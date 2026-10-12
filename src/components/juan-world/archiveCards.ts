import { preserveImageArt } from './imageArt';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import type { Model, Workshop } from './models';

/** Golden, red and blue celestial card backs orbit a shared centre; no portrait faces. */
export function createArchiveCards(w: Workshop): Model {
  const root = new THREE.Group();
  const cards: THREE.Group[] = [];
  const glows: THREE.ShaderMaterial[] = [];
  const width = 0.74,
    height = 1.3;
  const variants = [
    { id: 'gold', edge: '#b88b43', glow: '#ffd16b' },
    { id: 'red', edge: '#a14434', glow: '#ff5a42' },
    { id: 'blue', edge: '#477ba9', glow: '#55b5ff' },
  ];
  for (const { id, edge, glow } of variants) {
    const card = new THREE.Group();
    card.userData.keep = true;
    root.add(card);
    const faces = new THREE.Group();
    faces.visible = false;
    card.add(faces);
    const map = w.loadTexture(
      `${import.meta.env.BASE_URL}assets/juan-world/archive-orbit-${id}-v2.webp`,
      () => {
        faces.visible = true;
      },
      edge,
    );
    const face = new THREE.MeshBasicMaterial({
      map,
      transparent: true,
      alphaTest: 0.1,
      toneMapped: false,
    });
    preserveImageArt(face);
    const originalCompile = face.onBeforeCompile;
    face.onBeforeCompile = (shader, renderer) => {
      originalCompile.call(face, shader, renderer);
      shader.uniforms.cardFieldTint = { value: new THREE.Color(edge) };
      shader.fragmentShader = 'uniform vec3 cardFieldTint;\n' + shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <opaque_fragment>',
        `float originalCardLum = dot(diffuseColor.rgb, vec3(.2126,.7152,.0722));
         float glyphLight = smoothstep(.08, .4, originalCardLum);
         diffuseColor.rgb *= 1. + glyphLight * .6;
         vec2 cardUV = vMapUv;
         float fieldArea = smoothstep(.06,.16,cardUV.x)*(1.-smoothstep(.84,.94,cardUV.x))
           *smoothstep(.04,.12,cardUV.y)*(1.-smoothstep(.9,.97,cardUV.y));
         float emptyField = 1.-smoothstep(.06,.2,originalCardLum);
         float fieldCentre = .75+.25*(1.-smoothstep(.15,.58,length((cardUV-.5)*vec2(1.2,.85))));
         diffuseColor.rgb += cardFieldTint * fieldArea * emptyField * fieldCentre * .24;
         diffuseColor.rgb /= max(1., max(diffuseColor.r, max(diffuseColor.g,diffuseColor.b)));
         outgoingLight = diffuseColor.rgb;
         #include <opaque_fragment>`,
      );
    };
    face.customProgramCacheKey = () => 'orbital-card-luminous-field-v3';
    w.effects.add(face);
    const edgeMaterial = new THREE.MeshPhysicalMaterial({
      color: edge,
      roughness: 0.46,
      metalness: 0.55,
      clearcoat: 0.15,
    });
    w.effects.add(edgeMaterial);
    const shell = new THREE.Mesh(
      w.geometry(
        'archive:orbit-shell-v2',
        () => new RoundedBoxGeometry(0.7, 1.255, 0.028, 4, 0.018),
      ),
      edgeMaterial,
    );
    shell.castShadow = shell.receiveShadow = true;
    card.add(shell);
    for (const side of [-1, 1]) {
      const art = new THREE.Mesh(
        w.geometry('archive:orbit-face-v2', () => new THREE.PlaneGeometry(width, height)),
        face,
      );
      art.position.z = side * 0.016;
      art.rotation.y = side < 0 ? Math.PI : 0;
      faces.add(art);
    }
    const aura = new THREE.ShaderMaterial({
      uniforms: {
        cardMap: { value: map },
        cardTint: { value: new THREE.Color(glow) },
        intensity: { value: 0.72 },
      },
      vertexShader: `varying vec2 auraUV;
        void main(){auraUV=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
      fragmentShader: `uniform sampler2D cardMap;uniform vec3 cardTint;uniform float intensity;varying vec2 auraUV;
        float glyph(vec2 uv){
          if(any(lessThan(uv,vec2(0.)))||any(greaterThan(uv,vec2(1.))))return 0.;
          vec4 art=texture2D(cardMap,uv);
          return art.a*smoothstep(.06,.42,dot(art.rgb,vec3(.2126,.7152,.0722)));
        }
        float silhouette(vec2 uv){
          if(any(lessThan(uv,vec2(0.)))||any(greaterThan(uv,vec2(1.))))return 0.;
          return texture2D(cardMap,uv).a;
        }
        void main(){
          vec2 uv=(auraUV-.5)*vec2(.82/.74,1.4/1.3)+.5;
          vec2 d=vec2(.004,.002);
          float light=glyph(uv)*.2;
          light+=(glyph(uv+vec2(d.x,0.))+glyph(uv-vec2(d.x,0.))+glyph(uv+vec2(0.,d.y))+glyph(uv-vec2(0.,d.y)))*.12;
          light+=(glyph(uv+d)+glyph(uv-d)+glyph(uv+vec2(d.x,-d.y))+glyph(uv+vec2(-d.x,d.y)))*.08;
          vec2 e=vec2(.018,.009);
          float edge=(silhouette(uv+e)+silhouette(uv-e)+silhouette(uv+vec2(e.x,-e.y))+silhouette(uv+vec2(-e.x,e.y)))*.25;
          light+=max(0.,edge-silhouette(uv))*.32;
          gl_FragColor=vec4(cardTint*light*intensity,1.);
        }`,
      transparent: true,
      depthWrite: false,
      blending: THREE.CustomBlending,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneFactor,
      blendSrcAlpha: THREE.ZeroFactor,
      blendDstAlpha: THREE.OneFactor,
      toneMapped: false,
    });
    w.effects.add(aura);
    glows.push(aura);
    for (const side of [-1, 1]) {
      const halo = new THREE.Mesh(
        w.geometry('archive:orbit-aura-v2', () => new THREE.PlaneGeometry(0.82, 1.4)),
        aura,
      );
      halo.position.z = side * 0.023;
      halo.rotation.y = side < 0 ? Math.PI : 0;
      halo.raycast = () => {}; // The soft aura never intercepts clicks outside the actual card.
      faces.add(halo);
    }
    cards.push(card);
  }
  const animate = (time: number, hover: number) => {
    root.position.y = (root.userData.baseY ?? 0) + Math.sin(time * 0.45) * 0.025;
    cards.forEach((card, i) => {
      const phase = time * 0.25 + (i * Math.PI * 2) / 3;
      glows[i].uniforms.intensity.value =
        0.72 + Math.sin(time * 1.25 + i * 2) * 0.08 + hover * 0.12;
      // Three equal phase offsets give a full, depth-tested elliptical orbit every 25s.
      card.position.set(
        Math.sin(phase) * 0.78,
        0.79 + Math.cos(phase) * 0.15 + hover * 0.035,
        Math.cos(phase) * 0.46,
      );
      card.rotation.set(0, Math.sin(phase) * 0.22, -Math.sin(phase) * 0.1);
    });
  };
  animate(0, 0);
  return {
    root,
    anchor: new THREE.Vector3(-0.72, -0.08, 0.55),
    animate,
  };
}
