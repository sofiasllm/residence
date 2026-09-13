import * as T from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { buildWorld, BUILDINGS, footprint } from './world.js';
import { sampleTour, CHAPTERS, STOPS } from './tour.js';

const $=s=>document.querySelector(s),clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x));
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const small=matchMedia('(max-width: 700px)').matches;
const stage=$('.stage'),journey=$('#journey'),host=$('#scene'),status=$('#scene-status');
let renderer,scene,camera,world,ready=false,failed=false,desired=0,progress=0,raf=0,lastTime=0,lastChapter=-1,active=true,width=1,height=1,range=1;
const direction=new T.Vector3(),look=new T.Vector3();
const requestFrame=()=>{if(!raf&&!document.hidden)raf=requestAnimationFrame(frame)};
function readScroll(){range=Math.max(1,journey.offsetHeight-stage.offsetHeight);desired=clamp((window.scrollY-journey.offsetTop)/range);active=window.scrollY+window.innerHeight>journey.offsetTop&&window.scrollY<journey.offsetTop+journey.offsetHeight;requestFrame()}
function resize(){width=stage.clientWidth;height=stage.clientHeight;if(renderer){renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix()}readScroll()}
window.addEventListener('scroll',readScroll,{passive:true});
window.addEventListener('resize',resize,{passive:true});
window.addEventListener('pageshow',readScroll);
new ResizeObserver(resize).observe(stage);
document.addEventListener('visibilitychange',()=>{if(!document.hidden){lastTime=0;requestFrame()}});

