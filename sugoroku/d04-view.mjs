import {canAct, ownSeat} from './d04-core.mjs';

const messages = {
  CONNECTION: '接続が切れています', HAND_CONNECTION: '手札を確認できません', MATCH_NOT_FOUND: '対局が見つかりません',
  VERSION_MISMATCH: '対局の版が異なります。ページを更新してください', NOT_A_PARTICIPANT: 'この対局には参加していません',
  UNCONFIRMED_ACTION: '操作の結果を確認できません。再確認してください', STALE_REVISION: '対局が進みました。もう一度選んでください',
  STORAGE: '操作の記録を保存できません', SOLD: 'この物件は購入済みです', INSUFFICIENT_FUNDS: 'お金が足りません',
  HAND_FULL: '手札がいっぱいです', MATCH_FINISHED: 'この対局は終了しました', NOT_YOUR_TURN: 'ほかの旅人の番です',
  INVALID_PHASE: '今はその操作はできません', INVALID_ARGUMENT: '入力や選択を確認してください',
  MATCH_FULL: 'この対局は満席です', NOT_HOST: '出発できるのは対局をつくった人です', NOT_READY: '全員の準備ができるまでお待ちください',
  NOT_PARTICIPANT: 'この対局には参加していません', NOT_FOUND: '対局が見つかりません。招待コードを確認してください',
  ACTION_ID_REUSED: '操作の記録が一致しません。再読み込みして確認してください',
  RNG_EXHAUSTED: '対局の抽選処理で問題が起きました。管理者にお知らせください',
};
const element = (tag, text, className) => {const el = document.createElement(tag); if (text) el.textContent = text; if (className) el.className = className; return el;};

