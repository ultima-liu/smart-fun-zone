/** The color atlas supplies fine fluid detail; all lighting remains on the actual sphere. */
export const GAS_CLOUDS = `
uniform sampler2D gasAtlas;
uniform float gasAtlasReady;
vec4 gasClouds(vec3 p){
 float latitude=asin(clamp(p.y,-1.,1.));
 float longitude=atan(p.z,p.x);
 float flow=worldTime*(.0011+.00035*sin(latitude*7.));
 vec2 uv=vec2(fract(longitude/6.2831853+.5+flow),latitude/3.14159265+.5);
 float polarFade=1.-smoothstep(.78,.98,abs(p.y));
 float curl=worldNoise(p*12.+vec3(worldTime*.008,0.,0.))-.5;
 uv.y=clamp(uv.y+curl*.003*polarFade,.002,.998);
 vec3 atlas=texture2D(gasAtlas,uv).rgb;
 // Feather any remaining atlas edge mismatch across a narrow longitude strip.
 float seam=.5*(1.-smoothstep(0.,.018,min(uv.x,1.-uv.x)));
 atlas=mix(atlas,texture2D(gasAtlas,vec2(1.-uv.x,uv.y)).rgb,seam);
 float warp=worldFbm(p*6.+7.);
 float jets=.5+.5*sin(latitude*38.+warp*5.);
 vec3 fallback=mix(vec3(.075,.027,.018),vec3(.43,.21,.09),jets);
 vec3 color=mix(fallback,atlas,gasAtlasReady);
 float height=dot(color,vec3(.2126,.7152,.0722));
 return vec4(color,smoothstep(.035,.38,height));
}
`;
