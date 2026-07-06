# ながおか探検録

新潟県長岡市を実際に歩いて巡る位置情報ゲーム。史跡・名所にGPSで近づくとお宝を発見し、コイン・XPを獲得。買い物・レベルアップしながら長岡の歴史文化を知る。

## ドキュメント
- 設計：[`docs/DESIGN.md`](docs/DESIGN.md)
- ロードマップ：[`docs/ROADMAP.md`](docs/ROADMAP.md)
- **モデル運用（Fableトークン節約）**：[`docs/ORCHESTRATION.md`](docs/ORCHESTRATION.md)
- **イラスト依頼仕様（ChatGPT用）**：[`docs/ART_REQUEST.md`](docs/ART_REQUEST.md)
- データスキーマ：[`data/pois.sample.json`](data/pois.sample.json)

## 決定事項（2026-07-06）
名称=ながおか探検録／MVP=中心部+摂田屋／地図=自作簡易マップ／アート=新デザイン（masaさんがChatGPTで用意）。

## 現状
Phase 0（設計）完了。次は Phase 1（MVP骨組み・Sonnet主導）＋ イラスト用意（masaさん）を並行。

## 開発の基本方針
普段の実装は **Sonnet**（`/model`）で。設計・難所だけ **Fable/Opus**。重い作業はサブエージェントに委譲し、Fableは司令塔に徹する（詳細は `docs/ORCHESTRATION.md`）。
