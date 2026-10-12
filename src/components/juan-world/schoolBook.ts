import * as THREE from 'three';
import { preserveImageArt } from './imageArt';
import type { Model, Workshop } from './models';

/** Reference golden open tome, with the school's shared-time orbit, mist and rising sparks. */
export function createSchoolBook(w: Workshop): Model {
  const root = new THREE.Group();
  const book = new THREE.Group();
  root.add(book);
  let alphaPixels: Uint8ClampedArray | undefined;
  const maskSize = 256;
  const texture = w.loadTexture(
    `${import.meta.env.BASE_URL}assets/juan-world/school-golden-tome-v3.webp`,
    (loaded) => {
      const source = loaded.image as HTMLImageElement;
      image.scale.y = (2.8 * source.height) / source.width / 2.4;
      const mask = document.createElement('canvas');
      mask.width = mask.height = maskSize;
      const context = mask.getContext('2d', { willReadFrequently: true })!;
      context.drawImage(source, 0, 0, maskSize, maskSize);
      alphaPixels = context.getImageData(0, 0, maskSize, maskSize).data;
      image.visible = true;
    },
  );
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    color: '#ffffff',
    side: THREE.DoubleSide,
    alphaTest: 0.08,
    toneMapped: false,
  });
  preserveImageArt(material);
  w.effects.add(material);
  const image = new THREE.Mesh(
    w.geometry('school:golden-tome-v2', () => new THREE.PlaneGeometry(2.8, 2.4)),
    material,
  );
  image.position.y = 0.88;
  image.userData.keep = true;
  image.visible = false;
  book.add(image);
  const planeRaycast = image.raycast.bind(image);
  image.raycast = (raycaster, intersections) => {
    const candidates: THREE.Intersection[] = [];
    planeRaycast(raycaster, candidates);
    for (const hit of candidates) {
      if (!image.visible || !alphaPixels || !hit.uv) continue;
      const x = Math.min(maskSize - 1, Math.max(0, Math.floor(hit.uv.x * maskSize)));
      const y = Math.min(maskSize - 1, Math.max(0, Math.floor((1 - hit.uv.y) * maskSize)));
      if (alphaPixels[(y * maskSize + x) * 4 + 3] >= 21) intersections.push(hit);
    }
  };
  // Additive light preserves the composer's alpha marker for the original illustration.
  const lightBlend = {
    transparent: true,
    depthWrite: false,
    blending: THREE.CustomBlending,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneFactor,
    blendSrcAlpha: THREE.ZeroFactor,
    blendDstAlpha: THREE.OneFactor,
    toneMapped: false,
  };
  const orbit = new THREE.Group();
  orbit.position.y = 0.88;
  orbit.userData.keep = true;
  book.add(orbit);
  const glows: THREE.MeshBasicMaterial[] = [];
  for (let i = 0; i < 2; i++) {
    const glow = new THREE.MeshBasicMaterial({
      ...lightBlend,
      blendSrc: THREE.SrcAlphaFactor,
      color: i ? '#f0ad39' : '#ffe39a',
      opacity: 0.65,
    });
    w.effects.add(glow);
    glows.push(glow);
    const trail = new THREE.Group();
    trail.rotation.set(i ? -0.55 : 0.7, i ? -0.38 : 0.45, i ? -0.5 : 0.4);
    orbit.add(trail);
    const geometry = w.geometry(
      `school-book-orbit:${i}`,
      () => new THREE.TorusGeometry(1.14 + i * 0.11, 0.012, 8, 120, Math.PI * 1.72),
    );
    const mesh = new THREE.Mesh(geometry, glow);
    mesh.scale.y = 0.75;
    mesh.userData.keep = true;
    mesh.raycast = () => {};
    trail.add(mesh);
    for (let j = 0; j < 9; j++) {
      const a = (j * Math.PI * 2) / 9;
      const mote = w.ball(
        trail,
        'mint',
        0.021,
        Math.cos(a) * (1.14 + i * 0.11),
        Math.sin(a) * (1.14 + i * 0.11) * 0.75,
      );
      mote.material = glow;
      mote.castShadow = mote.receiveShadow = false;
      mote.raycast = () => {};
    }
  }
  const mist = new THREE.ShaderMaterial({
    ...lightBlend,
    side: THREE.DoubleSide,
    uniforms: { time: { value: 0 } },
    vertexShader: `uniform float time; varying vec2 mistUv;
      void main(){mistUv=uv;vec3 p=position;p.z+=sin(uv.x*18.+time*.6)*.017;
      gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,
    fragmentShader: `uniform float time;varying vec2 mistUv;
      void main(){float edge=pow(max(0.,sin(mistUv.y*3.14159)),1.7);
      float streak=pow(clamp(.5+.5*sin(mistUv.y*20.+sin(mistUv.x*22.-time*1.4)*1.7),0.,1.),5.);
      float ends=pow(max(0.,sin(mistUv.x*3.14159)),.6);
      float light=edge*ends*(.04+streak*.16);
      gl_FragColor=vec4(mix(vec3(.52,.17,.025),vec3(1.,.68,.15),streak)*light,0.);}`,
  });
  w.effects.add(mist);
  for (let strand = 0; strand < 2; strand++) {
    const geometry = w.geometry(`school:golden-mist:${strand}`, () => {
      const positions: number[] = [],
        uv: number[] = [],
        indices: number[] = [];
      for (let i = 0; i <= 96; i++) {
        const t = i / 96,
          a = t * Math.PI * 1.8 + strand * Math.PI - 0.8;
        for (const side of [-1, 1]) {
          positions.push(
            Math.sin(a) * (0.16 + Math.sin(t * Math.PI) * 0.13),
            0.72 + t * 1.8 + side * 0.065,
            Math.cos(a) * 0.16 + 0.07,
          );
          uv.push(t, (side + 1) / 2);
        }
        if (i < 96) {
          const n = i * 2;
          indices.push(n, n + 1, n + 2, n + 1, n + 3, n + 2);
        }
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      g.setIndex(indices);
      return g;
    });
    const ribbon = new THREE.Mesh(geometry, mist);
    ribbon.userData.keep = true;
    ribbon.raycast = () => {};
    book.add(ribbon);
  }
  const sparkMaterial = new THREE.ShaderMaterial({
    ...lightBlend,
    uniforms: { time: { value: 0 }, activity: { value: 0.8 } },
    vertexShader: `uniform float time;varying float fade;varying float hue;
      void main(){float life=fract(position.x+time*.045);float a=position.y*6.283185+time*.1;
      vec3 p=vec3(sin(a)*(.12+life*.46+position.z*.12),.75+life*1.65,cos(a)*.18+.15);
      fade=max(0.,sin(life*3.14159));hue=position.z;
      vec4 view=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*view;
      gl_PointSize=min(5.,25./max(1.,-view.z));}`,
    fragmentShader: `uniform float activity;varying float fade;varying float hue;
      void main(){float d=length(gl_PointCoord-.5);if(d>.5)discard;
      vec3 color=mix(vec3(1.,.34,.04),vec3(1.,.83,.3),hue);
      float light=pow(max(0.,1.-d*2.),2.)*fade*.8*activity;
      gl_FragColor=vec4(color*light,0.);}`,
  });
  w.effects.add(sparkMaterial);
  const sparks = new THREE.Points(
    w.geometry('school:golden-sparks', () => {
      const g = new THREE.BufferGeometry();
      const seeds = Array.from({ length: 64 }, (_, i) => [
        i / 64,
        ((i * 17) % 47) / 47,
        ((i * 13) % 43) / 43,
      ]).flat();
      g.setAttribute('position', new THREE.Float32BufferAttribute(seeds, 3));
      return g;
    }),
    sparkMaterial,
  );
  sparks.frustumCulled = false;
  sparks.raycast = () => {};
  book.add(sparks);
  // Live central page flames: upward flowing noise, soft tongues and rising embers.
  const flameMaterials: THREE.ShaderMaterial[] = [];
  for (let i = 0; i < 2; i++) {
    const flameMaterial = new THREE.ShaderMaterial({
      ...lightBlend,
      side: THREE.DoubleSide,
      uniforms: {
        time: { value: 0 },
        phase: { value: i * 2.37 },
        strength: { value: 1 },
      },
      vertexShader: `uniform float time;uniform float phase;varying vec2 flameUv;
        void main(){flameUv=uv;vec3 p=position;
        p.x+=sin(uv.y*7.-time*2.3+phase)*uv.y*.07;
        p.y+=sin(time*2.1+phase)*uv.y*.045;
        gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,
      fragmentShader: `uniform float time;uniform float phase;uniform float strength;
        varying vec2 flameUv;
        float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
        float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
          return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),
            mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);}
        void main(){float y=flameUv.y;float x=flameUv.x-.5;
          float drift=sin(y*8.-time*2.5+phase)*(.035+y*.12)
            +sin(y*17.-time*3.4+phase)*y*.035;
          vec2 flow=vec2(x*8.+phase,y*7.-time*2.4);
          float turbulence=noise(flow)*.65+noise(flow*2.1)*.35;
          float width=(.09+.13*turbulence)*pow(max(0.,1.-y),.65)+.008;
          float d=abs(x-drift);
          float body=exp(-d*d/(width*width));
          float core=exp(-d*d/(width*width*.12));
          float tongue=.45+.55*noise(vec2(x*13.+phase,y*11.-time*3.1));
          float ends=smoothstep(0.,.12,y)*(1.-smoothstep(.72,1.,y));
          float flicker=.82+.18*sin(time*8.2+phase+y*5.);
          vec3 gold=mix(vec3(1.2,.32,.015),vec3(1.7,.95,.16),turbulence);
          vec3 light=(gold*body*tongue+vec3(1.5,1.15,.4)*core*.2)
            *ends*flicker*strength;
          gl_FragColor=vec4(light,0.);}`,
    });
    w.effects.add(flameMaterial);
    flameMaterials.push(flameMaterial);
    const flame = new THREE.Mesh(
      w.geometry('school:live-page-flame', () => new THREE.PlaneGeometry(0.96, 1.4, 8, 32)),
      flameMaterial,
    );
    flame.position.set(i ? 0.1 : -0.06, i ? 1.64 : 1.56, 0.035 + i * 0.005);
    flame.rotation.z = i ? -0.08 : 0.06;
    flame.userData.keep = true;
    flame.raycast = () => {};
    book.add(flame);
  }
  return {
    root,
    anchor: new THREE.Vector3(0.7, 0.04, 0.68),
    animate(time, hover, active) {
      book.position.y = Math.sin(time * 0.55) * 0.025;
      book.rotation.z = Math.sin(time * 0.32) * 0.015;
      mist.uniforms.time.value = sparkMaterial.uniforms.time.value = time;
      sparkMaterial.uniforms.activity.value = active ? 1.2 : 0.8;
      flameMaterials.forEach((flame) => {
        flame.uniforms.time.value = time;
        flame.uniforms.strength.value = 1 + hover * 0.15;
      });
      orbit.rotation.y = time * 0.12;
      orbit.rotation.z = Math.sin(time * 0.28) * 0.06;
      glows.forEach((glow, i) => {
        glow.opacity = 0.6 + Math.sin(time * 0.8 + i) * 0.09 + hover * 0.06;
      });
    },
  };
}
