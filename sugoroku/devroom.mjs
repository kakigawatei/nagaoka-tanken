// 開発室 — みんなで育てるスゴ録（masa 提案 2026-09-21・ポム実装）
//   投稿（バグ／要望／名所の情報）→ 月曜にポムがまとめ → 木曜の更新ノートで返事・クレジット → 分かれ目だけ投票（48時間・1人1票）
//   Firestore: sugoroku_feedback（本人が create・全員 read）／sugoroku_ballots（{voteId}_{uid} を本人が create）
//   運営側の状態（採用/見送り/返事/更新ノート/投票の定義/貢献の集計）は data/devroom_notes.json（リポジトリ・毎週ポムが更新）
import { initializeApp, getApp, getApps } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getAuth, signInAnonymously } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { getFirestore, collection, addDoc, getDocs, query, orderBy, limit, where, doc, setDoc, getDoc } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

const CFG = { apiKey: "AIzaSyDtDZIEQtBzjujnpTDcXt1QeEU2r-wbg74", authDomain: "kakigawatei-franchise.firebaseapp.com", projectId: "kakigawatei-franchise" };
const TYPES = [["bug", "バグ・おかしい所"], ["idea", "要望・こうしたい"], ["spot", "名所の情報（名前・写真）"], ["other", "その他"]];
const STATUS = { new: ["受付", "#8a7a5c"], planned: ["直します", "#2c6e49"], vote: ["投票中", "#8a5cc4"], done: ["反映済み", "#1f5fa8"], declined: ["見送り", "#a04030"], dup: ["同じ声あり", "#8a7a5c"] };
const WEIGHT = { bug: 1, idea: 3, spot: 2, other: 1, vote: 0.2, adopted: 3 };
const RANKS = [[0, "旅人"], [1, "見習い開発者"], [10, "協力隊"], [30, "開発メンバー"], [100, "名誉市民"]];
let fb = null, notes = null, me = null;

function pickApp() { const n = getApps().map(a => a.name); if (n.includes("sugoroku-d04")) return getApp("sugoroku-d04"); if (n.includes("[DEFAULT]")) return getApp(); return initializeApp(CFG); }
async function connect() {
  if (fb) return fb;
  const app = pickApp(); const auth = getAuth(app);
  try { await auth.authStateReady(); } catch (e) {}
  const user = auth.currentUser || (await signInAnonymously(auth)).user;
  fb = { db: getFirestore(app), uid: user.uid }; return fb;
}
async function loadNotes() { if (notes) return notes; try { notes = await (await fetch("data/devroom_notes.json?v=" + Math.floor(Date.now() / 3600000))).json(); } catch (e) { notes = { updates: [], statuses: {}, votes: [], credits: [] }; } return notes; }
function playerName() {
  try { const k = localStorage.getItem("devroom_name"); if (k) return k; } catch (e) {}
  try { for (const k of Object.keys(localStorage)) { if (/sugoroku/.test(k)) { const v = JSON.parse(localStorage.getItem(k) || "{}"); if (v && typeof v.name === "string" && v.name && v.name !== "旅人") return v.name; } } } catch (e) {}
  return "";
}
const esc = t => String(t == null ? "" : t).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const $ = id => document.getElementById(id);

