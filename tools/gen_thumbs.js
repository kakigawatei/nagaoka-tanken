/*
 * 図鑑グリッド用サムネイル生成（2026-08-01 パフォーマンス改修）
 *
 * 背景: 図鑑グリッドは 768×1152・約2.4MB のカードPNGをそのままサムネとして
 * 読み込んでいた。発見50枚なら転送100MB超・デコードRAM170MB級になり、
 * 図鑑タブが重い最大の原因だった。
 *
 * これを assets/thumbs/<同名>.webp（幅320・q78・約20KB）に置き換える。
 * index.html 側は thumbs を読み、無ければ onerror で原寸PNGへフォールバック
 * するため、新カード追加時にこのスクリプトを回し忘れても表示は壊れない。
 *
 * 使い方: node tools/gen_thumbs.js   （カード追加のたびに実行）
 */
"use strict";
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const ROOT = path.join(__dirname, "..");
const ASSETS = path.join(ROOT, "assets");
const OUT = path.join(ASSETS, "thumbs");

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const cards = fs.readdirSync(ASSETS).filter(f => /^card_.*\.png$/.test(f));
  let made = 0, skipped = 0, total = 0;
  for (const f of cards) {
    const src = path.join(ASSETS, f);
    const dst = path.join(OUT, f.replace(/\.png$/, ".webp"));
    // 既に新しいサムネがあればスキップ（差分再生成）
    if (fs.existsSync(dst) && fs.statSync(dst).mtimeMs >= fs.statSync(src).mtimeMs) { skipped++; continue; }
    await sharp(src).resize({ width: 320 }).webp({ quality: 78 }).toFile(dst);
    total += fs.statSync(dst).size;
    made++;
  }
  console.log(`thumbs: ${made} generated, ${skipped} up-to-date, new bytes=${Math.round(total/1024)}KB`);
})();
