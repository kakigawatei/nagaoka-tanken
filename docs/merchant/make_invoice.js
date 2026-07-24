/**
 * 加盟店向け 請求書PDF ジェネレータ（銀行振込のお店用）
 *
 *   ⚠️【2026-07-24 方針転換】加盟＝無料スタート＋有料オプション制。基本掲載の月額課金は廃止。
 *   このジェネレータの --plan 固定価格（ライト/スタンダード/プレミアム月額・初期登録料）は旧モデル。
 *   今後は「有料オプションの個別見積り金額」を請求する用途に転用する（金額は都度指定）。基本掲載は無料＝請求不要。
 *
 *   node docs/merchant/make_invoice.js --shop "○○食堂" --plan standard --months 3 --init 0
 *
 * 口座情報は docs/merchant/bank.local.json から読む。
 * ★ bank.local.json は .gitignore 済み（公開リポジトリなので絶対にコミットしない）。
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const DIR = __dirname;
const CHROME = process.env.CHROME_PATH ||
  "C:/Program Files/Google/Chrome/Application/chrome.exe";

// 税込・月額
const PLANS = {
  light:    { name: "ライト",       price: 3000 },
  standard: { name: "スタンダード", price: 6000 },
  premium:  { name: "プレミアム",   price: 12000 },
};

function arg(name, def) {
  const i = process.argv.indexOf("--" + name);
  return i > -1 ? process.argv[i + 1] : def;
}
const yen = (n) => n.toLocaleString("ja-JP");

const shop   = arg("shop");
const planId = arg("plan", "standard");
const months = parseInt(arg("months", "3"), 10);
const init   = parseInt(arg("init", "0"), 10);   // 初期登録料（キャンペーン割引後の金額）

if (!shop) {
  console.error('使い方: node make_invoice.js --shop "店名" --plan light|standard|premium --months 3|12 --init 0');
  process.exit(1);
}
const plan = PLANS[planId];
if (!plan) { console.error("plan は light / standard / premium のいずれか"); process.exit(1); }

const bankPath = path.join(DIR, "bank.local.json");
if (!fs.existsSync(bankPath)) {
  console.error("bank.local.json がありません。bank.local.example.json をコピーして口座情報を記入してください。");
  process.exit(1);
}
const bank = JSON.parse(fs.readFileSync(bankPath, "utf8"));

// 12か月一括は「1か月分サービス」＝11か月分の料金で12か月掲載
const billedMonths = months === 12 ? 11 : months;
const monthsFee = plan.price * billedMonths;
const total = monthsFee + init;

const rows = [];
rows.push(`<tr>
  <td class="desc">加盟店掲載料 ${plan.name}プラン
    <small>${months}か月分${months === 12 ? "（12か月一括：1か月分サービスのため11か月分のご請求）" : ""}</small>
  </td>
  <td class="r">${billedMonths}か月</td>
  <td class="r">￥${yen(plan.price)}</td>
  <td class="r">￥${yen(monthsFee)}</td>
</tr>`);
if (init > 0) {
  rows.push(`<tr>
    <td class="desc">初期登録料<small>ピン・図鑑カード制作、地図上の位置設定、掲載データ登録（初回のみ）</small></td>
    <td class="r">1式</td>
    <td class="r">￥${yen(init)}</td>
    <td class="r">￥${yen(init)}</td>
  </tr>`);
} else {
  rows.push(`<tr>
    <td class="desc">初期登録料<small>先行加盟店キャンペーン適用</small></td>
    <td class="r">1式</td>
    <td class="r">￥5,000</td>
    <td class="r">￥0（無料）</td>
  </tr>`);
}

const today = new Date();
const due = new Date(today); due.setDate(due.getDate() + 14);
const fmt = (d) => `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
const invoiceNo = `NT-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}-${Math.floor(Math.random() * 900 + 100)}`;

const html = fs.readFileSync(path.join(DIR, "invoice_template.html"), "utf8")
  .replace(/{{INVOICE_NO}}/g, invoiceNo)
  .replace(/{{ISSUE_DATE}}/g, fmt(today))
  .replace(/{{DUE_DATE}}/g, fmt(due))
  .replace(/{{SHOP_NAME}}/g, shop)
  .replace(/{{TOTAL}}/g, yen(total))
  .replace(/{{ROWS}}/g, rows.join("\n"))
  .replace(/{{BANK_NAME}}/g, bank.bankName)
  .replace(/{{BRANCH}}/g, bank.branch)
  .replace(/{{ACCOUNT_TYPE}}/g, bank.accountType)
  .replace(/{{ACCOUNT_NO}}/g, bank.accountNo)
  .replace(/{{ACCOUNT_HOLDER}}/g, bank.accountHolder)
  .replace(/{{EXTRA_NOTE}}/g, months === 12
    ? "※ 12か月一括のため、1か月分（無料サービス分）を差し引いてご請求しております。"
    : "※ 最低利用期間は3か月です。");

const outDir = path.join(DIR, "out");
fs.mkdirSync(outDir, { recursive: true });
const tmpHtml = path.join(outDir, `_invoice_${invoiceNo}.html`);
const outPdf  = path.join(outDir, `請求書_${shop}_${invoiceNo}.pdf`);
fs.writeFileSync(tmpHtml, html, "utf8");

execFileSync(CHROME, [
  "--headless", "--disable-gpu", "--no-pdf-header-footer",
  `--print-to-pdf=${outPdf}`,
  "file:///" + tmpHtml.replace(/\\/g, "/"),
], { stdio: "ignore" });
fs.unlinkSync(tmpHtml);

console.log(`請求書を作成しました: ${outPdf}`);
console.log(`  ${shop} / ${plan.name} / ${months}か月 / 初期登録料 ￥${yen(init)} → 合計 ￥${yen(total)}（税込）`);
