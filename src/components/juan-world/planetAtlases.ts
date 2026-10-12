/** Fine albedo atlases are lit and given relief on the real sphere, never a planet billboard. */
export const PLANET_ATLASES = `
uniform sampler2D rockAtlas;uniform sampler2D iceAtlas;uniform sampler2D starAtlas;
uniform float rockAtlasReady;uniform float iceAtlasReady;uniform float starAtlasReady;
vec3 planetAtlas(sampler2D atlas,vec3 p,float drift){
 vec2 uv=vec2(fract(atan(p.z,p.x)/6.2831853+.5+drift),asin(clamp(p.y,-1.,1.))/3.14159265+.5);
 uv.y=clamp(uv.y,.002,.998);
 vec3 color=texture2D(atlas,uv).rgb;
 float seam=.5*(1.-smoothstep(0.,.018,min(uv.x,1.-uv.x)));
 return mix(color,texture2D(atlas,vec2(1.-uv.x,uv.y)).rgb,seam);
}
float atlasHeight(vec3 color){return dot(color,vec3(.2126,.7152,.0722));}
`;
