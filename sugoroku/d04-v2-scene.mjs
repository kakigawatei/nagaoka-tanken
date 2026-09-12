import {createV2Terrain} from './v2-terrain.mjs';
import {mapSpriteSizes} from './grid-board.mjs';

export const V2_BOARD='fe0edaae5362b5d3';
const colors={blue:'#3984c4',red:'#d9552f',yellow:'#e3bd3c',plain:'#fffdf7',dest:'#3f977e',prop:'#9968ad'};
export function createV2GridScene(display,{redraw=()=>{},imageFactory=()=>new Image(),fieldFetcher=fetch}={}){
 const anchors={},byId=new Map(display.nodes.map(n=>[n.id,n]));
 const order=display.trace?.provisionalStations||display.nodes.filter(n=>n.station).map(n=>({station:n.station}));
 const places=order.map((s,i)=>{const n=display.nodes.find(n=>n.station===s.station);return {number:i+1,id:n.id,name:n.name};});
 let disposed=false,labels=[];
 const controller=new AbortController();
 const terrain=createV2Terrain(display,{imageFactory,anchors,redraw:()=>{if(!disposed)redraw();}});
 const anchorReady=Promise.resolve().then(()=>fieldFetcher(new URL('./assets/art/field/v1/landmark_anchors.json',import.meta.url),{signal:controller.signal}))
  .then(async r=>{if(!r.ok)throw new Error('ANCHORS_UNAVAILABLE');const data=await r.json();
   for(const n of display.nodes.filter(n=>n.station)){const a=data[n.station];if(!Array.isArray(a)||a.length!==2||!a.every(v=>Number.isFinite(v)&&v>=0&&v<=1))throw new Error('ANCHOR_INVALID');}
   if(!disposed){Object.assign(anchors,data);redraw();}return [];
  }).catch(()=>['landmark_anchors.json']);
 return {
  kind:'v2-terrain',places,
  fieldReady:Promise.all([terrain.ready,anchorReady]).then(([r,missing])=>({missing:[...r.missing,...missing]})),
  dispose(){disposed=true;controller.abort();terrain.dispose();labels=[];},
  hitTest(x,y){return labels.find(l=>!l.hidden&&x>=l.x&&x<=l.x+l.width&&y>=l.y&&y<=l.y+l.height)?.number;},
  draw(ctx,{screen,width,height,cell,goal,owner=()=>null,shops=new Set(),path=[],tokens=[],labelTop=height<450?55:130,labelBottom=height-64}){
   const sizes=mapSpriteSizes(cell);if(disposed)return {sizes,labels:[]};
   ctx.textAlign='left';ctx.textBaseline='alphabetic';
   const side=Math.min(23,cell*.38);
   const obstacles=tokens.map(p=>({x:p.x-sizes.token/2-5,y:p.y-sizes.token-8,width:sizes.token+10,height:sizes.token+12}));
   labels=terrain.draw(ctx,{screen,width,height,cell,labelTop,labelBottom,labelWidth:Math.max(30,width-70),obstacles,
    beforePlaces(){
     ctx.save();
     if(path.length>1){ctx.beginPath();path.forEach((id,i)=>{const p=screen(byId.get(id));i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y);});ctx.strokeStyle='#d9552f';ctx.lineWidth=Math.max(2,Math.min(5,cell*.08));ctx.stroke();}
     for(const n of display.nodes){const p=screen(n);if(p.x<-30||p.x>width+30||p.y<-30||p.y>height+30)continue;
      // Keep the overview road continuous; the destination remains visible.
      if(cell<16&&n.id!==goal)continue;
      const owned=n.prop?owner(n.prop):null;
      ctx.fillStyle=n.prop?colors.prop:colors[n.t]||colors.plain;ctx.fillRect(p.x-side/2,p.y-side/2,side,side);
      ctx.strokeStyle=owned==='you'?'#e0b84a':owned?'#9c8bd6':'#fff';ctx.lineWidth=owned?3:Math.min(2,Math.max(.5,cell*.04));ctx.strokeRect(p.x-side/2,p.y-side/2,side,side);
      if(shops.has(n.id)&&cell>=32){ctx.fillStyle='#724a1f';ctx.fillRect(p.x-side*.18,p.y-side*.18,side*.36,side*.36);}
      if(n.id===goal){ctx.strokeStyle='#d9552f';ctx.lineWidth=3;ctx.strokeRect(p.x-side/2-4,p.y-side/2-4,side+8,side+8);}
     }ctx.restore();
    }
   })||[];
   return {sizes,labels};
  }
 };
}
