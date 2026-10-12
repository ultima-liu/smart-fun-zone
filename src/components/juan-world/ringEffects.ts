import * as THREE from 'three';

/** Physical debris and volumetric theme accents share the planet clock and transition weights. */
export function ringEffects(
  weights: { value: THREE.Vector4 },
  clock: { value: number },
  noise: string,
) {
  const root = new THREE.Group();
  const geometry = new THREE.IcosahedronGeometry(1, 1);
  const rockMaterial = new THREE.MeshStandardMaterial({
    color: '#a696bd',
    roughness: 0.94,
    metalness: 0,
    flatShading: true,
    transparent: true,
    depthWrite: false,
  });
  const iceMaterial = new THREE.MeshPhysicalMaterial({
    color: '#b5e4ef',
    roughness: 0.19,
    metalness: 0,
    transmission: 0.28,
    thickness: 0.055,
    transparent: true,
    opacity: 0.82,
    depthWrite: false,
    clearcoat: 0.38,
    specularIntensity: 0.4,
    envMapIntensity: 0.28,
    emissive: '#459cba',
    emissiveIntensity: 0.025,
    flatShading: true,
  });
  const rocks = new THREE.InstancedMesh(geometry, rockMaterial, 260);
  const ice = new THREE.InstancedMesh(new THREE.OctahedronGeometry(1, 0), iceMaterial, 320);
  const transform = new THREE.Object3D();
  for (const mesh of [rocks, ice]) {
    const frozen = mesh === ice;
    for (let i = 0; i < mesh.count; i++) {
      const angle = i * 2.39996,
        seed = ((i * 47 + 13) % 173) / 173;
      const radius = 3.65 + seed * 0.86;
      transform.position.set(
        Math.cos(angle) * radius,
        Math.sin(angle) * radius,
        Math.sin(i * 13.7) * (frozen ? 0.075 : 0.05),
      );
      transform.rotation.set(i * 0.71, i * 1.31, i * 0.43);
      const size = 0.012 + Math.pow(((i * 29) % 31) / 31, 2.4) * 0.052;
      transform.scale.set(
        size * (frozen ? 1.8 : 1.25),
        size * (frozen ? 0.35 : 0.66),
        size * (frozen ? 0.7 : 0.9),
      );
      transform.updateMatrix();
      mesh.setMatrixAt(i, transform.matrix);
      mesh.setColorAt(
        i,
        new THREE.Color(frozen ? '#d2f2ff' : '#b7a6cb').multiplyScalar(0.48 + seed * 0.52),
      );
    }
    root.add(mesh);
  }
  const flameMaterial = new THREE.ShaderMaterial({
    uniforms: { appearanceWeights: weights, worldTime: clock },
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    vertexShader: `uniform float worldTime;varying vec3 flamePoint;varying float reach;${noise}
      void main(){reach=(length(position.xy)-3.8)/1.25;flamePoint=position;vec3 p=position;
      float curl=worldNoise(vec3(normalize(position.xy)*8.,worldTime*.65));
      p.xy=normalize(p.xy)*(3.8+reach*(.4+curl*1.05));
      float twist=reach*.055*sin(worldTime*1.7+curl*9.);
      p.xy=mat2(cos(twist),-sin(twist),sin(twist),cos(twist))*p.xy;
      flamePoint=p;
      gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,
    fragmentShader: `uniform vec4 appearanceWeights;uniform float worldTime;varying vec3 flamePoint;varying float reach;${noise}
      void main(){vec2 radial=normalize(flamePoint.xy);
      float flow=worldFbm(vec3(radial*32.,reach*4.-worldTime*.8));
      float a=atan(radial.y,radial.x);
      float wisps=pow(.5+.5*sin(a*180.+reach*14.+flow*9.-worldTime*.6),5.);
      float length=.2+.7*worldNoise(vec3(radial*15.,worldTime*.1));
      float fire=wisps*(1.-smoothstep(length-.08,length+.08,reach))*pow(max(0.,1.-reach),1.2)*smoothstep(0.,.06,reach);
      vec3 color=mix(vec3(1.,.47,.055),vec3(.85,.065,.006),reach);
      gl_FragColor=vec4(color*1.35,fire*appearanceWeights.w*.66);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      }`,
  });
  const flame = new THREE.Mesh(new THREE.RingGeometry(3.8, 5.05, 384, 24), flameMaterial);
  root.add(flame);
  const mistMaterial = new THREE.ShaderMaterial({
    uniforms: { appearanceWeights: weights, worldTime: clock },
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    vertexShader: `uniform float worldTime;varying vec3 mistPoint;varying vec3 mistNormal;varying vec3 mistView;${noise}
      void main(){mistPoint=position;mistNormal=normalMatrix*normal;vec3 q=position;
      q.xy*=1.+(worldNoise(vec3(normalize(q.xy)*7.,worldTime*.04))-.5)*.009;
      vec4 p=modelViewMatrix*vec4(q,1.);mistView=-p.xyz;gl_Position=projectionMatrix*p;}`,
    fragmentShader: `uniform vec4 appearanceWeights;uniform float worldTime;varying vec3 mistPoint;varying vec3 mistNormal;varying vec3 mistView;${noise}
      void main(){float banks=worldFbm(mistPoint*3.2+vec3(worldTime*.04,-worldTime*.02,0));
      float veil=smoothstep(.32,.66,banks)*pow(abs(dot(normalize(mistNormal),normalize(mistView))),.8);
      vec3 color=mix(vec3(.22,.13,.075),vec3(.62,.44,.29),banks);
      gl_FragColor=vec4(color,veil*appearanceWeights.y*.13);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      }`,
  });
  const mist = new THREE.Mesh(new THREE.TorusGeometry(4.03, 0.09, 8, 192), mistMaterial);
  mist.scale.z = 0.28;
  root.add(mist);
  return {
    root,
    update(time: number) {
      rocks.visible = weights.value.x > 0.001;
      rockMaterial.opacity = weights.value.x * 0.85;
      rocks.rotation.z = time * 0.022;
      ice.visible = weights.value.z > 0.001;
      iceMaterial.opacity = weights.value.z * 0.86;
      ice.rotation.z = -time * 0.016;
      flame.visible = weights.value.w > 0.001;
      mist.visible = weights.value.y > 0.001;
      mist.rotation.z = time * 0.012;
    },
  };
}
