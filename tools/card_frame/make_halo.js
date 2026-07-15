// シルエット型のクリーム・ハロー（縁取り＋モヤモヤ）を1枚生成する。
// frame_overlay_v2 の下部シルエット（橋・水道タンク・建物・地面・木）の"かたまり"を抜き出し、
// スカイライン（各柱の最上点）から下を全部塗り潰し（＝橋トラスの隙間も塗る）、
// 輪郭を少し太らせ（dilate＋ゆらぎ）、ぼかしてクリームの発光アルファにする。
// アートとフレームの間に敷くと、建物の高さに合わせてデコボコにイラストが
// シルエットへ溶け込みつつ、夜の暗い絵でもシルエットがくっきり読める。
// usage: cd tools/card_frame && node make_halo.js
const sharp = require('sharp');

// ---- チューニングパラメータ ----
const DILATE = 14;   // シルエット輪郭からクリーム不透過コアを外へ太らせる量(px)
const WOBBLE = 8;    // 輪郭のゆらぎ振幅(px)：機械的なオフセットに見えないように
// 2段グロー：狭いぼかし（縁の発光）＋広いぼかし（長く尾を引くモヤ）を足して飽和させる
const BLUR1 = 14, GAIN1 = 1.5;   // 縁
const BLUR2 = 38, GAIN2 = 0.55;  // モヤ
// 検出範囲：左右の花火はほぼ不透過クリーム上なので、混入しても見た目に影響しない。
// 右下の小さな木(x>835)も拾うため右へ広げる。
const X0 = 185, X1 = 945, Y0 = 1295;

(async () => {
  const F = 'frame_overlay_v2.png';
  const { data, info } = await sharp(F).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height, C = info.channels;

  const isDark = (x, y) => {
    const i = (y * W + x) * C;
    return data[i + 3] > 170 && (data[i] + data[i + 1] + data[i + 2]) / 3 < 115;
  };

  // 1) 各列のスカイライン最上点（縦3px連続で濃い＝ゴミ除外）
  const INF = 1e9;
  const top = new Array(W).fill(INF);
  for (let x = X0; x < X1; x++) {
    for (let y = Y0; y < H - 2; y++) {
      if (isDark(x, y) && isDark(x, y + 1) && isDark(x, y + 2)) { top[x] = y; break; }
    }
  }
  // 横3列メディアンで孤立スパイクを除去（尖塔は2px幅以上なら残る）
  const topM = top.slice();
  for (let x = X0 + 1; x < X1 - 1; x++) {
    const a = [top[x - 1], top[x], top[x + 1]].sort((p, q) => p - q);
    topM[x] = a[1];
  }

  // 2) 円形構造要素での2D dilate（列ごとに newTop を計算）＋ゆるいゆらぎ
  const wob = x => WOBBLE * (0.5 + 0.28 * Math.sin(x * 0.043 + 1.7) + 0.22 * Math.sin(x * 0.011 + 0.4));
  const newTop = new Array(W).fill(INF);
  for (let x = 0; x < W; x++) {
    let best = INF;
    for (let dx = -DILATE; dx <= DILATE; dx++) {
      const xx = x + dx;
      if (xx < 0 || xx >= W || topM[xx] === INF) continue;
      const rise = Math.floor(Math.sqrt(DILATE * DILATE - dx * dx) + wob(xx));
      const t = topM[xx] - rise;
      if (t < best) best = t;
    }
    newTop[x] = best;
  }

  // 3) コア（スカイラインから下は全部不透過＝橋の隙間もクリームで埋まる）
  const core = Buffer.alloc(W * H, 0);
  for (let x = 0; x < W; x++) {
    if (newTop[x] === INF) continue;
    const t = Math.max(0, newTop[x]);
    for (let y = t; y < H; y++) core[y * W + x] = 255;
  }

  // 4) 2段ぼかし→ゲイン合成：「不透過コア＋発光の縁＋長く尾を引くモヤ」のアルファに
  const raw1 = { raw: { width: W, height: H, channels: 1 } };
  // 注意: toColourspace('b-w') が無いと sharp が3chに展開してバッファ長が変わる
  const glow1 = await sharp(core, raw1).blur(BLUR1).toColourspace('b-w').raw().toBuffer();
  const glow2 = await sharp(core, raw1).blur(BLUR2).toColourspace('b-w').raw().toBuffer();
  // 発光は「半透明のベール」にする＝コアも含め上限 PEAK(≈50%) まで。
  // これで境界でイラストが透けて、ぼんやりとシルエットに溶け込む（不透過の下地にしない）。
  const PEAK = 128; // 最大アルファ ≈50%
  const alpha = Buffer.alloc(W * H);
  for (let i = 0; i < W * H; i++) {
    const v = Math.max(core[i], Math.min(255, Math.round(glow1[i] * GAIN1 + glow2[i] * GAIN2)));
    alpha[i] = Math.round(v * PEAK / 255);
  }

  // 5) クリーム地(#eecd84)に載せて halo PNG へ
  await sharp({ create: { width: W, height: H, channels: 3, background: { r: 238, g: 205, b: 132 } } })
    .joinChannel(alpha, { raw: { width: W, height: H, channels: 1 } })
    .png()
    .toFile('silhouette_halo.png');
  console.log('wrote silhouette_halo.png  (DILATE=%d WOBBLE=%d BLUR1=%d GAIN1=%s BLUR2=%d GAIN2=%s)', DILATE, WOBBLE, BLUR1, GAIN1, BLUR2, GAIN2);
})();
