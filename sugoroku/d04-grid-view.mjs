import {layoutMapLabels,mapSpriteSizes} from './grid-board.mjs';
import {createFieldLayer} from './field-art.mjs';
import {createV2GridScene,V2_BOARD} from './d04-v2-scene.mjs';

const colors={blue:'#3984c4',red:'#d9552f',yellow:'#e3bd3c',plain:'#fffdf7',dest:'#3f977e',prop:'#9968ad'};
const major=new Set(['駅前','寺泊','出雲崎','与板','川西','越路','山古志','栃尾','小国','悠久山']);
export function createGridScene(display,{redraw=()=>{},imageFactory=()=>new Image(),getIcon=()=>null,fieldFetcher}={}){
 if(display.boardVersion===V2_BOARD)return createV2GridScene(display,{redraw,imageFactory,fieldFetcher});
 const field=createFieldLayer(display,{redraw,imageFactory,...(fieldFetcher?{fetcher:fieldFetcher}:{})});
 const images=new Map(),byId=new Map(display.nodes.map(n=>[n.id,n]));
 let disposed=false;
 function image(src){
  if(!images.has(src)){const im=imageFactory();images.set(src,im);im.onload=()=>{if(!disposed)redraw();};im.src=src;}
  const im=images.get(src);return im.complete&&im.naturalWidth?im:null;
 }
 const visible=(p,pad,w,h)=>p.x>=-pad&&p.x<=w+pad&&p.y>=-pad&&p.y<=h+pad;
 return {
  fieldReady:field.ready,
  dispose(){disposed=true;field.dispose();for(const im of images.values())im.onload=null;images.clear();},
  draw(ctx,{screen,width,height,cell,goal,owner=()=>null,shops=new Set(),path=[],tokens=[]}){
   // CSS-pixel drawing keeps label bounds and sprite sizes consistent at every DPR.
   ctx.fillStyle='#d6e8c4';ctx.fillRect(0,0,width,height);
   field.ground(ctx,screen,cell,width,height);
   const river=screen({x:-2,y:-8}),end=screen({x:-2,y:25});
   ctx.fillStyle='#8bcce3';ctx.fillRect(river.x-cell*.35,river.y,cell*.7,end.y-river.y);
   const kakigawa=screen({x:1,y:11.7});ctx.fillRect(kakigawa.x,kakigawa.y,cell*7,cell*.45);
   for(const lot of display.scenery||[]){const p=screen(lot),size=cell*1.25;if(!visible(p,size,width,height))continue;
    if(field.inside(lot))continue;
    const region=['town','rural','hill'].includes(lot.region)?lot.region:'rural';
    const im=image(`assets/art/grid/${region}-v1.png`);if(im)ctx.drawImage(im,p.x-size/2,p.y-size/2,size,size);
   }
   ctx.lineCap='square';ctx.lineJoin='miter';
   for(const [color,factor] of [['#626c65',.22],['#fffdf7',.14]]){
    ctx.strokeStyle=color;ctx.lineWidth=Math.max(.6,Math.min(14,cell*factor));ctx.beginPath();
    for(const e of display.edges){const [a,b]=Array.isArray(e)?e:[e.a,e.b];if(field.inside(byId.get(a))&&field.inside(byId.get(b)))continue;const p=screen(byId.get(a)),q=screen(byId.get(b));ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);}ctx.stroke();
   }
   field.roads(ctx,screen,cell);
   const side=Math.min(23,cell*.38),sizes=mapSpriteSizes(cell),labels=[],shopLabels=[],obstacles=[],buildings=[];
   for(const lot of field.lots()){const id=field.decoration(lot),p=screen(lot);if(id&&visible(p,cell,width,height))buildings.push({id,p:{x:p.x,y:p.y+cell*.42},size:cell*.9});}
   for(const n of display.nodes){const id=field.landmark(n),p=screen(n);if(id&&visible(p,80,width,height))buildings.push({id,p:{x:p.x,y:p.y-side/2-4},size:n.id===goal?sizes.goal:sizes.place});}
   buildings.sort((a,b)=>a.p.y-b.p.y);
   for(const b of buildings){const rect=field.paint(ctx,b.id,b.p,b.size);if(rect)obstacles.push(rect);}
   if(path.length>1){ctx.beginPath();path.forEach((id,i)=>{const p=screen(byId.get(id));i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y);});ctx.strokeStyle='#d9552f';ctx.lineWidth=Math.max(2,Math.min(5,cell*.08));ctx.stroke();}
   const landmarkPoints=display.nodes.filter(n=>n.station).map(screen);
   for(const p of tokens)obstacles.push({x:p.x-sizes.token,y:p.y-sizes.token-8,width:sizes.token*2,height:sizes.token+16});
   const goalNode=byId.get(goal);
   if(goalNode){const p=screen(goalNode),text=`▼目的地 ${goalNode.name||goalNode.station}`;
    // Only anchor an onscreen goal; drawArrow handles offscreen destinations.
    if(visible(p,0,width-64,height))labels.push({x:Math.max(10,p.x),y:Math.max(height<450?55:130,p.y-sizes.goal-24),text,width:text.length*14+8,goal:true});
   }
   for(const n of display.nodes){const p=screen(n);if(!visible(p,80,width,height))continue;
    const owned=n.prop?owner(n.prop):null;
    ctx.fillStyle=owned==='you'?'#e0b84a':owned?'#9c8bd6':n.prop?'#9968ad':colors[n.t]||'#fffdf7';
    ctx.fillRect(p.x-side/2,p.y-side/2,side,side);ctx.strokeStyle='#fff';ctx.lineWidth=Math.min(2,Math.max(.5,cell*.04));ctx.strokeRect(p.x-side/2,p.y-side/2,side,side);
    if(n.id===goal){ctx.strokeStyle='#d9552f';ctx.lineWidth=3;ctx.strokeRect(p.x-side/2-4,p.y-side/2-4,side+8,side+8);}
    if(n.station){const size=n.id===goal?sizes.goal:sizes.place;
     const im=field.landmark(n)?null:getIcon(n.station);
     if(im){ctx.drawImage(im,p.x-size/2,p.y-size-4,size,size);obstacles.push({x:p.x-size/2-4,y:p.y-size-8,width:size+8,height:size+12});}
     if(cell>=32&&n.id!==goal){const text=n.name||n.station;labels.push({x:p.x,y:p.y+side/2+4,text,width:text.length*11+8});}
    }
    if(shops.has(n.id)&&cell>=80){
     const nearby=landmarkPoints.filter(q=>Math.hypot(q.x-p.x,q.y-p.y)<cell*1.6);
     const y=Math.max(p.y+side/2+8,...nearby.map(q=>q.y+side/2+28));
     if(!shopLabels.some(q=>Math.hypot(q.anchorX-p.x,q.anchorY-p.y)<Math.max(140,cell*1.5)))shopLabels.push({x:p.x,y,text:'カード売り場',width:86,shop:true,anchorX:p.x,anchorY:p.y});
    }
   }
   for(const district of display.districts||[]){if(cell<24&&!major.has(district.name))continue;const p=screen(district);const text=String(district.name||'');labels.push({x:p.x,y:p.y,text,width:text.length*13+8});}
   labels.push({x:river.x+30,y:river.y+20,text:'信濃川',width:52});
   labels.push(...shopLabels);
   const intersects=(a,b)=>a.x<b.x+b.width+4&&a.x+a.width+4>b.x&&a.y<b.y+b.height+4&&a.y+a.height+4>b.y;
   const placed=layoutMapLabels(labels,{left:10,right:Math.max(30,width-64),top:height<450?55:130,bottom:height-64}).filter(label=>!label.shop||!obstacles.some(rect=>intersects(label,rect)));
   for(const label of placed){ctx.font=`bold ${label.goal?14:11}px sans-serif`;ctx.textAlign='left';ctx.lineJoin='round';ctx.strokeStyle='#fff';ctx.lineWidth=4;ctx.strokeText(label.text,label.x+4,label.y+15,label.width-8);ctx.fillStyle=label.goal?'#c13824':'#263934';ctx.fillText(label.text,label.x+4,label.y+15,label.width-8);}
   return {sizes,labels:placed};
  }
 };
}
