import {D04Session, requestUuid} from './d04-core.mjs';
import {createView} from './d04-view.mjs';
import {catalogMatches} from './d04-catalog.mjs';
import {CpuAdvance} from './d04-advance.mjs';

async function start(bridge) {
  const view = createView(bridge);
  const emulator = new URLSearchParams(location.search).get('emu') === '1';
  const scope = emulator ? 'emulator-127.0.0.1' : 'production';
  try {
    const response = await fetch('./data/d04_catalog.json');
    if (!response.ok) throw new Error('カタログを読み込めません');
    const manifest = await response.json();
    if (!catalogMatches(bridge.catalog, manifest)) throw new Error('盤面の版が異なります。ページを更新してください');
    const {connectFirebase} = await import('./d04-firebase.mjs');
    const {uid, transport} = await connectFirebase(bridge.config, emulator);
    let advance;
    const session = new D04Session({uid, transport, storage: localStorage, scope, boardVersion: manifest.boardVersion, onChange: () => {view.render(); void advance?.tick();}});
    advance = new CpuAdvance(session);
    const lifeKey = `sugoroku_d04_lobby:${scope}:${uid}`;
    let pendingLife = null, lifeSending = false;
    try {pendingLife = JSON.parse(localStorage.getItem(lifeKey) || 'null');} catch { /* Invalid saved request is ignored. */ }
    const updateUrl = matchId => {const url = new URL(location.href); url.searchParams.set('mode', 'd04'); url.searchParams.set('match', matchId); history.replaceState(null, '', url);};
    async function performLife(inviteCode) {
      if (!pendingLife || lifeSending) return;
      if (pendingLife.api === 'sugorokuJoinMatch' && !inviteCode) {view.message('招待コードを入力して再確認してください'); return;}
      lifeSending = true; view.busy(true);
      try {
        const body = {...pendingLife.body}; if (inviteCode) body.inviteCode = inviteCode;
        const data = await transport.call(pendingLife.api, body);
        if (data?.status === 'rejected') {pendingLife = null; localStorage.removeItem(lifeKey); session.error = data.errorCode || 'CONNECTION'; return;}
        if (!/^sugo_[a-zA-Z0-9_-]{1,120}$/.test(data?.matchId || '') || !Number.isInteger(data.revisionAfter) || data.revisionAfter < 0) throw new Error('Invalid lifecycle response');
        const changedMatch = data.matchId !== session.matchId;
        if (changedMatch) view.newMatch();
        session.acknowledgeLifecycle(data);
        localStorage.removeItem(lifeKey); pendingLife = null;
        if (changedMatch) updateUrl(data.matchId);
        else await session.refresh();
        if (data.inviteCode) view.invite(data.inviteCode);
      } catch (error) {
        const definite = error.details?.errorCode || ({'functions/permission-denied': 'NOT_A_PARTICIPANT', 'functions/unauthenticated': 'CONNECTION', 'functions/invalid-argument': 'INVALID_ARGUMENT'})[error.code];
        if (definite) {pendingLife = null; localStorage.removeItem(lifeKey); session.error = definite;}
        else session.error = 'UNCONFIRMED_ACTION';
      }
      finally {lifeSending = false; view.busy(!!pendingLife); view.render();}
    }
    const handlers = {
      async lifecycle(api, payload) {
        if (pendingLife || lifeSending || session.pending || session.posting) return;
        const {inviteCode, ...body} = payload;
        pendingLife = {api, body: {...body, requestId: `${uid}:${requestUuid()}`}};
        try {localStorage.setItem(lifeKey, JSON.stringify(pendingLife));} catch {pendingLife = null; session.error = 'STORAGE'; view.render(); return;}
        await performLife(inviteCode);
      },
      async retry(inviteCode) {
        advance.reset();
        if (pendingLife) return performLife(inviteCode);
        if (session.pending) return session.retryPending();
        if (session.matchId) return session.refresh().catch(() => {session.setOffline();});
      },
    };
    view.bind(session, handlers);
    const matchId = session.pending?.body.matchId || new URLSearchParams(location.search).get('match') || session.saved.matchId;
    if (matchId) {session.connect(matchId); updateUrl(matchId);}
    if (pendingLife) {view.busy(true); view.message('前の操作の結果を再確認してください');}
    addEventListener('offline', () => session.setOffline());
    addEventListener('online', () => {advance.reset(); if (session.matchId) session.refresh().catch(() => session.setOffline());});
    addEventListener('pagehide', () => session.disconnect());
    addEventListener('pageshow', event => {if (event.persisted && session.matchId) session.connect(session.matchId);});
  } catch (error) {view.message(['カタログを読み込めません', '盤面の版が異なります。ページを更新してください'].includes(error.message) ? error.message : '接続できませんでした。ページを更新して再確認してください');}
}

if (globalThis.SUGOROKU_D04_VIEW) start(globalThis.SUGOROKU_D04_VIEW);
