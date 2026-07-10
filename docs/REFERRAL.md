# 友達紹介システム（紹介コード・Firebase連携）設計メモ

masaさん発案（2026-07-10・シリアルナンバーに続くFirebase活用の第2弾）。
友達を紹介するとお互いに得があり、紹介人数で称号がもらえる。

## 決まっている仕様（masaさん確定・2026-07-10）
- **紹介された人**：友達の紹介コードを入力。特典としてコインを“ちょっと多め”にもらえる。
- **紹介した人**：紹介が成立するたびにカウント+1。人数に応じて称号。
- **成立の条件（重要）**：紹介された人が **実GPSで初めて1枚カードを取った瞬間** に初めて成立する。
  - インストールやコード入力だけでは成立しない（＝実際に遊んだ人だけカウント）。
  - シミュレーション（開発モード）やコインワープでの発見は成立にカウントしない。現地GPSのみ。

## 追加で決めたこと（実装上の判断・masaさん要veto）
- 紹介コードを入力できるのは **カード0枚の新規プレイヤーのときだけ**（すでに探検を始めている人は不可）。
  → 「新しい人を連れてきた」だけがカウントされる、という趣旨を素直に満たすため。
- 紹介ボーナス（紹介された人が成立時にもらうコイン）＝ `REFERRAL_BONUS`（初期値 **150コイン**、調整はここ一箇所）。
- 紹介した人へのコイン報酬は、称号マイルストーン達成時に付与（人数そのものでのコイン配布はしない＝荒稼ぎ抑止）。

## データ構造（Firestore）
```
refcodes/{CODE}          : { uid, at }          // 紹介コード→uid。作成のみ（重複防止＝コードの一意性を担保）
referrals/{referredUid}  : { referrerUid, code, at }
                           // 「この人(referredUid)は referrerUid に紹介されて成立した」。
                           // ドキュメントIDが被紹介者uid＝1人1回しか作れない＝二重カウント不可。成立時に作成。
```
- **紹介人数**は「`referrals` の中で `referrerUid == 自分` の件数」を集計クエリ（runAggregationQuery / count）で数える。
  → 可変カウンタを直接いじらせないので、数字を勝手に盛れない。件数＝実際に成立した被紹介者の数。

## セーブ（端末ローカル）追加フィールド
```
referral: {
  myCode: null,           // 自分の紹介コード（発行後に保持）
  enteredCode: null,      // 友達から入力したコード（成立前の保留）
  referrerUid: null,      // 入力時に解決した紹介者uid
  milestoneReached: false,// 実GPSで初カードを取った＝成立の前提を満たした
  credited: false,        // 成立して特典受領済み（1回だけ）
  count: 0                // 自分の紹介人数（Firestore集計のキャッシュ・表示用）
}
```
※ Firebaseの端末ID（uid/refreshToken）は localStorage 側（セーブJSONには含めない）。シリアルと共通。[[SERIAL_NUMBERS]]

## フロー
### A. 自分の紹介コード発行（遅延生成）
友達紹介UIを開いた時、`myCode` が無ければランダム6桁英数字を生成し `refcodes/{CODE}` を
**作成専用（存在しない事を前提条件）** で登録（衝突したら別コードで再試行）。成功したら `myCode` 保存。

### B. 友達のコード入力
- 条件：`found.length === 0`（新規）かつ 未入力かつ 未成立。自分のコードは不可。
- `refcodes/{CODE}` を読み、存在すれば `enteredCode`＋`referrerUid` を保留保存。
  「登録したよ。最初のカードを取ると特典！」と表示。存在しなければエラー。

### C. 成立（実GPSで初カード）
- `attemptDiscovery` の初回発見分岐で、`viaWarp!==true` かつ `mode==="gps"` の初発見なら
  `referral.milestoneReached = true` にして `processReferral()`。
- `processReferral()`：`enteredCode && milestoneReached && !credited && オンライン` のとき
  `referrals/{自分uid}` を作成専用で作る → 成功で **紹介ボーナス付与＋credited=true**＋お祝い表示。
  失敗（オフライン等）は保留し、`online`イベント／起動時に再試行。

### D. 紹介人数の表示（紹介した側）
友達紹介UIを開いた時、`referrerUid == 自分` の `referrals` を集計 → `referral.count` 更新＋称号チェック。

## 称号／実績（既存システムに追加）
`ACHIEVEMENTS` / `TITLES` は `check(save)` 関数式なので `save.referral.count` で判定を足すだけ。
- 実績：はじめての紹介(1人)／紹介3人／紹介5人／紹介10人 など。
- 称号：例「なかま思い」(1)「長岡アンバサダー」(5) 等。マイルストーンでコイン報酬。

## UI
ホームに「🎁 友達をさそう」ボタン → 紹介モーダル：
- 自分の紹介コード（コピー可）
- 友達のコード入力欄＋登録ボタン（新規プレイヤー時のみ有効）
- 自分の紹介人数＋次の称号までの残り
- 成立状況（保留中／成立済み）の表示

## セキュリティルール（masaさんが Firestore に“追記”）
既存の `cards` ルールに加えて：
```
    // 友達紹介：紹介コードは本人のuidだけ登録可・誰でも読める
    match /refcodes/{code} {
      allow read: if request.auth != null;
      allow create: if request.auth != null
                    && request.resource.data.uid == request.auth.uid;
    }
    // 成立記録：自分の分だけ作成可（docId＝自分のuid）・読み取りは集計のため許可
    match /referrals/{referredUid} {
      allow read: if request.auth != null;
      allow create: if request.auth != null
                    && referredUid == request.auth.uid
                    && request.resource.data.referrerUid is string;
    }
```
（v1は「ゆるく」。厳格化＝GPS検証・レート制限・アカウント連携は後フェーズ。）

## 不正対策の正直な整理
- カウントは可変数値ではなく「成立記録の件数」なので **数字の直接改ざんは不可**。
- 残るリスクは「再インストール→別uid→自分のコード入力→現地でカード取得」の自演。
  毎回“現地に実際に行く手間”がかかるため casual 抑止にはなる。本気の対策は後フェーズ
  （端末認証／アカウント連携／サーバー側GPS検証）。シリアルと同じ段階導入。

## コスト
Firestore 無料枠（Spark）で十分。集計クエリ・作成ともごく少量。
