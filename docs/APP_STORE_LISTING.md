# App Store 申請メタ情報（ながおか探検録）

App Store Connect に入力する内容一式。コピペで使える。**2026-07-25 全面更新**（多言語・蔵王エリア・牧野御殿・AR花火・着せ替え等の追加を反映／App Privacyをアプリ現状に合わせて見直し）。

## 基本
- **アプリ名**：ながおか探検録
- **サブタイトル（30字以内）**：歩いて集める、長岡のお宝図鑑
- **バンドルID**：com.nagaokatanken.app
- **主要言語**：日本語
- **SKU**（任意の管理用ID）：nagaokatanken-001
- **現行バージョン（今回の申請）**：1.4
- **価格**：無料
- **カテゴリ**：主：ゲーム ／ 副：旅行

## プロモーションテキスト（170字以内・後から変更可）
```
長岡のまちを歩いて、史跡や名所に近づくとお宝を発見！集めた図鑑でその土地の歴史も学べます。ご当地ガチャ・偉人の着せ替え・殿の御殿・ARで打ち上げる花火まで、遊びながら長岡を巡る位置情報ゲーム。日本語/英語/中国語対応。無料で遊べます。
```

## 説明文（Description）
```
新潟県長岡市を舞台に、歩いて楽しむ位置情報ゲームです。まちの史跡・名所に実際に近づくと「お宝」を発見し、集めて図鑑にしていきます。

■ 歩いて、まちのお宝を発見
アオーレ長岡、山本五十六記念館、河井継之助記念館、摂田屋の醸造のまち、山古志の錦鯉と棚田、寺泊の魚の市場通り、栃尾・与板・越路・蓬平・蔵王…。長岡じゅうの名所に近づくとお宝カードを発見。カードにはその土地の歴史や物語が詰まっていて、遊びながら長岡のことが学べます。

■ 集めて、育てて、また行きたくなる
・発見でコインとXPを獲得、レベルアップ
・現地で回せる「ご当地ガチャ」とおみやげコレクション
・同じ場所へ通うほど、図鑑カードが豪華版に昇格
・偉人になりきれる「衣装だんす」（山本五十六・直江兼続・小林虎三郎 ほか）

■ さらに深まる、やり込み要素
・殿からお呼びが！集めたおみやげを"年貢"として納め、殿の信頼を得ると、まだ見ぬ隠された土地が解禁される「牧野御殿」
・実績を達成すると花火が解放。ARカメラで、あなたのカメラに花火を打ち上げて撮影・シェア

■ 多言語対応
日本語 / English / 简体中文 / 繁體中文。長岡を訪れる海外の方にも楽しめます。

■ お店・おでかけ情報
まちの加盟店やクーポン、混雑状況もチェックできます。アプリ内のお知らせで最新情報も届きます。

■ 位置情報・プライバシーについて
位置情報は史跡への接近判定に使用します。アプリの改善のため匿名の利用状況を集計する場合がありますが、氏名などの個人を特定する情報は収集しません。

さあ、探検家になって長岡を巡りましょう。あなたの街が、冒険のフィールドになります。
```

## What's New（リリースノート・今回の更新）
```
・多言語対応を追加（英語・簡体中文・繁體中文）
・新エリア「蔵王」、山古志のビューポイント巡り、隠しスポットを追加
・殿が登場する新システム「牧野御殿」— おみやげを納めて新しい土地を解禁
・ARカメラで花火を打ち上げて撮影できる「花火館」
・偉人の衣装に着せ替えできる「衣装だんす」を拡充
・アプリ内お知らせ、お店・クーポン・混雑情報に対応
・図鑑カードの刷新、各種の調整と安定性の改善
```

## キーワード（100字以内・カンマ区切り）
```
長岡,街歩き,まち歩き,位置情報,GPS,史跡,散歩,ご当地,観光,探検,図鑑,新潟,花火,AR,着せ替え,錦鯉,山古志,おでかけ
```

