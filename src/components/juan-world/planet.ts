import * as THREE from 'three';
import { WORLD_APPEARANCES, type WorldAppearance } from './appearances';
import { ringEffects } from './ringEffects';
import { GAS_CLOUDS } from './gasPlanet';
import { PLANET_ATLASES } from './planetAtlases';
import type { Workshop } from './models';

// Shared object-space microdetail complements the four fine surface atlases.
const NOISE = `
float worldHash(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
float worldNoise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
return mix(mix(mix(worldHash(i),worldHash(i+vec3(1,0,0)),f.x),mix(worldHash(i+vec3(0,1,0)),worldHash(i+vec3(1,1,0)),f.x),f.y),
mix(mix(worldHash(i+vec3(0,0,1)),worldHash(i+vec3(1,0,1)),f.x),mix(worldHash(i+vec3(0,1,1)),worldHash(i+vec3(1,1,1)),f.x),f.y),f.z);}
float worldFbm(vec3 p){return worldNoise(p)*.57+worldNoise(p*2.07+7.)*.28+worldNoise(p*4.13+19.)*.15;}
`;
const SURFACE = `
uniform vec4 appearanceWeights; uniform float worldTime; uniform vec3 planetLightDirection; varying vec3 skinPoint;
${NOISE}
${GAS_CLOUDS}
${PLANET_ATLASES}
float skinRelief=0.;
vec4 rockSurface(vec3 p){
 vec3 fallback=mix(vec3(.018,.027,.052),vec3(.14,.11,.19),worldFbm(p*11.));
 vec3 color=mix(fallback,planetAtlas(rockAtlas,p,0.),rockAtlasReady);
 skinRelief+=(atlasHeight(color)*.035+worldNoise(p*180.)*.001)*appearanceWeights.x;
 return vec4(color,0.);
}
vec4 gasSurface(vec3 p){
 vec4 cloud=gasClouds(p);
 skinRelief+=(cloud.a*.0035+worldNoise(p*145.)*.0007)*appearanceWeights.y;
 return vec4(cloud.rgb,0.);
}
vec4 iceSurface(vec3 p){
 vec3 fallback=mix(vec3(.012,.07,.14),vec3(.33,.54,.61),worldFbm(p*8.));
 vec3 color=mix(fallback,planetAtlas(iceAtlas,p,0.),iceAtlasReady);
 float height=atlasHeight(color);
 skinRelief+=(height*.014+worldNoise(p*190.)*.0006)*appearanceWeights.z;
 return vec4(color*.82,0.);
}
vec4 starSurface(vec3 p){
 float latitude=asin(clamp(p.y,-1.,1.));
 float drift=worldTime*.00045*(1.-.35*p.y*p.y);
 float curl=(worldNoise(p*24.+worldTime*.025)-.5)*.0009*cos(latitude);
 vec3 fallback=mix(vec3(.24,.015,.002),vec3(.85,.27,.015),worldFbm(p*28.+worldTime*.012));
 vec3 fire=mix(fallback,planetAtlas(starAtlas,p,drift+curl),starAtlasReady);
 fire*=.95+.05*worldNoise(p*170.+worldTime*.4);
 skinRelief+=atlasHeight(fire)*.001*appearanceWeights.w;
 return vec4(fire*.67,1.25);
}
vec4 worldSurface(vec3 p){skinRelief=0.;vec4 s=vec4(0.);
 if(appearanceWeights.x>.001)s+=rockSurface(p)*appearanceWeights.x;
 if(appearanceWeights.y>.001)s+=gasSurface(p)*appearanceWeights.y;
 if(appearanceWeights.z>.001)s+=iceSurface(p)*appearanceWeights.z;
 if(appearanceWeights.w>.001)s+=starSurface(p)*appearanceWeights.w;
 return s;}
`;