export function createView(bridge) {
  const $ = id => document.getElementById(id);
  let session = null, commands = null, lobbyRequested = false, entryRequested = false, panel = null, dismissedResult = null, activeLife = false, inviteCode = '';
  let dicePicking = false;
  const lobby = element('section', '', 'd04-lobby'); lobby.id = 'd04Lobby';
  const heading = element('h2', 'ながおかスゴ録');
  const back = element('a', '遊び方を選び直す'); back.href = '?';
  const nameLabel = element('label', '名前'); const name = element('input'); name.maxLength = 12; name.autocomplete = 'nickname'; name.value = '旅人'; nameLabel.appendChild(name);
  const create = element('button', '部屋をつくる');
  const codeLabel = element('label', '招待コード'); const code = element('input'); code.autocomplete = 'off'; code.maxLength = 120; codeLabel.appendChild(code);
  const join = element('button', 'コードで参加', 'ghost');
  const entry = element('div', '', 'd04-entry'); entry.append(nameLabel, create, codeLabel, join);
  const invite = element('p'); const members = element('ul', '', 'd04-members');
  const copyInvite = element('button', '招待コードをコピー', 'ghost'); copyInvite.hidden = true;
  copyInvite.onclick = async () => {try {await navigator.clipboard.writeText(inviteCode); status.textContent = 'コピーしました';} catch {status.textContent = inviteCode;}};
  const other = element('button', '別の対局に参加', 'ghost'); other.onclick = () => {entryRequested = true; render();};
  const readyLabel = element('label', '', 'd04-ready'); const ready = element('input'); ready.type = 'checkbox'; readyLabel.append(ready, document.createTextNode('準備できた'));
  const start = element('button', '出発'); const close = element('button', '閉じる', 'ghost');
  const status = element('p'); status.setAttribute('role', 'status');
  lobby.append(heading, back, entry, invite, copyInvite, members, readyLabel, start, other, close, status); $('wrap').appendChild(lobby);
  const retry = element('button', '再確認', 'ghost'); retry.id = 'd04Retry'; retry.hidden = true; $('panel').appendChild(retry);
  const cardName = id => bridge.cards.find(c => c.id === id)?.name || id;
  const propertyName = id => bridge.catalog.properties.find(p => p.id === id)?.name || id;
  const current = () => session?.game;

  function lifecycle(api, body) { if (activeLife || dicePicking) return; commands.lifecycle(api, body).catch(() => {}); }
  create.onclick = () => lifecycle('sugorokuCreateMatch', {name: name.value.trim() || '旅人'});
  join.onclick = () => {if (code.value.trim()) lifecycle('sugorokuJoinMatch', {name: name.value.trim() || '旅人', inviteCode: code.value.trim()});};
  ready.onchange = () => lifecycle('sugorokuSetReady', {matchId: session.matchId, expectedRevision: current().revision, ready: ready.checked});
  start.onclick = () => lifecycle('sugorokuStartMatch', {matchId: session.matchId, expectedRevision: current().revision});
  close.onclick = () => {lobbyRequested = false; render();};
  retry.onclick = () => commands.retry(code.value.trim());

  async function action(type, payload, revision) {
    if (!session || current()?.revision !== revision || activeLife || dicePicking) return;
    if(type === 'ROLL' && globalThis.TRAVEL_UI?.spin) {
      const matchId=session.matchId;
      dicePicking=true;render();
      try {
        if(!await globalThis.TRAVEL_UI.spin() || session.matchId!==matchId || current()?.revision!==revision)return;
        const result=await session.send(type,payload);
        if(result?.status==='applied' && result.result?.faces && session.matchId===matchId) await globalThis.TRAVEL_UI.dice(result.result.faces);
      } catch {session.error='CONNECTION';}
      finally {dicePicking=false;render();}
      return;
    }
    session.send(type, payload).catch(() => {session.error = 'CONNECTION'; session.posting = false; render();});
  }
  function hideCard() {$('card').style.display = 'none'; $('wrap').classList.remove('results-open');}
  function renderCard(game, own) {
    const final = game.status === 'finished' && (dismissedResult !== session.matchId || panel === 'rank');
    const purchase = game.phase === 'await_purchase' && game.activeSeat === own;
    if (purchase) panel = null;
    if (!final && !purchase && !panel) {hideCard(); return;}
    const body = $('cBody'); body.replaceChildren(); $('cBuy').style.display = 'none'; $('card').style.display = 'block';
    $('wrap').classList.toggle('results-open', final || !!panel);
    $('cSkip').textContent = '閉じる'; $('cSkip').disabled = purchase && (session.blocked || activeLife);
    $('cSkip').onclick = () => {if (purchase) action('CLOSE_PURCHASE', {}, game.revision); else {dismissedResult = session.matchId; panel = null; hideCard();}};
    if (final || panel === 'rank') {
      $('cTitle').textContent = final ? '3年の旅の結果' : '総資産';
      const rows = game.finalResults?.rows || Object.entries(game.seats).map(([id, seat]) => ({name: seat.name, total: seat.money + bridge.catalog.properties.filter(p => game.propertyOwners[p.id] === id).reduce((n, p) => n + p.price, 0)})).sort((a, b) => b.total - a.total);
      rows.forEach((row, i) => body.appendChild(element('p', `${row.rank || i + 1}位 ${row.name}　${row.total}万両`)));
      if (final) {
        $('cBuy').style.display = ''; $('cBuy').textContent = '再戦'; $('cBuy').disabled = session.blocked || activeLife;
        $('cBuy').onclick = () => lifecycle('sugorokuRematch', {matchId: session.matchId, expectedRevision: game.revision});
      }
    } else if (panel === 'assets' && !purchase) {
      $('cTitle').textContent = '持ち物件'; const ids = Object.keys(game.propertyOwners).filter(id => game.propertyOwners[id] === own);
      if (!ids.length) body.appendChild(element('p', 'まだ物件はありません'));
      ids.forEach(id => body.appendChild(element('p', propertyName(id))));
    } else if (purchase) {
      const shop = game.turnContext.purchase; $('cTitle').textContent = shop.kind === 'cards' ? 'カード売り場' : ['investment', 'invest'].includes(shop.kind) ? '米百俵' : '物件';
      shop.offers.forEach(offer => {
        const type = shop.kind === 'cards' ? 'BUY_CARD' : ['investment', 'invest'].includes(shop.kind) ? 'INVEST' : 'BUY_PROPERTY';
        const payload = {[type === 'BUY_CARD' ? 'cardId' : type === 'INVEST' ? 'offerId' : 'propertyId']: offer.id};
        const row = element('div', '', 'd04-offer');
        row.appendChild(element('span', type === 'BUY_CARD' ? cardName(offer.id) : type === 'INVEST' ? '学びへの投資' : propertyName(offer.id)));
        const buy = element('button', `${offer.price}万両で買う`); buy.disabled = session.blocked || activeLife || !canAct(game, session.hand, session.uid, type, payload);
        buy.onclick = () => action(type, payload, game.revision); row.appendChild(buy); body.appendChild(row);
      });
    }
  }
  function render() {
    const game = current(); const own = ownSeat(game, session?.uid);
    const showLobby = !game || game.status === 'lobby' || lobbyRequested;
    lobby.hidden = !showLobby;
    entry.hidden = !!game && !entryRequested; other.hidden = game?.status !== 'finished' || entryRequested; members.replaceChildren();
    if (game) Object.entries(game.seats).forEach(([id, seat]) => members.appendChild(element('li', `${seat.name}${id === own ? '（あなた）' : ''}　${seat.kind === 'cpu' ? 'CPU' : seat.ready ? '準備OK' : '準備中'}`)));
    const locked = !session || session.blocked || activeLife || dicePicking;
    create.disabled = !commands || activeLife || !!session?.pending; join.disabled = create.disabled;
    readyLabel.hidden = game?.status !== 'lobby'; ready.disabled = locked; ready.checked = !!game?.seats[own]?.ready;
    start.hidden = game?.status !== 'lobby' || game?.hostUid !== session?.uid;
    start.disabled = locked || Object.values(game?.seats || {}).some(seat => seat.kind === 'human' && !seat.ready);
    close.hidden = !game || game.status === 'lobby';
    retry.hidden = !commands || !(session?.error || session?.pending || activeLife);
    status.textContent = messages[session?.error] || (session?.error ? '操作を完了できませんでした' : '');
    if (!game) { $('roll').disabled = true; return; }
    bridge.paint(game, session.uid);
    const me = game.seats[own]; $('money').textContent = me?.money ?? 0;
    const round = Math.max(1, Math.min(game.round, 108)); const month = (3 + Math.floor((round - 1) % 36 / 3)) % 12 + 1;
    $('date').textContent = game.status === 'finished' ? '3年の旅 終了' : `${1 + Math.floor((round - 1) / 36)}年目 ${month}月`;
    $('destTxt').textContent = game.destination ? `目的地: ${bridge.nodeName(game.destination.nodeId)}　あと${bridge.distance(me?.pos, game.destination.nodeId) ?? '-'}マス　援助金 ${game.destination.bonus}万両` : '出発前';
    if(game.destination) globalThis.TRAVEL_UI?.destination?.(bridge.nodeName(game.destination.nodeId),bridge.distance(me?.pos,game.destination.nodeId) ?? '-',game.destination.bonus);
    $('tip').textContent = '';
    const active = game.seats[game.activeSeat]?.name || '';
    const cpuBusy = session.cpuAdvance?.matchId === session.matchId && session.cpuAdvance?.epoch === session.epoch && game.status === 'playing' && game.seats[game.activeSeat]?.kind === 'cpu';
    const stateText = game.status === 'finished' ? '旅が終わりました' : game.status === 'lobby' ? '出発を待っています' : game.activeSeat !== own ? `${active}の番` : game.phase === 'await_direction' ? '進む道を選んでください' : game.phase === 'await_purchase' ? '買い物' : game.phase === 'await_roll' ? 'あなたの番' : '移動中';
    $('msg').textContent = messages[session.error] || (session.error ? '操作を完了できませんでした' : !session.online ? '接続を確認しています' : cpuBusy ? `${active || 'CPU'}が移動しています` : stateText);
    $('stock').textContent = session.posting ? '送信中' : session.pending ? '結果を確認中' : cpuBusy && session.online && !session.error ? 'CPU進行中' : `${Math.min(game.completedRounds, 108)} / 108`;
    $('roll').disabled = locked || showLobby || !canAct(game, session.hand, session.uid, 'ROLL');
    $('roll').onclick = () => action('ROLL', {}, game.revision);
    ['rank', 'assets', 'nameBtn'].forEach(id => {$(id).disabled = false;});
    $('nameBtn').textContent = '対局'; $('nameBtn').onclick = () => {lobbyRequested = true; render();};
    $('rank').onclick = () => {panel = 'rank'; renderCard(game, own);};
    $('assets').onclick = () => {panel = 'assets'; renderCard(game, own);};
    const hand = $('hand'); hand.replaceChildren();
    const cards = session.hand?.cards || [];
    hand.style.display = cards.length ? 'flex' : 'none'; hand.style.flexWrap = 'wrap';
    $('wrap').classList.toggle('has-hand', cards.length > 0); $('wrap').classList.toggle('hand2', cards.length >= 4); $('wrap').classList.toggle('hand3', cards.length >= 7);
    cards.forEach(card => {
      const button = element('button', cardName(card.cardId), 'ghost'); button.style.flex = '1 1 30%'; button.title = bridge.cards.find(c => c.id === card.cardId)?.desc || '';
      const payload = {cardInstanceId: card.instanceId}; button.disabled = locked || showLobby || !canAct(game, session.hand, session.uid, 'USE_CARD', payload);
      button.onclick = () => action('USE_CARD', payload, game.revision); hand.appendChild(button);
    });
    bridge.directions(game.phase === 'await_direction' && game.activeSeat === own && !showLobby ? game.turnContext.allowedNextNodes : [], id => action('CHOOSE_DIRECTION', {toNodeId: id}, game.revision), locked, game.turnContext?.remainingSteps);
    if (showLobby) hideCard(); else renderCard(game, own);
  }
  render();
  return {
    bind(value, handlers) {session = value; commands = handlers; render();}, render,
    busy(value) {activeLife = value; render();},
    invite(value) {inviteCode = value || ''; invite.textContent = value ? `招待コード: ${value}` : ''; copyInvite.hidden = !value;},
    message(value) {$('msg').textContent = value; status.textContent = value;},
    newMatch() {globalThis.TRAVEL_UI?.resetTokens?.(); panel = null; dismissedResult = null; lobbyRequested = false; entryRequested = false; inviteCode = ''; invite.textContent = ''; copyInvite.hidden = true; hideCard();},
  };
}
