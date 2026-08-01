/*
 * 画像アセットの減色最適化（2026-08-01 提案⑥）
 *
 * 400KB以上のPNG（アイコン類を除く）を palette量子化(q100) で圧縮する。
 * 水彩画アートは256色パレットでも視覚的に区別がつかない（実測 平均差0.9%）。
 *
 * 安全装置:
 *  - 元とのピクセル平均差(RGBA)が閾値を超えたらスキップ（見た目が変わる圧縮はしない）
 *  - 25%以上縮まない場合もスキップ（リスクに見合わない）
 *  - 元データはgit履歴に残る（戻すときは git checkout <rev> -- assets/xxx.png）
 *
 * 使い方: node tools/optimize_assets.js [--dry]
 */
"use strict";
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const ASSETS = path.join(__dirname, "..", "assets");
const MIN_KB = 400;          // これ未満は触らない
const MAX_MEAN_DIFF = 4.0;   // ピクセル平均差(0-255)の許容値
const MIN_SAVING = 0.25;     // 最低圧縮率（25%縮まなければ据え置き）
const EXCLUDE = /^(app_icon|admin_icon|crowd_icon|apple_touch|favicon)/;
const DRY = process.argv.includes("--dry");

async function meanDiff(bufA, bufB) {
  const A = await sharp(bufA).ensureAlpha().raw().toBuffer();
  const B = await sharp(bufB).ensureAlpha().raw().toBuffer();
  if (A.length !== B.length) return 999;
  let sum = 0;
  for (let i = 0; i < A.length; i += 4) {
    sum += (Math.abs(A[i]-B[i]) + Math.abs(A[i+1]-B[i+1]) + Math.abs(A[i+2]-B[i+2]) + Math.abs(A[i+3]-B[i+3])) / 4;
  }
  return sum / (A.length / 4);
}

(async () => {
  const files = fs.readdirSync(ASSETS)
    .filter(f => f.endsWith(".png") && !EXCLUDE.test(f))
    .filter(f => fs.statSync(path.join(ASSETS, f)).size >= MIN_KB * 1024)
    .sort();
  let done = 0, skippedQ = 0, skippedS = 0, before = 0, after = 0;
  for (const f of files) {
    const p = path.join(ASSETS, f);
    const src = fs.readFileSync(p);
    let out;
    try {
      out = await sharp(src).png({ palette: true, quality: 100, effort: 8 }).toBuffer();
    } catch (e) { console.log("ERR", f, e.message); continue; }
    if (out.length > src.length * (1 - MIN_SAVING)) { skippedS++; continue; }
    const d = await meanDiff(src, out);
    if (d > MAX_MEAN_DIFF) { console.log("SKIP(quality)", f, "diff=" + d.toFixed(2)); skippedQ++; continue; }
    before += src.length; after += out.length;
    if (!DRY) fs.writeFileSync(p, out);
    done++;
    if (done % 25 === 0) console.log("...", done, "files");
  }
  console.log(`最適化 ${done}枚 / 画質スキップ ${skippedQ} / 効果薄スキップ ${skippedS}`);
  console.log(`${Math.round(before/1048576)}MB → ${Math.round(after/1048576)}MB (${Math.round(after/Math.max(before,1)*100)}%)${DRY ? "  [DRY RUN]" : ""}`);
})();