## URL類
- **サポートURL**：https://kakigawatei.github.io/nagaoka-tanken/
- **マーケティングURL**（任意）：https://kakigawatei.github.io/nagaoka-tanken/
- **プライバシーポリシーURL**：https://kakigawatei.github.io/nagaoka-tanken/privacy.html

## 年齢区分（レーティング）
- 不適切な要素は無し → **4+**（全年齢）。レーティング質問はすべて「なし／No」でOK。

## ⚠️ App Privacy（データ収集の質問）※要見直し
**重要：初版では「データ収集なし」で申請していたが、現在はFirebase（匿名認証＋Firestore）を利用しているため、内容の更新が必要。** 使っている機能：
- 匿名認証（端末ごとの匿名ID）／匿名の集計カウンター（利用状況）／発見の通し番号・お知らせ・お店の混雑取得。
- 氏名・メール等の個人情報、および正確な位置情報の外部送信は無し（位置は端末内で接近判定にのみ使用）。

**推奨する回答（App Store Connect の App Privacy）：**
- 「データを収集していますか？」→ **収集している（ただし本人に紐づかない）** に変更。
  - 収集種別＝**使用状況データ（Usage Data）**、必要に応じて**識別子（Identifiers＝匿名ID）**。用途＝**アプリの機能／分析**。**トラッキングには使用しない**（第三者と共有しない・広告に使わない）。「ユーザーに紐づけない（Not Linked to You）」を選択。
- 正確な位置情報＝**収集しない**（端末内処理・外部送信なしのため）。
- ※プライバシーポリシー（privacy.html）も、匿名集計・Firebase利用の記載と整合しているか確認（必要ならコンが追記）。

## スクリーンショット（必須）
- **6.7インチ（iPhone）用が最低限必須**（1290×2796px。iPhone 15/16/17 Pro Max）。3〜5枚以上あると良い。
- おすすめの見せ場（現バージョン反映）：
  1. ホーム（探検家キャラ＋コイン＋最寄りスポット）
  2. お宝発見の演出／図鑑（豪華版カードが映える）
  3. 牧野御殿（殿の登場・年貢・隠し土地解禁）
  4. AR花火（カメラに花火が打ち上がる画）
  5. 衣装だんす（偉人の着せ替え）／マップ／多言語切替
- 撮り方：実機でスクショ or デザインした訴求スクショ（端末フレーム＋キャッチコピー）。コンが後者を作成可。
- ※多言語ローカライズする場合は、各言語のスクショも用意すると効果的（任意）。

## 提出前チェック
- [ ] （Mac）`node build-www.js && npx cap sync ios` で最新Webを反映
- [ ] （Mac）Xcodeでバージョン番号を更新（Marketing Version／Build番号）→ Archive → App Store Connect にアップロード
- [ ] App Store Connect で上記メタ情報（説明文・What's New 等）を更新
- [ ] スクショをアップロード（6.7インチ必須）
- [ ] **App Privacy を上記の内容に更新**（Firebase利用に整合）
- [ ] プライバシーポリシーURL・価格＝無料・対象国を確認
- [ ] ビルドを選択して「審査に提出」

---

# 多言語ローカライズ（App Store Connect の各言語欄にコピペ）

アプリの多言語対応（日/英/簡/繁）に合わせて、ストアも各言語のローカライズを追加すると海外ユーザーに届きやすい。App Store Connect →「App情報」/各バージョンで言語を追加し、以下を貼り付ける。**アプリ名は共通で「ながおか探検録」でOK（必要なら英語圏に "Nagaoka Explorer" を併記可）。**

## 🇬🇧 English (英語)

