# 図鑑カード刷新 タスクフロー（正典・完全版）

このファイルは「ながおか探検録」の**図鑑カード刷新（既存カードを写実水彩＋エリア専用フレームに差し替え）**の作業手順を、**トークンリセット/コールドスタート後でも同じ品質・同じ手順で再現できる**ようにまとめた唯一の正典。**新しいセッションで作業を頼まれたら、まずこのファイルを最初から読むこと。** ここに全部書いてある＝毎回ゼロから組み立て直さない。

作成 2026-07-17（与板作業中に masa の要望で作成）。実績エリア: 摂田屋 / 山古志 / 寺泊（完了）→ 与板（進行中）。

---

## 0. 大原則（これだけは絶対）

1. **カードは1エリアずつ・1スポットずつ手作り。** 一括生成しない。「一つずつやるのが誠実」（masa方針）。
2. **アートに文字を入れさせない。** スポット名/ロゴ/読める看板はChatGPTに描かせない（漢字が崩れる）。**文字＝縦ロゴは後工程でこちら（Claude）が正確に型押しする。**
3. **フレームのサイズは全エリア完全統一。** 特に「左ロゴ帯幅＝透過窓の左端＝x208」「キャンバス1024×1536」「最終768×1152」。ここがブレると図鑑で並べたとき不揃いになる（masaが最も気にする点）。
4. **masaへのコピペ用プロンプトは必ず自己完結＝1回コピペで完結・部分削除ゼロ。** 「これを貼って、さらにこの一文も足して」は禁止。1メッセージ＝完成した1プロンプト。案内文は別メッセージに分ける。
5. **連続モード。** 定型フローに入ったら毎ステップの許可を取らない。昼アートが来たら→合成→即豪華版プロンプト送付。豪華版が来たら→合成→assets差替→sw bump→push。プレビューは見せるが承認待ちで止まらない。問題や本当の判断時だけ止まる。
6. **masaはDiscordのスマホからやりとりReplyツールで返す**（日本語・簡潔）。ターミナル出力は本人に届かない。詳細は [masa-discord-workflow メモリ] 参照。

---

## 1. 統一フレーム仕様（実測値・全エリア共通）

| 項目 | 値 |
|---|---|
| レンダーキャンバス | **1024×1536px**（HTML/Edgeヘッドレス） |
| 最終カード | **768×1152px**（sharpで縮小） |
| 台紙色（クリーム） | **#e7d3a4** |
| インク色（深緑・単色） | **#1b3a2c** |
| 透過窓 left（＝左ロゴ帯幅） | **208px**（摂田屋208/山古志207/寺泊211/与板208 でほぼ一致＝揃える生命線） |
| 透過窓 right | 951〜958px |
| 透過窓 top | 約76px |
| 窓 bottom（下部シルエット上端） | エリア可変（1180〜1336）。ここだけ個性でOK |

**アート配置（build script内・全エリア共通）:**
```css
.art{position:absolute;left:184px;top:-offsetY;width:800px;height:1536px;
     object-fit:cover;object-position:center;}
```
アートは窓leftより24px左（x=184）から始まり、はみ出しは左ロゴ帯の不透過部で隠れる。→**フレームのロゴ帯はx208まで完全不透過であること必須。**

**縦ロゴSVG（build script内・全エリア共通。1文字も変えない）:**
- font: `"Arial Black","Franklin Gothic Heavy","Impact"` / weight 900 / fill `#1b3a2c`
- `font-size="158" textLength="1040" lengthAdjust="spacingAndGlyphs"`（自動フィット）
- `text-anchor="middle" dominant-baseline="central"`
- `transform="translate(122,765) rotate(-90)"`（帯中心x=122）
- grungeフィルタ: feTurbulence(baseFreq0.05,4oct,seed11)→feDisplacementMap(scale4) ＋ 斑点feTurbulence(0.75,2oct,seed4)→feColorMatrix(alpha 13,-7.2)→feComposite out

**下部シルエット帯:** 最新方式＝**上端フェードの半透明ブレンド**（寺泊/与板）。上端でα0（アートに溶ける）→下端でα255（不透過ではっきり）。masaの「シルエットははっきり／上端だけ溶かす」希望を満たす。摂田屋/山古志は旧・全面不透過。

---

## 2. エリアのフレームを新規に作る手順（エリア初回のみ）

