# iOSアプリ化 手順（Capacitorラッパー → App Store）

今のWebアプリ（index.html一式）をそのまま**ネイティブアプリの皮（Capacitor）**で包んでApp Storeに出すための手順。中身のコード（GPS・図鑑・ガチャ等）はそのまま流用。

- appId：`com.nagaokatanken.app`
- appName：`ながおか探検録`
- webDir：`www`（`build-www.js` が配信用ファイルだけを集めて作る）
- 設定ファイル：`capacitor.config.json`（このリポジトリに用意済み）

> ⚠️ iOSのビルド・申請は **Mac + Xcode** が必要（Windowsでは不可）。以下は基本すべて **masaさんのMac** で実行。

---

## 0. 事前準備（Mac）
1. **Xcode** をApp Storeから入れる（無料・大きいので時間がかかる）。入れたら一度起動して規約に同意。
2. **Node.js**（v18+）を入れる（https://nodejs.org）。
3. **CocoaPods** を入れる：ターミナルで `sudo gem install cocoapods`（またはHomebrew: `brew install cocoapods`）。
4. **Apple Developer Program** に登録（$99/年）。※シミュレータ確認だけなら未登録でも可。実機テスト・申請の段階で必要。
5. リポジトリを取得：`git clone https://github.com/kakigawatei/nagaoka-tanken.git` → `cd nagaoka-tanken`

## 1. Capacitorを入れて iOSプロジェクトを作る（初回だけ）
```bash
# 依存を入れる（最新版）
npm install
npm install @capacitor/core@latest @capacitor/cli@latest @capacitor/ios@latest

# 配信用の www/ を組み立てる
node build-www.js

# iOSネイティブプロジェクトを生成（capacitor.config.json を読む。cap init は不要）
npx cap add ios
```
これで `ios/` フォルダ（Xcodeプロジェクト）が生成される（`ios/` はgit管理外＝各自のMacで生成）。

## 2. 位置情報（GPS）の許可文を追加
`ios/App/App/Info.plist` に以下を追加（Xcodeの左ペインで Info.plist を開き、キーを追加してもOK）：
- キー：`NSLocationWhenInUseUsageDescription`
- 値（例）：`現在地の周辺にある史跡・名所を探すために位置情報を使用します。`

> これが無いとGPSが動きません。バックグラウンドで使う予定は無いので When In Use だけでOK。

## 3. シミュレータで動作確認
```bash
node build-www.js && npx cap sync ios
npx cap open ios      # Xcodeが開く
```
Xcodeで上部の実行先を「iPhone(シミュレータ)」にして ▶ 実行。アプリが起動して、タイトル→ホーム等が表示されればOK。
（シミュレータのGPSは Xcode の Features → Location でダミー座標を流せる）

## 4. 署名（実機テスト・申請の準備）
Xcode左の「App」ターゲット → 「Signing & Capabilities」：
- 「Automatically manage signing」ON
- Team：自分のApple Developerチームを選択（要 $99登録）
- Bundle Identifier：`com.nagaokatanken.app`（config と一致）

実機で試すには、iPhoneをUSB接続して実行先に選ぶ。

## 5. Web側を更新したときの反映
アプリの中身（index.html等）を直したら、毎回：
```bash
node build-www.js && npx cap sync ios
```
※ App Store版は「その時点のwww/を焼き込む」形。Web（GitHub Pages）はこれまで通り即時反映だが、アプリ版は再ビルド＆申請が必要。

## 6. App Store Connect でアプリ登録 → 申請
1. https://appstoreconnect.apple.com → 「マイApp」→ ＋ → 新規App
   - プラットフォーム：iOS／名前：ながおか探検録／主要言語：日本語／バンドルID：com.nagaokatanken.app／SKU：任意（例 nagaokatanken-001）
2. 情報を埋める：カテゴリ（ゲーム or 旅行）、年齢区分、プライバシーポリシーURL（GitHub Pages等）、サポートURL
3. **App Privacy**（プライバシー質問）：位置情報を使う→「位置情報（おおよそ/正確）」を申告。用途は「アプリ機能（現在地で史跡を探す）」。端末外に送っていない旨も回答
4. スクリーンショット：6.7インチ等の必須サイズ（シミュレータで撮影可）
5. Xcodeで Archive（Product → Archive）→ Distribute App → App Store Connect にアップロード
6. アップロードしたビルドを選んで「審査に提出」

> 審査のコツ：GPSで史跡を巡る“ちゃんと機能する”アプリなので通りやすい。単なるWebサイトの薄いラッパーは弾かれるが、本作は該当しない。

---

## 既知の注意・TODO（実装時に対応）
- **Service Worker**：アプリ内（capacitor://localhost 配信）ではSWが不要・むしろ邪魔になることがある。アプリ内でだけSW登録をスキップする対応を入れる予定（`if(!window.Capacitor){ … SW登録 … }`）。挙動がおかしければ最優先で対応。
- **位置情報の精度**：navigator.geolocation はWKWebViewでも動くが、より安定させたい場合は `@capacitor/geolocation` プラグインへ差し替え可能。
- **アイコン/スプラッシュ**：`app_icon` 系は用意済み。Capacitor用のアイコン/スプラッシュ生成は `@capacitor/assets` で一括生成できる（後で対応）。
- **アプリ内課金（IAP）＝フェーズ2**：App Store Connectで課金アイテム（消耗型コインパック等）を登録し、実装は **RevenueCat** で行う予定（StoreKitを簡略化・月$2.5k売上まで無料）。無料で遊べる大原則は維持し、時短/便利/装飾のみ販売。詳細は別途。

## まとめ（最短フロー）
1. Apple Developer登録（$99）を開始（承認待ちの間に↓を進められる）
2. Mac：Xcode/Node/CocoaPods → `npm install` → `node build-www.js` → `npx cap add ios` → シミュレータで確認
3. 署名（Team設定）→ 実機確認
4. App Store Connectでアプリ作成 → スクショ・情報・プライバシー → Archive → 申請
5. （公開後）フェーズ2：アプリ内課金