- **Subtitle (30 chars)**：`Walk Nagaoka, find treasures`
- **Promotional Text (170)**：
```
Walk Nagaoka, approach real landmarks, and discover treasure cards! Learn local history as you collect—plus gacha, historical costumes, a lord's manor, and AR fireworks. JP/EN/中文. Free to play.
```
- **Description**：
```
A location-based walking game set in Nagaoka City, Niigata, Japan. Get physically close to the city's historic sites and landmarks to discover "treasures," then collect them into an illustrated card book.

■ Walk and discover the city's treasures
Aore Nagaoka, the Isoroku Yamamoto Memorial Museum, the Tsuginosuke Kawai Memorial Museum, the brewery town of Settaya, the koi and terraced ponds of Yamakoshi, the fish market street of Teradomari, and Tochio, Yoita, Koshiji, Yomogihira, Zao… Approach landmarks across Nagaoka to discover treasure cards packed with local history and stories—learn about Nagaoka while you play.

■ Collect, grow, and want to go again
- Earn coins and XP on each discovery, and level up
- Spin the on-site "local gacha" and build a souvenir collection
- The more you revisit a place, the more its card upgrades to a deluxe version
- Dress up as historical figures in the "costume wardrobe" (Isoroku Yamamoto, Kanetsugu Naoe, and more)

■ Deeper features to enjoy
- The lord summons you! Offer souvenirs as "tribute," earn his trust, and unlock hidden lands in "Makino Manor"
- Unlock fireworks by earning achievements, then launch them onto your own camera with AR—capture and share

■ Multiple languages
Japanese / English / Simplified Chinese / Traditional Chinese. Enjoyable for overseas visitors, too.

■ Shops & outings
Check partner shops, coupons, and crowd status. In-app announcements keep you up to date.

■ About location & privacy
Location is used to detect when you're near historic sites. We may aggregate anonymous usage to improve the app, but we do not collect personally identifying information such as your name.

Become an explorer and tour Nagaoka. Your town becomes a field of adventure.
```
- **Keywords (100)**：`Nagaoka,walking,walk,GPS,location game,history,sightseeing,Niigata,explore,collection,fireworks,AR,travel,Japan`
- **What's New**：
```
- Added multiple languages (English, Simplified & Traditional Chinese)
- New "Zao" area, Yamakoshi viewpoint tour, and hidden spots
- New "Makino Manor" system—a lord appears; offer souvenirs to unlock new lands
- "Fireworks Hall": launch fireworks onto your camera with AR
- Expanded "costume wardrobe" to dress up as historical figures
- In-app announcements, shop/coupon/crowd info
- Card artwork refresh, various tweaks and stability improvements
```

## 🇨🇳 简体中文 (簡体字)

- **Subtitle (30)**：`步行长冈，发现宝物`
- **Promotional Text (170)**：
```
在长冈边走边玩，走近名胜就能发现宝物卡片！收集图鉴还能了解当地历史。扭蛋、变装、牧野御殿、AR烟花等你来玩。支持日/英/中，免费畅玩。
```
- **Description**：
```
一款以日本新潟县长冈市为舞台、边走边玩的定位游戏。实际走近城市中的史迹与名胜，就能发现「宝物」，收集成图鉴。

■ 边走边发现城市的宝物
Aore长冈、山本五十六纪念馆、河井继之助纪念馆、摂田屋的酿造之乡、山古志的锦鲤与梯田梯池、寺泊的鱼市场通，以及栃尾・与板・越路・蓬平・藏王……走近长冈各地的名胜，即可发现满载当地历史与故事的宝物卡片，边玩边了解长冈。

■ 收集、养成，让你想一再前往
・每次发现获得金币与经验值，提升等级
・在当地转动「当地扭蛋」，收集特产
・同一地点到访越多次，图鉴卡片就会升级为豪华版
・在「衣装间」变装成伟人（山本五十六、直江兼续等）

■ 更深入的可玩要素
・殿下召见！将收集的特产作为「年贡」献上，获得殿下信任，解锁隐藏的土地——「牧野御殿」
・达成成就即可解锁烟花，用AR把烟花放到你的相机里，拍照分享

■ 多语言对应
日本语／English／简体中文／繁體中文。来访的海外朋友也能畅玩。

■ 店铺・出游信息
可查看加盟店、优惠券与拥挤状况。应用内通知随时送达最新消息。

■ 关于定位与隐私
定位仅用于判断你是否靠近史迹。为改善应用可能会统计匿名使用情况，但不会收集姓名等可识别个人的信息。

成为探险家，畅游长冈吧。你的城市，就是冒险的舞台。
```
- **Keywords (100)**：`长冈,步行,散步,定位,GPS,史迹,观光,新潟,探险,图鉴,烟花,AR,旅行,地图,日本`
- **What's New**：
```
・新增多语言（英语、简体中文、繁体中文）
・新增「藏王」区域、山古志观景点巡游、隐藏地点
・全新「牧野御殿」系统——殿下登场，献上特产解锁新土地
・「烟花馆」：用AR把烟花放到你的相机里
・扩充「衣装间」，变装成伟人
・支持应用内通知、店铺/优惠券/拥挤信息
・图鉴卡片焕新，多项调整与稳定性改善
```

