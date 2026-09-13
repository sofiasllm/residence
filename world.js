import * as T from 'three';

// Approximate metres inferred from the supplied aerial image, never a survey.
export const BUILDINGS = [
  {x:-27,z:23,w:27,d:25,h:12.8,step:1.7},
  {x:-27,z:-10,w:32,d:17,h:12.8,step:0},
  {x:10,z:-10,w:31,d:18,h:12.8,step:0},
  {x:43,z:-23,w:27,d:36,h:12.8,step:1.5},
  {x:43,z:21,w:27,d:26,h:12.8,step:1.7}
];
export const BEDS = [
  {x:-7,z:6,w:6,d:7},{x:4,z:6,w:7,d:7},{x:16,z:6,w:7,d:7},{x:25,z:6,w:4,d:7}
];
export function footprint(b, extra=0) {
  const w=b.w/2+extra,d=b.d/2+extra,s=b.step;
  return s ? [[-w+s,-d],[w-s,-d],[w-s,-d+s],[w,-d+s],[w,d-s],[w-s,d-s],[w-s,d],[-w+s,d],[-w+s,d-s],[-w,d-s],[-w,-d+s],[-w+s,-d+s]] : [[-w,-d],[w,-d],[w,d],[-w,d]];
}

export function buildWorld(scene, textures = {}) {
  let seed=391027;
  const rnd=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
  const range=(a,b)=>a+(b-a)*rnd();
  const batches=new Map(),obstacles=[],resources=[];
  const unitBox=new T.BoxGeometry(1,1,1);
  const sphere=new T.SphereGeometry(1,12,9);
  const leafGeo=new T.IcosahedronGeometry(1,1);
  const cylinder=new T.CylinderGeometry(1,1,1,8);
  const ring=new T.TorusGeometry(1,.06,6,16);
  const std=(color,opts={})=>new T.MeshStandardMaterial({color,roughness:.78,...opts});
  const grain=(size,base,variance,tiles=1)=>{
    const data=new Uint8Array(size*size*4);
    for(let y=0;y<size;y++)for(let x=0;x<size;x++){
      const k=(y*size+x)*4;
      let v=base+(rnd()-.5)*variance;
      if(tiles>1&&((x%(size/tiles)<1)||(y%(size/tiles)<1)))v-=25;
      data[k]=data[k+1]=data[k+2]=v;data[k+3]=255;
    }
    const t=new T.DataTexture(data,size,size);t.wrapS=t.wrapT=T.RepeatWrapping;t.magFilter=T.LinearFilter;t.minFilter=T.LinearMipmapLinearFilter;t.generateMipmaps=true;t.needsUpdate=true;resources.push(t);return t;
  };
  const paving=grain(256,224,16,8);paving.repeat.set(12,10);
  const gravel=grain(128,224,46);gravel.repeat.set(7,7);
  const grassNoise=grain(128,221,53);grassNoise.repeat.set(30,30);
  const asphaltNoise=grain(128,213,39);asphaltNoise.repeat.set(15,5);
  const m={
    cream:std('#e1d1b9'),sand:std('#bc9a70'),stone:std('#d2cdbf'),roof:std('#c6c3b8',{map:gravel,roughness:1}),
    dark:std('#323c39',{metalness:.48,roughness:.42}),glass:std('#718680',{metalness:.78,roughness:.19,envMapIntensity:1.6}),
    balconyGlass:std('#59726a',{metalness:.5,roughness:.15,transparent:true,opacity:.48,depthWrite:false,side:T.DoubleSide}),
    interior:std('#e8cd9f',{emissive:'#d5a25c',emissiveIntensity:.22}),curtain:std('#e0d6bf',{roughness:1}),
    tile:std('#d4cbb8',{map:paving}),curb:std('#c9c5b5'),road:std('#454944',{map:asphaltNoise,roughness:1}),line:std('#e0ded0'),
    grass:std('#4c6340',{map:grassNoise,roughness:1}),soil:std('#665641'),wood:std('#8f7453'),trunk:std('#746a50'),
    leaves:std('#ffffff',{roughness:.92}),paint:std('#ffffff',{metalness:.48,roughness:.28}),rubber:std('#272b2b',{roughness:.98}),
    chrome:std('#aab4b0',{metalness:.85,roughness:.27}),lamp:std('#ffdf9e',{emissive:'#ffc67c',emissiveIntensity:2.2}),
    blue:std('#469bba',{metalness:.48,roughness:.4}),path:std('#dbc8a6',{roughness:.98}),rubberBlue:std('#83b8c2'),
    red:std('#8f3933',{emissive:'#ab3327',emissiveIntensity:.4})
  };
  const dummy=new T.Object3D(),col=new T.Color();
  function instance(geo,mat,x,y,z,sx=1,sy=1,sz=1,ry=0,color=null,rx=0,rz=0) {
    const key=geo.uuid+mat.uuid;
    if(!batches.has(key))batches.set(key,{geo,mat,rows:[]});
    batches.get(key).rows.push({x,y,z,sx,sy,sz,ry,rx,rz,color});
  }
  const box=(x,y,z,w,h,d,mat=m.cream,ry=0,color=null)=>instance(unitBox,mat,x,y,z,w,h,d,ry,color);
  const ball=(x,y,z,sx,sy,sz,color)=>instance(sphere,m.leaves,x,y,z,sx,sy,sz,rnd()*6.28,color);
  const pole=(x,y,z,r,h,mat=m.dark)=>instance(cylinder,mat,x,y,z,r,h,r);
  function bar(a,b,r,mat=m.dark) {
    const start=new T.Vector3(...a),end=new T.Vector3(...b),delta=end.clone().sub(start);
    dummy.position.copy(start).add(end).multiplyScalar(.5);dummy.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.clone().normalize());dummy.scale.set(r,delta.length(),r);dummy.updateMatrix();
    const key=cylinder.uuid+mat.uuid;
    if(!batches.has(key))batches.set(key,{geo:cylinder,mat,rows:[]});
    batches.get(key).rows.push({matrix:dummy.matrix.clone()});
  }
  function shapeMesh(points,h,y,mat,x=0,z=0){
    const shape=new T.Shape(points.map(([px,pz])=>new T.Vector2(px,-pz)));
    const geometry=new T.ExtrudeGeometry(shape,{depth:h,bevelEnabled:false,steps:1});geometry.rotateX(-Math.PI/2);
    const mesh=new T.Mesh(geometry,mat);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;scene.add(mesh);resources.push(geometry);return mesh;
  }

  // The two roads, left parking, rear ramp, and central forecourt follow the photo.
  box(0,-.5,0,900,1,900,m.grass);
  box(4,-.02,-1,164,.22,94,m.tile);
  for(const z of [-49,46]){
    box(0,.02,z,550,.12,9,m.road);
    for(let x=-250;x<251;x+=9)box(x,.091,z,4,.016,.13,m.line);
    for(const side of [-1,1])box(0,.12,z+side*5.2,550,.3,1.4,m.curb);
  }
  box(-59,.14,0,27,.06,79,m.road);
  box(6,.15,28,45,.07,13,m.road);
  box(-17,.13,-36.5,84,.05,8,m.road);
  box(-27,-.03,-29.5,35,.04,5.3,m.road);
  box(-27,.53,-32.2,35,1.1,.35,m.cream);box(-27,.53,-26.8,35,1.1,.35,m.cream);
  box(-44.5,.53,-29.5,.35,1.1,5.6,m.cream);
  for(let x=-43;x< -11;x+=6)box(x,.03,-29.5,3,.018,.12,m.line);
  // Ramp pitch is represented by a gently declining surface behind the left block.
  const ramp=new T.Mesh(new T.BoxGeometry(34,.15,5.1),m.road);ramp.position.set(-27,.2,-29.5);ramp.rotation.z=-.035;ramp.receiveShadow=true;scene.add(ramp);
  box(5,.23,13.1,49,.25,3.4,m.tile);
  box(-27,.23,4,36,.25,6,m.tile);
  box(10,.2,-.5,36,.2,4.7,m.tile);
  box(28,.23,6.5,3.2,.25,35,m.tile);
  for(let i=0;i<8;i++)box(-10.5,.19+i*.035,18+i*.35,3,.15,1,m.curb);
  for(let x=-12;x<30;x+=2.8)box(x,.197,25, .07,.014,6.2,m.line);
  for(let x=-64;x<=-52;x+=2.8)for(let z=-22;z<=35;z+=15)box(x,.182,z,.07,.014,5.1,m.line);
  for(let z=-14;z<37;z+=15){box(-59,.23,z,23,.4,2.4,m.curb);box(-59,.47,z,22.5,.08,2,m.soil);}
  box(-44.8,.34,0,.6,.6,80,m.curb);
  box(-44.8,.33,13,2.7,.18,53,m.tile);
  // Pedestrian entrance from the foreground road.
  for(let z=35;z<42;z+=1.4)box(-10,.2,z,3.1,.05,.62,m.line);
  for(let x=-35;x<59;x+=2.5){if(x>-13&&x<-7)continue;pole(x,.75,39.4,.036,1.4);box(x,.9,39.4,2.5,.04,.04,m.dark);box(x,.45,39.4,2.5,.04,.04,m.dark);}

  function tree(x,z,scale=1,flower=false){
    const h=4.3*scale;
    pole(x,h*.44,z,.12*scale,h*.85,m.trunk);
    for(let j=0;j<5;j++){
      const a=j*2.399;const bx=x+Math.cos(a)*.95*scale,bz=z+Math.sin(a)*.95*scale;
      bar([x,h*.5,z],[bx,h*.92,bz],.065*scale,m.trunk);
    }
    const palette=flower?['#a15b78','#cf81a3','#bb7396','#d491ad']:['#384c2f','#4e6038','#6b713b','#2a452e','#5b6332'];
    for(let j=0;j<18;j++){
      const a=rnd()*Math.PI*2,r=Math.sqrt(rnd())*1.6*scale;
      const y=h+range(-.4,.8)*scale;
      const bx=x+Math.cos(a)*r,bz=z+Math.sin(a)*r;
      ball(bx,y,bz,range(.45,.9)*scale,range(.45,.85)*scale,range(.45,.9)*scale,palette[Math.floor(rnd()*palette.length)]);
      for(let k=0;k<13;k++){
        const la=rnd()*Math.PI*2,lr=range(.4,1)*scale,sz=range(.13,.3)*scale;
        instance(leafGeo,m.leaves,bx+Math.cos(la)*lr,y+range(-.6,.8)*scale,bz+Math.sin(la)*lr,sz,sz*.45,sz,rnd()*6.28,palette[Math.floor(rnd()*palette.length)],rnd()*3,rnd()*3);
      }
    }
  }
  function shrub(x,z,s=1,flower=false,y=.45){
    for(let j=0;j<4;j++)ball(x+range(-.35,.35)*s,y+range(.1,.35)*s,z+range(-.35,.35)*s,.45*s,.36*s,.45*s,flower?['#ac658c','#bc7793','#c58aa3'][j%3]:['#526f48','#72824a','#8b9154'][j%3]);
  }
  function hedge(x,z,w,d){
    box(x,.15,z,w,.2,d,m.soil);
    const count=Math.ceil(w*d/1.1);
    for(let i=0;i<count;i++)shrub(x+range(-w/2,w/2),z+range(-d/2,d/2),.8);
  }
  const bedObstacles=[];
  for(const [i,b] of BEDS.entries()){
    box(b.x,.42,b.z,b.w,.65,b.d,m.curb);box(b.x,.77,b.z,b.w-.35,.1,b.d-.35,m.grass);
    tree(b.x,b.z,1.0+i*.04,i===0);
    for(let j=0;j<12;j++)shrub(b.x+range(-b.w/2+.6,b.w/2-.6),b.z+range(-b.d/2+.6,b.d/2-.6),.6,false,.8);
    bedObstacles.push({x:b.x,z:b.z,w:b.w,d:b.d,padding:.45});
  }
  for(let x=-72;x<79;x+=5.5){tree(x,-43,range(.68,.94));tree(x,54.5,range(.8,1.25));}
  for(let z=-33;z<38;z+=7){tree(-70,z,range(.65,.9));tree(-46,z,range(.65,.85));}
  for(let z=-14;z<38;z+=15)for(const x of [-66,-58,-51])tree(x,z,.72);
  for(let x=-67;x<80;x+=8){hedge(x,39.7,6.5,1.15);hedge(x,-43,5,1.4);}
  for(let x=-120;x<=120;x+=10){tree(x+range(-3,3),range(-76,-66),range(1.2,1.85));tree(x+range(-3,3),range(66,78),range(1.1,1.8));}
  for(let z=-64;z<=65;z+=9){tree(-90+range(-4,4),z,range(1.2,1.7));tree(94+range(-3,3),z,range(1.25,1.7));}

  // Facade materials retain the windows, stonework and planting in the supplied views.
  const photoMaterials = new Map();
  function facade(b,ox,oz,width,rot,balconies=true){
    const source = Math.abs(rot-Math.PI)<.01 ? 'rear' : (b.w>29 ? 'central' : 'wide');
    const texture = textures[source] || textures.central;
    if(texture){
      if(!photoMaterials.has(source)) photoMaterials.set(source,new T.MeshBasicMaterial({map:texture,color:'#f7eedf'}));
      const panel=new T.Mesh(new T.PlaneGeometry(width,b.h),photoMaterials.get(source));
      panel.position.set(ox+Math.sin(rot)*.061,b.h/2+.2,oz+Math.cos(rot)*.061);
      panel.rotation.y=rot;scene.add(panel);
    }
    const c=Math.cos(rot),sn=Math.sin(rot);
    const fbox=(u,y,v,w,h,d,mat)=>box(ox+c*u+sn*v,y,oz-sn*u+c*v,w,h,d,mat,rot);
    const bays=3,step=width/bays;
    if(balconies)for(let bay=0;bay<bays;bay++){
      const u=-width/2+step*(bay+.5),bw=step*.63;
      for(let floor=1;floor<4;floor++){
        const sy=.2+floor*b.h/4;
        fbox(u,sy,.39,bw,.13,.76,m.cream);
        fbox(u,sy+.56,.72,bw-.05,.94,.028,m.balconyGlass);
        fbox(u,sy+1.06,.73,bw,.035,.035,m.dark);
        for(const dir of [-1,1])fbox(u+dir*bw/2,sy+.59,.73,.027,.97,.035,m.dark);
      }
    }
  }
  for(const b of BUILDINGS){
    const pts=footprint(b);shapeMesh(pts,b.h,.2,m.cream,b.x,b.z);
    shapeMesh(footprint(b,.25),.22,b.h+.2,m.roof,b.x,b.z);
    for(let i=0;i<pts.length;i++){
      const p=pts[i],q=pts[(i+1)%pts.length];
      box(b.x+(p[0]+q[0])/2,b.h+.6,b.z+(p[1]+q[1])/2,Math.hypot(q[0]-p[0],q[1]-p[1]),.58,.19,m.cream,-Math.atan2(q[1]-p[1],q[0]-p[0]));
    }
    facade(b,b.x,b.z+b.d/2,b.w-b.step*2,0,true);
    facade(b,b.x,b.z-b.d/2,b.w-b.step*2,Math.PI,true);
    facade(b,b.x+b.w/2,b.z,b.d-b.step*2,Math.PI/2,false);
    facade(b,b.x-b.w/2,b.z,b.d-b.step*2,-Math.PI/2,false);
    box(b.x,.4,b.z+b.d/2+1.35,4,.4,2.5,m.stone);
    box(b.x,1.55,b.z+b.d/2+.22,2.1,2.7,.13,m.glass);
    box(b.x,1.55,b.z+b.d/2+.31,.05,2.7,.05,m.dark);
    box(b.x,3.05,b.z+b.d/2+1.05,3.9,.18,2.1,m.dark);
    box(b.x,2.95,b.z+b.d/2+1,2,.04,.3,m.lamp);
    for(let k=0;k<6;k++){
      const x=b.x+range(-b.w*.22,b.w*.22),z=b.z+range(-b.d*.25,b.d*.25);
      box(x,b.h+.66,z,range(.7,1.3),.7,range(.7,1.3),m.stone);
      box(x,b.h+1.02,z,.65,.03,.65,m.dark);
      for(let j=-2;j<=2;j++)box(x+j*.11,b.h+1.05,z,.035,.03,.61,m.chrome);
    }
    for(let k=0;k<4;k++){const x=b.x+range(-b.w*.35,b.w*.35),z=b.z+range(-b.d*.32,b.d*.32);pole(x,b.h+.64,z,.11,.7,m.chrome);}
    for(let x=b.x-b.w/2+1;x<b.x+b.w/2;x+=1.7){if(Math.abs(x-b.x)<2.2)continue;shrub(x,b.z+b.d/2+2.1,.65);}
    obstacles.push({x:b.x,z:b.z,w:b.w+2,d:b.d+2,padding:.5});
  }

  // Cars with shaped bodywork, glass cabins, wheels, lights and mirrors.
  function carShape(points,width){
    const shape=new T.Shape();points.forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y));shape.closePath();
    const g=new T.ExtrudeGeometry(shape,{depth:width,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.055,bevelThickness:.05});g.translate(0,0,-width/2);g.rotateY(Math.PI/2);resources.push(g);return g;
  }
  const bodyGeo=carShape([[-2.08,.49],[-2.12,.82],[-1.91,1.02],[-1.14,1.15],[1.4,1.05],[2.11,.78],[2.08,.48]],1.68);
  const cabinGeo=carShape([[-1.28,1.04],[-.78,1.67],[.85,1.65],[1.5,1.03]],1.5);
  const tireGeo=new T.CylinderGeometry(.35,.35,.24,14);tireGeo.rotateZ(Math.PI/2);
  const hubGeo=new T.CylinderGeometry(.19,.19,.255,12);hubGeo.rotateZ(Math.PI/2);
  function car(x,z,rotation=0,color='#bec4bf',scale=1){
    const c=Math.cos(rotation),s=Math.sin(rotation),ty=.14;
    const part=(geo,mat,dx,dy,dz,sx=1,sy=1,sz=1,tint=null)=>instance(geo,mat,x+(c*dx+s*dz)*scale,ty+dy*scale,z+(-s*dx+c*dz)*scale,sx*scale,sy*scale,sz*scale,rotation,tint);
    part(bodyGeo,m.paint,0,0,0,1,1,1,color);part(cabinGeo,m.glass,0,0,0);
    part(unitBox,m.paint,0,1.67,-.06,1.38,.055,1.55,color);
    for(const side of [-1,1]){
      part(unitBox,m.dark,side*.765,1.35,.15,.055,.59,.11);
      part(unitBox,m.paint,side*.88,1.17,-.9,.3,.15,.2,color);
      for(const dz of [-1.34,1.3]){part(tireGeo,m.rubber,side*.85,.45,dz);part(hubGeo,m.chrome,side*.87,.45,dz);}
      part(unitBox,m.lamp,side*.55,.84,-2.085,.42,.13,.05);
      part(unitBox,m.red,side*.55,.84,2.08,.43,.14,.05);
    }
    part(unitBox,m.dark,0,.62,-2.1,.77,.15,.055);part(unitBox,m.line,0,.72,2.12,.38,.11,.04);
    obstacles.push({x,z,w:Math.abs(c)*1.9+Math.abs(s)*4.5,d:Math.abs(c)*4.5+Math.abs(s)*1.9,padding:.25});
  }
  const colors=['#d9d8cd','#343d42','#687783','#b42f27','#2e4d74','#b9aa89','#29445a','#e3e0d4','#465d70'];
  for(let i=1;i<13;i++)car(-10.5+i*2.8,25,0,colors[i%colors.length],.94);
  for(let row=0;row<4;row++)for(let i=0;i<6;i++){if(rnd()<.12)continue;car(-66+i*2.8,-22+row*15,Math.PI*(row%2),colors[Math.floor(rnd()*colors.length)],.92);}
  car(-39,-29.5,Math.PI/2,'#b9c1c6',.9);car(5,46,Math.PI/2,'#34434d');car(-36,-49,-Math.PI/2,'#323b40');

  function bench(x,z,rot=0){
    const c=Math.cos(rot),s=Math.sin(rot);const p=(dx,y,dz,w,h,d,mat)=>box(x+c*dx+s*dz,y,z-s*dx+c*dz,w,h,d,mat,rot);
    for(let i=0;i<4;i++)p(0,.61,-.25+i*.17,1.8,.08,.14,m.wood);
    for(let i=0;i<3;i++)p(0,.84+i*.14,-.36,1.8,.1,.07,m.wood);
    for(const side of [-1,1]){p(side*.65,.35,0,.06,.65,.7,m.dark);p(side*.65,.82,-.37,.055,.7,.055,m.dark);}
  }
  for(const x of [-1,11,23])bench(x,11.9,Math.PI);
  for(const x of [-11,0,12,24]){
    pole(x,1.1,14.9,.055,1.95);box(x,2.1,14.9,.3,.07,.3,m.dark);box(x,2.035,14.9,.23,.045,.23,m.lamp);
  }
  // Eastern garden, winding path, playground and blue equipment.
  box(71,.15,-2,26,.2,81,m.grass);
  const pathCurve=new T.CatmullRomCurve3([new T.Vector3(61,.29,35),new T.Vector3(76,.29,29),new T.Vector3(75,.29,18),new T.Vector3(66,.29,10),new T.Vector3(77,.29,0),new T.Vector3(75,.29,-12),new T.Vector3(66,.29,-18),new T.Vector3(63,.29,-30),new T.Vector3(72,.29,-36),new T.Vector3(81,.29,-27),new T.Vector3(78,.29,-18)]);
  const points=pathCurve.getPoints(150),positions=[],indices=[];
  for(let i=0;i<points.length;i++){
    const tang=points[Math.min(i+1,points.length-1)].clone().sub(points[Math.max(0,i-1)]).normalize();
    const perpendicular=new T.Vector3(tang.z,0,-tang.x).multiplyScalar(1.22);
    for(const dir of [-1,1])positions.push(points[i].x+perpendicular.x*dir,.3,points[i].z+perpendicular.z*dir);
    if(i<points.length-1){const a=i*2;indices.push(a,a+1,a+2,a+1,a+3,a+2);}
  }
  const pathGeo=new T.BufferGeometry();pathGeo.setAttribute('position',new T.Float32BufferAttribute(positions,3));pathGeo.setIndex(indices);pathGeo.computeVertexNormals();
  const pathMat=m.path.clone();pathMat.side=T.DoubleSide;const pathMesh=new T.Mesh(pathGeo,pathMat);pathMesh.receiveShadow=true;scene.add(pathMesh);
  function disk(x,z,r,mat){const geo=new T.CylinderGeometry(r,r,.07,40);instance(geo,mat,x,.32,z);}
  disk(71,-26,5.8,m.rubberBlue);disk(71,2,4.5,m.rubberBlue);
  for(const z of [-31,-23])for(const x of [69,74])pole(x,1.75,z,.065,2.85,m.blue);
  for(const z of [-31,-23]){bar([69,3.18,z],[74,3.18,z],.065,m.blue);box(71.5,1.3,z,4.8,.16,2.2,m.wood);}
  for(const x of [69,74]){
    bar([x,3.18,-31],[x,3.18,-23],.065,m.blue);
    for(let z=-30;z<=-24;z+=1)bar([x,1.4,z],[x,3.1,z],.022,m.dark);
    for(let y=1.5;y<3.1;y+=.4)bar([x,y,-31],[x,y,-23],.022,m.dark);
  }
  box(71.5,1.35,-27,4.6,.12,8,m.wood);
  for(let z=-30;z<=-23;z+=1)bar([69,3.15,z],[74,3.15,z],.05,m.blue);
  for(const x of [68,74]){bar([x,.35,0],[x,3.4,2],.09,m.blue);bar([x,.35,4],[x,3.4,2],.09,m.blue);}
  bar([68,3.4,2],[74,3.4,2],.09,m.blue);
  for(const x of [70,72.3]){bar([x-.3,3.3,2],[x-.3,.9,2],.018,m.dark);bar([x+.3,3.3,2],[x+.3,.9,2],.018,m.dark);box(x,.9,2,.85,.08,.4,m.dark);}
  // Slide at the end of the climbing structure.
  const slide=new T.Mesh(new T.BoxGeometry(1.4,.09,4.5),m.blue);slide.position.set(71.5,.92,-20.5);slide.rotation.x=.29;slide.receiveShadow=true;scene.add(slide);
  for(let i=0;i<23;i++){const x=range(61,83),z=range(-38,34);if(points.some(p=>Math.hypot(p.x-x,p.z-z)<2.5)||Math.hypot(x-71,z+26)<6.5||Math.hypot(x-71,z-2)<5.5)continue;tree(x,z,range(.75,1.1),i%5===0);}
  for(let z=-37;z<=35;z+=3.3){shrub(82,z,1.5,z%2<1);shrub(60.5,z,1);}
  for(const p of [[76,-17,0],[63,-8,Math.PI/2],[72,21,Math.PI],[77,-34,0]])bench(...p);
  for(let z=-33;z<32;z+=12){pole(80,2.1,z,.05,4);box(80,4.1,z,.42,.08,.42,m.dark);box(80,4.03,z,.28,.06,.28,m.lamp);}

  // A few human figures establish scale without obstructing the walkways.
  for(const [x,z] of [[.2,13.2],[1.2,13.6],[21,1],[25,16],[-35,3],[64,-10]]){
    const shirt=rnd()<.5?'#d7c9b0':'#52666a';
    instance(cylinder,m.paint,x,1.08,z,.18,.67,.14,0,shirt);
    ball(x,1.62,z,.135,.17,.135,'#b18d70');
    for(const dir of [-1,1]){bar([x+dir*.09,.82,z],[x+dir*.11,.22,z+dir*.09],.065,m.dark);bar([x+dir*.21,1.34,z],[x+dir*.25,.94,z+.07],.053,m.sand);}
  }
  for(const {geo,mat,rows} of batches.values()){
    const mesh=new T.InstancedMesh(geo,mat,rows.length);
    rows.forEach((r,i)=>{
      if(r.matrix)mesh.setMatrixAt(i,r.matrix);
      else{dummy.position.set(r.x,r.y,r.z);dummy.rotation.set(r.rx,r.ry,r.rz);dummy.scale.set(r.sx,r.sy,r.sz);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);}
      if(r.color)mesh.setColorAt(i,col.set(r.color));
    });
    mesh.castShadow=mat!==m.balconyGlass&&mat!==m.lamp;mesh.receiveShadow=true;mesh.computeBoundingSphere();scene.add(mesh);
  }
  return {obstacles:[...obstacles,...bedObstacles],materials:m,resources,buildings:BUILDINGS};
}

export function isWalkable(x,z,obstacles){
  if(x<-84||x>89||z<-57||z>57)return false;
  return !obstacles.some(o=>Math.abs(x-o.x)<o.w/2+o.padding&&Math.abs(z-o.z)<o.d/2+o.padding);
}
