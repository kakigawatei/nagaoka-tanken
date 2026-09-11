import {canonical,catalogMatches} from './d04-catalog.mjs';
export const SUPPORTED_BOARDS=Object.freeze(['8060e7bdbda4cde3']);
const fail=code=>{throw Object.assign(new Error(code),{boardError:code});};
export async function fetchBoard(version,{fetcher=fetch,digest=bytes=>crypto.subtle.digest('SHA-256',bytes),supported=SUPPORTED_BOARDS}={}){
 if(!supported.includes(version)||!/^[0-9a-f]{16}$/.test(version))fail('VERSION_MISMATCH');
 const read=async name=>{const response=await fetcher(`./data/boards/${version}/${name}.json`);if(!response.ok)fail('BOARD_LOAD_FAILED');return response.json();};
 const [catalog,display]=await Promise.all([read('catalog'),read('display')]);
 const {boardVersion,...content}=catalog;
 const hash=Array.from(new Uint8Array(await digest(new TextEncoder().encode(canonical(content)))),v=>v.toString(16).padStart(2,'0')).join('').slice(0,16);
 if(boardVersion!==version||hash!==version||display.boardVersion!==version||!catalogMatches(display,catalog)||display.renderer!=='mercator-v1')fail('VERSION_MISMATCH');
 if(!display.nodes.every(n=>Number.isFinite(n.lat)&&Math.abs(n.lat)<85&&Number.isFinite(n.lng)))fail('VERSION_MISMATCH');
 return {catalog,display};
}

export class BoardConnection{
 constructor({session,bridge,load=fetchBoard,onReset=()=>{}}){Object.assign(this,{session,bridge,load,onReset});this.generation=0;}
 cancel(){this.generation++;this.session.disconnect();this.session.online=false;this.session.loading=false;}
 async open(matchId,minimumRevision=-1){
  const s=this.session;
  if(!/^sugo_[a-zA-Z0-9_-]{1,120}$/.test(matchId))fail('INVALID_MATCH');
  if(s.posting||s.pending&&s.pending.body.matchId!==matchId)fail('UNCONFIRMED_ACTION');
  const generation=++this.generation;
  s.disconnect();s.loading=true;s.online=false;s.error=null;s.emit();
  try{
   const game=await s.transport.readGame(matchId);
   if(generation!==this.generation)return false;
   if(!game)fail('MATCH_NOT_FOUND');
   if(!game.participantUids?.includes(s.uid))fail('NOT_A_PARTICIPANT');
   if(game.schemaVersion!==1||game.rulesVersion!=='d04-v1')fail('VERSION_MISMATCH');
   const assets=await this.load(game.boardVersion);
   if(generation!==this.generation)return false;
   this.onReset();this.bridge.installBoard(assets.display,assets.catalog);
   s.boardVersion=assets.catalog.boardVersion;s.loading=false;
   s.connect(matchId,minimumRevision);
   s.accept(game,true);
   return true;
  }catch(e){if(generation===this.generation){s.loading=false;s.online=false;s.error=e.boardError||'BOARD_LOAD_FAILED';s.emit();}throw e;}
 }
}
