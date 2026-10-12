import * as THREE from 'three';

/** Local, depth-tested holograms. They share the world's clock and reduced-motion policy. */
export function hologram(color: string, opacity = 0.35) {
  const material = new THREE.ShaderMaterial({
    uniforms: {
      tint: { value: new THREE.Color(color) },
      time: { value: 0 },
      opacity: { value: opacity },
    },
    vertexShader: `varying vec3 point; varying vec3 facing;
      void main(){ point=position; facing=normalize(normalMatrix*normal);
      gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `uniform vec3 tint; uniform float time; uniform float opacity;
      varying vec3 point; varying vec3 facing;
      void main(){ float lines=.45+.55*pow(clamp(.5+.5*sin((point.y+point.z)*100.-time*3.),0.,1.),6.);
      float edge=pow(clamp(1.-abs(facing.z),0.,1.),2.);
      gl_FragColor=vec4(tint*(1.25+edge),opacity*(lines+edge*.3)); }`,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });
  return {
    material,
    update: (time: number) => {
      material.uniforms.time.value = time;
    },
  };
}

export function radar(parent: THREE.Object3D) {
  const material = new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 } },
    vertexShader: `varying vec2 point; void main(){point=position.xy; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `uniform float time; varying vec2 point;
      void main(){float r=length(point); float a=mod(atan(point.y,point.x)-time*.65+6.283185,6.283185);
      float sweep=exp(-a*5.); float grid=pow(clamp(.5+.5*cos(r*42.),0.,1.),20.)*.12;
      float cross=(step(abs(point.x),.004)+step(abs(point.y),.004))*.08;
      gl_FragColor=vec4(vec3(.16,1.,.58)*(1.+sweep),(.07+grid+cross+sweep*.65)*(1.-smoothstep(.68,.74,r))); }`,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });
  const disc = new THREE.Mesh(new THREE.CircleGeometry(0.74, 48), material);
  disc.rotation.x = -Math.PI / 2;
  disc.position.y = 1.49;
  disc.userData.keep = true;
  parent.add(disc);
  return (time: number) => {
    material.uniforms.time.value = time;
  };
}

type ParticleKind = 'data' | 'weld' | 'exhaust' | 'ride';
/** Compact GPU particle systems, one draw call each; no animation allocations. */
export function particles(
  parent: THREE.Object3D,
  kind: ParticleKind,
  origin = new THREE.Vector3(),
) {
  const count = kind === 'ride' ? 72 : 32;
  const geometry = new THREE.BufferGeometry();
  const seeds = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    seeds[i * 3] = i / count;
    seeds[i * 3 + 1] = ((i * 17) % 31) / 31;
    seeds[i * 3 + 2] = ((i * 13) % 29) / 29;
  }
  geometry.setAttribute('position', new THREE.BufferAttribute(seeds, 3));
  const mode = ['data', 'weld', 'exhaust', 'ride'].indexOf(kind);
  const colors = ['#c081ff', '#ff9b38', '#51cfff', '#ff4bbb'];
  const material = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      mode: { value: mode },
      tint: { value: new THREE.Color(colors[mode]) },
      strength: { value: 1 },
    },
    vertexShader: `uniform float time; uniform int mode; varying float fade; varying float hue;
      void main(){float seed=position.x; float life=fract(seed+time*.6); vec3 p; hue=seed;
      if(mode==0){float a=seed*18.85+time*.55; p=vec3(cos(a)*.44,.28+life*1.2,sin(a)*.44); fade=sin(life*3.14159);}
      else if(mode==1){float a=position.y*6.283185; p=vec3(cos(a)*life*.28,-life*life*.48,sin(a)*life*.28); fade=(1.-life)*step(.3,sin(time*1.8))*step(.001,time);}
      else if(mode==2){p=vec3(-life*.85,cos(position.y*6.283185)*(.035+life*.11),sin(position.y*6.283185)*(.035+life*.11));fade=1.-life;}
      else {float a=seed*6.283185; p=vec3(cos(a)*1.025,sin(a)*.34,sin(a)*.95); fade=.18+.82*pow(clamp(.5+.5*cos(a-time*1.6),0.,1.),8.);}
      vec4 view=modelViewMatrix*vec4(p,1.); gl_Position=projectionMatrix*view;
      gl_PointSize=min(9.,(mode==1?65.:45.)/max(1.,-view.z)); }`,
    fragmentShader: `uniform vec3 tint; uniform int mode; uniform float strength; varying float fade; varying float hue;
      void main(){float d=length(gl_PointCoord-.5); if(d>.5)discard;
      vec3 color=mode==3 ? .55+.45*cos(6.283185*(hue+vec3(0.,.33,.67))) : tint;
      gl_FragColor=vec4(color*2.3,pow(max(0.,1.-d*2.),1.5)*fade*strength); }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const points = new THREE.Points(geometry, material);
  points.position.copy(origin);
  // Shader positions differ from the seed buffer; avoid seed-based culling and point picking.
  points.frustumCulled = false;
  points.raycast = () => {};
  parent.add(points);
  return (time: number, strength = 1) => {
    material.uniforms.time.value = time;
    material.uniforms.strength.value = strength;
  };
}

/** A short, local energy flow along a real charging connection. */
export function chargeStream(parent: THREE.Object3D, from: THREE.Vector3, to: THREE.Vector3) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(
      Array.from({ length: 24 }, (_, i) => [i / 24, (i * 0.618) % 1, 0]).flat(),
      3,
    ),
  );
  const material = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      from: { value: from },
      to: { value: to },
      tint: { value: new THREE.Color('#4de6b3') },
    },
    vertexShader: `uniform float time;uniform vec3 from;uniform vec3 to;varying float fade;
      void main(){float t=fract(position.x+time*.38);vec3 p=mix(from,to,t);
      p.y+=sin(t*3.14159)*.08;fade=.25+.75*sin(t*3.14159);
      vec4 v=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*v;gl_PointSize=min(7.,40./max(1.,-v.z));}`,
    fragmentShader: `uniform vec3 tint;varying float fade;void main(){float r=length(gl_PointCoord-.5);if(r>.5)discard;
      gl_FragColor=vec4(tint,pow(max(0.,1.-r*2.),1.4)*fade*.75);}`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  points.raycast = () => {};
  parent.add(points);
  return (time: number) => {
    material.uniforms.time.value = time;
  };
}

/** Four stronger fading broadcast arcs; time is supplied by the scene, with no private timer. */
export function signalWaves(parent: THREE.Object3D, origin: THREE.Vector3) {
  const group = new THREE.Group();
  group.position.copy(origin);
  group.userData.keep = true;
  parent.add(group);
  const geometry = new THREE.TorusGeometry(0.36, 0.019, 8, 40, Math.PI * 1.25);
  const waves = Array.from({ length: 4 }, () => {
    const wave = new THREE.Mesh(
      geometry,
      new THREE.MeshBasicMaterial({
        color: '#63cbe4',
        transparent: true,
        opacity: 0.25,
        depthWrite: false,
      }),
    );
    wave.rotation.z = -Math.PI * 0.125;
    wave.raycast = () => {};
    group.add(wave);
    return wave;
  });
  return (time: number, active = false) => {
    waves.forEach((wave, i) => {
      const phase = (time * 0.4 + i / 4) % 1;
      wave.scale.setScalar(0.5 + phase * 2.2);
      wave.position.y = phase * 0.18;
      wave.material.opacity = (0.4 + (active ? 0.24 : 0)) * (1 - phase);
    });
  };
}

/** Camera-facing electrical ribbons run from the glass interior towards ship-mounted receivers. */
export function inductionArcs(
  parent: THREE.Object3D,
  sources: THREE.Vector3[],
  targets: THREE.Vector3[],
) {
  const positions: number[] = [],
    indices: number[] = [];
  const segments = 40;
  for (let arc = 0; arc < sources.length; arc++) {
    const offset = positions.length / 3;
    for (let i = 0; i <= segments; i++)
      for (const side of [-1, 1]) positions.push(i / segments, side, arc);
    for (let i = 0; i < segments; i++) {
      const n = offset + i * 2;
      indices.push(n, n + 1, n + 2, n + 1, n + 3, n + 2);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  const material = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      sources: { value: sources },
      targets: { value: targets },
      tint: { value: new THREE.Color('#5accff') },
    },
    vertexShader: `uniform float time;uniform vec3 sources[4];uniform vec3 targets[4];
      varying float progress;varying float across;varying float path;
      void main(){int id=int(position.z);float t=position.x;progress=t;across=position.y;path=position.z;
      vec3 start=sources[id],end=targets[id];vec3 p=mix(start,end,t);
      float bend=sin(t*3.14159);float tick=floor(time*9.);
      p+=vec3(sin(t*73.+tick+path*2.)*.03,bend*.075,cos(t*61.+tick+path)*.025)*bend;
      vec4 view=modelViewMatrix*vec4(p,1.);
      vec3 direction=(modelViewMatrix*vec4(end-start,0.)).xyz;
      vec2 normal=normalize(vec2(-direction.y,direction.x));view.xy+=normal*across*.018;
      gl_Position=projectionMatrix*view;}`,
    fragmentShader: `uniform float time;uniform vec3 tint;varying float progress;varying float across;varying float path;
      void main(){float packet=pow(clamp(.5+.5*cos((progress-time*.55+path*.21)*18.85),0.,1.),12.);
      // Interpolation can overshoot the ribbon edge; fractional pow needs a nonnegative base.
      float edge=pow(clamp(1.-abs(across),0.,1.),.7);float alpha=(.26+.6*packet)*edge;
      gl_FragColor=vec4(tint*(1.+packet*.35),alpha);}`,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.userData.keep = true;
  mesh.frustumCulled = false;
  mesh.raycast = () => {};
  parent.add(mesh);
  return (time: number) => {
    material.uniforms.time.value = time;
  };
}

/** Continuous plasma jets with a hot inner core and a moving, tapered outer plume. */
export function enginePlume(parent: THREE.Object3D, origin: THREE.Vector3) {
  const group = new THREE.Group();
  group.userData.keep = true;
  group.position.copy(origin);
  parent.add(group);
  const geometry = new THREE.ConeGeometry(0.115, 1.45, 18, 4, true)
    .rotateZ(Math.PI / 2)
    .translate(-0.725, 0, 0);
  const material = new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 }, tint: { value: new THREE.Color('#51cfff') } },
    vertexShader: `uniform float time;varying float progress;
      void main(){progress=clamp(-position.x/1.45,0.,1.);vec3 p=position;
      p.yz*=.91+.09*sin(position.x*24.+time*12.);
      gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,
    fragmentShader: `uniform float time;uniform vec3 tint;varying float progress;
      void main(){float bands=.72+.28*sin(progress*33.-time*9.);
      vec3 color=mix(tint,tint*vec3(.4,.35,.8),progress);
      gl_FragColor=vec4(color*1.5,pow(clamp(1.-progress,0.,1.),1.3)*bands*.64);}`,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });
  for (const scale of [1, 0.52]) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.scale.set(scale, scale, scale);
    mesh.raycast = () => {};
    group.add(mesh);
  }
  return (time: number) => {
    material.uniforms.time.value = time;
  };
}
