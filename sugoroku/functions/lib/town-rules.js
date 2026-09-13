// Shared by the solo client and the pure engine; no platform dependencies.
export const TOWN_RULES='d04-towns-v1';
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
