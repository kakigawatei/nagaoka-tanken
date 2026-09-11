export const landmarks=[
  {key:'nagaoka_st',name:'長岡駅',x:7,y:7,art:'nagaoka_st'},
  {key:'aore',name:'アオーレ長岡',x:5,y:8,art:'aore'},
  {key:'honmaru',name:'長岡城本丸跡',x:6,y:9,art:'honmaru'},
  {key:'isoroku',name:'山本五十六記念館',x:5,y:2},
  {key:'tsuginosuke',name:'河井継之助記念館',x:9,y:3},
  {key:'kakigawa',name:'柿川',x:2,y:11}
];
// Schematic connections, not a reconstruction of individual real streets.
const corridors=[[[2,3],[9,3]],[[2,7],[9,7]],[[2,9],[9,9]],[[2,11],[7,11]],[[2,3],[2,11]],[[5,2],[5,11]],[[7,3],[7,11]],[[9,3],[9,9]]];
export function buildBoard(){
  const nodes=[],edges=[],adj={},byCoord=new Map(),edgeKeys=new Set();
  const node=(x,y)=>{const key=`${x},${y}`;if(!byCoord.has(key)){const id=nodes.length;byCoord.set(key,id);nodes.push({id,x,y,type:['blue','plain','plain','red','plain','yellow'][id%6]});adj[id]=[];}return byCoord.get(key);};
  for(const [[x0,y0],[x1,y1]] of corridors){
    if(x0!==x1&&y0!==y1)throw new Error('DIAGONAL');
    const dx=Math.sign(x1-x0),dy=Math.sign(y1-y0),length=Math.abs(x1-x0)+Math.abs(y1-y0);let prev=node(x0,y0);
    for(let i=1;i<=length;i++){const next=node(x0+dx*i,y0+dy*i),key=[prev,next].sort((a,b)=>a-b).join(':');if(!edgeKeys.has(key)){edges.push([prev,next]);adj[prev].push(next);adj[next].push(prev);edgeKeys.add(key);}prev=next;}
  }
  const places=landmarks.map(p=>({...p,id:byCoord.get(`${p.x},${p.y}`)}));
  for(const p of places)Object.assign(nodes[p.id],{type:'place',place:p});
  const shops=[{name:'駅前のおみやげ屋',x:7,y:5,price:200},{name:'まちなかの食堂',x:2,y:7,price:300},{name:'川沿いの甘味処',x:5,y:11,price:250}];
  for(const shop of shops)Object.assign(nodes[byCoord.get(`${shop.x},${shop.y}`)],{type:'shop',shop});
  return {nodes,edges,adj,places,start:places[0].id,destination:places[1].id};
}
export function distances(adj,goal){const d={[goal]:0},q=[goal];for(let i=0;i<q.length;i++)for(const id of adj[q[i]])if(d[id]===undefined){d[id]=d[q[i]]+1;q.push(id);}return d;}