### 2-1. フレームのデザイン設計（Fableに任せる）
masaは「フレーム設計はFableに」と指名することが多い。その場合 `Agent`(model:"fable") を synchronous で立て、**このファイルと既存の build_final_card_*.js / frame_*_overlay.png を読ませて統一仕様を実測させ**、エリアの題材から四隅4モチーフ・下部シルエット・縁飾り・縦ロゴ案・豪華版トーンを設計させる。成果物＝masaにそのまま渡せる日本語（設計サマリ＋ChatGPT生成プロンプト＋ロゴ候補）。

### 2-2. フレーム生地をChatGPTで生成（masa）
masaがChatGPTで「**額縁だけ・中央の窓は空・写真なし・深緑単色・1024×1536・左に無地ロゴ帯約200px**」を生成。
- ⚠️**額縁付き完成カードを添付させない**（額縁ごと再描画してロゴ帯も消える）。
- 一番安定するのは**既存エリアの `frame_○○_raw.png`（枠だけ生地）を構造見本として添付**し「この構造・帯幅のまま、四隅と下部のモチーフだけ差し替え」と1プロンプトで指示（大原則4）。テンプレは §6-A。

### 2-3. 生地を保存＆窓をknockoutしてoverlay化（Claude）
1. 送られた生地を `tools/card_frame/frame_<area>_raw.png` に保存（1024×1536。違えばsharpでresize）。
2. **窓座標を実測**（下記スクリプトで winLeft/right・下部シーン上端を測る）。winLeftが208±3なら統一OK。
3. `make_teradomari_overlay.js` をコピーして `make_<area>_overlay.js` を作り、パラメータを実測に合わせて調整 → `frame_<area>_overlay.png` 生成。調整パラメータ:
   - `WIN_YMAX`＝窓のflood-fillを止めるy（下部シーン上端の少し上）
   - `GRAD_TOP`/`GRAD_FULL`＝下部シルエットのフェード帯（α0→α255）
   - `FOOT_X0/FOOT_X1`＝シルエット内側x範囲（≈208〜951）
   - `BORDER_Y`＝下端外枠を不透過に保つy（≈1505）
   - `MAXA`＝下端の不透過度（255＝くっきり）
   - flood-fillの種(seed)は窓内部の点。`isWin`＝クリーム平坦色検出（g≥226 && r≥232 && b≤225）

窓座標の実測スニペット（node、リポジトリ直下で実行）:
```js
const s=require("sharp");
(async()=>{const {data,info}=await s("tools/card_frame/frame_<area>_raw.png").ensureAlpha().raw().toBuffer({resolveWithObject:true});
const {width:w,channels:c}=info; const idx=(x,y)=>(y*w+x)*c;
const isDark=i=>data[i]<130&&data[i+1]<130&&data[i+2]<130;
const winL=y=>{for(let x=500;x>60;x--){if(isDark(idx(x,y)))return x;}return -1};
const winR=y=>{for(let x=512;x<1010;x++){if(isDark(idx(x,y)))return x;}return -1};
for(const y of [300,760,1200])console.log("y="+y,"L="+winL(y),"R="+winR(y));})();
```

### 2-4. build script を作る（Claude）
`build_final_card_teradomari.js` をコピーして `build_final_card_<area>.js` を作り、**`FRAME` 定数のパスだけ `frame_<area>_overlay.png` に差し替える。他は1文字も変えない**（ロゴSVGのtransformが同一＝帯位置が揃う）。

### 2-5. テスト合成→masaに枠確認
既存の枠なしアート（例 `tools/card_frame/art_yamakoshi_day.png`）をプレースホルダに §4 の手順で1枚合成し、masaに見せて「この枠で確定OK？豪華版トーンもOK？」を確認。OKが出たら:
- **枠ツールをgitコミット**（`frame_<area>_raw.png`＋`frame_<area>_overlay.png`＋`build_final_card_<area>.js`＋`make_<area>_overlay.js`）。sw bumpは不要（ツールのみ・ライブカード未変更）。
- スポット作業（§3）へ。

---

## 3. スポット1つを仕上げる標準フロー（毎スポット反復）

