# ART_REQUEST_15：直江兼続「愛の兜」衣装スプライト＋新スポット2枚のカード

## A. 衣装「直江兼続（愛の兜）」のキャラスプライト（6枚）
兼続お船ミュージアム（与板）発見で解放される着せ替え衣装。案内役キャラが、直江兼続の
黒い甲冑＋金色の「愛」の前立（漢字）の兜をかぶった姿。コードは実装済み（解放→購入→着用）で、
スプライトが届けば自動反映。届くまでは素のアバターで表示（画像割れなし）。

### 超重要：既存の案内役キャラと“同一人物・同じ画風・同じポーズ・同じ大きさ”に揃える
- 生成時、対応する**既存スプライトを参照として一緒に貼り**、「このキャラに、下の甲冑・兜を
  着せて、**ポーズ／画風／キャラの大きさ・位置はそのまま**」と指示する。
- 兜：黒地に金色の「愛」の**漢字**の前立（masaさん添付の実物写真を参照）。黒×金×臙脂の甲冑。
- **背景は透過（PNG）**。既存スプライトと同じキャンバスサイズ・同じ余白。

| # | ファイル名 | 元にする既存スプライト |
|---|---|---|
| 1 | `guide_idle_kanetsugu.png` | `guide_idle.png`（男の子・待機） |
| 2 | `guide_happy_kanetsugu.png` | `guide_happy.png`（男の子・喜び） |
| 3 | `guide_point_kanetsugu.png` | `guide_point.png`（男の子・指差し） |
| 4 | `guide_idle_boy2_kanetsugu.png` | `guide_idle_boy2.png`（男の子2・待機） |
| 5 | `guide_idle_girl1_kanetsugu.png` | `guide_idle_girl1.png`（女の子・待機） |
| 6 | `guide_idle_girl2_kanetsugu.png` | `guide_idle_girl2.png`（女の子2・待機） |

（＝既存の isoroku / tsuginosuke / torasaburo 衣装と同じ6枚構成。boy1のみ happy/point も用意し、
boy2/girl1/girl2 は idle のみ＝happy/point は boy1版で代用される。）

## B. 新スポットのお宝カード（2スポット＝通常＋豪華版の4枚）
共通スタイルは ART_REQUEST_14 と同じ（レトロなポストカード風・水彩手描き、縦3:4、
1024×1536、文字・ロゴなし、既存カードと同じ絵師感）。

| # | ファイル名 | 描く対象 |
|---|---|---|
| 7 | `card_suido_tank.png` | **水道タンク**：昭和初期のレトロな円筒形の水道タンクと、クラシカルモダンなポンプ室棟。緑の水道公園・東屋・近代化遺産の趣。 |
| 8 | `card_hasegawa_tei.png` | **長谷川邸**：堀と土塁・生垣に囲まれた広大な武家屋敷。茅葺寄棟造りの表門と主屋。北陸最古級の豪農の館、荘厳で歴史ある佇まい。 |

豪華版（`_deluxe`）も各1枚：同じ場所・構図を**夜＋長岡花火＋金色の光**で豪華に。
`card_suido_tank_deluxe.png` / `card_hasegawa_tei_deluxe.png`

## 納品後（Claude側で実施）
`assets/` に配置 → 各POIの `treasure.image` を `card_<id>.png` に差し替え＋`DELUXE_CARDS`追加、
衣装スプライトは配置するだけで反映（AVATAR_COSTUMES対応済み）→ sw更新 → ヘッドレス検証 → 公開。

## 任意：図鑑カードの「愛」兜クレスト
`card_kanetsugu_museum.png` は既に愛の兜デザイン。より本物寄り（クレストを明確な「愛」の漢字）に
したい場合は、同ファイル名で描き直して差し替え可（任意）。
