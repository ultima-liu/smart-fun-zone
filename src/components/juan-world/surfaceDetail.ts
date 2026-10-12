import * as THREE from 'three';

type SurfaceKind = 'metal' | 'leather' | 'mineral' | 'paper' | 'glass' | 'polymer';
const kinds: SurfaceKind[] = ['metal', 'leather', 'mineral', 'paper', 'glass', 'polymer'];

/** Sub-pixel detail fades with derivatives; existing artwork, tint and shader effects survive. */
export function refineSurface(
  material: THREE.MeshStandardMaterial,
  kind: SurfaceKind,
  panels = false,
) {
  if (material.userData.precisionSurface) return;
  material.userData.precisionSurface = kind;
  const compile = material.onBeforeCompile.bind(material);
  const previousKey = material.customProgramCacheKey();
  material.onBeforeCompile = (shader, renderer) => {
    compile(shader, renderer);
    shader.uniforms.precisionKind = { value: kinds.indexOf(kind) };
    shader.uniforms.precisionPanels = { value: panels ? 1 : 0 };
    shader.vertexShader =
      `varying vec3 precisionPoint;varying vec3 precisionNormal;\n${shader.vertexShader}`.replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\nprecisionPoint=position;precisionNormal=normal;',
      );
    shader.fragmentShader = `
      varying vec3 precisionPoint;varying vec3 precisionNormal;uniform float precisionKind;uniform float precisionPanels;
      float precisionHash(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
      float precisionNoise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
      return mix(mix(mix(precisionHash(i),precisionHash(i+vec3(1,0,0)),f.x),mix(precisionHash(i+vec3(0,1,0)),precisionHash(i+vec3(1,1,0)),f.x),f.y),
      mix(mix(precisionHash(i+vec3(0,0,1)),precisionHash(i+vec3(1,0,1)),f.x),mix(precisionHash(i+vec3(0,1,1)),precisionHash(i+vec3(1,1,1)),f.x),f.y),f.z);}
      float precisionGrain=0.;float precisionRelief=0.;
      ${shader.fragmentShader}`;
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <roughnessmap_fragment>',
      `
      #include <roughnessmap_fragment>
      vec3 detailP=precisionPoint;
      float resolved=1.-smoothstep(.002,.008,max(length(dFdx(detailP)),length(dFdy(detailP))));
      float grit=precisionNoise(detailP*330.)-.5;
      precisionGrain=grit*resolved;
      float brush=sin(detailP.y*2400.+precisionNoise(detailP*31.)*3.)*resolved;
      float leather=precisionNoise(detailP*140.)-.5;
      precisionRelief=precisionGrain*.0003;
      if(precisionKind<.5){roughnessFactor+=precisionGrain*.085+brush*.017;precisionRelief+=brush*.00009;}
      else if(precisionKind<1.5){roughnessFactor+=leather*.12*resolved;precisionRelief+=leather*.0011*resolved;}
      else if(precisionKind<2.5){roughnessFactor+=precisionGrain*.12;precisionRelief+=leather*.0022*resolved;}
      else if(precisionKind<3.5){roughnessFactor+=precisionGrain*.08;precisionRelief+=brush*.0001;}
      else if(precisionKind<4.5){roughnessFactor+=precisionGrain*.006;precisionRelief*=.08;}
      else {roughnessFactor+=precisionGrain*.1;precisionRelief*=.4;}
      if(precisionPanels>.5&&precisionKind<.5){
        vec3 planeNormal=abs(normalize(precisionNormal));
        vec2 panelUV=planeNormal.z>max(planeNormal.x,planeNormal.y)?detailP.xy:planeNormal.y>planeNormal.x?detailP.xz:detailP.yz;
        vec2 panelCell=fract(panelUV/vec2(.24,.16)+.5);
        float edge=min(min(panelCell.x,1.-panelCell.x),min(panelCell.y,1.-panelCell.y));
        float panelAA=max(fwidth(edge),.002);
        float groove=1.-smoothstep(.003,.007+panelAA,edge);
        float bevel=smoothstep(.007,.012+panelAA,edge)*(1.-smoothstep(.012+panelAA,.019+panelAA,edge));
        float visible=1.-smoothstep(.01,.032,max(length(dFdx(detailP)),length(dFdy(detailP))));
        diffuseColor.rgb*=1.-groove*.14*visible+bevel*.04*visible;
        precisionRelief+=(-groove*.0007+bevel*.0002)*visible;
        roughnessFactor+=groove*.045*visible;
      }
      roughnessFactor=clamp(roughnessFactor,.04,1.);
      diffuseColor.rgb*=1.+precisionGrain*(precisionKind>3.5?.012:.055);
    `,
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <normal_fragment_maps>',
      `
      #include <normal_fragment_maps>
      vec3 detailDx=dFdx(-vViewPosition),detailDy=dFdy(-vViewPosition);
      vec3 detailR1=cross(detailDy,normal),detailR2=cross(normal,detailDx);
      float detailDet=dot(detailDx,detailR1);
      normal=normalize(abs(detailDet)*normal-sign(detailDet)*(dFdx(precisionRelief)*detailR1+dFdy(precisionRelief)*detailR2));
    `,
    );
  };
  material.customProgramCacheKey = () => `${previousKey}:precision-${kind}-${panels}-v1`;
  material.needsUpdate = true;
}

/** Called after each factory has established its own fixed material appearance. */
export function refineModel(root: THREE.Object3D, family: string) {
  root.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) return;
    for (const material of Array.isArray(node.material) ? node.material : [node.material]) {
      if (!(material instanceof THREE.MeshStandardMaterial)) continue;
      const metadata = material.userData.facilitySurface;
      if (metadata?.glow || material.blending === THREE.AdditiveBlending) continue;
      const ink = metadata?.ink ?? '';
      const physical = material as THREE.MeshPhysicalMaterial;
      const kind: SurfaceKind =
        ink === 'glass' || physical.transmission > 0.05
          ? 'glass'
          : ['rock', 'grass', 'leaf'].includes(ink)
            ? 'mineral'
            : family === 'school' && ['wood', 'ink'].includes(ink)
              ? 'leather'
              : family === 'school' && ['paper', 'cream'].includes(ink)
                ? 'paper'
                : family === 'park' && !['cream', 'paper'].includes(ink)
                  ? 'polymer'
                  : 'metal';
      refineSurface(material, kind, ['dock', 'supply', 'ship'].includes(family));
    }
  });
}
