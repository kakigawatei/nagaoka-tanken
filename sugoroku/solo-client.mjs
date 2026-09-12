import {fetchBoard} from './d04-boards.mjs';
import {DISPLAY_RENDERERS} from './d04-renderers.mjs';
export const LEGACY_SOLO_BOARD='1e48703b19599772';
export const LEGACY_SOLO_KEY='nagaoka_sugoroku_solo_'+LEGACY_SOLO_BOARD;
export const SOLO_BOARD='fe0edaae5362b5d3';
export const SOLO_KEY='nagaoka_sugoroku_solo_'+SOLO_BOARD;
export const ACTIVE_SOLO_KEY='nagaoka_sugoroku_solo_active_board';
export const soloKey=version=>'nagaoka_sugoroku_solo_'+version;
export function selectSoloBoard(storage,defaultBoard=SOLO_BOARD){
 const active=storage.getItem(ACTIVE_SOLO_KEY);
 if(active){if(!/^[a-f0-9]{16}$/.test(active)||!storage.getItem(soloKey(active)))throw new Error('SAVE_VERSION_INVALID');return active;}
 if(storage.getItem(LEGACY_SOLO_KEY))return LEGACY_SOLO_BOARD;
 return storage.getItem(SOLO_KEY)?SOLO_BOARD:defaultBoard;
}
export function readSolo(storage,catalog){
 const raw=storage.getItem(soloKey(catalog.boardVersion));if(!raw)return null;
 const state=JSON.parse(raw),nodes=new Set(catalog.nodes.map(n=>n.id)),props=new Set(catalog.properties.map(p=>p.id));
 const validSeat=s=>s&&nodes.has(s.pos)&&Number.isFinite(s.money)&&Array.isArray(s.owned)&&s.owned.every(id=>props.has(id));
 if(state.boardVersion!==catalog.boardVersion||!validSeat(state)||state.dest!==null&&!nodes.has(state.dest)||!Array.isArray(state.rivals)||state.rivals.length!==3||!state.rivals.every(validSeat)||!Array.isArray(state.cards)||!Array.isArray(state.log)||!Number.isInteger(state.turn)||state.turn<0||state.turn>108)throw new Error('SAVE_INVALID');
 return state;
}
export function connectSolo(bridge,{load=fetchBoard,storage=localStorage,defaultBoard=SOLO_BOARD}={}){
 let pending=false,done=false;
 async function start(){
  if(pending||done)return;pending=true;bridge.loading();
  try{const version=selectSoloBoard(storage,defaultBoard);const {display,catalog}=await load(version);if(catalog.boardVersion!==version)throw new Error('SAVE_VERSION_MISMATCH');const state=readSolo(storage,catalog);bridge.boot(display,catalog,DISPLAY_RENDERERS[display.renderer],state);done=true;}
  catch{bridge.failed(start);}finally{pending=false;}
 }
 return start;
}
if(globalThis.SUGOROKU_SOLO_VIEW)connectSolo(globalThis.SUGOROKU_SOLO_VIEW)();
