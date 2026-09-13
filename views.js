import * as T from 'three';
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t)};
// Depth-reprojected perspectives preserve the actual supplied visual details.
// They complement the continuous exterior mesh; they are not measured scans.
export const VIEWS=[
 {name:'aerial',start:0,end:.08,aspect:1504/1046,kind:'aerial',shift:[.7,-.35,1.2]},
 {name:'front',start:.095,end:.178,aspect:1983/793,kind:'front',shift:[.65,.02,.65]},
 {name:'left',start:.178,end:.224,aspect:1672/941,kind:'left',shift:[.45,.03,.5]},
 {name:'parking',start:.24,end:.31,aspect:1504/1046,kind:'parking',shift:[.7,.03,.55]},
 {name:'court',start:.397,end:.48,aspect:1983/793,kind:'court',shift:[.35,.01,.6]},
 {name:'rear',start:.61,end:.70,aspect:1983/793,kind:'rear',shift:[.55,.02,.5]},
 {name:'aerial',start:.932,end:1.001,aspect:1504/1046,kind:'aerial',shift:[-.45,.2,-.5]}
];
function boxMask(u,v,x1,x2,y1,y2,soft=.018){return smooth(x1-soft,x1+soft,u)*(1-smooth(x2-soft,x2+soft,u))*smooth(y1-soft,y1+soft,v)*(1-smooth(y2-soft,y2+soft,v));}
function depthAt(u,v,kind){
 if(kind==='aerial'){
  let d=58-20*v;
  for(const r of [[.16,.40,.32,.54],[.18,.4,.51,.79],[.41,.61,.27,.5],[.59,.79,.05,.42],[.74,.94,.35,.64]])d-=boxMask(u,v,...r,.025)*6;
  return d;
 }
 let d=v<.38?105:Math.min(105,8.5/Math.max(.075,v-.34));
 const planes={front:[[.05,.29,.33,.64,39],[.14,.37,.25,.55,54],[.38,.58,.26,.54,55],[.57,.78,.21,.53,58],[.69,.94,.34,.65,40]],court:[[0,.28,0,.64,19],[.27,.36,.19,.54,34],[.39,.67,.24,.63,46],[.69,.79,.19,.6,32],[.78,1,0,.71,18]],rear:[[.05,.25,.29,.62,38],[.26,.42,.3,.59,44],[.44,.65,.25,.66,40],[.67,.79,.28,.62,48],[.77,.96,.24,.62,38]],left:[[.06,.19,.20,.63,30],[.18,.51,.23,.61,28],[.49,.62,.27,.5,46],[.61,.77,.25,.5,53],[.74,.97,.34,.58,60]],parking:[[.02,.25,.16,.64,27],[.24,.53,.17,.66,22],[.53,.68,.34,.61,40],[.71,.96,.38,.62,54]]};
 for(const [x1,x2,y1,y2,z] of planes[kind]||[])d=T.MathUtils.lerp(d,z,boxMask(u,v,x1,x2,y1,y2));
 return d;
}
export function buildPhotoView(view,texture){
 const nx=156,ny=96,g=new T.PlaneGeometry(2,2,nx,ny),a=g.attributes.position,uv=g.attributes.uv;
 const tang=Math.tan(T.MathUtils.degToRad(50)/2);
 for(let i=0;i<a.count;i++){const u=uv.getX(i),v=1-uv.getY(i),d=depthAt(u,v,view.kind);a.setXYZ(i,(u*2-1)*tang*view.aspect*d,(1-v*2)*tang*d,-d)}
 g.computeVertexNormals();g.computeBoundingSphere();
 const material=new T.MeshBasicMaterial({map:texture,transparent:true,opacity:1,toneMapped:false,side:T.DoubleSide,depthTest:false,depthWrite:false});
 const mesh=new T.Mesh(g,material);mesh.frustumCulled=false;
 const scene=new T.Scene();scene.add(mesh);
 const camera=new T.PerspectiveCamera(50,view.aspect,.1,160);camera.lookAt(0,0,-50);
 return {scene,camera,material,view};
}
export function photoWeight(view,p){
 if(p<view.start||p>view.end)return 0;
 const fade=Math.min(.017,(view.end-view.start)*.22);
 return (view.start===0?1:smooth(view.start,view.start+fade,p))*(view.end>1?1:1-smooth(view.end-fade,view.end,p));
}
export function renderPhoto(renderer,photo,p,width,height,reduced){
 const {view,camera,material,scene}=photo;
 const t=clamp((p-view.start)/(view.end-view.start))-.5;
 material.opacity=photoWeight(view,p);
 const aspect=width/height;
 camera.aspect=aspect;
 camera.fov=aspect>view.aspect?T.MathUtils.radToDeg(2*Math.atan(Math.tan(T.MathUtils.degToRad(50)/2)*view.aspect/aspect)):50;
 camera.position.set(...view.shift.map(v=>v*t*(reduced?0:1)));
 camera.lookAt(0,0,-60);camera.updateProjectionMatrix();
 // A tiny overscan keeps displaced edges out of the viewport.
 camera.zoom=1.035;camera.updateProjectionMatrix();
 renderer.autoClear=false;renderer.clearDepth();renderer.render(scene,camera);renderer.autoClear=true;
}
