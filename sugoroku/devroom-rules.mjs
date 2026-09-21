// 開発室の共通ルール（ブラウザ devroom.mjs と node tools_devroom_dump.mjs が同じ関数を使う・2026-09-21 エル監査）
// 有効票 = 実在する投票（notes.votes）・選択肢の範囲内・受付日時 createdAt（サーバー時刻）が開始〜締切の間。createdAt が無い票は無効
export function ballotTime(b) {
  const c = b && b.createdAt;
  if (c == null) return null;
  if (typeof c === "number") return c;                       // 取り出しツール（timestampValue → ms）
  if (typeof c.toMillis === "function") return c.toMillis(); // Firestore Timestamp
  if (typeof c.seconds === "number") return c.seconds * 1000;
  return null;
}
export function validBallot(b, votes) {
  const v = (votes || []).find(x => x.id === b.voteId); if (!v) return null;
  if (!Number.isInteger(b.choice) || b.choice < 0 || b.choice >= (v.options || []).length) return null;
  const t = ballotTime(b); if (t === null) return null;
  if (t > Date.parse(v.until) || (v.from && t < Date.parse(v.from))) return null;
  return v;
}
export const WEIGHT = { bug: 1, idea: 3, spot: 2, other: 1, vote: 0.2, adopted: 3 };
export const RANKS = [[0, "旅人"], [1, "見習い開発者"], [10, "協力隊"], [30, "開発メンバー"], [100, "名誉市民"]];
