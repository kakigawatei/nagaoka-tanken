# 引き継ぎメモ：iOSアプリ化（Mac側のClaudeへ）

このリポジトリ「ながおか探検録」を **iOSアプリ化 → App Store公開** する作業の引き継ぎ。
これまではWindows PCのClaudeが担当し、Web版の実装とCapacitor土台の用意まで済んでいる。**iOSのビルド・申請はMac必須**なので、ここからはMac側のClaudeが直接ターミナル/Xcodeを操作して進める。

## プロジェクト概要
- 新潟県長岡市の街歩き位置情報ゲーム（PWA・静的サイト・バニラJS単一 `index.html`）。
- 公開Web版：https://kakigawatei.github.io/nagaoka-tanken/ （GitHub Pages、`main`へpushで自動デプロイ）。
- リポジトリ：github.com/kakigawatei/nagaoka-tanken 。**Webの真のソースはこのリポジトリ**。`index.html`/`data/`/`assets/`/`sw.js`/`manifest.webmanifest`。

## 決定事項（変更しないこと）
- App Store方針：**Capacitorで今のWebをラップ**（コード流用、作り直さない）。
- appId：`com.nagaokatanken.app` ／ appName：`ながおか探検録`（`capacitor.config.json`に設定済み）。
- Apple Developer：**Individual登録済み**（本名 岡雅俊が販売者表示。スピード優先）。Xcodeインストール済み。
- webDir：`www`（`build-www.js`が配信ファイルだけを`www/`に集める）。`www/`・`ios/`はgitignore。

## 済んでいること（コミット済み）
- `capacitor.config.json`、`build-www.js`、`docs/IOS_APP_SETUP.md`（Mac手順の詳細）。
- Web版は完成・公開運用中（ガチャ、図鑑＋豪華版カード全17、再訪2時間ルール、加盟店フォーム接続 tally.so/r/GxyO8L 等）。

## 次にやること（この順で。詳細は IOS_APP_SETUP.md）
1. リポジトリを最新に（`git pull`）。CocoaPods未導入なら導入（`brew install cocoapods` 推奨、無ければ `sudo gem install cocoapods`）。
2. `npm install` → `npm install @capacitor/core@latest @capacitor/cli@latest @capacitor/ios@latest`
3. `node build-www.js` → `npx cap add ios`
4. `ios/App/App/Info.plist` に `NSLocationWhenInUseUsageDescription`（例：「現在地の周辺にある史跡・名所を探すために位置情報を使用します。」）を追加。
5. `npx cap open ios` → Xcodeで署名Team設定（Bundle IDは `com.nagaokatanken.app`）→ **iOSシミュレータで起動確認**（タイトル→ホーム→GPSシミュレーションで発見まで）。
6. 問題なければ実機確認 → App Store Connectでアプリ作成 → スクショ/プライバシー（位置情報の用途申告）→ Archive → 申請。

## 注意・既知の落とし穴
- **Service Worker**：アプリ内（`capacitor://localhost`配信）ではSWが不要・干渉することがある。挙動がおかしければ `index.html` のSW登録を `if(!window.Capacitor){ … }` でガードする（Web版の動作は変えない）。
- **位置情報**：`navigator.geolocation` はWKWebViewでも動くが、不安定なら `@capacitor/geolocation` に差し替え可。
- **Pages配信を壊さない**：`ios/`・`www/`・`node_modules/` は `.gitignore` 済み。Pagesはリポジトリ直下を配信するので、余計な生成物をコミットしない。
- **Web変更の反映**：アプリ版は「その時点の`www/`を焼き込む」形。Web(index.html)を直したら `node build-www.js && npx cap sync ios` が必要（Web版Pagesは従来通り即時）。

## フェーズ2：アプリ内課金（IAP）
- 無料で遊べる大原則は維持（pay-to-winにしない）。売るのは時短/便利/見た目（コインパック、ダブルコイン券・探知強化の有償版、装飾、サポーター課金）。
- 実装は **RevenueCat** 推奨（StoreKit簡略化・月$2.5k売上まで無料）。App Store Connectで課金アイテム登録。
- 注意：コインは現状localStorage（端末内）。購入付与も端末内でMVPはOK、堅牢化は将来サーバー。

## 補足
- これまでの詳細な開発経緯メモはWindows側のClaudeのメモリにあり、Mac側からは見えない。**このリポジトリの `docs/` が実質の引き継ぎ資料**（IOS_APP_SETUP.md／BUSINESS_PLATFORM.md／LEGAL_DRAFTS.md／MERCHANT_APPLICATION_FORM.md／STRIPE_SETUP.md／PROMO_MATERIALS.md／ROADMAP.md／ORCHESTRATION.md）。
- 宣伝素材（チラシ/POP）のCodecプロンプトは `docs/PROMO_MATERIALS.md`。
