// 開発室 — みんなで育てるスゴ録（masa 提案 2026-09-21・ポム実装）
//   地図右の 🛠 から開く「何でもできる」入口。ホーム（今のお題・募集・投票・最新の更新・自分の貢献）→ 投稿／みんなの声／更新ノート／投票／貢献
//   投稿 → 月曜にポムがまとめ → 木曜の更新ノートで返事・クレジット → 分かれ目だけ投票（48時間・1人1票）
//   Firestore: sugoroku_feedback（本人 create・全員 read）／sugoroku_fb_likes（{fbId}_{uid} 共感・本人 create）／sugoroku_ballots（{voteId}_{uid} 本人 create）
//   運営側の状態（採用/見送り/返事/更新ノート/お題/募集/投票の定義/貢献の集計）は data/devroom_notes.json（リポジトリ・毎週ポムが更新）
import { initializeApp, getApp, getApps } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getAuth, signInAnonymously } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { getFirestore, collection, addDoc, getDocs, query, orderBy, limit, where, doc, setDoc } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

const CFG = { apiKey: "AIzaSyDtDZIEQtBzjujnpTDcXt1QeEU2r-wbg74", authDomain: "kakigawatei-franchise.firebaseapp.com", projectId: "kakigawatei-franchise" };
const TYPES = [["bug", "🐞", "バグ・おかしい所"], ["idea", "💡", "要望・こうしたい"], ["spot", "📷", "名所の情報（名前・写真）"], ["other", "💬", "その他"]];
const STATUS = { new: ["受付", "#8a7a5c"], planned: ["直します", "#2c6e49"], vote: ["投票中", "#8a5cc4"], done: ["反映済み", "#1f5fa8"], declined: ["見送り", "#a04030"], dup: ["同じ声あり", "#8a7a5c"] };
const WEIGHT = { bug: 1, idea: 3, spot: 2, other: 1, vote: 0.2, adopted: 3 };
const RANKS = [[0, "旅人"], [1, "見習い開発者"], [10, "協力隊"], [30, "開発メンバー"], [100, "名誉市民"]];
let fb = null, notes = null, likesCache = null, myLikes = new Set(), listSort = "new";

function pickApp() { const n = getApps().map(a => a.name); if (n.includes("sugoroku-d04")) return getApp("sugoroku-d04"); if (n.includes("[DEFAULT]")) return getApp(); return initializeApp(CFG); }
async function connect() {
  if (fb) return fb;
  const app = pickApp(); const auth = getAuth(app);
  try { await auth.authStateReady(); } catch (e) {}
  const user = auth.currentUser || (await signInAnonymously(auth)).user;
  fb = { db: getFirestore(app), uid: user.uid }; return fb;
}
async function loadNotes() { if (notes) return notes; try { notes = await (await fetch("data/devroom_notes.json?v=" + Math.floor(Date.now() / 600000))).json(); } catch (e) { notes = {}; } for (const k of ["updates", "votes", "credits", "topics", "tasks"]) notes[k] = notes[k] || []; notes.statuses = notes.statuses || {}; return notes; }
function playerName() {
  try { const k = localStorage.getItem("devroom_name"); if (k) return k; } catch (e) {}
  try { for (const k of Object.keys(localStorage)) { if (/sugoroku/.test(k)) { const v = JSON.parse(localStorage.getItem(k) || "{}"); if (v && typeof v.name === "string" && v.name && v.name !== "旅人") return v.name; } } } catch (e) {}
  return "";
}
const esc = t => String(t == null ? "" : t).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const $ = id => document.getElementById(id);
const fmtD = s => String(s || "").slice(5, 10).replace("-", "/");

