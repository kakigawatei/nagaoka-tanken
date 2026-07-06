const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const ASSETS = path.join(__dirname, "assets");
const ORIGINAL = path.join(ASSETS, "original");

const ICONS_256 = [
  "coin.png", "compass.png", "treasure.png",
  "pin_found.png", "pin_unknown.png",
  "ic_home.png", "ic_map.png", "ic_book.png", "ic_shop.png", "ic_settings.png",
  "chest_closed.png", "chest_open.png"
];
const GUIDE_H512 = ["guide_idle.png", "guide_happy.png", "guide_point.png"];
const WIDTH_1024 = ["title_frame.png", "map_chuo.png", "map_settaya.png"];
const CARD_W768 = [
  "card_aore.png", "card_yamamoto.png", "card_kawai.png", "card_kina_saffron.png", "card_yoshinogawa.png",
  "card_sensai.png", "card_nyozekura.png", "card_honmaru.png", "card_yukyuzan.png",
  "card_koshimurasaki.png", "card_hasegawa.png"
];

async function processFile(filename, resizeOpts) {
  const origPath = path.join(ORIGINAL, filename);
  const outPath = path.join(ASSETS, filename);
  if (!fs.existsSync(origPath)) {
    console.log("MISSING original:", filename);
    return;
  }
  await sharp(origPath)
    .resize(resizeOpts)
    .png({ compressionLevel: 9, palette: true, quality: 85 })
    .toFile(outPath);
  const sz = fs.statSync(outPath).size;
  const meta = await sharp(outPath).metadata();
  console.log(filename, "->", (sz / 1024).toFixed(0) + "KB", meta.width + "x" + meta.height);
}

async function main() {
  for (const f of ICONS_256) await processFile(f, { width: 256 });
  for (const f of GUIDE_H512) await processFile(f, { height: 512 });
  for (const f of WIDTH_1024) await processFile(f, { width: 1024 });
  for (const f of CARD_W768) await processFile(f, { width: 768 });
  console.log("DONE");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
