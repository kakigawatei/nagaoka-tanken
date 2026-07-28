// 白背景キャラを透過→トリム→341×512にfeet-anchor配置（アルパカ/衣装スプライトと同方式）
const sharp = require("sharp");
const [IN, OUT] = process.argv.slice(2);
const CANVAS_W = 341, CANVAS_H = 512, TARGET = 496; // 最長辺をTARGETに

(async () => {
  const { data, info } = await sharp(IN).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h, channels: c } = info;
  const isBG = (i) => data[i] >= 240 && data[i + 1] >= 240 && data[i + 2] >= 230;
  const filled = new Uint8Array(w * h);
  const stack = [];
  // 四隅から flood
  const seeds = [[0, 0], [w - 1, 0], [0, h - 1], [w - 1, h - 1], [Math.floor(w / 2), 0], [Math.floor(w / 2), h - 1]];
  for (const [sx, sy] of seeds) { const p = sy * w + sx; if (!filled[p] && isBG(p * c)) { filled[p] = 1; stack.push(p); } }
  while (stack.length) {
    const p = stack.pop(); const x = p % w, y = (p / w) | 0;
    for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {
      if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
      const q = ny * w + nx; if (filled[q]) continue;
      if (isBG(q * c)) { filled[q] = 1; stack.push(q); }
    }
  }
  const out = Buffer.from(data);
  let minX = w, maxX = 0, minY = h, maxY = 0, cnt = 0;
  for (let i = 0; i < w * h; i++) {
    if (filled[i]) { out[i * c + 3] = 0; }
    else { const x = i % w, y = (i / w) | 0; if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; cnt++; }
  }
  const cw = maxX - minX + 1, ch = maxY - minY + 1;
  console.log("content bbox", cw + "x" + ch, "opaque px", cnt);
  const trimmed = await sharp(out, { raw: { width: w, height: h, channels: c } })
    .extract({ left: minX, top: minY, width: cw, height: ch }).png().toBuffer();
  // scale so longest side = TARGET
  const scale = TARGET / Math.max(cw, ch);
  const rw = Math.round(cw * scale), rh = Math.round(ch * scale);
  const resized = await sharp(trimmed).resize(rw, rh).png().toBuffer();
  // place on 341x512, horizontally centered, bottom-aligned (feet anchor with small margin)
  const left = Math.round((CANVAS_W - rw) / 2);
  const top = CANVAS_H - rh - 4;
  await sharp({ create: { width: CANVAS_W, height: CANVAS_H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: resized, left: Math.max(0, left), top: Math.max(0, top) }])
    .png().toFile(OUT);
  console.log("written", OUT, rw + "x" + rh, "at", left + "," + top);
})().catch(e => { console.error(e); process.exit(1); });
