const manifestURL=new URL('./assets/art/field/v1/manifest.json',import.meta.url);
const roads={1:'end_N',2:'end_E',4:'end_S',8:'end_W',5:'NS',10:'EW',3:'NE',6:'ES',12:'SW',9:'WN',7:'NES',14:'ESW',13:'SWN',11:'WNE',15:'NESW'};
export function roadId(node,neighbors){
 let mask=0;
 for(const n of neighbors){const dx=n.x-node.x,dy=n.y-node.y;if(Math.abs(dx)+Math.abs(dy)!==1)throw new Error('Non-grid road');mask|=dy===-1?1:dx===1?2:dy===1?4:8;}
 return roads[mask]?'road_'+roads[mask]:null;
}
export function validateManifest(m){
 if(m?.schemaVersion!==1||m.tilePixels!==512||m.logicalPixels!==256||!m.assets)throw new Error('Invalid field manifest');
 const b=m.trialBounds;
 if(!b||!['minX','maxX','minY','maxY'].every(k=>Number.isInteger(b[k]))||b.maxX<b.minX||b.maxY<b.minY||(b.maxX-b.minX+1)*(b.maxY-b.minY+1)>400)throw new Error('Invalid trial bounds');
 for(const a of Object.values(m.assets))if(!/^tiles\/[a-zA-Z0-9_]+\.png$/.test(a.src)||!Array.isArray(a.anchor)||a.anchor.length!==2||!a.anchor.every(n=>Number.isFinite(n)&&n>=0&&n<=1)||!Array.isArray(a.footprint)||a.footprint.length!==2||!a.footprint.every(n=>n===1)||!['ground','road','building'].includes(a.layer))throw new Error('Invalid field asset');
 for(const id of ['ground_town_01',...Object.values(roads).map(k=>'road_'+k)])if(!m.assets[id])throw new Error('Missing field tile');
 return m;
}
export function createFieldLayer(display,{redraw=()=>{},imageFactory=()=>new Image(),fetcher=url=>fetch(url)}={}){
 let manifest=null,disposed=false;const images=new Map(),pending=new Set();
 const byId=new Map(display.nodes.map(n=>[n.id,n])),adj=new Map(display.nodes.map(n=>[n.id,[]]));
 for(const e of display.edges){const [a,b]=Array.isArray(e)?e:[e.a,e.b];adj.get(a).push(byId.get(b));adj.get(b).push(byId.get(a));}
 const routeTiles=new Map(display.nodes.map(n=>[n.id,roadId(n,adj.get(n.id))]));
 const inside=n=>!!manifest&&n.x>=manifest.trialBounds.minX&&n.x<=manifest.trialBounds.maxX&&n.y>=manifest.trialBounds.minY&&n.y<=manifest.trialBounds.maxY;
 const ready=(async()=>{
  try{
   const response=await fetcher(manifestURL);if(!response.ok)throw new Error('Field unavailable');
   const next=validateManifest(await response.json());if(next.boardVersion!==display.boardVersion||disposed)return false;
   await Promise.all(Object.entries(next.assets).map(([id,a])=>new Promise((resolve,reject)=>{
    const im=imageFactory();const finish=ok=>{clearTimeout(timer);pending.delete(cancel);im.onload=null;im.onerror=null;if(ok){images.set(id,im);resolve();}else reject(new Error('Field image unavailable'));};
    const cancel=()=>finish(false),timer=setTimeout(cancel,15000);pending.add(cancel);
    im.onload=()=>finish(im.naturalWidth===512&&im.naturalHeight===512);im.onerror=cancel;im.src=new URL(a.src,manifestURL).href;
   })));
   if(disposed)return false;manifest=next;redraw();return true;
  }catch{for(const cancel of [...pending])cancel();images.clear();return false;}
 })();
 function paint(ctx,id,p,w,h=w){const a=manifest?.assets[id],im=images.get(id);if(!a||!im)return null;const r={x:p.x-w*a.anchor[0],y:p.y-h*a.anchor[1],width:w,height:h};ctx.drawImage(im,r.x,r.y,w,h);return r;}
 return {ready,inside,
  dispose(){disposed=true;manifest=null;for(const cancel of [...pending])cancel();images.clear();},
  ground(ctx,screen,cell,width,height){if(!manifest)return;const b=manifest.trialBounds;
   // Non-seamless trial art is retained on disk, not repeated across the map.
   if(!manifest.groundSeamless)return;
   for(let y=b.minY;y<=b.maxY;y++)for(let x=b.minX;x<=b.maxX;x++){const p=screen({x,y});if(p.x+cell/2<0||p.x-cell/2>width||p.y+cell/2<0||p.y-cell/2>height)continue;
    // Share snapped boundaries, avoiding transparent cracks at fractional zoom.
    const left=Math.round(p.x-cell/2),top=Math.round(p.y-cell/2),right=Math.round(p.x+cell/2),bottom=Math.round(p.y+cell/2);
    ctx.drawImage(images.get('ground_town_01'),left,top,right-left,bottom-top);
   }
  },
  roads(ctx,screen,cell){if(!manifest)return;for(const n of display.nodes)if(inside(n))paint(ctx,routeTiles.get(n.id),screen(n),cell);},
  decoration(lot){if(!inside(lot))return null;const keys=['decor_shop_01','decor_house_01','decor_tree_broad_01'];return keys[((lot.x*7+lot.y*3)%3+3)%3];},
  landmark(n){const key='landmark_'+n.station;return inside(n)&&manifest.assets[key]?key:null;},
  paint
 };
}
