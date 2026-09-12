const manifestURL=new URL('./assets/art/field/v1/manifest.json',import.meta.url);
const roads={1:'end_N',2:'end_E',4:'end_S',8:'end_W',5:'NS',10:'EW',3:'NE',6:'ES',12:'SW',9:'WN',7:'NES',14:'ESW',13:'SWN',11:'WNE',15:'NESW'};
const decorPools={
 town:['house_01','house_02','shop_01','shop_02','flower_01','flower_01','tree_broad_01','tree_broad_02'],
 rural:['rice_01','rice_02','rice_01','rice_02','rice_01','rice_02','house_01','tree_broad_01'],
 hill:['tree_conifer_01','tree_conifer_02','tree_conifer_01','tree_conifer_02','rock_01','rock_01','tree_broad_02','house_02']
};
export function decorationId(lot){
 const pool=decorPools[lot.region]||decorPools.rural;
 // Integer mixing avoids stripes on the scenery lattice, including negative coordinates.
 let hash=(Math.imul(lot.x|0,73856093)^Math.imul(lot.y|0,19349663))>>>0;
 hash=Math.imul(hash^(hash>>>16),0x45d9f3b)>>>0;hash=(hash^(hash>>>16))>>>0;
 return 'decor_'+pool[hash%pool.length];
}
export function roadId(node,neighbors){
 let mask=0;
 for(const n of neighbors){const dx=n.x-node.x,dy=n.y-node.y;if(Math.abs(dx)+Math.abs(dy)!==1)throw new Error('Non-grid road');mask|=dy===-1?1:dx===1?2:dy===1?4:8;}
 return roads[mask]?'road_'+roads[mask]:null;
}
export function decorationLots(display,density){
 if(!density)return display.scenery||[];
 const occupied=new Set(display.nodes.map(n=>`${n.x},${n.y}`)),lots=new Map();
 for(const n of display.nodes){const radius=density[n.region]??1;
  for(let dy=-radius;dy<=radius;dy++)for(let dx=-radius;dx<=radius;dx++){
   const x=n.x+dx,y=n.y+dy,key=`${x},${y}`,distance=Math.abs(dx)+Math.abs(dy);
   if(occupied.has(key)||x===-2||(y===12&&x>=1&&x<=8))continue;
   const old=lots.get(key);if(!old||distance<old.distance)lots.set(key,{x,y,region:n.region,distance});
  }
 }
 return [...lots.values()].sort((a,b)=>a.y-b.y||a.x-b.x).map(({distance,...lot})=>lot);
}
export function validateManifest(m){
 if(m?.schemaVersion!==1||m.tilePixels!==512||m.logicalPixels!==256||!m.assets)throw new Error('Invalid field manifest');
 const b=m.trialBounds;
 if(!b||!['minX','maxX','minY','maxY'].every(k=>Number.isInteger(b[k]))||b.maxX<b.minX||b.maxY<b.minY||(b.maxX-b.minX+1)*(b.maxY-b.minY+1)>12000)throw new Error('Invalid trial bounds');
 for(const a of Object.values(m.assets))if(!/^tiles\/[a-zA-Z0-9_]+\.png$/.test(a.src)||!Array.isArray(a.anchor)||a.anchor.length!==2||!a.anchor.every(n=>Number.isFinite(n)&&n>=0&&n<=1)||!Array.isArray(a.footprint)||a.footprint.length!==2||!a.footprint.every(n=>n===1)||!['ground','road','building'].includes(a.layer))throw new Error('Invalid field asset');
 for(const id of ['ground_town_01',...Object.values(roads).map(k=>'road_'+k)])if(!m.assets[id])throw new Error('Missing field tile');
 if(m.groundSeamless===true&&(!m.groundTile||m.assets[m.groundTile]?.layer!=='ground'))throw new Error('Invalid active ground');
 if(m.groundByRegion)for(const region of ['town','rural','hill'])if(m.assets[m.groundByRegion[region]]?.layer!=='ground')throw new Error('Invalid regional ground');
 for(const a of Object.values(m.assets))if(a.scale!==undefined&&(!Number.isFinite(a.scale)||a.scale<0.5||a.scale>2||a.layer!=='building'))throw new Error('Invalid field scale');
 if(m.decorationRadius)for(const key of ['town','rural','hill'])if(!Number.isInteger(m.decorationRadius[key])||m.decorationRadius[key]<1||m.decorationRadius[key]>2)throw new Error('Invalid decoration density');
 return m;
}
export function createFieldLayer(display,{redraw=()=>{},imageFactory=()=>new Image(),fetcher=url=>fetch(url)}={}){
 let manifest=null,disposed=false,lots=display.scenery||[];const images=new Map(),pending=new Set();
 const byId=new Map(display.nodes.map(n=>[n.id,n])),adj=new Map(display.nodes.map(n=>[n.id,[]]));
 for(const e of display.edges){const [a,b]=Array.isArray(e)?e:[e.a,e.b];adj.get(a).push(byId.get(b));adj.get(b).push(byId.get(a));}
 const routeTiles=new Map(display.nodes.map(n=>[n.id,roadId(n,adj.get(n.id))]));
 const occupied=new Set(display.nodes.map(n=>`${n.x},${n.y}`)),regions=new Map();
 const regionAt=n=>{const key=`${n.x},${n.y}`;if(!regions.has(key)){const nearest=display.nodes.reduce((a,b)=>Math.abs(a.x-n.x)+Math.abs(a.y-n.y)<=Math.abs(b.x-n.x)+Math.abs(b.y-n.y)?a:b);regions.set(key,['town','rural','hill'].includes(nearest.region)?nearest.region:'rural');}return regions.get(key);};
 const inside=n=>!!manifest&&n.x>=manifest.trialBounds.minX&&n.x<=manifest.trialBounds.maxX&&n.y>=manifest.trialBounds.minY&&n.y<=manifest.trialBounds.maxY;
 const ready=(async()=>{
  try{
   const response=await fetcher(manifestURL);if(!response.ok)throw new Error('Field unavailable');
   const next=validateManifest(await response.json());if(next.boardVersion!==display.boardVersion||disposed)return false;
   await Promise.all(Object.entries(next.assets).map(([id,a])=>new Promise((resolve,reject)=>{
    const im=imageFactory();const finish=ok=>{clearTimeout(timer);pending.delete(cancel);im.onload=null;im.onerror=null;if(ok){images.set(id,im);resolve();}else if(id.startsWith('landmark_'))resolve();else reject(new Error('Field image unavailable'));};
    const cancel=()=>finish(false),timer=setTimeout(cancel,15000);pending.add(cancel);
    im.onload=()=>finish(im.naturalWidth===512&&im.naturalHeight===512);im.onerror=cancel;im.src=new URL(a.src,manifestURL).href;
   })));
   if(disposed)return false;manifest=next;lots=decorationLots(display,next.decorationRadius);redraw();return true;
  }catch{for(const cancel of [...pending])cancel();images.clear();return false;}
 })();
 function paint(ctx,id,p,w,h=w){const a=manifest?.assets[id],im=images.get(id);if(!a||!im)return null;w*=a.scale??1;h*=a.scale??1;const r={x:p.x-w*a.anchor[0],y:p.y-h*a.anchor[1],width:w,height:h};ctx.drawImage(im,r.x,r.y,w,h);return r;}
 return {ready,inside,lots:()=>lots,
  dispose(){disposed=true;manifest=null;for(const cancel of [...pending])cancel();images.clear();regions.clear();},
  ground(ctx,screen,cell,width,height){if(!manifest)return;const b=manifest.trialBounds;
   // Non-seamless trial art is retained on disk, not repeated across the map.
   if(manifest.groundSeamless!==true)return;
   const origin=screen({x:0,y:0});
   const minX=Math.max(b.minX,Math.floor((-origin.x-cell/2)/cell)),maxX=Math.min(b.maxX,Math.ceil((width-origin.x+cell/2)/cell));
   const minY=Math.max(b.minY,Math.floor((-origin.y-cell/2)/cell)),maxY=Math.min(b.maxY,Math.ceil((height-origin.y+cell/2)/cell));
   for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++){const p=screen({x,y});if(p.x+cell/2<0||p.x-cell/2>width||p.y+cell/2<0||p.y-cell/2>height)continue;
    // Share snapped boundaries, avoiding transparent cracks at fractional zoom.
    const left=Math.round(p.x-cell/2),top=Math.round(p.y-cell/2),right=Math.round(p.x+cell/2),bottom=Math.round(p.y+cell/2);
    ctx.drawImage(images.get(manifest.groundByRegion?.[regionAt({x,y})]||manifest.groundTile),left,top,right-left,bottom-top);
   }
  },
  roads(ctx,screen,cell){if(!manifest)return;for(const n of display.nodes)if(inside(n))paint(ctx,routeTiles.get(n.id),screen(n),cell);},
  decoration(lot){if(!inside(lot)||occupied.has(`${lot.x},${lot.y}`)||lot.x===-2||(lot.y===12&&lot.x>=1&&lot.x<=8))return null;const id=decorationId({...lot,region:lot.region||regionAt(lot)});return manifest.assets[id]?id:'decor_tree_broad_01';},
  landmark(n){const key='landmark_'+n.station;return inside(n)&&manifest.assets[key]&&images.has(key)?key:null;},
  paint
 };
}