/** Shared materials and geometry survive all theme changes; crossfades use the scene RAF. */
export function createCelestialWorld(w: Workshop, initial: WorldAppearance = 'rock') {
  const unit = (id: WorldAppearance) => {
    const values = [0, 0, 0, 0];
    values[WORLD_APPEARANCES.findIndex((item) => item.id === id)] = 1;
    return new THREE.Vector4(...(values as [number, number, number, number]));
  };
  const weights = unit(initial),
    from = weights.clone(),
    target = weights.clone();
  let transitionStart = 0,
    transitioning = false;
  const clock = { value: 0 },
    uniformWeights = { value: weights };
  const planetLightDirection = { value: new THREE.Vector3(-5, 8, 5).normalize() };
  const gasAtlasReady = { value: 0 };
  const gasAtlas = w.loadTexture(
    `${import.meta.env.BASE_URL}assets/juan-world/gas-cloud-atlas-v1.webp`,
    () => {
      gasAtlasReady.value = 1;
    },
    '#aa6638',
  );
  gasAtlas.wrapS = THREE.RepeatWrapping;
  gasAtlas.wrapT = THREE.ClampToEdgeWrapping;
  const gasUniforms = { gasAtlas: { value: gasAtlas }, gasAtlasReady };
  const atlasUniforms: Record<string, { value: THREE.Texture | number }> = {};
  for (const id of ['rock', 'ice', 'star'] as const) {
    const ready = { value: 0 };
    const atlas = w.loadTexture(
      `${import.meta.env.BASE_URL}assets/juan-world/${id}-surface-atlas-v1.webp`,
      () => {
        ready.value = 1;
      },
      id === 'rock' ? '#555267' : id === 'ice' ? '#78bbd7' : '#cf641d',
    );
    atlas.wrapS = THREE.RepeatWrapping;
    atlas.wrapT = THREE.ClampToEdgeWrapping;
    atlasUniforms[`${id}Atlas`] = { value: atlas };
    atlasUniforms[`${id}AtlasReady`] = ready;
  }
  const material = new THREE.MeshStandardMaterial({
    roughness: 0.91,
    metalness: 0.08,
  });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.appearanceWeights = uniformWeights;
    shader.uniforms.worldTime = clock;
    shader.uniforms.planetLightDirection = planetLightDirection;
    Object.assign(shader.uniforms, gasUniforms, atlasUniforms);
    shader.vertexShader = `varying vec3 skinPoint;\n${shader.vertexShader}`.replace(
      '#include <begin_vertex>',
      '#include <begin_vertex>\nskinPoint=normalize(position);',
    );
    shader.fragmentShader = SURFACE + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <map_fragment>',
      '#include <map_fragment>\nvec4 skinSurface=worldSurface(normalize(skinPoint));\ndiffuseColor.rgb=skinSurface.rgb;',
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <normal_fragment_maps>',
      `#include <normal_fragment_maps>
      vec3 reliefDx=dFdx(-vViewPosition),reliefDy=dFdy(-vViewPosition);
      vec3 reliefR1=cross(reliefDy,normal),reliefR2=cross(normal,reliefDx);
      float reliefDet=dot(reliefDx,reliefR1);
      normal=normalize(abs(reliefDet)*normal-sign(reliefDet)*(dFdx(skinRelief)*reliefR1+dFdy(skinRelief)*reliefR2));`,
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <emissivemap_fragment>',
      '#include <emissivemap_fragment>\ntotalEmissiveRadiance+=skinSurface.rgb*skinSurface.a;',
    );
    // Non-emissive spheres receive a soft terminator without changing building lights.
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <opaque_fragment>',
      `float skinSun=dot(normalize(skinPoint),planetLightDirection);
      float skinDay=smoothstep(-.18,.28,skinSun);
      outgoingLight*=mix(.045+.955*skinDay,1.,appearanceWeights.w);
      float solarFacing=abs(dot(normalize(normal),normalize(vViewPosition)));
      outgoingLight*=mix(1.,.48+.52*pow(solarFacing,.35),appearanceWeights.w);
      #include <opaque_fragment>`,
    );
  };
  const planet = new THREE.Mesh(new THREE.SphereGeometry(3.06, 96, 64), material);
  planet.receiveShadow = planet.castShadow = true;
  // Thin, restrained weather layers preserve the atlas detail below them.
  const clouds = new THREE.Group();
  for (let layer = 0; layer < 2; layer++) {
    const cloudMaterial = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: {
        appearanceWeights: uniformWeights,
        worldTime: clock,
        cloudLayer: { value: layer },
        ...gasUniforms,
      },
      vertexShader: `uniform vec4 appearanceWeights;uniform float worldTime;uniform float cloudLayer;
      varying vec3 cloudPoint;varying vec3 cloudNormal;varying vec3 cloudView;
      ${NOISE}
      void main(){cloudPoint=normalize(position);cloudNormal=normalize(mat3(modelMatrix)*normal);
      float altitude=(worldNoise(cloudPoint*7.+worldTime*.015)-.5)*.0015*appearanceWeights.y;
      vec4 pos=modelViewMatrix*vec4(position*(1.+altitude),1.);cloudView=normalize(-pos.xyz);
      gl_Position=projectionMatrix*pos;}`,
      fragmentShader: `uniform vec4 appearanceWeights;uniform float worldTime;uniform float cloudLayer;
      varying vec3 cloudPoint;varying vec3 cloudNormal;varying vec3 cloudView;
      ${NOISE}
      ${GAS_CLOUDS}
      void main(){
      vec3 p=normalize(cloudPoint);
      float drift=cloudLayer*(.006+worldTime*.0006);
      vec3 q=vec3(cos(drift)*p.x-sin(drift)*p.z,p.y,sin(drift)*p.x+cos(drift)*p.z);
      vec4 cloud=gasClouds(q);
      vec3 lightDir=normalize(vec3(-5,8,5));
      float solar=dot(normalize(cloudNormal),lightDir);
      float light=(.2+.8*max(solar,0.))*smoothstep(-.18,.28,solar);
      float facing=abs(dot(normalize(cloudView),normalize((viewMatrix*vec4(cloudNormal,0.)).xyz)));
      float limb=pow(clamp(1.-facing,0.,1.),2.);
      float edgeFade=smoothstep(0.,.16,facing);
      float banks=smoothstep(.28,.72,cloud.a);
      vec3 color=mix(cloud.rgb,vec3(.27,.24,.3),cloudLayer*.12);
      float opacity=mix(banks*.075, .012+banks*.025+limb*.018, cloudLayer);
      gl_FragColor=vec4(color*light,appearanceWeights.y*opacity*edgeFade);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      }`,
    });
    clouds.add(
      new THREE.Mesh(new THREE.SphereGeometry(3.078 + layer * 0.028, 64, 48), cloudMaterial),
    );
  }
  const haloMaterial = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
    uniforms: { appearanceWeights: uniformWeights, worldTime: clock },
    vertexShader: `varying vec3 n;varying vec3 view;varying vec3 p;varying vec3 worldNormal;
    void main(){p=normalize(position);worldNormal=normalize(mat3(modelMatrix)*normal);vec4 pos=modelViewMatrix*vec4(position,1.);n=normalize(normalMatrix*normal);view=normalize(-pos.xyz);gl_Position=projectionMatrix*pos;}`,
    fragmentShader: `uniform vec4 appearanceWeights;uniform float worldTime;varying vec3 n;varying vec3 view;varying vec3 p;varying vec3 worldNormal;
    ${NOISE}
    void main(){float facing=abs(dot(normalize(n),normalize(view)));
    float edge=pow(clamp(1.-facing,0.,1.),4.8+appearanceWeights.y*.4);
    edge*=mix(1.,smoothstep(0.,.25,facing)*(.7+.3*worldNoise(p*9.+worldTime*.015)),appearanceWeights.y);
    float lit=.22+.78*max(dot(normalize(worldNormal),normalize(vec3(-5,8,5))),0.);
    float aurora=pow(max(0.,sin(p.y*14.+worldFbm(p*6.)*6.+worldTime*.12)),5.)*smoothstep(.35,.8,abs(p.y));
    float flare=.6+worldFbm(p*15.+worldTime*.035)*.7;
    vec3 color=vec3(.13,.21,.68)*appearanceWeights.x+vec3(.21,.24,.53)*appearanceWeights.y+vec3(.12,.55,.68)*appearanceWeights.z+vec3(.95,.26,.028)*appearanceWeights.w;
    float strength=lit*(.36-appearanceWeights.y*.07)+appearanceWeights.z*aurora*.1+appearanceWeights.w*flare*.3;
    gl_FragColor=vec4(color*edge,edge*strength);}`,
  });
  const halo = new THREE.Mesh(new THREE.SphereGeometry(3.2, 64, 48), haloMaterial);
  const ring = new THREE.Group();
  ring.rotation.set(-Math.PI / 2 + 0.16, 0.12, -0.32);
  const ringMaterial = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    uniforms: { appearanceWeights: uniformWeights, worldTime: clock },
    vertexShader: `varying vec3 p;varying vec3 worldPoint;void main(){p=position;worldPoint=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `uniform vec4 appearanceWeights;uniform float worldTime;varying vec3 p;varying vec3 worldPoint;
    ${NOISE}
    void main(){float r=length(p.xy),a=atan(p.y,p.x);
    float band=(r-4.03)*2.1;float density=exp(-band*band);
    float gap=1.-.96*exp(-pow(abs(r-4.08)*56.,2.));
    gap*=1.-.62*exp(-pow(abs(r-3.87)*110.,2.));
    gap*=1.-.76*exp(-pow(abs(r-4.31)*125.,2.));
    float fine=.5+.5*sin(r*680.+worldNoise(vec3(r*71.,3,7))*3.);
    float layers=.25+.45*worldNoise(vec3(r*165.,2,7))+.3*fine;
    vec3 dustPoint=vec3(p.xy,0.);float grain=worldNoise(dustPoint*230.);
    float drifting=worldNoise(vec3(cos(a-worldTime*.018),sin(a-worldTime*.018),r)*26.);
    float strata=worldNoise(vec3(r*43.,5,2));
    vec3 rock=mix(vec3(.12,.1,.17),vec3(.4,.34,.46),strata);
    vec3 gas=mix(vec3(.19,.09,.042),vec3(.67,.48,.29),strata);
    vec3 ice=mix(vec3(.085,.23,.32),vec3(.56,.75,.8),strata);
    vec3 star=mix(vec3(.34,.025,.003),vec3(.91,.28,.018),strata);
    vec3 color=rock*appearanceWeights.x+gas*appearanceWeights.y+ice*appearanceWeights.z+star*appearanceWeights.w;
    color*=.8+grain*.3+drifting*.12;
    float vapor=mix(1.,.35+.65*smoothstep(.34,.7,drifting),appearanceWeights.w);
    vec3 light=normalize(vec3(-5,8,5));float behind=step(dot(worldPoint,light),0.);
    float separation=length(worldPoint-light*dot(worldPoint,light));
    float shade=mix(1.,.16+.84*smoothstep(2.9,3.25,separation),behind);
    float edges=smoothstep(3.62,3.73,r)*(1.-smoothstep(4.4,4.5,r));
    float opacity=gap*layers*(.34+grain*.22)*vapor;
    opacity*=1.-appearanceWeights.z*.28;
    gl_FragColor=vec4(color*shade,edges*density*opacity);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    }`,
  });
  ring.add(new THREE.Mesh(new THREE.RingGeometry(3.62, 4.5, 192, 4), ringMaterial));
  const positions = new Float32Array(650 * 3);
  for (let i = 0; i < 650; i++) {
    const angle = i * 2.39996,
      sample = ((i * 37) % 647) / 647,
      radius = 3.76 + sample * 0.63;
    positions.set(
      [Math.cos(angle) * radius, Math.sin(angle) * radius, Math.sin(i * 13.7) * 0.038],
      i * 3,
    );
  }
  const dustGeometry = new THREE.BufferGeometry();
  dustGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const dustMaterial = new THREE.PointsMaterial({
    size: 0.013,
    color: '#8e76b2',
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
  });
  const dust = new THREE.Points(dustGeometry, dustMaterial);
  dust.frustumCulled = false;
  dustMaterial.onBeforeCompile = (shader) => {
    shader.uniforms.appearanceWeights = uniformWeights;
    shader.uniforms.worldTime = clock;
    shader.vertexShader =
      'uniform vec4 appearanceWeights;uniform float worldTime;varying float emberLife;\n' +
      shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
      emberLife=fract(worldTime*.32+position.x*13.+position.y*7.);
      transformed.xy+=appearanceWeights.w*emberLife*(normalize(position.xy)*.8+vec2(-position.y,position.x)*.035);`,
    );
    shader.fragmentShader =
      'uniform vec4 appearanceWeights;varying float emberLife;\n' + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <color_fragment>',
      '#include <color_fragment>\ndiffuseColor.a*=1.-appearanceWeights.w*emberLife;',
    );
  };
  ring.add(dust);
  const effects = ringEffects(uniformWeights, clock, NOISE);
  ring.add(effects.root);
  const dustColors = ['#a898b7', '#d5b795', '#b5e3ef', '#ffae42'].map(
    (color) => new THREE.Color(color),
  );
  const roughness = new THREE.Vector4(0.94, 0.95, 0.56, 1);
  const values = [0, 0, 0, 0];
  function update(time: number, now: number) {
    if (transitioning) {
      const progress = Math.min(1, Math.max(0, (now - transitionStart) / 700));
      weights.lerpVectors(from, target, progress * progress * (3 - 2 * progress));
      transitioning = progress < 1;
    }
    clock.value = time;
    weights.toArray(values);
    dustMaterial.color.setRGB(0, 0, 0);
    values.forEach((weight, i) => {
      dustMaterial.color.r += dustColors[i].r * weight;
      dustMaterial.color.g += dustColors[i].g * weight;
      dustMaterial.color.b += dustColors[i].b * weight;
    });
    material.roughness = weights.dot(roughness);
    material.metalness = weights.z * 0.025;
    halo.scale.setScalar(0.973 + weights.w * 0.011);
    clouds.visible = weights.y > 0.001;
    dustMaterial.opacity = 0.45 - weights.y * 0.23 - weights.z * 0.2 + weights.w * 0.23;
    dustMaterial.size = 0.01 + weights.w * 0.015;
    dust.rotation.z = time * 0.018;
    effects.update(time);
  }
  return {
    planet,
    clouds,
    halo,
    ring,
    rockAtlas: atlasUniforms.rockAtlas.value as THREE.Texture,
    update,
    setRotation(angle: number) {
      // The terminator stays aligned with the world-space sun as the surface turns.
      planetLightDirection.value
        .set(-5, 8, 5)
        .normalize()
        .applyAxisAngle(THREE.Object3D.DEFAULT_UP, -angle);
    },
    get transitioning() {
      return transitioning;
    },
    setAppearance(id: WorldAppearance, immediate: boolean) {
      update(clock.value, performance.now());
      from.copy(weights);
      target.copy(unit(id));
      transitionStart = performance.now();
      transitioning = !immediate;
      if (immediate) weights.copy(target);
    },
  };
}
