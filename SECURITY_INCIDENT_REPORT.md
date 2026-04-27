# Vercel セキュリティインシデント 対応記録

作成日：2026-04-27

---

## インシデント概要

2026年4月、Vercelの内部システムに不正アクセスが発生。原因はVercel自体ではなく、第三者AIツール「Context.ai」のGoogle Workspace OAuthアプリが侵害されたことによるもの。Vercelは「限定的な顧客に影響があった」と発表。npmパッケージ・サプライチェーンへの影響はなし（複数社で確認済み）。

**IOC（侵害の指標）：**
```
OAuth App ID: 110671459871-30f1spbu0hptbs60cb4vsmv79i7bbvqj.apps.googleusercontent.com
```

---

## 確認アカウント

- Vercelアカウント：`shingais-projects-60587bb7`
- プロジェクト：`is-kanri`（mokumoku-system）https://is-kanri.vercel.app

---

## 必須対応

### 1. IOC確認（最優先）

**対応内容：** Vercelダッシュボード → Integrations画面を開き、上記OAuth App IDが存在しないか目視確認。

**状態：** 未確認（ダッシュボードでの手動確認が必要）

---

### 2. KV_REST_API_TOKEN / KV_REST_API_READ_ONLY_TOKEN のローテーション

**理由：** フルアクセストークンが漏洩すると、KV上の全データ（アカウント情報・セッション・Zohoトークン等）が読み書きされる可能性がある。

**対応手順：**
1. Upstashコンソール（https://console.upstash.com）にログイン
2. `fleet-mastodon-77221` データベースを選択
3. 「REST API」タブでトークンを再発行
4. Vercel環境変数（`KV_REST_API_TOKEN` / `KV_REST_API_READ_ONLY_TOKEN`）を新しい値に更新
5. 再デプロイ

**状態：** 未対応

---

### 3. KV_URL / REDIS_URL のローテーション

**理由：** 接続文字列にパスワードが埋め込まれており、KVトークンとは別の認証経路のため個別対応が必要。

**対応手順：**
1. Upstashコンソールで同データベースのパスワードをリセット
2. 新しい接続文字列を取得
3. Vercel環境変数（`KV_URL` / `REDIS_URL`）を同時に更新（同一インスタンスを指している）
4. 再デプロイ

**状態：** 未対応

---

### 4. ZOHO_WEBHOOK_TOKEN のローテーション

**理由：** 漏洩するとZoho CRMへの不正データ書き込みが可能になる。

**対応手順：**
1. Zohoコンソールでウェブフックトークンを再発行
2. Vercel環境変数（`ZOHO_WEBHOOK_TOKEN`）を新しい値に更新
3. 再デプロイ

**状態：** 未対応

---

## 推奨対応

### PASSWORD_ENC_KEY のローテーション

**理由：** 現在コードに参照箇所がなく（仕様記載のみで未実装）、変更しても既存データへの影響はない。ただし機密変数として設定されている以上、差し替えておくことが望ましい。

**対応手順：**
```bash
openssl rand -hex 32
```
で新しいキーを生成し、Vercel環境変数を更新。

**状態：** 未対応

---

### 全変数に Sensitive 設定を追加

Vercelダッシュボードで以下の変数すべてに「Sensitive」を設定し、値の閲覧を制限する。

- `KV_REST_API_TOKEN`
- `KV_REST_API_READ_ONLY_TOKEN`
- `KV_URL`
- `REDIS_URL`
- `ZOHO_WEBHOOK_TOKEN`
- `PASSWORD_ENC_KEY`

**状態：** 未対応

---

### MFA の設定

Vercelアカウントに認証アプリまたはパスキーでMFAを設定する（Vercel公式推奨）。

**状態：** 要確認

---

### Vercelアクティビティログの確認

Vercelダッシュボード → Settings → Activity で不審なデプロイ・アクセスがないか確認する。

**状態：** 未確認

---

## 対応ログ

| 日付 | 対応内容 | 担当 |
|------|----------|------|
| 2026-04-27 | 調査・本ドキュメント作成 | 新開 |
|  |  |  |
