import * as THREE from 'three';

/** Reserve opaque image pixels in the composer alpha channel for original-colour output. */
export function preserveImageArt(material: THREE.MeshBasicMaterial) {
  material.transparent = false;
  material.alphaTest = Math.max(0.08, material.alphaTest);
  material.toneMapped = false;
  material.userData.originalImage = true;
  if (material.map) material.map.anisotropy = 8;
  material.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader
      .replace('texture2D( map, vMapUv )', 'texture2D( map, vMapUv, -0.35 )')
      .replace('#include <opaque_fragment>', '#include <opaque_fragment>\ngl_FragColor.a = 0.;');
  };
  material.customProgramCacheKey = () => 'original-image-colour-v1';
}