const CSS = `
#devroom{position:fixed;inset:0;z-index:30;background:rgba(42,33,24,.55);display:none;align-items:flex-end;justify-content:center}
#devroom.show{display:flex}
#devroom .dr{width:100%;max-width:720px;max-height:88%;background:#fffdf7;border-radius:18px 18px 0 0;box-shadow:0 -8px 30px rgba(0,0,0,.2);display:flex;flex-direction:column;font-family:inherit;color:#2a2118}
#devroom .dr-head{display:flex;align-items:center;justify-content:space-between;padding:12px 16px 8px;border-bottom:2px solid #e6dcc6}
#devroom .dr-head strong{font-size:17px}
#devroom .dr-head button{flex:none;width:36px;height:36px;padding:0;border-radius:50%;background:#fff;color:#2a2118;border:2px solid #e6dcc6;box-shadow:none;font-size:18px}
#devroom .dr-tabs{display:flex;gap:6px;padding:8px 12px;overflow-x:auto}
#devroom .dr-tabs button{flex:none;padding:8px 12px;font-size:13px;border-radius:999px;background:#fff;color:#2a2118;border:2px solid #e6dcc6;box-shadow:none}
#devroom .dr-tabs button.on{background:#2a2118;color:#fff;border-color:#2a2118}
#devroom .dr-body{padding:10px 16px calc(16px + env(safe-area-inset-bottom));overflow-y:auto;font-size:14px;line-height:1.6}
#devroom label{display:block;font-size:12px;font-weight:700;color:#8a7a5c;margin:10px 0 4px}
#devroom select,#devroom input,#devroom textarea{width:100%;font:inherit;font-size:15px;padding:10px 12px;border:2px solid #e6dcc6;border-radius:12px;background:#fff;color:#2a2118;box-sizing:border-box}
#devroom textarea{min-height:110px;resize:vertical}
#devroom .dr-note{font-size:12px;color:#8a7a5c;margin-top:8px}
#devroom .fb{padding:10px 0;border-bottom:1px dashed #e6dcc6}
#devroom .fb .m{font-size:12px;color:#8a7a5c;display:flex;gap:8px;flex-wrap:wrap;align-items:center}
#devroom .tag{display:inline-block;padding:1px 8px;border-radius:999px;color:#fff;font-size:11px;font-weight:700}
#devroom .fb .t{margin-top:4px;white-space:pre-wrap;word-break:break-word}
#devroom .fb .r{margin-top:6px;padding:8px 10px;background:#f6f1e6;border-radius:10px;font-size:13px}
#devroom .up{padding:10px 0;border-bottom:1px dashed #e6dcc6}
#devroom .up h4{margin:0 0 4px;font-size:15px}
#devroom .up li{margin:2px 0}
#devroom .credit{color:#8a5cc4;font-size:12px}
#devroom .vote{padding:10px 0;border-bottom:1px dashed #e6dcc6}
#devroom .vote .opts{display:flex;flex-direction:column;gap:6px;margin-top:6px}
#devroom .vote .opts button{text-align:left;background:#fff;color:#2a2118;border:2px solid #e6dcc6;box-shadow:none;font-weight:600}
#devroom .vote .opts button.mine{border-color:#2a2118;background:#f6f1e6}
#devroom .bar{height:8px;background:#e6dcc6;border-radius:4px;overflow:hidden;margin-top:3px}
#devroom .bar i{display:block;height:100%;background:#c8471f}
#devroom .rank{font-size:22px;font-weight:800;margin:4px 0}
#devroom table{width:100%;border-collapse:collapse;font-size:13px}
#devroom td{padding:5px 4px;border-bottom:1px dashed #e6dcc6}
`;

const HTML = `
<div class="dr" role="dialog" aria-label="開発室">
  <div class="dr-head"><strong>🛠 開発室 — みんなで育てるスゴ録</strong><button id="drClose" aria-label="閉じる">×</button></div>
  <div class="dr-tabs"><button data-t="post" class="on">投稿する</button><button data-t="list">みんなの声</button><button data-t="notes">更新ノート</button><button data-t="vote">投票</button><button data-t="me">貢献</button></div>
  <div class="dr-body">
    <div id="drPost">
      <p style="margin:0">遊んで気づいたことを何でも。毎週月曜にまとめて、木曜の更新で返事します。採用された人の名前は更新ノートに載ります。</p>
      <label>種類</label><select id="drType">${TYPES.map(([k, v]) => `<option value="${k}">${v}</option>`).join("")}</select>
      <label>名前（更新ノートに載る呼び名・12文字まで）</label><input id="drName" maxlength="12" placeholder="例：ゆうき">
      <label>どこで（画面やマスの名前・任意）</label><input id="drWhere" maxlength="60" placeholder="例：寺泊の分かれ道／決算の画面">
      <label>内容</label><textarea id="drText" maxlength="500" placeholder="例：サイコロを振った後に画面が戻らない／目的地の矢印をもっと大きく"></textarea>
      <div class="row" style="margin-top:12px"><button id="drSend">送る</button></div>
      <div class="dr-note" id="drMsg"></div>
    </div>
    <div id="drList" hidden></div>
    <div id="drNotes" hidden></div>
    <div id="drVote" hidden></div>
    <div id="drMe" hidden></div>
  </div>
</div>`;

function mount() {
  if ($("devroom")) return;
  const st = document.createElement("style"); st.textContent = CSS; document.head.appendChild(st);
  const el = document.createElement("section"); el.id = "devroom"; el.innerHTML = HTML; document.body.appendChild(el);
  $("drClose").onclick = close; el.addEventListener("click", e => { if (e.target === el) close(); });
  el.querySelectorAll(".dr-tabs button").forEach(b => b.onclick = () => showTab(b.dataset.t));
  $("drName").value = playerName();
  $("drSend").onclick = send;
}
function showTab(t) {
  document.querySelectorAll("#devroom .dr-tabs button").forEach(b => b.classList.toggle("on", b.dataset.t === t));
  ["post", "list", "notes", "vote", "me"].forEach(k => { const e = $("dr" + k[0].toUpperCase() + k.slice(1)); if (e) e.hidden = k !== t; });
  if (t === "list") renderList(); if (t === "notes") renderNotes(); if (t === "vote") renderVote(); if (t === "me") renderMe();
}
export function open(tab) { mount(); $("devroom").classList.add("show"); showTab(tab || "post"); }
function close() { const e = $("devroom"); if (e) e.classList.remove("show"); }

