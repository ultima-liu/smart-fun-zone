import * as THREE from 'three';
import type { Model, Workshop } from './models';

const vertex = `varying vec2 point;
void main(){point=position.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;

// Analytic rings remain sharp at both the default world view and Pad close-up.
const fragment = `
uniform float radarTime, radarActive, radarHover;
varying vec2 point;
const float TAU=6.28318530718;
float band(float r,float center,float width,float aa){
  return 1.-smoothstep(width,width+aa,abs(r-center));
}
float arc(float angle,float count,float length){
  float phase=fract(angle/TAU*count);
  return smoothstep(.015,.04,phase)*(1.-smoothstep(length-.025,length,phase));
}
void main(){
  float r=length(point), a=atan(point.y,point.x);
  float aa=max(fwidth(r),.0012);
  float face=1.-smoothstep(.718,.725,r);
  float scanAngle=-radarTime*TAU/4.8;
  float age=mod(a-scanAngle+TAU*8.,TAU);
  float trail=exp(-age*3.1)*face;
  float beam=exp(-age*150.)*face;
  float gridR=abs(fract(r/.105+.5)-.5)*.105;
  float rings=(1.-smoothstep(.001,.001+aa,gridR))*face;
  float gridA=abs(sin(a*12.))*r;
  float spokes=(1.-smoothstep(.001,.001+aa,gridA))*face;
  float cross=(1.-smoothstep(.0015,.0015+aa,min(abs(point.x),abs(point.y))))*face;
  float fineR=abs(fract(r/.02625+.5)-.5)*.02625;
  float microGrid=(1.-smoothstep(.00045,.00045+aa,fineR))*face;
  vec3 cyan=vec3(.015,.64,.86), ice=vec3(.65,.93,1.);
  vec3 color=vec3(.004,.035,.072)*face;
  color+=cyan*(rings*.14+microGrid*.035+spokes*.10+cross*.14+trail*.45+beam*.72);
  float alpha=face*.76;

  // Echoes stay at stable coordinates; each lights as the sweep passes and then decays.
  for(int i=0;i<13;i++){
    float seed=float(i);
    float angle=seed*2.399963+.42;
    float distance=.19+fract(seed*.371+.17)*.46;
    vec2 center=vec2(cos(angle),sin(angle))*distance;
    float d=length(point-center);
    float echoAge=mod(angle-scanAngle+TAU*8.,TAU);
    float echo=.12+.88*exp(-echoAge*1.1);
    float radius=.012+fract(seed*.27)*.012;
    float core=1.-smoothstep(radius,radius+aa,d);
    float bloom=exp(-d*d/ .0012)*.3;
    color+=cyan*(core+bloom)*echo*(1.1+radarActive*.35);
    alpha=max(alpha,(core+bloom)*echo);
    float ping=echoAge*.11;
    float ripple=band(d,radius+ping,.0013,aa)*exp(-echoAge*3.);
    color+=cyan*ripple*.4;
  }

  float inner=band(r,.575,.003,aa)+band(r,.602,.002,aa);
  float fine=band(r,.738,.0015,aa)+band(r,.872,.0018,aa)+band(r,.916,.0013,aa);
  float bright=band(r,.788,.009,aa)*arc(a+radarTime*.12,4.,.76);
  bright+=band(r,.836,.004,aa)*arc(a-radarTime*.085+.4,3.,.88);
  bright+=band(r,.635,.012,aa)*arc(a+radarTime*.18+1.7,5.,.17);
  float ticks=band(r,.964,.018,aa)*arc(a,120.,.25);
  float majorTicks=band(r,.941,.022,aa)*arc(a+.015,12.,.055);
  float outer=band(r,1.012,.01,aa)*arc(a+.15,4.,.8);
  float telemetry=band(r,.895,.003,aa)*arc(a,72.,.08);
  color+=cyan*(inner*.8+fine*.48+ticks*.4+majorTicks*.55+outer*.45+telemetry*.35);
  color+=ice*bright*1.15;
  float detail=max(max(inner,fine),max(max(bright,ticks),max(majorTicks,outer)));
  alpha=max(alpha,clamp(detail,0.,1.));
  float haloDistance=(r-.8)/.14;
  float halo=exp(-haloDistance*haloDistance)*.06;
  color+=cyan*halo;
  alpha=max(alpha,halo);
  color*=1.+radarHover*.12+radarActive*.08;
  gl_FragColor=vec4(color,clamp(alpha,0.,1.));
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

/** A suspended layered radar display driven exclusively by the world's clock. */
export function createRadarMail(
  w: Workshop,
  courier: THREE.Group,
  envelope: THREE.Group,
): Model & { courier: THREE.Group; envelope: THREE.Group; glow: THREE.Mesh } {
  const root = new THREE.Group();
  root.scale.setScalar(0.82);
  root.userData.point = 'mail';
  const display = new THREE.Group();
  root.add(display, courier);
  const time = { value: 0 },
    active = { value: 0 },
    hover = { value: 0 };
  const material = new THREE.ShaderMaterial({
    uniforms: { radarTime: time, radarActive: active, radarHover: hover },
    vertexShader: vertex,
    fragmentShader: fragment,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  material.userData.fixedReference = true;
  w.effects.add(material);
  const glow = new THREE.Mesh(
    w.geometry('mail-radar:face', () => new THREE.CircleGeometry(1.08, 128)),
    material,
  );
  glow.userData.keep = true;
  display.add(glow);

  // Narrow dark-blue rims give the hologram depth without a platform or opaque panel.
  const rim = new THREE.MeshStandardMaterial({
    color: '#174a65',
    metalness: 0.7,
    roughness: 0.28,
    emissive: '#064866',
    emissiveIntensity: 0.22,
  });
  rim.userData.fixedReference = true;
  w.effects.add(rim);
  for (const [radius, z] of [
    [0.875, -0.032],
    [0.916, -0.075],
  ] as const) {
    const ring = new THREE.Mesh(
      w.geometry(`mail-radar:rim:${radius}`, () => new THREE.TorusGeometry(radius, 0.009, 8, 128)),
      rim,
    );
    ring.position.z = z;
    display.add(ring);
  }

  envelope.scale.setScalar(0.48);
  envelope.position.set(0.66, -0.59, 0.085);
  display.add(envelope);
  return {
    root,
    courier,
    envelope,
    glow,
    anchor: new THREE.Vector3(-0.45, 0.9, 0.06),
    animate(t, h, hasMail) {
      time.value = t;
      active.value = hasMail ? 1 : 0;
      hover.value = h;
      display.position.y = Math.sin(t * 0.6) * 0.025;
      envelope.visible = hasMail;
    },
  };
}
