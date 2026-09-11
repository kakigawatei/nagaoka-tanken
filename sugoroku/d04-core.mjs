export const MATCH_COLLECTION = 'sugoroku_matches';
export const REGION = 'asia-northeast1';
export function requestUuid() {
  if (crypto.randomUUID) return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64; bytes[8] = (bytes[8] & 63) | 128;
  const hex = [...bytes].map(n => n.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
export const ownSeat = (game, uid) => Object.entries(game?.seats || {}).find(([, seat]) => seat.uid === uid)?.[0] ?? null;
const copy = value => structuredClone(value);
const offers = game => game?.turnContext?.purchase?.offers || [];
const offerId = payload => payload.propertyId ?? payload.cardId ?? payload.offerId;

export function canAct(game, hand, uid, type, payload = {}) {
  const seatId = ownSeat(game, uid);
  if (!game || game.status !== 'playing' || !seatId || game.activeSeat !== seatId) return false;
  const seat = game.seats[seatId];
  if (type === 'ROLL') return game.phase === 'await_roll';
  if (type === 'USE_CARD') return game.phase === 'await_roll' && hand?.uid === uid && hand.cards?.some(c => c.instanceId === payload.cardInstanceId);
  if (type === 'CHOOSE_DIRECTION') return game.phase === 'await_direction' && game.turnContext?.allowedNextNodes?.includes(payload.toNodeId);
  if (game.phase !== 'await_purchase') return false;
  if (type === 'CLOSE_PURCHASE') return true;
  const offer = offers(game).find(o => o.id === offerId(payload));
  if (!offer || !Number.isFinite(offer.price) || offer.price < 0) return false;
  if (type === 'BUY_PROPERTY') return game.turnContext.purchase.kind === 'properties' && !game.propertyOwners[payload.propertyId] && seat.money >= offer.price;
  if (type === 'BUY_CARD') return game.turnContext.purchase.kind === 'cards' && seat.cardCount < 8 && seat.money - offer.price >= -1000;
  if (type === 'INVEST') return ['investment', 'invest'].includes(game.turnContext.purchase.kind) && seat.money >= offer.price;
  return false;
}

function intentOf(game, type, payload) {
  return {turnId: game.turnId, phase: game.phase, activeSeat: game.activeSeat,
    price: offers(game).find(o => o.id === offerId(payload))?.price ?? null, type};
}

// The transport owns Firebase; this controller never writes a game document.
export class D04Session {
  constructor({uid, transport, storage, scope = 'production', boardVersion, uuid = requestUuid, onChange = () => {}}) {
    Object.assign(this, {uid, transport, storage, boardVersion, uuid, onChange});
    this.key = `sugoroku_d04:${scope}:${uid}`;
    this.game = null; this.hand = null; this.matchId = null;
    this.online = false; this.posting = false; this.pending = null; this.error = null;
    this.awaitRevision = -1; this.epoch = 0; this.listeners = [];
    try { this.saved = JSON.parse(storage.getItem(this.key) || '{}'); } catch { this.saved = {}; }
    if (this.saved.pending?.body?.actionId?.startsWith(`${uid}:`)) this.pending = this.saved.pending;
  }
  emit() { this.onChange(this); }
  persist() { this.storage.setItem(this.key, JSON.stringify({matchId: this.matchId, revision: this.game?.revision ?? -1, awaitRevision: this.awaitRevision, pending: this.pending})); }
  get blocked() { return this.posting || !!this.pending || !this.online || !this.game || this.game.revision < this.awaitRevision; }
  connect(matchId, minimumRevision = -1) {
    if (!/^sugo_[a-zA-Z0-9_-]{1,120}$/.test(matchId)) throw new Error('INVALID_MATCH');
    if (this.pending && this.pending.body.matchId !== matchId) throw new Error('UNCONFIRMED_ACTION');
    const previousFloor = matchId === this.matchId ? this.awaitRevision : matchId === this.saved.matchId ? this.saved.awaitRevision ?? -1 : -1;
    this.disconnect(); this.matchId = matchId; this.game = null; this.hand = null; this.online = false; this.error = null; this.awaitRevision = Math.max(minimumRevision, previousFloor);
    const epoch = this.epoch;
    this.listeners.push(this.transport.watchGame(matchId, (data, meta = {}) => {
      if (epoch === this.epoch) this.accept(data, !meta.fromCache);
    }, () => { if (epoch === this.epoch) {this.online = false; this.error = 'CONNECTION'; this.emit();} }));
    this.persist(); this.emit();
  }
  acknowledgeLifecycle(result) {
    if (!/^sugo_[a-zA-Z0-9_-]{1,120}$/.test(result?.matchId || '') || !Number.isInteger(result.revisionAfter) || result.revisionAfter < 0) throw new Error('Invalid lifecycle response');
    if (result.matchId !== this.matchId) this.connect(result.matchId, result.revisionAfter);
    else {this.awaitRevision = Math.max(this.awaitRevision, result.revisionAfter); this.persist(); this.emit();}
  }
  disconnect() { this.epoch++; this.listeners.forEach(stop => stop()); this.listeners = []; this.handStop?.(); this.handStop = null; this.handSeat = null; }
  accept(data, online) {
    if (!data) {this.online = false; this.error = 'MATCH_NOT_FOUND'; this.emit(); return;}
    if (!Number.isInteger(data.revision) || data.schemaVersion !== 1 || data.rulesVersion !== 'd04-v1' || data.boardVersion !== this.boardVersion) {
      this.online = false; this.error = 'VERSION_MISMATCH'; this.emit(); return;
    }
    if (this.game && data.revision < this.game.revision) return;
    if (!data.participantUids?.includes(this.uid)) {this.online = false; this.error = 'NOT_A_PARTICIPANT'; this.emit(); return;}
    this.game = copy(data); this.online = online; this.error = null;
    const seatId = ownSeat(data, this.uid);
    if (seatId !== this.handSeat) {
      this.handStop?.(); this.hand = null; this.handSeat = seatId;
      if (seatId) {
        const epoch = this.epoch;
        this.handStop = this.transport.watchHand(this.matchId, seatId, value => {
          if (epoch !== this.epoch || seatId !== this.handSeat) return;
          if (value?.uid === this.uid && (!this.hand || (value.revision ?? 0) >= (this.hand.revision ?? 0))) this.hand = copy(value);
          else if (!value) this.hand = null;
          this.emit();
        }, () => {if (epoch === this.epoch) {this.hand = null; this.error = 'HAND_CONNECTION'; this.emit();}});
      }
    }
    this.persist(); this.emit();
  }
  async refresh() {
    const epoch = this.epoch;
    const game = await this.transport.readGame(this.matchId);
    if (epoch !== this.epoch) return;
    this.accept(game, true);
  }
  setOffline() {this.online = false; this.emit();}
  async send(type, payload = {}) {
    if (this.blocked || !canAct(this.game, this.hand, this.uid, type, payload)) return {status: 'rejected', errorCode: 'CLIENT_BLOCKED'};
    return this.execute(this.makeRequest(type, payload), 0);
  }
  makeRequest(type, payload) {
    return {body: {matchId: this.matchId, actionId: `${this.uid}:${this.uuid()}`, expectedRevision: this.game.revision,
      turnId: this.game.turnId, type, payload: copy(payload)}, intent: intentOf(this.game, type, payload)};
  }
  async retryPending() {
    if (!this.pending || this.posting) return;
    return this.execute(this.pending, 0);
  }
  async execute(request, retries) {
    this.posting = true; this.pending = request; this.error = null;
    // Persist the id before sending, so a lost response can only resend this operation.
    try {this.persist();} catch {this.posting = false; this.error = 'STORAGE'; this.emit(); return;}
    this.emit();
    let response;
    try { response = await this.transport.call('sugorokuAction', request.body); }
    catch (error) {
      const definite = error.details?.errorCode || ({'functions/permission-denied': 'NOT_A_PARTICIPANT', 'functions/unauthenticated': 'CONNECTION', 'functions/invalid-argument': 'INVALID_ARGUMENT'})[error.code];
      if (definite) response = {status: 'rejected', errorCode: definite};
      else {this.posting = false; this.error = 'UNCONFIRMED_ACTION'; this.emit(); return {status: 'unknown'};}
    }
    if (!['applied', 'rejected'].includes(response?.status)) {this.posting = false; this.error = 'UNCONFIRMED_ACTION'; this.emit(); return {status: 'unknown'};}
    if (response.status === 'applied' && (!Number.isInteger(response.revisionAfter) || response.actionId && response.actionId !== request.body.actionId)) {this.posting = false; this.error = 'UNCONFIRMED_ACTION'; this.emit(); return {status: 'unknown'};}
    this.pending = null;
    if (response.status === 'applied') this.awaitRevision = Math.max(this.awaitRevision, response.revisionAfter);
    try {this.persist();} catch {this.posting = false; this.error = 'STORAGE'; this.emit(); return response;}
    if (response.errorCode === 'STALE_REVISION' && retries === 0) {
      try {
        await this.refresh();
        const {type, payload} = request.body;
        if (this.online && JSON.stringify(intentOf(this.game, type, payload)) === JSON.stringify(request.intent) && canAct(this.game, this.hand, this.uid, type, payload)) {
          return this.execute(this.makeRequest(type, payload), 1);
        }
      } catch {this.online = false;}
    }
    this.posting = false; this.error = response.errorCode || null; this.emit();
    return response;
  }
}
