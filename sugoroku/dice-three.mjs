import * as THREE from './vendor/three-r180/three.module.js';
import {FACE_ORDER,landingRotation,settlePose,TOP_ROTATIONS} from './dice-pose.mjs';

const pips={1:[4],2:[0,8],3:[0,4,8],4:[0,2,6,8],5:[0,2,4,6,8],6:[0,2,3,5,6,8]};
let active=null;
function createStage(){
  const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));renderer.shadowMap.enabled=true;
  const host=document.createElement('div');host.className='dice-stage';host.setAttribute('role','dialog');host.setAttribute('aria-label','サイコロ');
  const canvas=renderer.domElement;canvas.setAttribute('aria-hidden','true');host.appendChild(canvas);
  const controls=document.createElement('div');controls.className='dice-stage-controls';host.appendChild(controls);
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(36,1,.1,50);
  camera.position.set(3,6.5,8);camera.lookAt(0,.5,0);
  scene.add(new THREE.HemisphereLight(0xffffff,0x756b60,3));
  const light=new THREE.DirectionalLight(0xffffff,3);light.position.set(-3,7,5);light.castShadow=true;light.shadow.mapSize.set(512,512);scene.add(light);
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(30,30),new THREE.ShadowMaterial({opacity:.2}));floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;scene.add(floor);
  const materials=FACE_ORDER.map(n=>{
    const c=document.createElement('canvas');c.width=c.height=256;const g=c.getContext('2d');
    g.fillStyle='#fffdf7';g.fillRect(0,0,256,256);g.strokeStyle='#b8afa5';g.lineWidth=5;g.strokeRect(3,3,250,250);
    g.fillStyle=n===1?'#d9552f':'#2a2118';for(const i of pips[n]){g.beginPath();g.arc(61+(i%3)*67,61+Math.floor(i/3)*67,n===1?25:20,0,Math.PI*2);g.fill();}
    const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;
    return new THREE.MeshStandardMaterial({map:texture,roughness:.4,metalness:0});
  });
  const geometry=new THREE.BoxGeometry(1.2,1.2,1.2),cubes=[];
  function count(n){while(cubes.length<n){const cube=new THREE.Mesh(geometry,materials);cube.castShadow=true;scene.add(cube);cubes.push(cube);}cubes.forEach((c,i)=>{c.visible=i<n;c.position.x=(i-(n-1)/2)*1.8;});}
  count(1);
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const s={host,controls,renderer,scene,camera,cubes,reduced,phase:'spin',raf:null,time:0,last:null,count,done:false,resolveThrow:null,resolveResult:null};
  const resize=()=>{const r=document.getElementById('wrap').getBoundingClientRect();renderer.setSize(r.width,r.height);camera.aspect=r.width/r.height;camera.position.set(3,6.5,8).multiplyScalar(Math.max(1,.8/camera.aspect));camera.lookAt(0,.5,0);camera.updateProjectionMatrix();};
  const dispose=()=>{
    if(s.done)return;s.done=true;cancelAnimationFrame(s.raf);removeEventListener('resize',resize);removeEventListener('pagehide',dispose);canvas.removeEventListener('webglcontextlost',lost);
    s.resolveThrow?.(false);s.resolveResult?.();geometry.dispose();materials.forEach(m=>{m.map.dispose();m.dispose();});floor.geometry.dispose();floor.material.dispose();renderer.dispose();renderer.forceContextLoss();host.remove();if(active===s)active=null;
  };
  const lost=e=>{e.preventDefault();s.failed=true;dispose();};canvas.addEventListener('webglcontextlost',lost);
  s.dispose=dispose;document.getElementById('wrap').appendChild(host);resize();addEventListener('resize',resize);addEventListener('pagehide',dispose);
  function draw(now){
    if(s.done)return;
    const dt=s.last===null?0:Math.min(.05,(now-s.last)/1000);s.last=now;s.time+=dt;
    try{
      for(let i=0;i<cubes.length;i++){
        const cube=cubes[i];if(!cube.visible)continue;
        let lift=0;
        if(s.phase==='spin'&&!reduced.matches){cube.rotation.x+=dt*(10+3*Math.sin(s.time*2.7));cube.rotation.y+=dt*(13+4*Math.cos(s.time*1.9));cube.rotation.z+=dt*(7+2*Math.sin(s.time*3.1));lift=.15+.1*Math.sin(s.time*4);}
        if(s.phase==='settle'){
          const progress=reduced.matches?1:Math.min(1,(now-s.settleStart)/1150);
          const pose=settlePose(s.starts[i],s.targets[i],progress);cube.rotation.set(...pose.rotation);lift=pose.lift;
        }
        cube.updateMatrix();const m=cube.matrix.elements;
        cube.position.y=.6*(Math.abs(m[1])+Math.abs(m[5])+Math.abs(m[9]))+lift;
      }
      renderer.render(scene,camera);
      if(s.phase==='settle'&&(reduced.matches||now-s.settleStart>=1150)){
        s.phase='result';s.resultAt=now;controls.replaceChildren();
        const label=document.createElement('strong');label.className='travel-dice-result';label.setAttribute('role','status');label.textContent=`${s.faces.join(' + ')}が出ました。${s.faces.reduce((a,b)=>a+b,0)}歩進めます`;controls.appendChild(label);
      }
      if(s.phase==='result'&&now-s.resultAt>=850){dispose();return;}
      s.raf=requestAnimationFrame(draw);
    }catch{s.failed=true;dispose();}
  }
  s.raf=requestAnimationFrame(draw);return s;
}
function spin(){
  if(active?.throwPromise)return active.throwPromise;
  active?.dispose();const s=createStage();active=s;
  const button=document.createElement('button');button.className='travel-throw';button.textContent='投げる';s.controls.appendChild(button);
  s.throwPromise=new Promise(resolve=>s.resolveThrow=resolve);
  button.onclick=()=>{if(button.disabled||s.done)return;button.disabled=true;button.textContent='出目を確認中';s.resolveThrow(true);s.resolveThrow=null;};
  button.focus();return s.throwPromise;
}
async function dice(faces){
  if(!Array.isArray(faces)||!faces.length||faces.length>3||faces.some(n=>!TOP_ROTATIONS[n]))throw new Error('INVALID_FACE');
  const s=active||createStage();active=s;s.count(faces.length);s.faces=[...faces];s.controls.replaceChildren();
  s.starts=s.cubes.map(c=>[c.rotation.x,c.rotation.y,c.rotation.z]);s.targets=faces.map((face,i)=>landingRotation(s.starts[i],face));s.settleStart=performance.now();s.phase='settle';
  await new Promise(resolve=>s.resolveResult=resolve);
  if(s.failed)throw new Error('DICE_RENDER_FAILED');
}
globalThis.DICE3D={spin,dice,cancel:()=>active?.dispose()};
