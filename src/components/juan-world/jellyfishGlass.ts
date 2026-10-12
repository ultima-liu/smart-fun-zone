import * as THREE from 'three';
import type { Workshop } from './models';

/** Shared by the physical skin and the emissive hair; normals follow the same deformation. */
export const JELLY_DEFORM = `
vec3 jellyDeform(vec3 p){
  float pulse=.5+.5*sin(jellyTime*2.05);
  if(jellyPart<1.5 || jellyPart>4.5){
    float gather=pow(clamp((1.24-p.y)/.7,0.,1.),1.25);
    p.xz*=1.-pulse*.13*gather;
    p.y=.68+(p.y-.68)*(1.+pulse*.19);
  }else{
    float trail=clamp((.68-p.y)/2.25,0.,1.);
    float azimuth=atan(p.z,p.x);
    float phase=jellyTime*2.05-trail*6.5+sin(azimuth)*.32+cos(azimuth)*.18;
    p.xz*=1.-pulse*.13*(1.-trail);
    p.x+=sin(phase)*.14*pow(trail,1.35);
    p.z+=cos(phase*.88+.6)*.11*pow(trail,1.35);
    p.y+=sin(phase-1.3)*.065*trail;
  }
  return p;
}`;

/** Close a curved membrane into a thin volume, including its lip and curled edges. */
export function jellyVolume(
  sheet: THREE.BufferGeometry,
  rows: number,
  columns: number,
  thickness: number,
  seam = false,
) {
  const count = sheet.getAttribute('position').count;
  const result = new THREE.BufferGeometry();
  const normal = sheet.getAttribute('normal');
  for (const [name, attribute] of Object.entries(sheet.attributes)) {
    const values = new Float32Array(count * attribute.itemSize * 2);
    values.set(attribute.array);
    values.set(attribute.array, count * attribute.itemSize);
    if (name === 'position') {
      for (let i = 0; i < count; i++) {
        for (let axis = 0; axis < 3; axis++) {
          values[(i + count) * 3 + axis] -= normal.array[i * 3 + axis] * thickness;
        }
      }
    }
    result.setAttribute(name, new THREE.BufferAttribute(values, attribute.itemSize));
  }
  const front = Array.from(sheet.index!.array);
  const indices = [...front];
  for (let i = 0; i < front.length; i += 3)
    indices.push(front[i] + count, front[i + 2] + count, front[i + 1] + count);
  const edge = (a: number, b: number) => {
    indices.push(a, a + count, b, b, a + count, b + count);
  };
  for (let i = 0; i < columns; i++) {
    edge(i, i + 1);
    const end = rows * (columns + 1);
    edge(end + i + 1, end + i);
  }
  for (let j = 0; j < rows; j++) {
    const a = j * (columns + 1),
      b = a + columns + 1;
    edge(b, a);
    edge(a + columns, b + columns);
  }
  result.setIndex(indices);
  result.computeVertexNormals();
  if (seam) {
    const normals = result.getAttribute('normal');
    for (const layer of [0, count])
      for (let row = 0; row <= rows; row++) {
        const first = layer + row * (columns + 1),
          last = first + columns;
        const n = new THREE.Vector3()
          .fromBufferAttribute(normals, first)
          .add(new THREE.Vector3().fromBufferAttribute(normals, last))
          .normalize();
        normals.setXYZ(first, n.x, n.y, n.z);
        normals.setXYZ(last, n.x, n.y, n.z);
      }
  }
  result.computeBoundingSphere();
  if (result.boundingSphere) result.boundingSphere.radius += 0.25;
  sheet.dispose();
  return result;
}

/** Small coloured studio reflections, private to the jellyfish, drawn once at construction. */
function reflectionMap(w: Workshop) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#132238';
  ctx.fillRect(0, 0, 512, 256);
  const wash = ctx.createLinearGradient(0, 0, 0, 256);
  wash.addColorStop(0, '#70a1b6');
  wash.addColorStop(0.48, '#254e65');
  wash.addColorStop(1, '#14283e');
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, 512, 256);
  for (const [x, y, width, height, color] of [
    [45, 22, 28, 100, '#8bd1ed'],
    [130, 50, 85, 30, '#69b6d8'],
    [325, 38, 24, 124, '#cf89bc'],
    [407, 62, 65, 22, '#68beca'],
  ] as const) {
    const fade = ctx.createLinearGradient(x, y, x + width, y);
    fade.addColorStop(0, '#122336');
    fade.addColorStop(0.18, color);
    fade.addColorStop(0.82, color);
    fade.addColorStop(1, '#122336');
    ctx.fillStyle = fade;
    ctx.fillRect(x, y, width, height);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.mapping = THREE.EquirectangularReflectionMapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  w.textures.add(texture);
  return texture;
}

