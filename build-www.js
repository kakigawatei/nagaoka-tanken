/*
 * Capacitor 用の webDir（www/）を組み立てるスクリプト。
 * GitHub Pages はリポジトリ直下をそのまま配信するが、Capacitor は「Web資産だけが入った
 * きれいなフォルダ」を webDir に指定したい。そこで、配信に必要なファイルだけを www/ へコピーする。
 * 使い方（Mac）：node build-www.js  →  npx cap sync ios
 */
"use strict";
const fs = require("fs");
const path = require("path");

const root = __dirname;
const out = path.join(root, "www");

// 毎回クリーンに作り直す
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

// 単体ファイル
["index.html", "sw.js", "manifest.webmanifest"].forEach(function (f) {
  const src = path.join(root, f);
  if (fs.existsSync(src)) fs.copyFileSync(src, path.join(out, f));
});

// ディレクトリ（assets は原本フォルダ original を除外して軽く）
fs.cpSync(path.join(root, "data"), path.join(out, "data"), { recursive: true });
fs.cpSync(path.join(root, "assets"), path.join(out, "assets"), {
  recursive: true,
  filter: function (src) {
    return !src.split(path.sep).includes("original");
  },
});

console.log("www/ を組み立てました（index.html / sw.js / manifest / data / assets）");
