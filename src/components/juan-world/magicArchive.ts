import * as THREE from 'three';
import type { Ink, Model, Workshop } from './models';
import { tube } from './forms';

/** Reference tome: embossed blue leather, gilt hardware, layered seal and sapphire lens. */
export function createMagicArchive(w: Workshop): Model {
  const root = new THREE.Group();
  const book = new THREE.Group();
  book.rotation.set(-0.12, -0.1, 0.13);
  root.add(book);
  const cy = 0.912;
  const surface = (ink: Ink, color: string, roughness: number, metalness: number) => {
    const m = w.material(ink) as THREE.MeshPhysicalMaterial;
    m.color.set(color);
    m.map = m.bumpMap = null;
    m.roughness = roughness;
    m.metalness = metalness;
    m.transmission = 0;
    m.transparent = false;
    m.opacity = 1;
    m.clearcoat = 0.18;
    m.envMapIntensity = 0.55;
    m.specularIntensity = 0.4;
    return m;
  };
  surface('wood', '#173955', 0.64, 0.1);
  surface('paper', '#b6a285', 0.82, 0.03);
  surface('cream', '#6c5a45', 0.8, 0.08);
  surface('gold', '#bf9147', 0.39, 0.72);
  const cover = surface('ink', '#ffffff', 0.6, 0.18);
  cover.emissive.set('#36b6ba');
  cover.emissiveIntensity = 0.12;
  const map = w.loadTexture(
    `${import.meta.env.BASE_URL}assets/juan-world/archive-cover.webp`,
    (t) => {
      // Low-resolution material masks distinguish embossed metal from leather and cyan runes.
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 356;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(t.image as HTMLImageElement, 0, 0, 256, 356);
      const pixels = ctx.getImageData(0, 0, 256, 356);
      const metal = ctx.createImageData(256, 356);
      const emission = ctx.createImageData(256, 356);
      for (let i = 0; i < pixels.data.length; i += 4) {
        const [r, g, b] = pixels.data.slice(i, i + 3);
        const gilt = r > b * 1.18 && r > 70;
        metal.data.set([gilt ? 210 : 28, gilt ? 210 : 28, gilt ? 210 : 28, 255], i);
        const magic = g > r * 1.45 && b > r * 1.5 ? 0.65 : gilt ? 0.035 : 0;
        emission.data.set([r * magic, g * magic, b * magic, 255], i);
      }
      const make = (data: ImageData, srgb = false) => {
        const c = document.createElement('canvas');
        c.width = 256;
        c.height = 356;
        c.getContext('2d')!.putImageData(data, 0, 0);
        const texture = new THREE.CanvasTexture(c);
        if (srgb) texture.colorSpace = THREE.SRGBColorSpace;
        w.textures.add(texture);
        return texture;
      };
      cover.metalness = 1;
      cover.metalnessMap = make(metal);
      cover.emissiveMap = make(emission, true);
      cover.emissive.set('#ffffff');
      cover.emissiveIntensity = 0.4;
      cover.needsUpdate = true;
      spineMap.needsUpdate = true;
    },
  );
  cover.map = cover.bumpMap = map;
  cover.bumpScale = 0.004;
  const spineMap = map.clone();
  spineMap.repeat.set(0.13, 1);
  spineMap.offset.set(0.01, 0);
  w.textures.add(spineMap);
  const spineMaterial = new THREE.MeshPhysicalMaterial({
    color: '#ffffff',
    map: spineMap,
    roughness: 0.62,
    metalness: 0.2,
    envMapIntensity: 0.45,
    specularIntensity: 0.3,
  });
  w.materials.set('archive:engraved-spine', spineMaterial);
  // Closed volumes and many actual page edges remain visible from the side and back.
  w.box(book, 'wood', 1.43, 1.98, 0.065, 0, 0.83, -0.14);
  w.box(book, 'paper', 1.35, 1.88, 0.22, 0.018, 0.83, -0.002);
  for (let i = 0; i < 32; i++) {
    const z = -0.105 + i * 0.0066;
    w.box(book, 'cream', 0.01, 1.856, 0.001, 0.698, 0.83, z);
    for (const y of [-0.098, 1.76]) w.box(book, 'cream', 1.32, 0.0015, 0.001, 0.012, y, z);
  }
  w.box(book, 'wood', 1.43, 1.98, 0.055, 0, 0.83, 0.137);
  w.box(book, 'wood', 0.092, 1.96, 0.32, -0.698, 0.83, 0);
  const spine = w.mesh(
    book,
    w.geometry('archive:spine-face', () => new THREE.PlaneGeometry(0.31, 1.94)),
    'wood',
    -0.747,
    0.83,
    0,
  );
  spine.material = spineMaterial;
  spine.rotation.y = -Math.PI / 2;
  const face = w.mesh(
    book,
    w.geometry('archive:cover-face', () => new THREE.PlaneGeometry(1.4, 1.94)),
    'ink',
    0,
    0.83,
    0.167,
  );
  face.castShadow = false;
  for (const y of [0.03, 0.24, 1.42, 1.65]) w.box(book, 'gold', 0.097, 0.024, 0.337, -0.698, y, 0);
  for (const x of [-0.703, 0.703]) w.box(book, 'gold', 0.012, 1.96, 0.013, x, 0.83, 0.169);
  for (const y of [-0.143, 1.803]) w.box(book, 'gold', 1.418, 0.012, 0.013, 0, y, 0.169);
  for (const sx of [-1, 1])
    for (const sy of [-1, 1]) {
      const x = sx * 0.65,
        y = 0.83 + sy * 0.93;
      const corner = w.box(book, 'gold', 0.115, 0.035, 0.065, x - sx * 0.018, y, 0.147);
      corner.rotation.z = sx * sy * 0.12;
      w.box(book, 'gold', 0.027, 0.14, 0.054, x + sx * 0.028, y - sy * 0.055, 0.15);
      const clasp = w.ball(book, 'gold', 0.028, x, y - sy * 0.015, 0.183);
      clasp.scale.z = 0.45;
    }
  // Raised rings follow the generated seal's center; the sapphire is real curved geometry.
  for (const [r, thickness, z] of [
    [0.171, 0.012, 0.191],
    [0.395, 0.008, 0.184],
    [0.566, 0.004, 0.184],
  ]) {
    w.ring(book, 'gold', r, thickness, 0, cy, z);
  }
  const sapphire = surface('blue', '#ffffff', 0.22, 0.16);
  sapphire.map = sapphire.emissiveMap = map;
  sapphire.clearcoat = 0.45;
  sapphire.clearcoatRoughness = 0.3;
  sapphire.specularIntensity = 0.18;
  sapphire.emissive.set('#006ec5');
  sapphire.emissiveIntensity = 0.45;
  sapphire.onBeforeCompile = (shader) => {
    shader.uniforms.magicTime = { value: 0 };
    sapphire.userData.magicTime = shader.uniforms.magicTime;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 gemPoint;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\ngemPoint=position;');
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        '#include <common>\nvarying vec3 gemPoint; uniform float magicTime;',
      )
      .replace(
        '#include <map_fragment>',
        `#ifdef USE_MAP
         diffuseColor *= texture2D(map,vec2(.5+gemPoint.x/1.4,.542+gemPoint.y/1.94));
         #endif`,
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#ifdef USE_EMISSIVEMAP
         totalEmissiveRadiance *= texture2D(emissiveMap,vec2(.5+gemPoint.x/1.4,.542+gemPoint.y/1.94)).rgb;
         #endif
      float flow=sin(gemPoint.y*170.+sin(gemPoint.x*110.+magicTime*.3)*3.+gemPoint.z*80.);
      float veins=pow(clamp(.5+.5*flow,0.,1.),24.);
      totalEmissiveRadiance+=veins*vec3(.0,.07,.14);`,
      );
  };
  sapphire.customProgramCacheKey = () => 'archive-sapphire-v2';
  const gem = w.mesh(
    book,
    w.geometry('archive:sapphire', () => new THREE.SphereGeometry(0.155, 40, 28)),
    'blue',
    0,
    cy,
    0.188,
  );
  gem.scale.z = 0.56;
  gem.userData.keep = true;
  // A floating cyan inscription layer, close to the embossed cover rather than a big platform.
  const runeCanvas = document.createElement('canvas');
  runeCanvas.width = runeCanvas.height = 512;
  const ctx = runeCanvas.getContext('2d')!;
  ctx.translate(256, 256);
  ctx.strokeStyle = '#0ab8cc';
  ctx.lineWidth = 1.6;
  for (const r of [216, 245]) {
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  for (let i = 0; i < 30; i++) {
    ctx.save();
    ctx.rotate((i * Math.PI * 2) / 30);
    ctx.translate(0, -231);
    ctx.beginPath();
    ctx.moveTo(-4, -6);
    ctx.lineTo(-4, 6);
    ctx.lineTo(4, 1);
    ctx.lineTo(1, -5);
    if (i % 3 === 0) {
      ctx.moveTo(-7, 0);
      ctx.lineTo(7, 0);
    }
    if (i % 3 === 1) {
      ctx.moveTo(4, -6);
      ctx.lineTo(7, 6);
    }
    ctx.stroke();
    ctx.restore();
  }
  const runeMap = new THREE.CanvasTexture(runeCanvas);
  runeMap.colorSpace = THREE.SRGBColorSpace;
  w.textures.add(runeMap);
  const runeMaterial = new THREE.MeshBasicMaterial({
    map: runeMap,
    color: '#10bad1',
    transparent: true,
    opacity: 0.7,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  w.effects.add(runeMaterial);
  const seal = new THREE.Mesh(
    w.geometry('archive:floating-runes', () => new THREE.PlaneGeometry(1.26, 1.26)),
    runeMaterial,
  );
  seal.position.set(0, cy, 0.225);
  seal.userData.keep = true;
  book.add(seal);
  const cyan = w.material('mint', true) as THREE.MeshPhysicalMaterial;
  cyan.emissive.set('#00a9cc');
  cyan.emissiveIntensity = 0.7;
  cyan.specularIntensity = 0;
  for (const angle of [0.35, 2.6, 4.8]) {
    const points: [number, number, number][] = Array.from({ length: 14 }, (_, i) => {
      const a = angle + (i / 13) * 0.65;
      return [Math.cos(a) * 0.584, cy + Math.sin(a) * 0.584, 0.25];
    });
    tube(w, book, 'mint', points, 0.004, true);
  }
  const mist = new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 } },
    vertexShader: `uniform float time; varying vec2 mistUv;
      void main(){mistUv=uv; vec3 p=position; p.z+=sin(uv.x*18.+time*.6)*.017;
      gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,
    fragmentShader: `uniform float time; varying vec2 mistUv;
      void main(){float edge=pow(max(0.,sin(mistUv.y*3.14159)),1.7);
      float streak=pow(clamp(.5+.5*sin(mistUv.y*20.+sin(mistUv.x*22.-time*1.4)*1.7),0.,1.),5.);
      float ends=pow(max(0.,sin(mistUv.x*3.14159)),.6);
      gl_FragColor=vec4(mix(vec3(.015,.28,.52),vec3(0.,.65,.85),streak),edge*ends*(.2+streak*.6));}`,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });
  w.effects.add(mist);
  for (let strand = 0; strand < 2; strand++) {
    const geometry = w.geometry(`archive:mist:${strand}`, () => {
      const pos: number[] = [],
        uv: number[] = [],
        index: number[] = [];
      for (let i = 0; i <= 96; i++) {
        const t = i / 96,
          a = t * Math.PI * 1.8 + strand * Math.PI - 0.8;
        for (const side of [-1, 1]) {
          pos.push(
            Math.sin(a) * (0.82 + Math.sin(t * Math.PI) * 0.16),
            -0.38 + t * 2.52 + side * 0.1,
            Math.cos(a) * 0.5 + 0.1,
          );
          uv.push(t, (side + 1) / 2);
        }
        if (i < 96) {
          const n = i * 2;
          index.push(n, n + 1, n + 2, n + 1, n + 3, n + 2);
        }
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      g.setIndex(index);
      g.computeVertexNormals();
      return g;
    });
    const ribbon = new THREE.Mesh(geometry, mist);
    ribbon.userData.keep = true;
    ribbon.raycast = () => {};
    book.add(ribbon);
  }
  const sparkMaterial = new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 }, activity: { value: 1 } },
    vertexShader: `uniform float time; varying float fade; varying float hue;
      void main(){float life=fract(position.x+time*.045);float a=position.y*6.283185+time*.1;
      vec3 p=vec3(sin(a)*(.62+position.z*.42),-.28+life*2.25,cos(a)*.4);
      fade=sin(life*3.14159);hue=position.z;
      vec4 view=modelViewMatrix*vec4(p,1.); gl_Position=projectionMatrix*view;
      gl_PointSize=min(5.,25./max(1.,-view.z));}`,
    fragmentShader: `uniform float activity; varying float fade; varying float hue;
      void main(){float d=length(gl_PointCoord-.5); if(d>.5)discard;
      vec3 c=hue>.55?vec3(.9,.49,.08):vec3(0.,.52,.73);
      gl_FragColor=vec4(c,pow(max(0.,1.-d*2.),2.)*fade*.8*activity);}`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  w.effects.add(sparkMaterial);
  const sparks = new THREE.Points(
    w.geometry('archive:sparks', () => {
      const g = new THREE.BufferGeometry();
      const seeds = Array.from({ length: 48 }, (_, i) => [
        i / 48,
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
  const bounce = new THREE.PointLight('#079cbd', 0.035, 0.8, 2);
  bounce.position.set(0, cy, 0.4);
  book.add(bounce);
  w.finish(book);
  root.traverse((node) => {
    if (
      node instanceof THREE.Mesh &&
      (node.material === cyan || node.material === runeMaterial || node.material === sapphire)
    )
      node.castShadow = node.receiveShadow = false;
  });
  return {
    root,
    anchor: new THREE.Vector3(0.48, -0.19, 0.42),
    animate(time, hover, active) {
      book.position.y = Math.sin(time * 0.55) * 0.025;
      book.rotation.z = 0.13 + Math.sin(time * 0.32) * 0.015;
      seal.rotation.z = -time * 0.025;
      mist.uniforms.time.value = sparkMaterial.uniforms.time.value = time;
      sparkMaterial.uniforms.activity.value = active ? 1.2 : 0.8;
      cyan.emissiveIntensity = 0.7 + Math.sin(time * 0.8) * 0.045 + hover * 0.06;
      if (sapphire.userData.magicTime) sapphire.userData.magicTime.value = time;
    },
  };
}