export function jellyfishGlass(
  w: Workshop,
  time: { value: number },
  active: { value: number },
  texture: THREE.Texture,
  ready: { value: number },
) {
  const environment = reflectionMap(w);
  const dataMap = (name: string) => {
    const data: THREE.Texture<HTMLImageElement | HTMLCanvasElement> = w.loadTexture(
      `${import.meta.env.BASE_URL}assets/juan-world/${name}`,
      () => {},
      name.includes('normal') ? '#8080ff' : '#ffb34d',
    );
    data.colorSpace = THREE.NoColorSpace;
    data.anisotropy = 8;
    data.wrapS = THREE.RepeatWrapping;
    return data;
  };
  const normal = dataMap('jellyfish-normal-v2.png'),
    optics = dataMap('jellyfish-optics-v2.png');
  return (part: number) => {
    const bell = part === 0,
      core = part === 4,
      frill = part === 5;
    const material = new THREE.MeshPhysicalMaterial({
      color: core ? '#e8b583' : bell ? '#effbfc' : '#edf4f7',
      vertexColors: true,
      metalness: 0,
      roughness: core ? 0.48 : 0.24,
      roughnessMap: optics,
      normalMap: bell ? null : normal,
      normalScale: new THREE.Vector2(bell ? 0.065 : 0.16, bell ? 0.065 : 0.16),
      transmission: bell ? 0.84 : core ? 0 : part === 1 ? 0.72 : part === 2 ? 0.75 : 0.78,
      transmissionMap: core ? null : optics,
      thickness: bell ? 0.11 : part === 2 ? 0.035 : 0.018,
      thicknessMap: core ? null : optics,
      ior: 1.335,
      dispersion: bell ? 0.05 : 0,
      attenuationColor: bell ? '#9edee6' : '#d9ecf3',
      attenuationDistance: 2.6,
      opacity: 1,
      transparent: false,
      depthWrite: true,
      side: THREE.FrontSide,
      clearcoat: core ? 0.3 : 0.65,
      clearcoatRoughness: 0.16,
      specularIntensity: core ? 0.3 : 0.7,
      specularColor: frill ? '#f3d0ed' : core ? '#f3d2bd' : '#bdeaf0',
      envMap: environment,
      envMapIntensity: 0.9,
      emissive: frill ? '#b948a4' : core ? '#efa86d' : '#39b6c5',
      emissiveIntensity: frill ? 0.4 : core ? 0.24 : bell ? 0.15 : 0.22,
    });
    material.userData.fixedReference = true;
    material.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, {
        jellyTime: time,
        jellyActive: active,
        jellyPart: { value: part },
        jellyTissue: { value: texture },
        jellyTextureReady: ready,
        jellyOptics: { value: optics },
      });
      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          `#include <common>
        uniform float jellyTime,jellyPart;
        attribute vec2 paint; varying vec2 tissuePaint;
        ${JELLY_DEFORM}`,
        )
        .replace(
          '#include <beginnormal_vertex>',
          `#include <beginnormal_vertex>
          vec3 jn=length(normal)>.001?normalize(normal):vec3(0.,1.,0.);
          vec3 jt=normalize(cross(abs(jn.y)<.9?vec3(0.,1.,0.):vec3(1.,0.,0.),jn));
          vec3 jb=cross(jn,jt);
          vec3 dx=jellyDeform(position+jt*.001)-jellyDeform(position-jt*.001);
          vec3 dy=jellyDeform(position+jb*.001)-jellyDeform(position-jb*.001);
          objectNormal=normalize(cross(dx,dy));`,
        )
        .replace(
          '#include <begin_vertex>',
          'vec3 transformed=jellyDeform(position); tissuePaint=paint;',
        )
        .replace(
          '#include <uv_vertex>',
          `#include <uv_vertex>
          #ifdef USE_NORMALMAP
          vNormalMapUv=paint;
          #endif
          #ifdef USE_ROUGHNESSMAP
          vRoughnessMapUv=paint;
          #endif
          #ifdef USE_TRANSMISSIONMAP
          vTransmissionMapUv=paint;
          #endif
          #ifdef USE_THICKNESSMAP
          vThicknessMapUv=paint;
          #endif`,
        );
      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>
        uniform float jellyPart,jellyActive,jellyTextureReady; uniform sampler2D jellyTissue,jellyOptics;
        varying vec2 tissuePaint;`,
        )
        .replace(
          '#include <color_fragment>',
          `#include <color_fragment>
          vec3 tissue=texture2D(jellyTissue,tissuePaint).rgb;
          float uvSeam=jellyPart<1.5||jellyPart>4.5?pow(abs(tissuePaint.x*2.-1.),24.):0.;
          tissue=mix(tissue,texture2D(jellyTissue,vec2(.5,tissuePaint.y)).rgb,uvSeam);
          float amount=jellyPart<.5?.18:jellyPart<1.5?.35:jellyPart<3.5?.5:jellyPart<4.5?.12:.2;
          diffuseColor.rgb=mix(diffuseColor.rgb,tissue,amount*jellyTextureReady);`,
        )
        .replace(
          '#include <emissivemap_fragment>',
          `#include <emissivemap_fragment>
          float crystalEdge=pow(clamp(1.-abs(dot(normal,normalize(vViewPosition))),0.,1.),2.6);
          float vein=smoothstep(.42,.84,texture2D(jellyOptics,tissuePaint).b);
          float softBack=pow(max(0.,dot(-normal,normalize(vec3(-.45,.55,.5)))),3.);
          vec3 edgeTint=jellyPart>4.5?vec3(.38,.035,.24):vec3(.026,.3,.36);
          float innerVein=jellyPart<.5?smoothstep(.55,.96,tissuePaint.y)*.14:jellyPart<1.5?.45:.14;
          totalEmissiveRadiance+=edgeTint*(crystalEdge*.38+vein*innerVein);
          totalEmissiveRadiance+=diffuseColor.rgb*softBack*.07;
          totalEmissiveRadiance*=1.+jellyActive*.12;`,
        );
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <transmission_fragment>',
        THREE.ShaderChunk.transmission_fragment.replace(
          'texture2D( thicknessMap, vThicknessMapUv ).g',
          'texture2D( thicknessMap, vThicknessMapUv ).b',
        ),
      );
    };
    material.customProgramCacheKey = () => 'jelly-organic-gel-v4';
    w.materials.set(`mail-crystal:${part}`, material);
    return material;
  };
}