## 🇹🇼 繁體中文 (繁体字)

- **Subtitle (30)**：`步行長岡，發現寶物`
- **Promotional Text (170)**：
```
在長岡邊走邊玩，走近名勝就能發現寶物卡片！收集圖鑑還能了解當地歷史。扭蛋、變裝、牧野御殿、AR煙火等你來玩。支援日/英/中，免費暢玩。
```
- **Description**：
```
一款以日本新潟縣長岡市為舞台、邊走邊玩的定位遊戲。實際走近城市中的史蹟與名勝，就能發現「寶物」，收集成圖鑑。

■ 邊走邊發現城市的寶物
Aore長岡、山本五十六紀念館、河井繼之助紀念館、攝田屋的釀造之鄉、山古志的錦鯉與梯田梯池、寺泊的魚市場通，以及栃尾・與板・越路・蓬平・藏王……走近長岡各地的名勝，即可發現滿載當地歷史與故事的寶物卡片，邊玩邊了解長岡。

■ 收集、養成，讓你想一再前往
・每次發現獲得金幣與經驗值，提升等級
・在當地轉動「當地扭蛋」，收集特產
・同一地點到訪越多次，圖鑑卡片就會升級為豪華版
・在「衣裝間」變裝成偉人（山本五十六、直江兼續等）

■ 更深入的可玩要素
・殿下召見！將收集的特產作為「年貢」獻上，獲得殿下信任，解鎖隱藏的土地——「牧野御殿」
・達成成就即可解鎖煙火，用AR把煙火放到你的相機裡，拍照分享

■ 多語言對應
日本語／English／简体中文／繁體中文。來訪的海外朋友也能暢玩。

■ 店鋪・出遊資訊
可查看加盟店、優惠券與擁擠狀況。應用內通知隨時送達最新消息。

■ 關於定位與隱私
定位僅用於判斷你是否靠近史蹟。為改善應用可能會統計匿名使用情況，但不會收集姓名等可識別個人的資訊。

成為探險家，暢遊長岡吧。你的城市，就是冒險的舞台。
```
- **Keywords (100)**：`長岡,步行,散步,定位,GPS,史蹟,觀光,新潟,探險,圖鑑,煙火,AR,旅行,地圖,日本`
- **What's New**：
```
・新增多語言（英語、簡體中文、繁體中文）
・新增「藏王」區域、山古志觀景點巡遊、隱藏地點
・全新「牧野御殿」系統——殿下登場，獻上特產解鎖新土地
・「煙火館」：用AR把煙火放到你的相機裡
・擴充「衣裝間」，變裝成偉人
・支援應用內通知、店鋪/優惠券/擁擠資訊
・圖鑑卡片煥新，多項調整與穩定性改善
```

> ※スクショは日本語版で作成済み（SS1〜5）。英/中のローカライズにも同じ画像を流用可。各言語のキャッチコピー入りスクショが必要ならコンが作成する（要相談）。
