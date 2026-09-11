import {extendRegionalBoard} from './grid-regional.mjs';
export function layoutMapLabels(items,bounds){
 const placed=[];
 const overlaps=(a,b)=>a.x<b.x+b.width+4&&a.x+a.width+4>b.x&&a.y<b.y+b.height+4&&a.y+a.height+4>b.y;
 for(const item of items){
  if(item.x<bounds.left||item.x>bounds.right||item.y<bounds.top||item.y>bounds.bottom)continue;
  const width=Math.min(item.width,bounds.right-bounds.left),height=20;
  for(const offset of [0,-24,24,-48,48]){
   const rect={...item,width,height,x:Math.max(bounds.left,Math.min(bounds.right-width,item.x-width/2)),y:Math.max(bounds.top,Math.min(bounds.bottom-height,item.y+offset))};
   if(placed.some(p=>overlaps(rect,p)))continue;placed.push(rect);break;
  }
 }
 return placed;
}
export const mapSpriteSizes=cell=>({token:Math.max(10,Math.min(48,cell*.73)),goal:Math.max(14,Math.min(72,cell)),place:Math.max(5,Math.min(48,cell*.7))});
export const landmarks=[
  {key:'nagaoka_st',name:'長岡駅',x:7,y:7,art:'nagaoka_st'},
  {key:'aore',name:'アオーレ長岡',x:5,y:8,art:'aore'},
  {key:'honmaru',name:'長岡城本丸跡',x:6,y:9,art:'honmaru'},
  {key:'isoroku',name:'山本五十六記念館',x:5,y:2},
  {key:'tsuginosuke',name:'河井継之助記念館',x:9,y:3},
  {key:'kakigawa',name:'柿川',x:2,y:11},
  {key:'yukyuzan',name:'悠久山公園',x:17,y:15}
];
// Schematic connections, not a reconstruction of individual real streets.
const corridors=[[[2,3],[9,3]],[[2,7],[9,7]],[[2,9],[9,9]],[[2,11],[7,11]],[[2,3],[2,11]],[[5,2],[5,11]],[[7,3],[7,11]],[[9,3],[9,9]]];
const regionalCorridors=[[[9,9],[17,9]],[[9,11],[17,11]],[[9,9],[9,11]],[[13,9],[13,15]],[[13,15],[17,15]],[[17,9],[17,15]]];
export const regionAt=(x)=>x<=9?'town':x<=14?'rural':'hill';
export function buildBoard(regional=false){
  const nodes=[],edges=[],adj={},byCoord=new Map(),edgeKeys=new Set();
  const node=(x,y)=>{const key=`${x},${y}`;if(!byCoord.has(key)){const id=nodes.length;byCoord.set(key,id);nodes.push({id,x,y,type:['blue','plain','plain','red','plain','yellow'][id%6]});adj[id]=[];}return byCoord.get(key);};
  for(const [[x0,y0],[x1,y1]] of [...corridors,...regionalCorridors]){
    if(x0!==x1&&y0!==y1)throw new Error('DIAGONAL');
    const dx=Math.sign(x1-x0),dy=Math.sign(y1-y0),length=Math.abs(x1-x0)+Math.abs(y1-y0);let prev=node(x0,y0);
    for(let i=1;i<=length;i++){const next=node(x0+dx*i,y0+dy*i),key=[prev,next].sort((a,b)=>a-b).join(':');if(!edgeKeys.has(key)){edges.push([prev,next]);adj[prev].push(next);adj[next].push(prev);edgeKeys.add(key);}prev=next;}
  }
  for(const n of nodes){
    n.region=regionAt(n.x);const pick=(n.x*7+n.y*3)%10;
    const palette=n.region==='town'?['shop','blue','shop','yellow','shop','plain','shop','red','blue','shop']:n.region==='rural'?['blue','blue','plain','blue','yellow','blue','red','blue','plain','blue']:['red','plain','red','blue','red','yellow','red','plain','red','blue'];
    n.type=palette[pick];if(n.type==='shop')n.shop={name:`まちの商店 ${n.id+1}`,price:150+(n.id%5)*50};
  }
  const places=landmarks.map(p=>({...p,id:byCoord.get(`${p.x},${p.y}`)}));
  for(const p of places){delete nodes[p.id].shop;Object.assign(nodes[p.id],{type:'place',place:p});}
  const shops=[{name:'駅前のおみやげ屋',x:7,y:5,price:200},{name:'まちなかの食堂',x:2,y:7,price:300},{name:'川沿いの甘味処',x:5,y:11,price:250}];
  for(const shop of shops)Object.assign(nodes[byCoord.get(`${shop.x},${shop.y}`)],{type:'shop',shop});
  const scenery=[];
  for(let x=1;x<=18;x++)for(let y=1;y<=16;y++){
    if(byCoord.has(`${x},${y}`)||!nodes.some(n=>Math.abs(n.x-x)+Math.abs(n.y-y)<=2))continue;
    if((x+y)%2)continue;scenery.push({x,y,region:regionAt(x)});
  }
  const board={nodes,edges,adj,places,scenery,start:places[0].id,destination:places[1].id};
  return regional?extendRegionalBoard(board):board;
}
export function distances(adj,goal){const d={[goal]:0},q=[goal];for(let i=0;i<q.length;i++)for(const id of adj[q[i]])if(d[id]===undefined){d[id]=d[q[i]]+1;q.push(id);}return d;}