const CSS = `
#devroom{position:fixed;inset:0;z-index:30;background:rgba(42,33,24,.55);display:none;align-items:flex-end;justify-content:center}
#devroom.show{display:flex}
#devroom .dr{width:100%;max-width:720px;max-height:90%;background:#fffdf7;border-radius:18px 18px 0 0;box-shadow:0 -8px 30px rgba(0,0,0,.2);display:flex;flex-direction:column;font-family:inherit;color:#2a2118}
#devroom .dr-head{display:flex;align-items:center;justify-content:space-between;padding:12px 16px 8px;border-bottom:2px solid #e6dcc6}
#devroom .dr-head strong{font-size:17px}
#devroom .dr-head button{flex:none;width:36px;height:36px;padding:0;border-radius:50%;background:#fff;color:#2a2118;border:2px solid #e6dcc6;box-shadow:none;font-size:18px}
#devroom .dr-tabs{display:flex;gap:6px;padding:8px 12px;overflow-x:auto;-webkit-overflow-scrolling:touch}
#devroom .dr-tabs button{flex:none;padding:8px 12px;font-size:13px;border-radius:999px;background:#fff;color:#2a2118;border:2px solid #e6dcc6;box-shadow:none}
#devroom .dr-tabs button.on{background:#2a2118;color:#fff;border-color:#2a2118}
#devroom .dr-body{padding:10px 16px calc(16px + env(safe-area-inset-bottom));overflow-y:auto;font-size:14px;line-height:1.6}
#devroom label{display:block;font-size:12px;font-weight:700;color:#8a7a5c;margin:10px 0 4px}
#devroom select,#devroom input,#devroom textarea{width:100%;font:inherit;font-size:15px;padding:10px 12px;border:2px solid #e6dcc6;border-radius:12px;background:#fff;color:#2a2118;box-sizing:border-box}
#devroom textarea{min-height:100px;resize:vertical}
#devroom .dr-note{font-size:12px;color:#8a7a5c;margin-top:8px}
#devroom .types{display:grid;grid-template-columns:1fr 1fr;gap:8px}
#devroom .types button{background:#fff;color:#2a2118;border:2px solid #e6dcc6;box-shadow:none;font-size:14px;padding:12px 8px;text-align:left}
#devroom .types button.on{border-color:#2a2118;background:#f6f1e6}
#devroom .home .sec{margin:10px 0 14px}
#devroom .home h4{margin:0 0 6px;font-size:13px;color:#8a7a5c;letter-spacing:.06em}
#devroom .topic{padding:12px 14px;background:#2a2118;color:#fff;border-radius:14px}
#devroom .topic b{display:block;font-size:15px}
#devroom .topic small{opacity:.8}
#devroom .big{display:grid;grid-template-columns:1fr 1fr;gap:8px}
#devroom .big button{padding:14px 8px;font-size:14px}
#devroom .big button.ghost{background:#fff;color:#2a2118;border:2px solid #e6dcc6;box-shadow:none}
#devroom .task{padding:10px 12px;border:2px dashed #e6dcc6;border-radius:12px;margin-top:6px;font-size:13px}
#devroom .task b{display:block}
#devroom .me-line{display:flex;align-items:center;justify-content:space-between;padding:10px 12px;background:#f6f1e6;border-radius:12px}
#devroom .me-line b{font-size:16px}
#devroom .sort{display:flex;gap:6px;margin-bottom:6px}
#devroom .sort button{flex:none;padding:5px 10px;font-size:12px;border-radius:999px;background:#fff;color:#2a2118;border:2px solid #e6dcc6;box-shadow:none}
#devroom .sort button.on{background:#2a2118;color:#fff;border-color:#2a2118}
#devroom .fb{padding:10px 0;border-bottom:1px dashed #e6dcc6}
#devroom .fb .m{font-size:12px;color:#8a7a5c;display:flex;gap:8px;flex-wrap:wrap;align-items:center}
#devroom .tag{display:inline-block;padding:1px 8px;border-radius:999px;color:#fff;font-size:11px;font-weight:700}
#devroom .fb .t{margin-top:4px;white-space:pre-wrap;word-break:break-word}
#devroom .fb .r{margin-top:6px;padding:8px 10px;background:#f6f1e6;border-radius:10px;font-size:13px}
#devroom .like{flex:none;padding:3px 10px;font-size:12px;border-radius:999px;background:#fff;color:#2a2118;border:2px solid #e6dcc6;box-shadow:none;margin-top:6px}
#devroom .like.on{background:#fbe9e2;border-color:#c8471f;color:#c8471f}
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
  <div class="dr-tabs"><button data-t="home" class="on">ホーム</button><button data-t="post">投稿する</button><button data-t="list">みんなの声</button><button data-t="notes">更新ノート</button><button data-t="vote">投票</button><button data-t="me">貢献</button></div>
  <div class="dr-body">
    <div id="drHome" class="home"></div>
    <div id="drPost" hidden>
      <p style="margin:0 0 6px">遊んで気づいたことを何でも。毎週月曜にまとめて、木曜の更新で返事します。採用された人の名前は更新ノートに載ります。</p>
      <label>種類</label><div class="types" id="drTypes">${TYPES.map(([k, ic, v], i) => `<button type="button" data-k="${k}" class="${i === 0 ? "on" : ""}">${ic} ${v}</button>`).join("")}</div>
      <label>内容</label><textarea id="drText" maxlength="500" placeholder="例：サイコロを振った後に画面が戻らない／目的地の矢印をもっと大きく／〇〇神社の写真を送りたい"></textarea>
      <label>どこで（画面やマスの名前・任意）</label><input id="drWhere" maxlength="60" placeholder="例：寺泊の分かれ道／決算の画面">
      <label>名前（更新ノートに載る呼び名・12文字まで）</label><input id="drName" maxlength="12" placeholder="例：ゆうき">
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
  $("drTypes").querySelectorAll("button").forEach(b => b.onclick = () => { $("drTypes").querySelectorAll("button").forEach(x => x.classList.toggle("on", x === b)); });
  $("drSend").onclick = send;
}
function showTab(t) {
  document.querySelectorAll("#devroom .dr-tabs button").forEach(b => b.classList.toggle("on", b.dataset.t === t));
  ["home", "post", "list", "notes", "vote", "me"].forEach(k => { const e = $("dr" + k[0].toUpperCase() + k.slice(1)); if (e) e.hidden = k !== t; });
  if (t === "home") renderHome(); if (t === "list") renderList(); if (t === "notes") renderNotes(); if (t === "vote") renderVote(); if (t === "me") renderMe();
}
export function open(tab) { mount(); $("devroom").classList.add("show"); showTab(tab || "home"); }
function close() { const e = $("devroom"); if (e) e.classList.remove("show"); }
function goPost(type, prefill) { showTab("post"); if (type) $("drTypes").querySelectorAll("button").forEach(x => x.classList.toggle("on", x.dataset.k === type)); if (prefill) $("drText").value = prefill; }

/* ---- ホーム: 今のお題 → 2つの大きなボタン → 募集中 → 投票中 → 最新の更新 → 自分 ---- */
async function renderHome() {
  const box = $("drHome"); box.innerHTML = "<p>読み込み中…</p>";
  const n = await loadNotes(); const now = Date.now();
  const topic = n.topics.find(t => !t.until || Date.parse(t.until) > now);
  const tasks = n.tasks.filter(t => !t.until || Date.parse(t.until) > now).slice(0, 3);
  const votes = n.votes.filter(v => Date.parse(v.until) > now);
  const last = n.updates[0];
  let mine = "";
  try { const m = await myStats(n); mine = `<div class="me-line"><div><b>${esc(m.rank)}</b><br><span style="font-size:12px;color:#8a7a5c">貢献 ${m.pts} ｜ 投稿 ${m.count}件${m.next ? " ｜ 次まであと " + m.nextLeft : ""}</span></div><button class="ghost" style="flex:none;padding:8px 12px;font-size:13px" data-go="me">くわしく</button></div>`; } catch (e) { mine = ""; }
  box.innerHTML = `
    <div class="sec"><div class="topic"><small>いま聞きたいこと</small><b>${esc(topic ? topic.title : "遊んで気づいたことを、何でも")}</b>${topic && topic.body ? `<small>${esc(topic.body)}</small>` : ""}</div></div>
    <div class="sec big"><button data-go="post">✍️ 気づいたことを送る</button><button class="ghost" data-go="post-spot">📷 名所の写真・名前を送る</button></div>
    ${tasks.length ? `<div class="sec"><h4>募集中</h4>${tasks.map(t => `<div class="task"><b>${esc(t.title)}</b>${esc(t.body || "")}${t.until ? `<div style="font-size:11px;color:#8a7a5c">〜${fmtD(t.until)}</div>` : ""}<div class="row" style="margin-top:6px"><button class="ghost" style="font-size:13px;padding:8px" data-go="post-spot" data-pre="${esc("【" + t.title + "】 ")}">これに応える</button></div></div>`).join("")}</div>` : ""}
    ${votes.length ? `<div class="sec"><h4>投票中（〜${fmtD(votes[0].until)}）</h4><div class="task" style="border-style:solid;border-color:#8a5cc4"><b>${esc(votes[0].title)}</b><div class="row" style="margin-top:6px"><button style="font-size:13px;padding:8px;background:#8a5cc4;box-shadow:none" data-go="vote">投票する</button></div></div></div>` : ""}
    <div class="sec"><h4>最新の更新</h4>${last ? `<div class="task"><b>${esc(last.ver)} <span style="font-weight:500;font-size:12px;color:#8a7a5c">${esc(last.date)}</span></b>${(last.items || []).slice(0, 3).map(i => "・" + esc(i.text)).join("<br>")}${(last.items || []).length > 3 ? "<br>…" : ""}<div class="row" style="margin-top:6px"><button class="ghost" style="font-size:13px;padding:8px" data-go="notes">更新ノートを見る</button></div></div>` : `<div class="task">最初の更新ノートは、投稿が集まった最初の木曜に出ます。<br><span style="font-size:12px;color:#8a7a5c">サイクル：月曜まとめ → 木曜更新。ぶつかる要望は投票（48時間）。最終決定は運営。</span></div>`}</div>
    <div class="sec">${mine}</div>`;
  box.querySelectorAll("[data-go]").forEach(b => b.onclick = () => { const g = b.dataset.go; if (g === "post") goPost(); else if (g === "post-spot") goPost("spot", b.dataset.pre || ""); else showTab(g); });
}

async function send() {
  const type = ($("drTypes").querySelector("button.on") || {}).dataset?.k || "other", name = $("drName").value.trim().slice(0, 12), where = $("drWhere").value.trim().slice(0, 60), text = $("drText").value.trim();
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

/* ---- みんなの声: 並べ替え（新しい順／共感が多い順／対応済み）＋ 共感（1人1回） ---- */
async function loadLikes(db, uid) {
  if (likesCache) return likesCache;
  const counts = {}; myLikes = new Set();
  try { const snap = await getDocs(query(collection(db, "sugoroku_fb_likes"), limit(3000))); snap.forEach(d => { const b = d.data(); counts[b.fbId] = (counts[b.fbId] || 0) + 1; if (b.uid === uid) myLikes.add(b.fbId); }); } catch (e) {}
  likesCache = counts; return counts;
}
async function renderList() {
  const box = $("drList"); box.innerHTML = "<p>読み込み中…</p>";
  try {
    const { db, uid } = await connect(); const n = await loadNotes(); const likes = await loadLikes(db, uid);
    const snap = await getDocs(query(collection(db, "sugoroku_feedback"), orderBy("t", "desc"), limit(80)));
    let rows = []; snap.forEach(d => rows.push(Object.assign({ id: d.id }, d.data())));
    if (!rows.length) { box.innerHTML = "<p>まだ投稿はありません。最初の1人になろう。</p>"; return; }
    if (listSort === "likes") rows = rows.slice().sort((a, b) => (likes[b.id] || 0) - (likes[a.id] || 0) || b.t - a.t);
    if (listSort === "done") rows = rows.filter(r => { const s = n.statuses[r.id]; return s && (s.status === "done" || s.status === "planned"); });
    const tl = Object.fromEntries(TYPES.map(([k, ic, v]) => [k, ic + " " + v.split("・")[0]]));
    box.innerHTML = `<div class="sort">${[["new", "新しい順"], ["likes", "共感が多い順"], ["done", "対応したもの"]].map(([k, v]) => `<button data-s="${k}" class="${listSort === k ? "on" : ""}">${v}</button>`).join("")}</div>` +
      (rows.length ? rows.map(r => { const s = n.statuses[r.id] || {}; const st = STATUS[s.status || "new"] || STATUS.new; const lc = likes[r.id] || 0; const mine = myLikes.has(r.id);
        return `<div class="fb"><div class="m"><span class="tag" style="background:${st[1]}">${st[0]}</span><span>${esc(tl[r.type] || r.type)}</span><span>${esc(r.name || "旅人")}</span><span>${esc(fmtD(r.createdAt))}</span>${r.where ? `<span>📍${esc(r.where)}</span>` : ""}</div><div class="t">${esc(r.text)}</div>${s.reply ? `<div class="r">🛠 ${esc(s.reply)}</div>` : ""}<button class="like ${mine ? "on" : ""}" data-id="${esc(r.id)}" ${mine || r.uid === uid ? "disabled" : ""}>${mine ? "共感した" : "わかる"} ${lc ? lc : ""}</button></div>`; }).join("") : "<p>まだありません。</p>");
    box.querySelectorAll(".sort button").forEach(b => b.onclick = () => { listSort = b.dataset.s; renderList(); });
    box.querySelectorAll(".like").forEach(b => b.onclick = async () => { const id = b.dataset.id; b.disabled = true; try { await setDoc(doc(db, "sugoroku_fb_likes", id + "_" + uid), { fbId: id, uid, t: Date.now() }); likesCache = null; renderList(); } catch (e) { b.disabled = false; } });
  } catch (e) { console.error(e); box.innerHTML = "<p>読み込めませんでした" + (e && e.code === "permission-denied" ? "（受付の準備中）" : "") + "</p>"; }
}
async function renderNotes() {
  const box = $("drNotes"); const n = await loadNotes(); const ups = n.updates;
  box.innerHTML = ups.length ? ups.map(u => `<div class="up"><h4>${esc(u.ver)} <span style="font-weight:500;font-size:12px;color:#8a7a5c">${esc(u.date)}</span></h4><ul style="margin:0;padding-left:18px">${(u.items || []).map(i => `<li>${esc(i.text)}${i.by && i.by.length ? ` <span class="credit">— ${i.by.map(esc).join("・")} さんの声</span>` : ""}</li>`).join("")}</ul></div>`).join("") : "<p>最初の更新ノートは、投稿が集まった最初の木曜に出ます。</p>";
}
async function renderVote() {
  const box = $("drVote"); box.innerHTML = "<p>読み込み中…</p>";
  const n = await loadNotes(); const votes = n.votes; const now = Date.now();
  if (!votes.length) { box.innerHTML = "<p>いま投票中のものはありません。要望がぶつかったときに、ここで決めます（48時間・1人1票・結果は更新ノートに）。</p>"; return; }
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
async function myStats(n) {
  const { db, uid } = await connect();
  const snap = await getDocs(query(collection(db, "sugoroku_feedback"), where("uid", "==", uid)));
  const mine = []; snap.forEach(d => mine.push(Object.assign({ id: d.id }, d.data())));
  let pts = 0, adopted = 0;
  for (const r of mine) { pts += WEIGHT[r.type] || 1; const s = n.statuses[r.id]; if (s && (s.status === "done" || s.status === "planned")) { pts += WEIGHT.adopted; adopted++; } }
  let votes = 0; try { const vs = await getDocs(query(collection(db, "sugoroku_ballots"), where("uid", "==", uid))); votes = vs.size; pts += votes * WEIGHT.vote; } catch (e) {}
  const extra = n.credits.find(c => c.uid === uid); if (extra && extra.bonus) pts += extra.bonus;
  pts = Math.round(pts * 10) / 10; let rank = RANKS[0][1], next = null;
  for (let i = 0; i < RANKS.length; i++) { if (pts >= RANKS[i][0]) rank = RANKS[i][1]; else { next = RANKS[i]; break; } }
  return { pts, rank, next: next ? next[1] : null, nextLeft: next ? Math.round((next[0] - pts) * 10) / 10 : 0, count: mine.length, adopted, votes };
}
async function renderMe() {
  const box = $("drMe"); box.innerHTML = "<p>読み込み中…</p>";
  try {
    const n = await loadNotes(); const m = await myStats(n);
    box.innerHTML = `<div class="rank">${esc(m.rank)}</div><div>貢献ポイント <b>${m.pts}</b>${m.next ? `　次の「${esc(m.next)}」まであと ${m.nextLeft}` : ""}</div>
      <table style="margin-top:8px"><tr><td>投稿</td><td>${m.count}件</td></tr><tr><td>採用・対応中</td><td>${m.adopted}件</td></tr><tr><td>投票</td><td>${m.votes}回</td></tr></table>
      <div class="dr-note">重み：バグ報告 1／要望 3／名所の情報 2／投票 0.2／採用されたら +3。「開発メンバー」以上の人は更新ノートにクレジットが載り、年間上位には功労者カードを贈ります。</div>
      ${n.credits.length ? `<h4 style="margin:14px 0 4px">貢献の多い人</h4><table>${n.credits.slice(0, 10).map((c, i) => `<tr><td>${i + 1}</td><td>${esc(c.name)}</td><td>${esc(c.rank || "")}</td><td style="text-align:right">${esc(c.points)}</td></tr>`).join("")}</table>` : ""}`;
  } catch (e) { console.error(e); box.innerHTML = "<p>読み込めませんでした" + (e && e.code === "permission-denied" ? "（受付の準備中）" : "") + "</p>"; }
}

/* 入口: 地図右の 🛠（#devTool）とメニューの「開発室」（#devRoomBtn）。?devroom=1 で自動で開く */
window.addEventListener("DOMContentLoaded", () => {
  const b = $("devRoomBtn"); if (b) b.onclick = () => { const p = $("panel"); if (p) p.hidden = true; open("home"); };
  const t = $("devTool"); if (t) t.onclick = () => open("home");
  if (new URLSearchParams(location.search).get("devroom") === "1") setTimeout(() => open("home"), 800);
});
window.devroomOpen = open;
