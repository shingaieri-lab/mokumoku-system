# ブランチマージ作業プラン

作成日: 2026-03-18
対象: mainにマージされていない35ブランチ

---

## 事前準備

```bash
# 1. mainを最新化
git checkout main
git pull origin main

# 2. バックアップタグを作成（何かあっても戻れる）
git tag backup-main-20260318
git push origin backup-main-20260318
```

---

## マージ順序の考え方

コンフリクトを最小化するため、以下の順番でマージする：

1. **小さいブランチ（差分が少ない）から着手** → リスクが低く慣れるための練習になる
2. **バグ修正系** → 機能追加より影響範囲が小さい
3. **機能追加系（小）** → 独立した機能から
4. **機能追加系（大）** → 影響範囲が広いものを最後に

---

## マージ手順（毎回この手順を繰り返す）

```bash
# 1. mainが最新か確認
git checkout main
git pull origin main

# 2. ブランチをマージ
git merge --no-ff origin/ブランチ名

# コンフリクトが出た場合
git status                  # コンフリクトしているファイルを確認
# ファイルを開いて修正
git add .
git commit

# 3. mainにpush
git push origin main

# 4. マージ完了したブランチを削除（任意）
git push origin --delete claude/ブランチ名
```

---

## ブランチ一覧（マージ順）

### フェーズ1: 小さなブランチ（差分1〜13コミット）

| # | ブランチ名 | コミット数 | 内容 | 状態 |
|---|---|---|---|---|
| 1 | `claude/remove-calendar-settings-v6cr9` | 1 | カレンダー設定の削除 | [ ] |
| 2 | `claude/auto-generate-user-id-2twAZ` | 1 | ユーザーID自動生成 | [ ] |
| 3 | `claude/update-page-title-LlLqT` | 3 | ページタイトルの更新 | [ ] |
| 4 | `claude/change-button-color-orange-tiJNj` | 8 | ボタンをオレンジ色に変更 | [ ] |
| 5 | `claude/fix-dashboard-lead-count-jHtyi` | 11 | ダッシュボードのリード数修正 | [ ] |
| 6 | `claude/switch-to-gemini-api-wiPX7` | 13 | Gemini API切り替え | [ ] |

### フェーズ2: バグ修正系（差分14〜35コミット）

| # | ブランチ名 | コミット数 | 内容 | 状態 |
|---|---|---|---|---|
| 7 | `claude/fix-ai-assistant-startup-kw3HL` | 16 | AIアシスタント起動修正 | [ ] |
| 8 | `claude/new-session-59IRD` | 19 | 新セッション対応 | [ ] |
| 9 | `claude/switch-to-gemini-api-n1eLp` | 26 | Gemini API切り替え（別版） | [ ] |
| 10 | `claude/update-gemini-model-6SZ6S` | 30 | Geminiモデル更新 | [ ] |
| 11 | `claude/fix-broken-functionality-5Ii93` | 31 | 壊れた機能の修正 | [ ] |
| 12 | `claude/fix-action-history-connection-qF7M6` | 33 | アクション履歴の接続修正 | [ ] |
| 13 | `claude/new-session-Eaguu` | 35 | 新セッション対応（別版） | [ ] |

### フェーズ3: 機能追加系・小（差分37〜60コミット）

| # | ブランチ名 | コミット数 | 内容 | 状態 |
|---|---|---|---|---|
| 14 | `claude/set-default-excluded-time-8qYe0` | 37 | デフォルト除外時間の設定 | [ ] |
| 15 | `claude/email-company-schedule-integration-G7RM9` | 39 | メール×会社スケジュール連携 | [ ] |
| 16 | `claude/auto-select-email-dates-mI8LI` | 41 | メール日付の自動選択 | [ ] |
| 17 | `claude/email-template-customization-gk01g` | 44 | メールテンプレートカスタマイズ | [ ] |
| 18 | `claude/display-member-names-schedule-CoyNb` | 48 | スケジュールにメンバー名表示 | [ ] |
| 19 | `claude/update-lead-sorting-NHBvK` | 49 | リードのソート更新 | [ ] |
| 20 | `claude/expand-email-body-09Fn0` | 54 | メール本文の展開 | [ ] |
| 21 | `claude/lead-action-history-panel-TtHtF` | 56 | リードアクション履歴パネル | [ ] |
| 22 | `claude/fix-layout-spacing-2PeNJ` | 60 | レイアウトスペーシング修正 | [ ] |

### フェーズ4: 機能追加系・大（差分68〜102コミット）

| # | ブランチ名 | コミット数 | 内容 | 状態 |
|---|---|---|---|---|
| 23 | `claude/lead-detail-split-layout-IUtyd` | 68 | リード詳細の分割レイアウト | [ ] |
| 24 | `claude/fix-company-name-scroll-H5BJC` | 69 | 会社名スクロール修正 | [ ] |
| 25 | `claude/fix-right-panel-scroll-WZXpP` | 72 | 右パネルスクロール修正 | [ ] |
| 26 | `claude/add-holiday-search-filter-6Ira1` | 77 | 祝日検索フィルター追加 | [ ] |
| 27 | `claude/add-name-spacing-note-teEXT` | 80 | 名前スペーシングの注記追加 | [ ] |
| 28 | `claude/time-picker-30min-intervals-WYWyC` | 82 | 時間選択を30分刻みに | [ ] |
| 29 | `claude/add-email-datetime-fields-MYFOk` | 85 | メールに日時フィールド追加 | [ ] |
| 30 | `claude/add-email-to-leads-fXV49` | 90 | リードにメール追加 | [ ] |
| 31 | `claude/improve-api-docs-d3AiS` | 93 | APIドキュメント改善 | [ ] |
| 32 | `claude/fix-email-day-display-G98x6` | 95 | メールの日付表示修正 | [ ] |
| 33 | `claude/account-colors-admin-panel-wPhuh` | 97 | 管理パネルのアカウントカラー | [ ] |
| 34 | `claude/add-field-annotations-9BXel` | 99 | フィールドアノテーション追加 | [ ] |
| 35 | `claude/update-display-name-example-Qbg4v` | 102 | 表示名サンプルの更新 | [ ] |

---

## コンフリクトが起きたときの対処

```bash
# 状況確認
git status

# コンフリクトしているファイルを確認
git diff --name-only --diff-filter=U

# 手動でファイルを修正後
git add <修正したファイル>
git commit

# マージ自体をやめたい場合（そのブランチをスキップ）
git merge --abort
```

---

## 元に戻したいときの手順

```bash
# mainをバックアップ時点に戻す
git reset --hard backup-main-20260318
git push origin main --force
```

---

## 完了後の確認

```bash
# マージされていないブランチがなくなったか確認
git branch -r --no-merged origin/main | grep 'origin/claude/'

# タグの削除（不要になったら）
git push origin --delete backup-main-20260318
```
