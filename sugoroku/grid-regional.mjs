import stations from './data/grid-stations.mjs';

// Hand-compressed district anchors. Routes are schematic, not real road traces.
const anchors={
 aoshiba:[19,13],saffron:[3,22],yoshinogawa:[5,21],murasaki:[7,20],hasegawa_sake:[7,24],
 kome100:[-6,-3],lyric:[-8,-4],kyuryo:[-19,20],umataka:[-16,8],rekihaku:[-17,12],
 kinpu:[6,-6],keyaki:[4,-5],takeakari:[-13,-10],wakinomachi:[-11,-8],
 hotoku:[-15,25],momiji:[-12,30],asahi:[-10,32],koryu:[17,28],yomogi_onsen:[19,26],
 togyu:[23,38],alpaca:[27,32],tanada:[19,35],oratar:[17,40],akiha:[32,0],gangi:[30,-3],
 tsuno:[-8,-17],kanetsugu:[-10,-19],teradomari_ichiba:[-17,-32],suizoku:[-19,-28],
 ryokan:[-28,-20],tsumairi:[-30,-18],tenryo:[-32,-16],ishii:[-29,-22],
 oguni_washi:[-28,43],hachikoku:[-33,37]
};
const chains=[
 ['nagaoka_st','kinpu','keyaki'],['yukyuzan','aoshiba'],
 ['kakigawa','murasaki','yoshinogawa','saffron','hasegawa_sake'],
 ['kome100','lyric','wakinomachi','takeakari','tsuno','kanetsugu','teradomari_ichiba','suizoku'],
 ['kanetsugu','ishii','ryokan','tsumairi','tenryo','suizoku'],
 ['lyric','umataka','rekihaku','kyuryo','hotoku','momiji','asahi','oguni_washi','hachikoku','kyuryo'],
 ['yukyuzan','yomogi_onsen','koryu','tanada','oratar','togyu','alpaca','yomogi_onsen'],
 ['aoshiba','akiha','gangi','kinpu']
];
const areaOf=s=>s.id==='kyuryo'?'川西':s.area;
export function extendRegionalBoard(base){
 const {nodes,edges,adj}=base,coords=new Map(nodes.map(n=>[`${n.x},${n.y}`,n.id]));
 const edgeKeys=new Set(edges.map(([a,b])=>[a,b].sort((a,b)=>a-b).join(':')));
 const node=(x,y)=>{const key=`${x},${y}`;if(coords.has(key))return coords.get(key);const id=nodes.length;nodes.push({id,x,y,type:'plain',region:'rural'});adj[id]=[];coords.set(key,id);return id;};
 const places=base.places.map(p=>({...p}));
 for(const s of stations){if(places.some(p=>p.key===s.id))continue;const [x,y]=anchors[s.id]||[];if(!Number.isInteger(x))throw new Error(`Missing anchor ${s.id}`);places.push({key:s.id,name:s.name,area:s.area,x,y,id:node(x,y)});}
 const byKey=Object.fromEntries(places.map(p=>[p.key,p]));
 const path=points=>{let [x,y]=points[0],prev=node(x,y);for(const [tx,ty] of points.slice(1)){if(x!==tx&&y!==ty)throw new Error('Diagonal route');while(x!==tx||y!==ty){x+=Math.sign(tx-x);y+=Math.sign(ty-y);const next=node(x,y),key=[prev,next].sort((a,b)=>a-b).join(':');if(!edgeKeys.has(key)){edgeKeys.add(key);edges.push([prev,next]);adj[prev].push(next);adj[next].push(prev);}prev=next;}}};
 const link=(a,b)=>path([[a.x,a.y],[b.x,a.y],[b.x,b.y]]);
 for(const chain of chains)for(let i=1;i<chain.length;i++)link(byKey[chain[i-1]],byKey[chain[i]]);
 // Explicit crossing corridors keep east/west networks separate elsewhere.
 path([[6,-6],[6,-3],[-6,-3]]);
 path([[2,7],[-16,7],[-16,8]]);
 path([[3,22],[-15,22],[-15,25]]);
 const hillAreas=new Set(['悠久山','よもぎ平','山古志','栃尾','小国']);
 for(const n of nodes){
  const nearest=places.reduce((a,b)=>Math.abs(a.x-n.x)+Math.abs(a.y-n.y)<=Math.abs(b.x-n.x)+Math.abs(b.y-n.y)?a:b);
  const distance=Math.abs(nearest.x-n.x)+Math.abs(nearest.y-n.y),source=stations.find(s=>s.id===nearest.key);
  n.area=areaOf(source);n.region=distance<=2?'town':hillAreas.has(n.area)?'hill':'rural';
  const pick=((n.x*7+n.y*3)%10+10)%10;
  const palette=n.region==='town'?['shop','blue','shop','yellow','shop','plain','shop','red','blue','shop']:n.region==='hill'?['red','red','plain','blue','red','yellow','red','plain','red','blue']:['blue','blue','plain','blue','yellow','blue','red','blue','plain','blue'];
  n.type=palette[pick];delete n.shop;delete n.place;
  if(n.type==='shop')n.shop={name:`${n.area}の${['みやげ処','食堂','工房'][n.id%3]}`,price:150+n.id%6*50};
 }
 for(const p of places){delete nodes[p.id].shop;Object.assign(nodes[p.id],{type:'place',place:p});}
 const scenery=[];for(const n of nodes)for(const [dx,dy] of [[1,1],[-1,-1]]){const x=n.x+dx,y=n.y+dy;if((x+y)%3||coords.has(`${x},${y}`)||scenery.some(s=>s.x===x&&s.y===y))continue;scenery.push({x,y,region:n.region});}
 const districts=[];for(const s of stations){const area=areaOf(s);if(districts.some(d=>d.name===area))continue;const p=byKey[s.id];districts.push({x:p.x,y:p.y-2,name:area});}
 return {...base,places,scenery,districts,regional:true};
}
