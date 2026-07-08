// 衣装スプライトの仮アート生成スクリプト（プレースホルダ）。
// 既存の案内役スプライト（assets/original/guide_*.png）を sharp の tint() で色替えし、
// 衣装ごとの仮スプライトを assets/original/（原寸）と assets/（本番用・軽量化）に出力する。
// 本アート（ART_REQUEST_04.md 依頼分）が届いたら、このスクリプトは不要になり
// assets/original/guide_<pose>_<costume>.png を直接差し替えて resize_assets.js を再実行すればよい。
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const ASSETS = path.join(__dirname, "assets");
const ORIGINAL = path.join(ASSETS, "original");

const POSES = ["idle", "happy", "point"];

// 衣装ごとのtint色（紺=五十六／茶=継之助／藍=虎三郎）＋明るさ調整で判別しやすくする
const COSTUME_TINTS = {
  isoroku:     { color: { r: 55,  g: 72,  b: 112 }, brightness: 1.0,  saturation: 1.05 }, // 紺・海軍
  tsuginosuke: { color: { r: 128, g: 82,  b: 42  }, brightness: 0.97, saturation: 1.1  }, // 茶・武士
  torasaburo:  { color: { r: 76,  g: 60,  b: 98  }, brightness: 0.92, saturation: 1.05 }  // 藍・学者
};

async function processOne(pose, costumeId, tint) {
  const srcPath = path.join(ORIGINAL, "guide_" + pose + ".png");
  if (!fs.existsSync(srcPath)) {
    console.log("MISSING source:", srcPath);
    return;
  }
  const outName = "guide_" + pose + "_" + costumeId + ".png";
  const origOut = path.join(ORIGINAL, outName);
  const finalOut = path.join(ASSETS, outName);

  // 原寸tint版をassets/original/へ（将来の本アート差し替え対象）
  await sharp(srcPath)
    .modulate({ brightness: tint.brightness, saturation: tint.saturation })
    .tint(tint.color)
    .png({ compressionLevel: 9 })
    .toFile(origOut);

  // 本番用（既存guideスプライトと同じ height:512 に軽量化）
  await sharp(origOut)
    .resize({ height: 512 })
    .png({ compressionLevel: 9, palette: true, quality: 85 })
    .toFile(finalOut);

  const sz = fs.statSync(finalOut).size;
  const meta = await sharp(finalOut).metadata();
  console.log(outName, "->", (sz / 1024).toFixed(0) + "KB", meta.width + "x" + meta.height);
}

async function main() {
  for (const costumeId of Object.keys(COSTUME_TINTS)) {
    for (const pose of POSES) {
      await processOne(pose, costumeId, COSTUME_TINTS[costumeId]);
    }
  }
  console.log("DONE");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
