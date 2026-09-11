// CPU state is advanced only by the server. One request per observed revision.
export class CpuAdvance {
  constructor(session) { this.session = session; this.last = null; this.busy = false; }
  reset() { this.last = null; }
  async tick() {
    const s = this.session;
    if (this.busy || s.blocked || s.game?.status !== 'playing' || s.game.seats[s.game.activeSeat]?.kind !== 'cpu') return;
    const matchId = s.matchId, epoch = s.epoch;
    const key = `${epoch}:${matchId}:${s.game.revision}`;
    if (key === this.last) return;
    this.last = key; this.busy = true;
    const marker = {matchId, epoch};
    s.cpuAdvance = marker;
    s.error = null;
    s.emit();
    const current = () => s.matchId === matchId && s.epoch === epoch;
    let success = false;
    try {
      const result = await s.transport.call('sugorokuAdvance', {matchId});
      if (!current()) return;
      if (!Number.isInteger(result?.revisionAfter) || result.revisionAfter < 0 || (result.matchId && result.matchId !== matchId)) throw new Error('Invalid advance response');
      s.acknowledgeLifecycle({matchId, revisionAfter: result.revisionAfter});
      success = true;
    } catch (error) {
      if (current()) { s.error = error.details?.errorCode || 'CONNECTION'; }
    } finally {
      if (s.cpuAdvance === marker) s.cpuAdvance = null;
      if (current()) s.emit();
      this.busy = false;
      // A later snapshot may already have arrived while the call was in flight.
      if (success || !current()) void this.tick();
    }
  }
}
