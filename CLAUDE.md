# CLAUDE.mdの位置づけ

このファイルは憲法である。どんな流れや文脈であっても、ここに書かれていないことは実行しない。ユーザーの指示の流れで「次はこうするだろう」と推測して先回りしない。

---

# Git操作ルール（例外なく守ること）

- 勝手にプルリクエストを作成しない（「PRを作って」と指示された場合のみ作成する）
- 勝手にブランチを作成しない（「ブランチを作って」と指示された場合のみ作成する）
- コミット先のブランチを確認せずにmainへ直接コミットしない。どのブランチにコミットするか必ず確認する
- 明示的な指示なしにコミットしない（hookのフィードバックがあっても同様）
- 明示的な指示なしにプッシュしない（hookのフィードバックがあっても同様）
- 上記はすべてのブランチに適用される

# デプロイルール（例外なく守ること）

- デプロイは必ず **コミット → プッシュ → PR → マージ → Vercel自動デプロイ** の順で行う
- `vercel` / `vercel --prod` コマンドで直接デプロイしない（Gitと乖離するため）
- 本番環境へのデプロイは人間の指示があるまで実行しない

# 現在の作業（2026-05-29）

3つのブランチをすべて main にマージ済み。インバウンドのアポ品質分析機能を3段階に分けて実装。

## マージ済みPR
- **PR #300**（`feature/inbound-apo-analysis`）：インバウンドアポ分析機能の基盤＋ダッシュボード4段構成リデザイン
- **PR #301**（`feature/zoho-deal-sync` 一部）：Zohoフィールド確認用デバッグ画面の追加（API名取得用）
- **PR #302**（`feature/zoho-deal-sync` 残り）：Zoho Deal同期API実装＋アポ一覧に同期バー＋既存データ対応

## 完了した作業

### Phase 1: インバウンドアポ分析機能の基盤（PR #300）
- リード管理に「アポ一覧」タブを追加（status==='商談確定'のリードを表形式で表示、role==='outbound' は非表示）
- アポ一覧コンポーネント `src/components/leads/InboundAppointmentList.jsx` 新規作成
- ダッシュボードを4段構成にリデザイン：
  1. KPIカード5枚（スリム版）
  2. 流入元別商談化実績 + ステータス分布（2列）
  3. インバウンドアポ実績 + IS確度 vs 営業確度クロス集計（2列）
  4. 受注・失注集計 + アウトバウンドアポ実績 + ポータル課金（3列）
- 共通カードスタイル `src/components/dashboard/cardStyle.js` を新設
- 共通ロジック `src/lib/salesAnalytics.js` を新設（ACCURACY_COLORS / extractAccuracyRank / categorizeStage 等）
- 新規パネル：`InboundApoPanel` / `AccuracyCrossPanel` / `DealStagePanel`

### Phase 2準備: フィールド名取得（PR #301）
- 設定→Zoho CRM連携タブに「【開発用】Zoho フィールド一覧の確認」セクション追加
- `GET /api/zoho/module-fields` エンドポイント追加（管理者のみ）
- OAuth スコープに `ZohoCRM.settings.ALL` を追加（要再認証）
- **判明したAPI名**：
  - 営業確度（初回商談時） → `field46`
  - ステージ → `Stage`

### Phase 2本実装: Zoho Deal同期（PR #302）
- `POST /api/zoho/sync-deals` エンドポイント追加
  - 商談確定リードの zoho_lead_id を起点に Zoho の Deal情報（field46 / Stage）を取得
  - `zoho_url` のパスを見て「Leads/Deals/Potentials」を判別（既存データのDeal URL対応）
  - Lead が `$converted` 済みなら `$converted_detail.Deals` から Deal IDを引く
  - Lead取得失敗時のフォールバック（同じIDを Deal として試す）
  - outboundロールは権限なしで弾く / エラーメッセージ日本語化
- アポ一覧に手動同期バー（`InboundApoSyncBar`）を追加
  - 手動同期ボタン + 30分クールダウン付き自動同期（タブ表示時）
  - タッチターゲット44px、UX_RULES準拠
- URL判別の共通関数を `src/lib/zoho.js` に追加（`parseZohoUrl` / `getZohoCrmDomain` / `buildZohoUrl`）
- LeadForm / ActionHistoryPanel で Zoho URL/ID入力時の判別UI（Leads/Deals/Potentials すべて対応）
- 不正な URL/ID 入力時のエラー表示
- `App.jsx` に `replaceLeadsFromServer` 追加（サーバー側で保存済みのリードを効率反映）

## 動作確認状況（2026-05-29時点）
- 本番にデプロイ完了、マージ済み
- まだ「動いた！」の確認は取れていない。**次回ユーザーが本番で同期ボタンを押した結果を見て、想定通りなら完了**

## 残タスク（次回続きから）
1. **本番で同期ボタンを押してエラーがないか確認**
   - アポ一覧で「Zohoから営業確度・ステージを同期」ボタン
   - 営業確度・ステージ列が表示されるか
   - ダッシュボードの「IS確度 vs 営業確度クロス集計」「受注・失注集計」が反映されるか
