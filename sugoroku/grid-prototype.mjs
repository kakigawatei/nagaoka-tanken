import {buildBoard,distances} from './grid-board.mjs';
const board=buildBoard(),$=id=>document.getElementById(id),canvas=$('map'),ctx=canvas.getContext('2d');
const art={};for(const key of ['nagaoka_st','aore','honmaru']){const im=new Image();im.onload=()=>draw();im.src=`icons/${key}.png`;art[key]=im;}
const token=new Image();token.onload=()=>draw();token.src='assets/art/cells/token_you_1.png';
let pos=board.start,dest=board.destination,cash=1000,draft=null,selected=null,owned=new Set(),drag=null;
let width=0,height=0,dpr=1,cell=66,camera={x:board.nodes[pos].x,y:board.nodes[pos].y};
const current=()=>draft?.at()??pos;
const point=n=>({x:width*.48+(n.x-camera.x)*cell,y:height*.46+(n.y-camera.y)*cell});
const names={blue:'青マス',red:'赤マス',yellow:'カードマス',plain:'道のマス',shop:'物件マス'};
const name=id=>board.nodes[id].place?.name||board.nodes[id].shop?.name||names[board.nodes[id].type];
function resize(){const r=$('gridApp').getBoundingClientRect();width=r.width;height=r.height;dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);draw();}
function draw(){
 if(!width)return;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle='#d6e8c4';ctx.fillRect(0,0,width,height);
 // A small river segment locates Kakigawa without inventing a full regional map.
 const river=point({x:0,y:11.7});ctx.fillStyle='#8bcce3';ctx.fillRect(0,river.y,width,cell*.45);
 for(let x=1;x<=10;x++)for(let y=1;y<=12;y++){
  if(board.nodes.some(n=>n.x===x&&n.y===y))continue;
  const p=point({x,y});ctx.fillStyle=(x+y)%3?'#b9d59e':'#efead7';ctx.fillRect(p.x-cell*.34,p.y-cell*.34,cell*.68,cell*.68);
  if((x+y)%3===0){ctx.fillStyle='#92aaa8';ctx.fillRect(p.x-cell*.23,p.y-cell*.20,cell*.20,cell*.35);ctx.fillStyle='#ddd8c7';ctx.fillRect(p.x+cell*.02,p.y-cell*.13,cell*.2,cell*.28);}
 }
 const paths=()=>{ctx.beginPath();for(const [a,b] of board.edges){const p=point(board.nodes[a]),q=point(board.nodes[b]);ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);}ctx.stroke();};
 ctx.lineCap='square';ctx.strokeStyle='#626c65';ctx.lineWidth=14;paths();ctx.strokeStyle='#fffdf7';ctx.lineWidth=9;paths();
 if(draft?.path.length){ctx.beginPath();[pos,...draft.path].forEach((id,i)=>{const p=point(board.nodes[id]);i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y);});ctx.strokeStyle='#d9552f';ctx.lineWidth=4;ctx.stroke();}
 const colors={blue:'#3984c4',red:'#d9552f',yellow:'#e3bd3c',plain:'#fffdf7',place:'#3f977e',shop:'#9968ad'};
 const side=Math.min(23,cell*.38);
 for(const n of board.nodes){const p=point(n);ctx.fillStyle=colors[n.type];ctx.fillRect(p.x-side/2,p.y-side/2,side,side);ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.strokeRect(p.x-side/2,p.y-side/2,side,side);if(n.id===dest){ctx.strokeStyle='#d9552f';ctx.lineWidth=3;ctx.strokeRect(p.x-side/2-4,p.y-side/2-4,side+8,side+8);}}
 for(const place of board.places){const p=point(place),im=art[place.art];if(im?.complete&&im.naturalWidth){const size=Math.min(48,cell*.7);ctx.drawImage(im,p.x-size/2,p.y-size-12,size,size);}ctx.font='bold 11px sans-serif';ctx.textAlign='center';ctx.lineJoin='round';ctx.strokeStyle='#fff';ctx.lineWidth=4;ctx.strokeText(place.name,p.x,p.y+side/2+15);ctx.fillStyle='#263934';ctx.fillText(place.name,p.x,p.y+side/2+15);}
 const p=point(board.nodes[current()]);ctx.fillStyle='#d9552f';ctx.beginPath();ctx.ellipse(p.x,p.y-3,12,5,0,0,Math.PI*2);ctx.fill();
 if(token.complete&&token.naturalWidth){const h=48,w=h*token.naturalWidth/token.naturalHeight;ctx.drawImage(token,p.x-w/2,p.y-h-4,w,h);}
 arrows();
}
function arrows(){
 const box=$('directions');box.replaceChildren();if(!draft||!draft.remaining()||!$('details').hidden)return;
 const at=board.nodes[current()],p=point(at),options=draft.next().map(id=>({id,back:false}));
 const previous=draft.path.length>1?draft.path.at(-2):draft.path.length?pos:null;
 if(previous!==null&&!options.some(o=>o.id===previous))options.push({id:previous,back:true});
 for(const option of options){const n=board.nodes[option.id],dx=n.x-at.x,dy=n.y-at.y,b=document.createElement('button');b.className='map-arrow'+(option.back?' back':'');b.textContent=dx>0?'→':dx<0?'←':dy>0?'↓':'↑';b.title=option.back?'1マス戻す':name(option.id);b.setAttribute('aria-label',b.title);
  b.style.left=`${p.x+dx*Math.max(44,cell*.64)}px`;b.style.top=`${p.y+dy*Math.max(44,cell*.64)}px`;
  b.onclick=()=>{if(!draft)return;if(option.back)draft.undo();else draft.move(option.id);follow();render();};box.appendChild(b);
 }
}
function follow(){camera={x:board.nodes[current()].x,y:board.nodes[current()].y};}
function render(){
 $('money').textContent=`${cash}万両`;$('destinationName').textContent=name(dest);$('distance').textContent=`あと ${distances(board.adj,dest)[current()]} マス`;
 $('remaining').textContent=draft?`あと ${draft.remaining()} 歩`:'';$('remaining').hidden=!draft;
 $('undo').disabled=!draft?.path.length;$('roll').disabled=!!draft;$('trial').disabled=!!draft;$('steps').disabled=!!draft;
 $('landing').hidden=!draft||draft.remaining()!==0;$('landingName').textContent=name(current());draw();
}
function begin(steps){if(draft)return;draft=TRAVEL_ROUTE.model({start:pos,steps,adj:board.adj});$('status').textContent=`${steps}が出ました`;follow();render();}
function undo(){if(draft?.undo()){follow();render();}}
function inspect(id=current()){
 selected=id;const n=board.nodes[id];$('detailsName').textContent=name(id);$('buy').hidden=true;
 $('detailsBody').textContent=n.shop?`試作価格 ${n.shop.price}万両\n${owned.has(id)?'購入済み':'売り出し中'}`:n.type==='blue'?'止まると +50万両':n.type==='red'?'止まると −30万両':n.type==='yellow'?'カードマス（この試作では効果なし）':id===dest?'ぴったり止まると援助金 +500万両':'長岡駅周辺';
 if(n.shop&&!draft&&pos===id&&!owned.has(id)){$('buy').hidden=false;$('buy').disabled=cash<n.shop.price;}
 $('details').hidden=false;draw();
}
$('yes').onclick=()=>{
 if(!draft||draft.remaining())return;pos=draft.at();draft=null;const n=board.nodes[pos];let message=`${name(pos)}に着地`;
 if(pos===dest){cash+=500;message+='・援助金 +500万両';const i=board.places.findIndex(p=>p.id===dest);dest=board.places[(i+1)%board.places.length].id;}
 else if(n.type==='blue'){cash+=50;message+='・+50万両';}else if(n.type==='red'){cash-=30;message+='・−30万両';}
 $('status').textContent=message;render();if(n.shop)inspect(pos);
};
$('no').onclick=undo;$('undo').onclick=undo;$('inspect').onclick=()=>inspect();$('closeDetails').onclick=()=>{$('details').hidden=true;render();};
$('buy').onclick=()=>{const n=board.nodes[selected];if(draft||selected!==pos||!n?.shop||owned.has(selected)||cash<n.shop.price)return;cash-=n.shop.price;owned.add(selected);$('status').textContent=`${n.shop.name}を購入`;render();inspect(selected);};
$('roll').onclick=()=>begin(1+Math.floor(Math.random()*6));$('trial').onclick=()=>{const n=Number($('steps').value);if(Number.isInteger(n)&&n>=1&&n<=6)begin(n);};
$('zoomIn').onclick=()=>{cell=Math.min(100,cell*1.25);draw();};$('zoomOut').onclick=()=>{cell=Math.max(24,cell/1.25);draw();};
$('fit').onclick=()=>{camera={x:5.5,y:6.5};cell=Math.min((width-80)/10,(height-230)/12);draw();};$('home').onclick=()=>{cell=66;follow();draw();};
canvas.addEventListener('pointerdown',e=>{if(drag)return;drag={id:e.pointerId,x:e.clientX,y:e.clientY,camera:{...camera}};canvas.setPointerCapture(e.pointerId);});
canvas.addEventListener('pointermove',e=>{if(!drag||e.pointerId!==drag.id)return;camera={x:drag.camera.x-(e.clientX-drag.x)/cell,y:drag.camera.y-(e.clientY-drag.y)/cell};draw();});
canvas.addEventListener('pointerup',e=>{if(!drag||e.pointerId!==drag.id)return;const tap=Math.hypot(e.clientX-drag.x,e.clientY-drag.y)<8;drag=null;if(tap){const rect=canvas.getBoundingClientRect();let best=24,id=null;for(const n of board.nodes){const p=point(n),d=Math.hypot(p.x-e.clientX+rect.left,p.y-e.clientY+rect.top);if(d<best){best=d;id=n.id;}}if(id!==null)inspect(id);}});
canvas.addEventListener('pointercancel',()=>drag=null);document.addEventListener('dblclick',e=>e.preventDefault(),{passive:false});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){$('details').hidden=true;render();}});addEventListener('resize',resize);
resize();$('status').textContent='長岡駅から出発';render();