function setupMap(){
 const ns='http://www.w3.org/2000/svg';
 for(const b of BUILDINGS){const n=document.createElementNS(ns,'path');n.setAttribute('class','map-block');n.setAttribute('d',footprint(b).map(([x,z],i)=>(i?'L':'M')+(b.x+x)+' '+(b.z+z)).join(' ')+'Z');$('#map-buildings').appendChild(n)}
 $('#map-route').setAttribute('d',STOPS.filter(v=>v.p[1]<20).map((v,i)=>(i?'L':'M')+v.p[0]+' '+v.p[2]).join(' '));
}
function updateCopy(p){
 let i=0;while(i<CHAPTERS.length-1&&p>=CHAPTERS[i+1].t)i++;
 const chapter=CHAPTERS[i],end=CHAPTERS[i+1]?.t??1.05;
 if(i!==lastChapter){
  $('#chapter-number').textContent=String(i+1).padStart(2,'0');$('#chapter-label').textContent=chapter.label;
  $('#story-eyebrow').textContent=chapter.eyebrow;$('#story-title').innerHTML=chapter.title;$('#story-description').textContent=chapter.description;
  $('#fact-value').textContent=chapter.value;$('#fact-unit').textContent=chapter.unit;$('#fact-caption').textContent=chapter.caption;
  lastChapter=i;
 }
 const edge=.009;const opacity=Math.min(i===0?1:clamp((p-chapter.t)/edge),clamp((end-p)/edge));
 $('#story-copy').style.opacity=opacity;$('#story-copy').style.transform=`translateY(${(1-opacity)*12}px)`;
 $('#scene-fact').style.opacity=opacity;
 $('#tour-position').style.opacity=p>.035&&p<.95&&ready?'.86':'0';
 $('#progress-fill').style.width=(p*100).toFixed(2)+'%';
 $('#progress-percent').innerHTML=String(Math.round(p*100)).padStart(2,'0')+' <span>/ 100</span>';
 $('#scroll-instruction').textContent=p>.96?'POURSUIVEZ POUR DÉCOUVRIR LE PROJET':p>.02?'DÉFILEZ À VOTRE RYTHME':'FAITES DÉFILER POUR ENTRER';
}
function updateCamera(p){
 const state=sampleTour(p);camera.position.fromArray(state.p);look.fromArray(state.look);
 // Wider portrait lens preserves a usable view while keeping the camera outside walls.
 camera.fov=width/height<.8?72:56;camera.lookAt(look);camera.updateProjectionMatrix();
 const x=clamp(camera.position.x,-87,87),z=clamp(camera.position.z,-61,57);
 camera.getWorldDirection(direction);
 $('#map-camera').setAttribute('cx',x.toFixed(2));$('#map-camera').setAttribute('cy',z.toFixed(2));
 $('#map-direction').setAttribute('transform',`translate(${x.toFixed(2)} ${z.toFixed(2)}) rotate(${T.MathUtils.radToDeg(Math.atan2(direction.x,-direction.z)).toFixed(2)})`);
}
function frame(time){
 raf=0;
 const dt=lastTime?Math.min((time-lastTime)/1000,.05):.016;lastTime=time;
 progress=reduced?desired:T.MathUtils.lerp(progress,desired,1-Math.exp(-dt*11));
 if(Math.abs(progress-desired)<.000005)progress=desired;
 updateCopy(progress);
 if(ready&&active){
  try{
   updateCamera(progress);
   renderer.render(scene,camera);
  }catch(error){showUnavailable(error)}
 }
 if(active&&progress!==desired)requestFrame();
}
function showUnavailable(error){
 console.warn('La visite 3D est indisponible.',error);
 failed=true;ready=false;host.style.opacity='0';document.body.classList.add('tour-unavailable');
 status.style.opacity='1';status.textContent='La visite 3D n’est pas disponible sur cet appareil. Rechargez la page avec l’accélération graphique activée. Les informations de la résidence restent accessibles en poursuivant le défilement.';
 readScroll();
}
async function loadTexture(loader,name){
 const url=`./assets/views/${name}.webp`;
 const texture=await loader.loadAsync(url);texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=Math.min(renderer.capabilities.getMaxAnisotropy(),8);return texture;
}
async function init(){
 resize();setupMap();updateCopy(desired);
 try{
  renderer=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,small?1.3:1.7));
  renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.92;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
  renderer.setSize(width,height,false);host.appendChild(renderer.domElement);
  renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();showUnavailable('Contexte graphique interrompu')});
  renderer.domElement.addEventListener('webglcontextrestored',()=>{status.textContent='Rechargez la page pour reprendre la visite 3D.'});
  scene=new T.Scene();scene.fog=new T.FogExp2('#beb28e',.0018);
  camera=new T.PerspectiveCamera(56,width/height,.15,1800);updateCamera(desired);
  const sky=new Sky();sky.scale.setScalar(1200);
  sky.material.uniforms.turbidity.value=7;sky.material.uniforms.rayleigh.value=1.1;
  sky.material.uniforms.mieCoefficient.value=.006;sky.material.uniforms.mieDirectionalG.value=.86;
  const sunPosition=new T.Vector3().setFromSphericalCoords(1,T.MathUtils.degToRad(82),T.MathUtils.degToRad(247));
  sky.material.uniforms.sunPosition.value.copy(sunPosition);scene.add(sky);
  scene.add(new T.HemisphereLight('#d8d4c5','#6a6345',1.7));
  const sun=new T.DirectionalLight('#ffce85',3.1);sun.position.set(-70,48,-65);sun.castShadow=true;
  sun.shadow.mapSize.set(small?1024:2048,small?1024:2048);Object.assign(sun.shadow.camera,{left:-118,right:118,top:118,bottom:-118,near:1,far:300});
  sun.shadow.bias=-.00015;sun.shadow.normalBias=.09;sun.shadow.radius=2;scene.add(sun);scene.add(sun.target);
  const loader=new T.TextureLoader();
  status.textContent='Les jardins et les façades prennent place…';
  await new Promise(resolve=>requestAnimationFrame(resolve));
  const materialNames=[['central','facade-central'],['wide','facade-wide'],['rear','facade-rear']];
  const materials=Object.fromEntries(await Promise.all(materialNames.map(async([key,name])=>[key,await loadTexture(loader,name)])));
  world=buildWorld(scene,materials);
  renderer.render(scene,camera);renderer.shadowMap.autoUpdate=false;
  ready=true;host.style.opacity='1';status.textContent='';status.style.opacity='0';readScroll();requestFrame();
 }catch(error){showUnavailable(error)}
}
init();