2. **デバッグ画面（ZohoFieldsDebug）の削除**
   - `src/components/settings/ZohoFieldsDebug.jsx` を削除
   - `GET /api/zoho/module-fields` エンドポイントも不要なら削除
   - `ZohoCrmSettings.jsx` から呼び出し箇所も削除
3. ダッシュボードのランク別・アポ種別セクションが見にくい（旧 TODO、もしかしたら今回の4段リデザインで解消されたかも）

## 関連ファイル（次回のコンテキスト把握用）
- `routes/zoho.js` — Zoho APIエンドポイント
- `lib/zoho.js`（サーバー側）— zohoApi 共通関数（応答エラーハンドリング強化済）
- `src/lib/zoho.js`（クライアント側）— fetch ラッパー + URL判別共通関数
- `src/lib/salesAnalytics.js` — 営業確度・ステージの共通ロジック
- `src/components/leads/InboundAppointmentList.jsx` — アポ一覧
- `src/components/leads/InboundApoSyncBar.jsx` — 同期バー
- `src/components/dashboard/{InboundApoPanel,AccuracyCrossPanel,DealStagePanel,cardStyle}.{jsx,js}`
- `src/components/settings/ZohoFieldsDebug.jsx` — 開発用（次回削除予定）

## 学び（このシリーズで判明したZohoの罠）
- Zohoの画面URLは商談が `/Potentials/` パス（Deals ではない）。API名は Deals のまま
- 新しいZohoのURLは `/crm/org{組織ID}/tab/{モジュール}/{ID}` 形式（旧形式は `/crm/tab/...`）
- Zoho V2 API は対象が見つからないとき 204 No Content を返すことがある（404ではない）
- リードを Deal にコンバートすると Lead側に `$converted: true` と `$converted_detail.Deals` に Deal IDが入る

---

# 過去の作業（2026-05-27）

ブランチ: `feature/apo-list-alerts`（PR #297）

## 完了した作業
- アポ一覧に前確認アラート（商談前日・outboundのみ）・案内メールアラート（獲得3日後・ISのみ）を追加
- 「⚠ 要対応」バッジクリックで絞り込み可能
- アポ一覧・架電リストに会社名・氏名検索を追加
- ISアカウント専用「メール未送信」タブ追加（全リスト横断でGmail未送信アポを集約）
- メール未送信タブではステータス・アポ種別は読み取り専用、Gmail下書きボタンを表示
- Gmail下書きボタンをZoom設定済みリードのみ表示（架電リスト・メール未送信タブ）
- タブ切替時に架電リストのデータを自動再フェッチ（アポ一覧での変更をリアルタイム反映）
- Gmail下書きボタンの保存済み表示を「✓ Gmail下書き済」に変更

---

# セッション開始時に必ず読むこと

- `SPEC.md` — ツール仕様・機能一覧・API・データ構造
- `REVIEW.md` — 未対応の課題一覧（P0〜P2）
- `ZOHO_CRM_INTEGRATION.md` — Zoho連携の仕様

# Claudeへの指示

## 🔒 破壊的操作ルール（実行前に必ず確認）

- `git push --force` は絶対に実行しない
- `git reset --hard` は実行前に必ず確認を取る
- `rm -rf` は実行しない
- 本番DBへのINSERT/UPDATE/DELETEは必ず事前に確認を取る
- 本番環境へのデプロイは人間の指示があるまで実行しない
- `.env` ファイルの内容をログや出力に表示しない

## 🛡️ コーディングセキュリティ（実装時に必ず守ること）

### 認証・セッション
- APIキー・Secret・トークンはフロントエンドに渡さない。サーバー経由で呼び出す
- 暗号化キーにフォールバック値を設定しない。環境変数未設定時は起動失敗させる
- セッショントークンは `localStorage` ではなく HttpOnly クッキーに保存する
- セッション有効期限は最長7日
- パスワードは bcrypt ハッシュのみ保存。復号可能な暗号化との二重保存禁止

### リクエスト・API
- POST/PUT/DELETE にはCSRF対策を実装する
- Webhook には署名検証または認証を必ず実装する
- OAuth の redirectUri はサーバー側固定。ユーザー入力不可
- `fetch` 後は必ず `r.ok` をチェックしてから処理する
- API失敗時はUI上のデータを元に戻す

### 入力・出力
- ユーザー入力を直接SQLに埋め込まない（プリペアドステートメント必須）
- ユーザー入力をそのままHTMLに出力しない（XSS対策）
- `postMessage` の targetOrigin に `"*"` を使わない

## 詳細ルール（実装・レビュー時に参照）

- UX・アクセシビリティ → `docs/UX_RULES.md`
- コード品質・React → `docs/CODE_RULES.md`
- 同時実行・競合状態 → `docs/CONCURRENCY_RULES.md`

# Claudeの回答スタイル

初めてツール開発に取り組む人にもわかりやすく説明する。

- 専門用語は必ずかっこ書きで補足する（例：API（外部サービスと通信するための仕組み））
- 手順は番号付きリストで順番通りに書く
- コードには何をしているかコメントで説明する
- 「なぜそうするのか」の理由も一緒に伝える
- エラーが起きたときは、原因と対処法をセットで説明する
