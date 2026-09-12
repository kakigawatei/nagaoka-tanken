const base=new URL('./assets/art/field/v2/src/',import.meta.url);
const forest=['sprite_forest_14_00.png','sprite_forest_14_01.png','sprite_forest_14_02.png','sprite_forest_20_06.png','sprite_forest_20_07.png',...Array.from({length:9},(_,i)=>`sprite_forest_cluster_${String(i).padStart(2,'0')}.png`)];
const mountains=['block_mountain_00.png','block_mountain_01.png','block_mountain_02.png'];
export const palette={grass:'#b4d464',water:'#349cdc',river:'#2c9cdc',bank:'#f0dca0',road:'#e6d7a4',roadEdge:'#7a5230'};
export function landmarkSize(n,stations,cell){const gap=Math.min(...stations.filter(s=>s.id!==n.id).map(s=>Math.max(Math.abs(s.x-n.x),Math.abs(s.y-n.y))));return Math.min(90,cell*1.5,gap*cell*.8);}
export function layoutLandmarkLabels(items,{width,height,top=130,bottom=height-116,cell=16,obstacles=[]}){
 const placed=[],overlap=(a,b)=>a.x<b.x+b.width+2&&a.x+a.width+2>b.x&&a.y<b.y+b.height+2&&a.y+a.height+2>b.y;
 const ordered=items.map((item,i)=>({...item,number:item.number??i+1,space:Math.min(...items.filter(other=>other!==item).map(other=>Math.hypot(item.p.x-other.p.x,item.p.y-other.p.y)))})).sort((a,b)=>b.space-a.space||a.number-b.number);
 const fits=(r,ignore)=>r.x>=4&&r.x+r.width<=width-4&&r.y>=top&&r.y+r.height<=bottom&&!placed.some(q=>q!==ignore&&!q.hidden&&overlap(r,q))&&!obstacles.some(q=>overlap(r,q));
 // Reserve every badge first so a later fallback cannot cover an earlier name.
 for(const item of ordered){const offsets=[];for(let dy=-54;dy<=54;dy+=18)for(let dx=-60;dx<=60;dx+=20)if(Math.hypot(dx,dy)<=60)offsets.push([dx,dy]);offsets.sort((a,b)=>Math.hypot(...a)-Math.hypot(...b));
  const r=offsets.map(([dx,dy])=>({x:item.p.x+dx-9,y:item.p.y+dy-8,width:18,height:16})).find(r=>fits(r));
  placed.push({...item,...(r||{x:item.p.x-9,y:item.p.y-8,width:18,height:16}),compact:true,hidden:!r});
 }
 for(const label of placed){const w=Math.min(174,width-16,label.text.length*11+8),h=16;
  const candidates=[[0,18],[0,-18],[w/2+5,0],[-w/2-5,0],[0,36],[0,-36],[30,30],[-30,30],[30,-30],[-30,-30],[0,54],[0,-54]];
  const r=candidates.filter(([dx,dy])=>Math.hypot(dx,dy)<=60).map(([dx,dy])=>({x:label.p.x+dx-w/2,y:label.p.y+dy-h/2,width:w,height:h})).find(r=>fits(r,label));
  if(r)Object.assign(label,r,{compact:false,hidden:false});
 }return placed;
}
export function orthogonal(points){const result=[points[0]];for(const p of points.slice(1)){const a=result.at(-1);if(a[0]!==p[0]&&a[1]!==p[1])result.push([p[0],a[1]]);result.push(p);}return result;}
export function pointInPolygon(x,y,points){let inside=false;for(let i=0,j=points.length-1;i<points.length;j=i++){const a=points[i],b=points[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;}
function segmentDistance(x,y,a,b){const dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy||1)));return Math.hypot(x-a[0]-t*dx,y-a[1]-t*dy);}
export function isWater(display,x,y,margin=0){
 if(display.water.some(w=>pointInPolygon(x,y,w.polygon)))return true;
 for(const r of display.rivers){const p=orthogonal(r.path);for(let i=1;i<p.length;i++)if(segmentDistance(x,y,p[i-1],p[i])<r.width/2+margin)return true;}return false;
}
export function forestLots(display){const result=[];
 for(let row=0;row<39;row++)for(let col=0;col<59;col++){
  const hash=(col*73856093^row*19349663)>>>0,east=2+col*1.5>=67;
  if(!east&&hash%23!==0)continue;
  const x=2+col*1.5+(hash%7-3)*.08,y=2+row*1.5+((hash>>>4)%7-3)*.08;
  // Reserve the whole sprite footprint, not only its foot point.
  const samples=[[x,y],[x-1.4,y],[x+1.4,y],[x-1.4,y-4],[x,y-4],[x+1.4,y-4]];
  if(samples.some(([a,b])=>pointInPolygon(a,b,hillPolygon)))continue;
  if(samples.some(([a,b])=>isWater(display,a,b,.5)))continue;
  if(display.nodes.some(n=>Math.abs(n.x-x)<1.7&&n.y>=y-4.3&&n.y<=y+.5))continue;
  if(display.nodes.some(n=>n.station&&Math.hypot(n.x-x,n.y-y)<3))continue;
  result.push({x,y,scale:east?2.6:1.8,src:forest[east?5+hash%9:hash%5]});
 }return result;
}
export const hillPolygon=[[77,3],[87,4],[92,10],[91,22],[92,36],[89,49],[85,60],[73,59],[70,53],[73,45],[71,37],[74,28],[72,18],[75,11]];
export function mountainPlan(display){
 const cells=[],border=[],stations=display.nodes.filter(n=>n.station);
 for(let y=3;y<60;y+=.5)for(let x=70;x<92;x+=.5){const a=x+.25,b=y+.25;
  if(!pointInPolygon(a,b,hillPolygon)||isWater(display,a,b,1)||display.nodes.some(n=>Math.abs(n.x-a)<1.5&&Math.abs(n.y-b)<1.5)||stations.some(n=>Math.hypot(n.x-a,n.y-b)<3))continue;
  cells.push({x,y});
 }
 for(let i=0;i<hillPolygon.length;i++){const a=hillPolygon[i],b=hillPolygon[(i+1)%hillPolygon.length],count=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1]));
  for(let j=0;j<count;j++){const x=a[0]+(b[0]-a[0])*j/count,y=a[1]+(b[1]-a[1])*j/count;
   if([[x-1.4,y],[x+1.4,y],[x-1.4,y-4],[x+1.4,y-4]].some(([a,b])=>isWater(display,a,b,.5))||display.nodes.some(n=>Math.abs(n.x-x)<1.7&&n.y>=y-4.3&&n.y<=y+.5)||stations.some(n=>Math.hypot(n.x-x,n.y-y)<3))continue;
   border.push({x,y,scale:1,src:forest[5+(i+j)%9]});
  }
 }return {cells,border};
}
export function createV2Terrain(display,{redraw=()=>{},imageFactory=()=>new Image(),anchors={},onLegend=()=>{}}={}){
 const images=new Map(),pending=new Set(),lots=forestLots(display),hill=mountainPlan(display);let disposed=false;
 const sprites=[...lots,...hill.border.map(l=>({...l,border:true}))].sort((a,b)=>a.y-b.y);
 const stationNodes=display.nodes.filter(n=>n.station);
 const names=['ground_grass_01.png','ground_sea_01.png',...forest,...mountains],missing=[];
 function load(src,key=src){return new Promise(resolve=>{const im=imageFactory();let done=false;const finish=ok=>{if(done)return;done=true;clearTimeout(timer);pending.delete(cancel);im.onload=null;im.onerror=null;if(ok&&!disposed)images.set(key,im);else missing.push(key);resolve(ok);};const cancel=()=>finish(false),timer=setTimeout(cancel,15000);pending.add(cancel);im.onload=()=>finish(im.naturalWidth>0);im.onerror=cancel;im.src=src;});}
 const ready=Promise.all([...names.map(n=>load(new URL(n,base).href,n)),...display.nodes.filter(n=>n.station).map(n=>load(new URL(`./assets/art/field/v1/tiles/landmark_${n.station}.png`,import.meta.url).href,n.station))]).then(()=>{if(!disposed)redraw();return {missing:[...missing]};});
 const line=(ctx,points,screen)=>{ctx.beginPath();points.forEach((p,i)=>{const q=screen({x:p[0],y:p[1]});i?ctx.lineTo(q.x,q.y):ctx.moveTo(q.x,q.y);});};
 function texture(ctx,id,screen,cell,width,height){const im=images.get(id);if(!im)return;const tile=cell*4,p=screen({x:0,y:0});for(let y=Math.floor(-p.y/tile)*4;y<=(height-p.y)/cell;y+=4)for(let x=Math.floor(-p.x/tile)*4;x<=(width-p.x)/cell;x+=4){const q=screen({x,y}),left=Math.round(q.x),top=Math.round(q.y);ctx.drawImage(im,left,top,Math.round(q.x+tile)-left,Math.round(q.y+tile)-top);}}
 return {ready,lots,dispose(){disposed=true;for(const cancel of [...pending])cancel();images.clear();},
 draw(ctx,{screen,cell,width,height,places=true,labelTop=130,labelBottom=height-116,labelWidth=width,obstacles=[],beforePlaces=()=>{}}){
  if(disposed||cell<=0)return;
  ctx.fillStyle=palette.grass;ctx.fillRect(0,0,width,height);texture(ctx,'ground_grass_01.png',screen,cell,width,height);
  for(const w of display.water){line(ctx,w.polygon,screen);ctx.closePath();ctx.strokeStyle=palette.bank;ctx.lineWidth=cell*2/9;ctx.stroke();ctx.save();ctx.clip();ctx.fillStyle=palette.water;ctx.fillRect(0,0,width,height);texture(ctx,'ground_sea_01.png',screen,cell,width,height);ctx.restore();}
  ctx.lineJoin='miter';ctx.lineCap='butt';
  for(const r of display.rivers){const points=orthogonal(r.path);for(const [color,w] of [[palette.bank,r.width*cell+cell*2/9],[palette.river,r.width*cell]]){line(ctx,points,screen);ctx.strokeStyle=color;ctx.lineWidth=Math.max(.6,w);ctx.stroke();}}
  ctx.save();line(ctx,hillPolygon,screen);ctx.closePath();ctx.clip();ctx.beginPath();
  for(const c of hill.cells){const p=screen(c);ctx.rect(p.x,p.y,cell*.5,cell*.5);}ctx.clip();
  for(let row=0;row<9;row++)for(let col=0;col<3;col++){const im=images.get(mountains[(row+col)%3]);if(!im)continue;const p=screen({x:68+col*10,y:1+row*7}),w=12*cell,h=w*im.naturalHeight/im.naturalWidth;if(p.x+w<0||p.x>width||p.y+h<0||p.y>height)continue;ctx.drawImage(im,p.x,p.y,w,h);}
  ctx.restore();
  const byId=new Map(display.nodes.map(n=>[n.id,n]));
  for(const [color,w] of [[palette.roadEdge,cell/3+2*Math.min(2,cell*.1)],[palette.road,cell/3]]){ctx.beginPath();for(const [a,b] of display.edges){const p=screen(byId.get(a)),q=screen(byId.get(b));ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);}ctx.strokeStyle=color;ctx.lineWidth=w;ctx.stroke();}
  if(cell>=12){ctx.save();ctx.fillStyle='#bf985633';for(const [a,b] of display.edges){const n=byId.get(a),m=byId.get(b),dx=m.x-n.x,dy=m.y-n.y;for(let i=0;i<3;i++){const seed=((a*73856093)^(b*19349663)^(i*83492791))>>>0,t=(i+.25+(seed%20)/40)/3,jitter=((seed>>>8)%101/100-.5)*.18,p=screen({x:n.x+dx*t-dy*jitter,y:n.y+dy*t+dx*jitter}),size=cell*(.018+(seed%3)*.005);if(p.x<0||p.x>width||p.y<0||p.y>height)continue;ctx.fillRect(p.x-size/2,p.y-size/2,size,size);}}ctx.restore();}
  for(const lot of sprites){const im=images.get(lot.src);if(!im)continue;const p=screen(lot),w=cell*lot.scale,h=w*im.naturalHeight/im.naturalWidth;if(p.x+w<0||p.x-w>width||p.y<0||p.y-h>height)continue;
   // Boundary trees may mask the outline, but never cover the mountain interior.
   ctx.save();ctx.beginPath();ctx.rect(0,0,width,height);for(let i=0;i<hillPolygon.length;i++){const q=screen({x:hillPolygon[i][0],y:hillPolygon[i][1]});i?ctx.lineTo(q.x,q.y):ctx.moveTo(q.x,q.y);}ctx.closePath();ctx.clip('evenodd');ctx.drawImage(im,p.x-w/2,p.y-h,w,h);ctx.restore();}
  beforePlaces();
  const labels=[];
  if(places)for(const n of stationNodes){const p=screen(n),im=images.get(n.station),size=landmarkSize(n,stationNodes,cell),anchor=anchors[n.station]||[.5,.93];if(p.x+size<0||p.x-size>width||p.y<labelTop||p.y>labelBottom)continue;if(im)ctx.drawImage(im,p.x-size*anchor[0],p.y-size*anchor[1],size,size);else{ctx.fillStyle='#245b3d';ctx.fillRect(p.x-3,p.y-3,6,6);}const number=(display.trace?.provisionalStations||stationNodes.map(n=>({station:n.station}))).findIndex(s=>s.station===n.station)+1;labels.push({p,text:n.name,number});}
  const placed=layoutLandmarkLabels(labels,{width:labelWidth,height,top:labelTop,bottom:labelBottom,cell,obstacles});
  onLegend(placed.filter(l=>l.compact).map(l=>({number:l.number,name:l.text})));
  for(const label of placed){if(label.hidden)continue;if(!label.compact||Math.hypot(label.x+9-label.p.x,label.y+8-label.p.y)>12){ctx.strokeStyle='#526e51';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(label.p.x,label.p.y);ctx.lineTo(label.x+label.width/2,label.y+8);ctx.stroke();}}
  for(const label of placed){if(label.hidden)continue;ctx.fillStyle=label.compact?'#183226':'#ffffff';ctx.fillRect(label.x,label.y,label.width,label.height);ctx.font='11px sans-serif';ctx.fillStyle=label.compact?'#fff':'#183226';ctx.fillText(label.compact?String(label.number):label.text,label.x+3,label.y+12,label.width-6);}
  return placed;
 }
 };
}
