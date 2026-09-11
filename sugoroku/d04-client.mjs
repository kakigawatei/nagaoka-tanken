import {D04Session, requestUuid} from './d04-core.mjs';
import {createView} from './d04-view.mjs';
import {BoardConnection, SUPPORTED_BOARDS} from './d04-boards.mjs';
import {CpuAdvance} from './d04-advance.mjs';

async function start(bridge) {
  const view = createView(bridge);
  const emulator = new URLSearchParams(location.search).get('emu') === '1';
  const scope = emulator ? 'emulator-127.0.0.1' : 'production';
  try {
    const {connectFirebase} = await import('./d04-firebase.mjs');
    const {uid, transport} = await connectFirebase(bridge.config, emulator);
    let advance;
    const session = new D04Session({uid, transport, storage: localStorage, scope, boardVersion: null, onChange: () => {view.render(); if(!pendingLife&&!lifeSending)void advance?.tick();}});
    const connection=new BoardConnection({session,bridge,onReset:()=>view.newMatch()});
    let targetMatch=null;
    advance = new CpuAdvance(session);
    const lifeKey = `sugoroku_d04_lobby:${scope}:${uid}`;
    let pendingLife = null, lifeSending = false;
    try {pendingLife = JSON.parse(localStorage.getItem(lifeKey) || 'null');} catch { /* Invalid saved request is ignored. */ }
    const updateUrl = matchId => {const url = new URL(location.href); url.searchParams.set('mode', 'd04'); url.searchParams.set('match', matchId); history.replaceState(null, '', url);};
    async function performLife(inviteCode) {
      if (!pendingLife || lifeSending) return;
      if (pendingLife.api === 'sugorokuJoinMatch' && !pendingLife.result && !inviteCode) {view.message('招待コードを入力して再確認してください'); return;}
      lifeSending = true; view.busy(true);
      try {
        const body = {...pendingLife.body}; if (inviteCode) body.inviteCode = inviteCode;
        const data = pendingLife.result || await transport.call(pendingLife.api, body);
        if (data?.status === 'rejected') {pendingLife = null; localStorage.removeItem(lifeKey); session.error = data.errorCode || 'CONNECTION'; return;}
        if (!/^sugo_[a-zA-Z0-9_-]{1,120}$/.test(data?.matchId || '') || !Number.isInteger(data.revisionAfter) || data.revisionAfter < 0) throw new Error('Invalid lifecycle response');
        pendingLife.result=data;localStorage.setItem(lifeKey,JSON.stringify(pendingLife));
        const changedMatch = data.matchId !== session.matchId || !session.online;
        targetMatch=data.matchId;
        if(changedMatch){if(!await connection.open(data.matchId,data.revisionAfter))return;}
        else session.acknowledgeLifecycle(data);
        localStorage.removeItem(lifeKey); pendingLife = null;
        if (changedMatch) updateUrl(data.matchId);
        else await session.refresh();
        if (data.inviteCode) view.invite(data.inviteCode);
      } catch (error) {
        const definite = error.details?.errorCode || ({'functions/permission-denied': 'NOT_A_PARTICIPANT', 'functions/unauthenticated': 'CONNECTION', 'functions/invalid-argument': 'INVALID_ARGUMENT'})[error.code];
        if (definite) {pendingLife = null; localStorage.removeItem(lifeKey); session.error = definite;}
        else session.error = error.boardError || 'UNCONFIRMED_ACTION';
      }
      finally {lifeSending = false; view.busy(!!pendingLife); view.render();if(!pendingLife)void advance.tick();}
    }
    const handlers = {
      async lifecycle(api, payload) {
        if (pendingLife || lifeSending || session.pending || session.posting || session.loading) return;
        const {inviteCode, ...body} = payload;
        pendingLife = {api, body: {...body, ...(api==='sugorokuCreateMatch'?{supportedBoardVersions:[...SUPPORTED_BOARDS]}:{}), requestId: `${uid}:${requestUuid()}`}};
        try {localStorage.setItem(lifeKey, JSON.stringify(pendingLife));} catch {pendingLife = null; session.error = 'STORAGE'; view.render(); return;}
        await performLife(inviteCode);
      },
      async retry(inviteCode) {
        advance.reset();
        if (pendingLife) return performLife(inviteCode);
        if(session.loading)return;
        const id=session.pending?.body.matchId||targetMatch||session.matchId;
        if(id){try{if(await connection.open(id)){updateUrl(id);if(session.pending)await session.retryPending();}}catch{view.render();}}
      },
    };
    view.bind(session, handlers);
    const matchId = session.pending?.body.matchId || pendingLife?.result?.matchId || pendingLife?.body?.matchId || new URLSearchParams(location.search).get('match') || session.saved.matchId;
    targetMatch=matchId;
    addEventListener('offline', () => session.setOffline());
    addEventListener('online', () => {advance.reset(); if (!session.loading && !session.posting && !pendingLife && targetMatch) connection.open(targetMatch).catch(()=>view.render());});
    addEventListener('pagehide', () => connection.cancel());
    addEventListener('pageshow', event => {if (event.persisted && targetMatch && !session.posting) connection.open(targetMatch).catch(()=>view.render());});
    if (matchId) {try{if(await connection.open(matchId))updateUrl(matchId);}catch{view.render();}}
    if (pendingLife) {view.busy(true); view.message('前の操作の結果を再確認してください');}
  } catch (error) {view.message(['カタログを読み込めません', '盤面の版が異なります。ページを更新してください'].includes(error.message) ? error.message : '接続できませんでした。ページを更新して再確認してください');}
}

if (globalThis.SUGOROKU_D04_VIEW) start(globalThis.SUGOROKU_D04_VIEW);
