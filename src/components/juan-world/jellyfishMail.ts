import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { Model, Workshop } from './models';
import { JELLY_DEFORM, jellyVolume, jellyfishGlass } from './jellyfishGlass';
import { sculptJellyfish } from './jellyfishSculpt';

// Only the fine peripheral hairs use alpha; the body is a closed optical gel volume.
const vertex = `
uniform float jellyTime, jellyPart;
varying vec2 tissueUv;
varying vec3 tissueColor;
${JELLY_DEFORM}
void main(){
  tissueUv=uv; tissueColor=color;
  gl_Position=projectionMatrix*modelViewMatrix*vec4(jellyDeform(position),1.);
}`;
const fragment = `
uniform float jellyTime,jellyActive;
varying vec2 tissueUv;
varying vec3 tissueColor;
void main(){
  float light=1.2+.2*sin(tissueUv.y*18.-jellyTime*1.5);
  gl_FragColor=vec4(tissueColor*light*(1.+jellyActive*.1),.8);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

/** Parametric jellyfish, with one scene clock driving contraction and delayed tissue motion. */
export function createJellyfishMail(
  w: Workshop,
  courier: THREE.Group,
  envelope: THREE.Group,
): Model & { courier: THREE.Group; envelope: THREE.Group; glow: THREE.Mesh } {
  const root = new THREE.Group();
  root.scale.setScalar(0.74);
  root.userData.point = 'mail';
  const organism = new THREE.Group();
  root.add(organism, courier);
  const time = { value: 0 },
    active = { value: 0 };
  const textureReady = { value: 0 };
  const texture = w.loadTexture(
    `${import.meta.env.BASE_URL}assets/juan-world/jellyfish-tissue-v2.webp`,
    () => {
      textureReady.value = 1;
    },
  );
  const glass = jellyfishGlass(w, time, active, texture, textureReady);
  const materials = Array.from({ length: 6 }, (_, part) => {
    if (part !== 3) return glass(part);
    const material = new THREE.ShaderMaterial({
      uniforms: {
        jellyTime: time,
        jellyActive: active,
        jellyPart: { value: part },
        jellyTissue: { value: texture },
        jellyTextureReady: textureReady,
      },
      vertexShader: vertex,
      fragmentShader: fragment,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    material.userData.fixedReference = true;
    w.effects.add(material);
    return material;
  });
  const cyan = new THREE.Color('#63f3ff'),
    pink = new THREE.Color('#fb60d9');
  const blue = new THREE.Color('#12bde8'),
    cream = new THREE.Color('#ffd77e');
  const palette = [cyan, pink, blue, cream];

  const surface = (
    name: string,
    rows: number,
    columns: number,
    part: number,
    point: (u: number, v: number) => THREE.Vector3,
    tint: (u: number, v: number) => THREE.Color,
    patch?: number,
    thickness = 0,
    seam = false,
  ) => {
    const geometry = w.geometry(`mail-jelly:${name}`, () => {
      const positions: number[] = [],
        colors: number[] = [],
        uvs: number[] = [],
        paintUvs: number[] = [],
        indices: number[] = [];
      for (let j = 0; j <= rows; j++) {
        for (let i = 0; i <= columns; i++) {
          const u = i / columns,
            v = j / rows;
          const p = point(u, v),
            c = tint(u, v);
          positions.push(p.x, p.y, p.z);
          colors.push(c.r, c.g, c.b);
          uvs.push(u, v);
          paintUvs.push(patch === undefined ? u : u * 0.16 + patch, v);
          if (i < columns && j < rows) {
            const a = j * (columns + 1) + i,
              b = a + columns + 1;
            indices.push(a, a + 1, b, b, a + 1, b + 1);
          }
        }
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      g.setAttribute('paint', new THREE.Float32BufferAttribute(paintUvs, 2));
      g.setIndex(indices);
      g.computeVertexNormals();
      if (seam) {
        // Join duplicated UV boundary normals without welding UVs or tissue coordinates.
        const normals = g.getAttribute('normal');
        for (let row = 0; row <= rows; row++) {
          const first = row * (columns + 1),
            last = first + columns;
          const n = new THREE.Vector3()
            .fromBufferAttribute(normals, first)
            .add(new THREE.Vector3().fromBufferAttribute(normals, last))
            .normalize();
          normals.setXYZ(first, n.x, n.y, n.z);
          normals.setXYZ(last, n.x, n.y, n.z);
        }
      }
      g.computeBoundingSphere();
      // Include the full envelope of vertex animation in culling and picking bounds.
      if (g.boundingSphere) g.boundingSphere.radius += 0.25;
      return thickness > 0 ? jellyVolume(g, rows, columns, thickness, seam) : g;
    });
    const mesh = new THREE.Mesh(geometry, materials[part]);
    mesh.userData.keep = true;
    organism.add(mesh);
    return mesh;
  };

  let glow = sculptJellyfish(surface);

  // GPU deformation uses organism coordinates, so matching tissues share a draw call.
  // Keep indexed geometry instead of issuing a draw for every fine tentacle.
  for (let part = 1; part < 6; part++) {
    const meshes = organism.children.filter(
      (node): node is THREE.Mesh => node instanceof THREE.Mesh && node.material === materials[part],
    );
    if (meshes.length < 2) continue;
    const geometry = mergeGeometries(
      meshes.map((mesh) => mesh.geometry),
      false,
    );
    if (!geometry) continue;
    w.merged.push(geometry);
    geometry.computeBoundingSphere();
    if (geometry.boundingSphere) geometry.boundingSphere.radius += 0.25;
    const mesh = new THREE.Mesh(geometry, materials[part]);
    meshes.forEach((node) => node.removeFromParent());
    organism.add(mesh);
    if (part === 4) glow = mesh;
  }

  // A small hovering letter is the functional mail cue; it never becomes the body of the animal.
  envelope.scale.setScalar(0.37);
  envelope.position.set(0.32, 0.3, 0.38);
  organism.add(envelope);

  // Sparse luminous plankton: a single draw call, with no extra animation loop.
  const motesGeometry = w.geometry('mail-jelly:motes', () => {
    const positions: number[] = [],
      colors: number[] = [];
    for (let i = 0; i < 32; i++) {
      const a = i * 2.399963,
        r = 0.55 + (i % 7) * 0.105;
      positions.push(Math.cos(a) * r, 1.05 - (i % 13) * 0.18, Math.sin(a) * r);
      const c = palette[i % 4];
      colors.push(c.r, c.g, c.b);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    return g;
  });
  const motesMaterial = new THREE.ShaderMaterial({
    uniforms: { jellyTime: time, jellyActive: active },
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    vertexShader: `uniform float jellyTime; varying vec3 glowColor;
      void main(){glowColor=color;vec3 p=position;p.x+=sin(jellyTime*.35+p.y*3.)*.06;
      p.y+=sin(jellyTime*.5+p.x*4.)*.055;vec4 vp=modelViewMatrix*vec4(p,1.);
      gl_Position=projectionMatrix*vp;gl_PointSize=clamp(13./-vp.z,1.,3.5);}`,
    fragmentShader: `uniform float jellyActive; varying vec3 glowColor;
      void main(){float r=length(gl_PointCoord-.5);float a=(1.-smoothstep(.05,.5,r))*.5;
      gl_FragColor=vec4(glowColor*(1.+jellyActive*.2),a);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      }`,
  });
  motesMaterial.userData.fixedReference = true;
  w.effects.add(motesMaterial);
  organism.add(new THREE.Points(motesGeometry, motesMaterial));

  return {
    root,
    courier,
    envelope,
    glow,
    anchor: new THREE.Vector3(0, -1.55, 0.35),
    animate(t, hover, hasMail) {
      time.value = t;
      active.value = hasMail ? 1 : hover * 0.45;
      organism.position.y = Math.sin(t * 1.025) * 0.045;
      organism.rotation.z = -0.075 + Math.sin(t * 0.48) * 0.022;
      envelope.visible = hasMail;
      envelope.rotation.y = Math.sin(t * 0.7) * 0.1;
    },
  };
}