1. **masaが実物の参照写真を1枚送る**（＋こちらは §6-B の昼アートプロンプトを送る。ロゴ名はスポット表から。プロンプトは自己完結1枚）。
2. masaが**文字・枠なしの昼アート**を生成して送る。
3. **昼を合成**（§4、offsetYは主役が下部シルエットに隠れる時だけ上げる）→ 768×1152プレビューをmasaに見せる。
4. **すぐ豪華版プロンプトを送る**（§6-C。エリアの豪華版トーンで。masaは「昼アートを参照添付」して生成）。※連続モード＝ここで承認待ちしない。
5. masaが豪華版アートを送る → **豪華版を合成** → プレビュー。
6. **両方を assets に反映**: `assets/card_<id>.png`（昼）＋`assets/card_<id>_deluxe.png`（豪華）。
7. **sw.js の `CACHE_VERSION` を +1**（例 v84→v85）。
8. **1スポット＝1コミット＋push**。コミットメッセージ例: `図鑑カード刷新: <エリア> <スポット名>（通常＋豪華）を写実水彩＋<エリア>フレームに差し替え（sw v85）`。
9. 次のスポットへ。全スポット終わったら「<エリア>エリア完了」コミットで締める。

**参照写真がない場合**: masaが「写真なし」と言ったら、写真なしでも描けるよう主役の特徴を文章で描写したプロンプトに差し替える。

---

## 4. 合成レンダーの実コマンド

```bash
SCRATCH="<scratchpadの絶対パス>"   # ⚠️リポジトリのtoolsディレクトリに書くとAccess-denied(0x5)。必ずscratchpadへ
cp "<送られたアート>" "$SCRATCH/art_<id>.png"
# 1) 合成HTML生成（NAME=縦ロゴ, 末尾はoffsetY。主役が隠れなければ0）
node tools/card_frame/build_final_card_<area>.js "file:///$SCRATCH/art_<id>.png" "<VERTICAL LOGO>" "$SCRATCH/<id>.html" 0
# 2) Edgeヘッドレスでスクショ（1024×1536）
EDGE="/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"
"$EDGE" --headless=new --disable-gpu --no-sandbox --hide-scrollbars --window-size=1024,1536 \
  --virtual-time-budget=8000 --screenshot="$SCRATCH/<id>_render.png" "file:///$SCRATCH/<id>.html"
# 3) sharpで768×1152に縮小して assets へ
node -e "const s=require('sharp'); s('$SCRATCH/<id>_render.png').resize(768,1152).png().toFile('assets/card_<id>.png').then(()=>console.log('done'))"
```
- Windows: sharp等をnodeに渡すパスは `C:/...` 形式（bashの `/c/...` はnodeのfsが解釈しない）。scriptはリポジトリ直下で実行（sharpは repo の node_modules）。
- `--virtual-time-budget` は画像ロード待ち。8000ms程度。

---

## 5. エリア・スポット・ロゴ・豪華版トーン表

**豪華版トーン（エリア共通）:** 寺泊＝夕焼け＋長岡花火 ／ 与板＝十五夜の満月＋祭り提灯 ／ 山古志＝夜＋花火（震災遺構の木籠は静かな慰霊トーン）。新エリアはFableが1案提示→masa決定。

**与板（進行中, id＝pois.jsonの実id）:**
| # | id | スポット | 縦ロゴ | 状態 |
|---|---|---|---|---|
| ① | yoita | 都野神社 | TSUNO JINJA | ✅ v84 |
| ② | kanetsugu_museum | 兼続お船ミュージアム | KANETSUGU OFUNE | 作業中 |
| ③ | yoita_castle | 与板城跡（城山） | YOITA CASTLE | 未 |
| ④ | moto_yoita | 本与板城跡 | MOTOYOITA JO | 未 |
| ⑤ | rakuzanen | 楽山苑 | RAKUZANEN | 未 |

※過去エリアのロゴ実績: 寺泊＝TERADOMARI ICHIBA/SHIRAYAMAHIME JINJA/SHOMYOJI MITSUZOIN/SYUUKANEN/TERADOMARI SUIZOKUKAN/TERADOMARI BEACH。山古志＝ORATARU/YAMAKOSHI TOGYU/NAKAYAMA ZUIDO/KOGOMO MEMORIAL/TANESUHARA ALPACA/YUBU ALPACA。

---

## 6. コピペ用プロンプト・テンプレート（自己完結・1回コピペ用）

