// Shared by the solo client and the pure engine; no platform dependencies.
export const TOWN_RULES='d04-towns-v1';
export function townDestinationPool(catalog,ids,dist,from,previous=null){
 const candidates=townCandidates(catalog.destinationNodeIds||ids,dist,from,previous);
 if(catalog.destinationPolicy!=='dead-end-bands-v1')return candidates;
 const ends=new Set(catalog.deadEndNodeIds),weight=catalog.deadEndWeight;
 if(!Number.isInteger(weight)||weight<1||weight>10)throw new Error('INVALID_DESTINATION_WEIGHT');
 return candidates.flatMap(id=>Array(ends.has(id)?weight:1).fill(id));
}
export function canBuyAtStop(catalog,node,destination){
 return !!node.prop&&(catalog?.stopPolicy!=='mixed-town-stops-v1'||node.t==='prop'||node.t==='dest'||node.id===destination);
}
export function townCandidates(ids,dist,from,previous=null){
 const reachable=ids.filter(id=>id!==from&&id!==previous&&Number.isFinite(dist[id])&&dist[id]>0);
 for(const [lo,hi] of [[10,60],[5,80],[1,100]]){
  const selected=reachable.filter(id=>dist[id]>=lo&&dist[id]<=hi);
  if(selected.length)return selected.sort((a,b)=>a-b);
 }
 if(!reachable.length)throw new Error('NO_DESTINATION');
 const nearest=Math.min(...reachable.map(id=>dist[id]));
 return reachable.filter(id=>dist[id]===nearest).sort((a,b)=>a-b);
}
