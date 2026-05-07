// 日付ユーティリティ（holidays.js との重複を避け、normalizeDate のみここで管理）

// 日付を YYYY-MM-DD に正規化する
// 対応フォーマット: "YYYY-MM-DD"（そのまま）、"YYYY/M/D" or "YYYY-M-D"（ゼロ埋め変換）
export function normalizeDate(s) {
  if (!s) return "";
  s = s.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})$/);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  return s;
}