async function send() {
  const type = $("drType").value, name = $("drName").value.trim().slice(0, 12), where = $("drWhere").value.trim().slice(0, 60), text = $("drText").value.trim();
  const msg = $("drMsg");
  if (text.length < 4) { msg.textContent = "内容をもう少し書いてください（4文字以上）"; return; }
  $("drSend").disabled = true; msg.textContent = "送っています…";
  try {
    const { db, uid } = await connect();
    try { localStorage.setItem("devroom_name", name); } catch (e) {}
    const ver = (document.querySelector('script[src*="d04-client"]') ? "d04" : "solo") + " " + (new URLSearchParams(location.search).get("mode") || "");
    await addDoc(collection(db, "sugoroku_feedback"), { uid, name: name || "旅人", type, where, text, ver: ver.trim(), ua: navigator.userAgent.slice(0, 80), t: Date.now(), createdAt: new Date().toISOString() });
    $("drText").value = ""; $("drWhere").value = ""; msg.textContent = "ありがとう！月曜にまとめて、木曜の更新ノートで返事します。";
  } catch (e) { console.error(e); msg.textContent = (e && e.code === "permission-denied") ? "いまは受付の準備中です（運営がルールを設定するまで送れません）" : "送れませんでした。電波の良い所でもう一度。"; }
  finally { $("drSend").disabled = false; }
}
async function renderList() {
  const box = $("drList"); box.innerHTML = "<p>読み込み中…</p>";
  try {
    const { db } = await connect(); const n = await loadNotes();
    const snap = await getDocs(query(collection(db, "sugoroku_feedback"), orderBy("t", "desc"), limit(60)));
    const rows = []; snap.forEach(d => rows.push(Object.assign({ id: d.id }, d.data())));
    if (!rows.length) { box.innerHTML = "<p>まだ投稿はありません。最初の1人になろう。</p>"; return; }
    const tl = Object.fromEntries(TYPES);
    box.innerHTML = rows.map(r => { const s = (n.statuses || {})[r.id] || {}; const st = STATUS[s.status || "new"] || STATUS.new;
      return `<div class="fb"><div class="m"><span class="tag" style="background:${st[1]}">${st[0]}</span><span>${esc(tl[r.type] || r.type)}</span><span>${esc(r.name || "旅人")}</span><span>${esc(String(r.createdAt || "").slice(5, 10).replace("-", "/"))}</span>${r.where ? `<span>📍${esc(r.where)}</span>` : ""}</div><div class="t">${esc(r.text)}</div>${s.reply ? `<div class="r">🛠 ${esc(s.reply)}</div>` : ""}</div>`; }).join("");
  } catch (e) { console.error(e); box.innerHTML = "<p>読み込めませんでした" + (e && e.code === "permission-denied" ? "（受付の準備中）" : "") + "</p>"; }
}
async function renderNotes() {
  const box = $("drNotes"); const n = await loadNotes(); const ups = n.updates || [];
  box.innerHTML = ups.length ? ups.map(u => `<div class="up"><h4>${esc(u.ver)} <span style="font-weight:500;font-size:12px;color:#8a7a5c">${esc(u.date)}</span></h4><ul style="margin:0;padding-left:18px">${(u.items || []).map(i => `<li>${esc(i.text)}${i.by && i.by.length ? ` <span class="credit">— ${i.by.map(esc).join("・")} さんの声</span>` : ""}</li>`).join("")}</ul></div>`).join("") : "<p>最初の更新ノートは、投稿が集まった最初の木曜に出ます。</p>";
}
async function renderVote() {
  const box = $("drVote"); box.innerHTML = "<p>読み込み中…</p>";
  const n = await loadNotes(); const votes = (n.votes || []); const now = Date.now();
  if (!votes.length) { box.innerHTML = "<p>いま投票中のものはありません。要望がぶつかったときに、ここで決めます（48時間・1人1票）。</p>"; return; }
  let db, uid; try { ({ db, uid } = await connect()); } catch (e) { box.innerHTML = "<p>読み込めませんでした</p>"; return; }
  const parts = [];
  for (const v of votes) {
    const closed = Date.parse(v.until) < now; let mine = null; const counts = {};
    try { const snap = await getDocs(query(collection(db, "sugoroku_ballots"), where("voteId", "==", v.id))); snap.forEach(d => { const b = d.data(); counts[b.choice] = (counts[b.choice] || 0) + 1; if (b.uid === uid) mine = b.choice; }); } catch (e) {}
    const total = Object.values(counts).reduce((a, b) => a + b, 0); const show = closed || mine !== null;
    parts.push(`<div class="vote" data-v="${esc(v.id)}"><b>${esc(v.title)}</b><div style="font-size:12px;color:#8a7a5c">${closed ? "締切" : "締切 " + esc(v.until.slice(5, 16).replace("T", " "))}${total ? " ・ " + total + "票" : ""}${v.result ? " ・ 結果：" + esc(v.result) : ""}</div>${v.body ? `<div style="font-size:13px;margin-top:4px">${esc(v.body)}</div>` : ""}<div class="opts">${v.options.map((o, i) => `<button ${closed ? "disabled" : ""} data-c="${i}" class="${mine === i ? "mine" : ""}">${esc(o)}${show ? `<div class="bar"><i style="width:${total ? Math.round((counts[i] || 0) / total * 100) : 0}%"></i></div><span style="font-size:11px;color:#8a7a5c">${counts[i] || 0}票</span>` : ""}</button>`).join("")}</div></div>`);
  }
  box.innerHTML = parts.join("");
  box.querySelectorAll(".vote").forEach(el => el.querySelectorAll("button[data-c]").forEach(b => b.onclick = async () => {
    const vid = el.dataset.v, c = +b.dataset.c;
    try { await setDoc(doc(db, "sugoroku_ballots", vid + "_" + uid), { voteId: vid, uid, choice: c, t: Date.now() }); renderVote(); }
    catch (e) { alert(e && e.code === "permission-denied" ? "この投票はもう締め切られたか、投票済みです" : "投票できませんでした"); }
  }));
}
async function renderMe() {
  const box = $("drMe"); box.innerHTML = "<p>読み込み中…</p>";
  try {
    const { db, uid } = await connect(); const n = await loadNotes();
    const snap = await getDocs(query(collection(db, "sugoroku_feedback"), where("uid", "==", uid)));
    const mine = []; snap.forEach(d => mine.push(Object.assign({ id: d.id }, d.data())));
    let pts = 0; const lines = [];
    for (const r of mine) { const w = WEIGHT[r.type] || 1; pts += w; const s = (n.statuses || {})[r.id]; if (s && (s.status === "done" || s.status === "planned")) { pts += WEIGHT.adopted; } }
    let votes = 0; try { const vs = await getDocs(query(collection(db, "sugoroku_ballots"), where("uid", "==", uid))); votes = vs.size; pts += votes * WEIGHT.vote; } catch (e) {}
    const extra = (n.credits || []).find(c => c.uid === uid); if (extra && extra.bonus) pts += extra.bonus;
    pts = Math.round(pts * 10) / 10; let rank = RANKS[0][1], next = null;
    for (let i = 0; i < RANKS.length; i++) { if (pts >= RANKS[i][0]) rank = RANKS[i][1]; else { next = RANKS[i]; break; } }
    const adopted = mine.filter(r => { const s = (n.statuses || {})[r.id]; return s && (s.status === "done" || s.status === "planned"); }).length;
    box.innerHTML = `<div class="rank">${esc(rank)}</div><div>貢献ポイント <b>${pts}</b>${next ? `　次の「${esc(next[1])}」まであと ${Math.round((next[0] - pts) * 10) / 10}` : ""}</div>
      <table style="margin-top:8px"><tr><td>投稿</td><td>${mine.length}件</td></tr><tr><td>採用・対応中</td><td>${adopted}件</td></tr><tr><td>投票</td><td>${votes}回</td></tr></table>
      <div class="dr-note">重み：バグ報告 1／要望 3／名所の情報 2／投票 0.2／採用されたら +3。「開発メンバー」以上の人は更新ノートにクレジットが載り、年間上位には功労者カードを贈ります。</div>
      ${(n.credits || []).length ? `<h4 style="margin:14px 0 4px">貢献の多い人</h4><table>${n.credits.slice(0, 10).map((c, i) => `<tr><td>${i + 1}</td><td>${esc(c.name)}</td><td>${esc(c.rank || "")}</td><td style="text-align:right">${esc(c.points)}</td></tr>`).join("")}</table>` : ""}`;
  } catch (e) { console.error(e); box.innerHTML = "<p>読み込めませんでした" + (e && e.code === "permission-denied" ? "（受付の準備中）" : "") + "</p>"; }
}

/* 入口: メニューの「開発室」ボタン（index.html に <button id="devRoomBtn">）。無ければ作らない */
window.addEventListener("DOMContentLoaded", () => {
  const b = $("devRoomBtn"); if (b) b.onclick = () => { const p = $("panel"); if (p) p.hidden = true; open("post"); };
  if (new URLSearchParams(location.search).get("devroom") === "1") setTimeout(() => open("post"), 800);
});
window.devroomOpen = open;