### 6-A. フレーム生地生成（エリア初回・既存生地を添付する版）
> masaに「既存の `frame_○○_raw.png` を添付して」と案内（別メッセージ）した上で、これ1本を送る。`【】`をエリアに合わせて書き換えて送る。
```
添付した画像と同じ「装飾フレームだけ」のカード画像を作ってください。1024×1536ピクセル、縦長。添付画像は完成見本の“枠の生地”です。これをベースに、【エリア名】版へ下記のとおり描き替えてください。

【そのまま維持するもの】
・全体の枠の構造とレイアウト（外周の二重罫線、四辺に巡る細い和柄パターン帯、四隅の雲形の隅飾り枠、下部の横長シルエット帯）
・左端にある幅が画像の約1/5（約200px）の「無地クリーム色の縦帯」。ここには何も描かない（後からロゴ文字を入れるため）
・中央〜右の大きな縦長の窓は、何も描かれていない平坦なクリーム色の“空”のまま
・色は深緑（#1b3a2c）の単色インクと、クリーム色（#e7d3a4）の台紙の2色のみ。大正〜昭和初期のマッチラベル／木版画風

【描き替えるもの（モチーフだけ差し替え）】
四隅の隅飾りの中身：【左上=… / 右上=… / 左下=… / 右下=…】
下部の横長シルエット帯：【エリアの町並み・自然のシルエット】

【最重要】写真やイラストをはめ込んだ完成カードではなく、中央の窓が空のクリーム色のままの「装飾フレームだけ」を出力してください。
```

### 6-B. 昼アート（毎スポット・参照写真を添付する版）
```
新潟県長岡市の「【スポット名】」を1枚描いてください。添付した参照写真の構図と特徴を活かして、絵画化してください。

【画風】温かみのある和の風景画。実際の写真の構図と色を活かしつつ、少し絵画的に整える（写実7：イラスト3）。やわらかな陰影、上質な和紙のような細かい粒状感、彩度は落ち着いたセピア寄り。自然光の昼、澄んだ空。日本画とレトロな観光ポスターの中間のような、品のある雰囲気。

【構図】縦長（アスペクト比 2:3）。主役の【建物／風景の特徴】を画面の中央〜やや上に大きく配置し、手前に【前景：参道・石段・水面・草花・アプローチ等】を置いて奥行きを出す。

【禁止】画像内に文字・ロゴ・読める看板は入れない（後で加えます）。額縁や縁飾りも付けない（中央の絵だけ）。実在の人物は描かない（必要なら小さな後ろ姿のシルエット程度）。

この場所の特徴を活かして、上記の画風で縦長に1枚描いてください。
```

### 6-C. 豪華版（毎スポット・昼アートを参照添付する版）
> `【夜の演出】`をエリアの豪華版トーンで書く。与板＝十五夜。寺泊＝夕焼け＋花火。
```
先ほど作った「【スポット名】」の通常版（昼）の画像を、参照として添付します。この画像と“まったく同じ構図・同じ画風・同じ縦横比(2:3)”のまま、時間帯だけ夜に変えてください。

【夜の演出】
・（与板の例）藍〜紺の静かな夜空に大きな満月をひとつ。参道の石灯籠・軒下・拝殿に祭りの提灯やろうそくの暖かい灯り（暖色の金・オレンジ）。石畳や水面に月と灯りの映り込みを少し。全体は静かな青い夜のトーンだが提灯と月あかりで暖かく品よく。
・（寺泊の例）茜〜橙〜紫の夕焼け空に長岡花火を数発。海面/水面に映り込み。店明かりが灯り始める。

【禁止】構図・建物の形・縦横比(2:3)は変えない。文字・ロゴ・枠は入れない。人物は増やさない。
```

---

## 7. デプロイと反映（重要な区別）

- **デプロイ＝`git push origin main`**（GitHub Pagesがリポジトリ直下を配信）。
- **反映の区別（masaに伝えるとき必ず区別する）**: Web(github.io)とホーム画面PWAは`sw.js`のCACHE_VERSIONを上げてpushすれば即反映。**App Store版ネイティブアプリ（Capacitor）だけは別**＝`capacitor.config.json`に`server.url`が無く`www/`をbundleするので、Macでリビルド（`git pull`→`node build-www.js`→`npx cap sync ios`→Xcodeでバージョン上げ→Archive→提出）しないと入らない。カード刷新は基本Web先行。
- 詳細は [nagaoka-walk-project メモリ] / [nagaoka-teradomari-card-refresh メモリ] 参照。

---

## 8. 関連ファイル

- ツール: `tools/card_frame/build_final_card_<area>.js`, `make_<area>_overlay.js`, `frame_<area>_raw.png`, `frame_<area>_overlay.png`
- アート画風の元仕様: `docs/CARD_ART_SPEC.md`
- スポットID/データ: `data/pois.json`（各スポットの id・name・blurb）
- メモリ: masa-discord-workflow / nagaoka-walk-project / nagaoka-teradomari-card-refresh / nagaoka-yoita-card-refresh
