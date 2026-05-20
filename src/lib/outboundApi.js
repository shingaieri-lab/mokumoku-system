// アウトバウンド機能のAPI呼び出し・ユーティリティ層

// リスト一覧取得
export async function fetchOutboundLists() {
  const r = await fetch('/api/outbound/lists');
  if (!r.ok) throw new Error('リスト取得に失敗しました');
  return r.json();
}

// リスト作成（CSVデータ込み）
export async function createOutboundList(name, leads) {
  const r = await fetch('/api/outbound/lists', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, leads }),
  });
  if (!r.ok) {
    const d = await r.json().catch(() => ({}));
    throw new Error(d.error || 'リスト作成に失敗しました');
  }
  return r.json();
}

// リスト削除
export async function deleteOutboundList(listId) {
  const r = await fetch(`/api/outbound/lists/${listId}`, { method: 'DELETE' });
  if (!r.ok) {
    const d = await r.json().catch(() => ({}));
    throw new Error(d.error || '削除に失敗しました');
  }
}

// リード一覧取得
export async function fetchOutboundLeads(listId) {
  const r = await fetch(`/api/outbound/leads/${listId}`);
  if (!r.ok) throw new Error('架電リスト取得に失敗しました');
  return r.json();
}

// リード保存（配列ごと上書き）
export async function saveOutboundLeads(listId, leads) {
  const r = await fetch(`/api/outbound/leads/${listId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(leads),
  });
  if (!r.ok) {
    const d = await r.json().catch(() => ({}));
    throw new Error(d.error || '保存に失敗しました');
  }
}

// Chatwork送信
export async function sendChatwork(message) {
  const r = await fetch('/api/outbound/chatwork', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  });
  if (!r.ok) {
    const d = await r.json().catch(() => ({}));
    throw new Error(d.error || 'Chatwork送信に失敗しました');
  }
}

// Chatwork設定取得（admin用）
export async function fetchOutboundConfig() {
  const r = await fetch('/api/outbound/config');
  if (!r.ok) throw new Error('設定取得に失敗しました');
  return r.json();
}

// Chatwork設定保存（admin用）
export async function saveOutboundConfig(config) {
  const r = await fetch('/api/outbound/config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });
  if (!r.ok) {
    const d = await r.json().catch(() => ({}));
    throw new Error(d.error || '設定保存に失敗しました');
  }
}

// アウトバウンド用CSVパース
// 対応列: 会社名, 担当者名, 電話番号, 携帯番号, メールアドレス, 業種, 役職, 住所, メモ
export function parseOutboundCSV(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim() && !l.startsWith('#'));
  if (lines.length < 2) return { leads: [], errors: ['ヘッダー行とデータ行が必要です'] };

  const headers = lines[0].split(',').map(h => h.trim().replace(/^"(.*)"$/, '$1').toLowerCase());
  const colMap = {
    company:  headers.findIndex(h => ['company',  '会社名'].includes(h)),
    contact:  headers.findIndex(h => ['contact',  '担当者名', '担当者'].includes(h)),
    phone:    headers.findIndex(h => ['phone',    '電話番号', '電話'].includes(h)),
    mobile:   headers.findIndex(h => ['mobile',   '携帯番号', '携帯'].includes(h)),
    email:    headers.findIndex(h => ['email',    'メール', 'メールアドレス'].includes(h)),
    industry: headers.findIndex(h => ['industry', '業種'].includes(h)),
    position: headers.findIndex(h => ['position', '役職'].includes(h)),
    address:  headers.findIndex(h => ['address',  '住所'].includes(h)),
    memo:     headers.findIndex(h => ['memo',     'メモ', '備考'].includes(h)),
  };

  const errors = [];
  const leads = [];

  lines.slice(1).forEach((line, i) => {
    const cols = splitCSVLine(line);
    const company = colMap.company >= 0 ? (cols[colMap.company] || '').trim() : '';
    if (!company) { errors.push(`${i + 2}行目: 会社名が空のためスキップ`); return; }
    leads.push({
      company,
      contact:  colMap.contact  >= 0 ? (cols[colMap.contact]  || '').trim() : '',
      phone:    colMap.phone    >= 0 ? (cols[colMap.phone]    || '').trim() : '',
      mobile:   colMap.mobile   >= 0 ? (cols[colMap.mobile]   || '').trim() : '',
      email:    colMap.email    >= 0 ? (cols[colMap.email]    || '').trim() : '',
      industry: colMap.industry >= 0 ? (cols[colMap.industry] || '').trim() : '',
      position: colMap.position >= 0 ? (cols[colMap.position] || '').trim() : '',
      address:  colMap.address  >= 0 ? (cols[colMap.address]  || '').trim() : '',
      memo:     colMap.memo     >= 0 ? (cols[colMap.memo]     || '').trim() : '',
    });
  });

  return { leads, errors };
}

function splitCSVLine(line) {
  const cols = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') { inQ = !inQ; }
    else if (c === ',' && !inQ) { cols.push(cur); cur = ''; }
    else { cur += c; }
  }
  cols.push(cur);
  return cols.map(c => c.replace(/^"(.*)"$/, '$1'));
}

// Chatwork送信メッセージ生成
export function buildChatworkMessage(lead) {
  const info = lead.appointmentInfo || {};
  const supervisorLabel = { yes: 'はい', no: 'いいえ', unknown: '不明' }[info.supervisor] || '';
  const lines = [
    '【アポ獲得報告】',
    lead.listName   ? `リスト：${lead.listName}` : null,
    info.salesPerson ? `営業担当者：${info.salesPerson}` : null,
    `企業名：${lead.company}`,
    info.website    ? `会社HP：${info.website}` : null,
    info.address    ? `住所：${info.address}` : null,
    (lead.position || lead.contact) ? `役職/氏名：${[lead.position, lead.contact].filter(Boolean).join(' / ')}` : null,
    lead.phone      ? `電話番号：${lead.phone}` : null,
    lead.mobile     ? `携帯番号：${lead.mobile}` : null,
    lead.email      ? `メールアドレス：${lead.email}` : null,
    info.confirmedDate ? `商談獲得日：${info.confirmedDate}` : null,
    (info.meetingDate && info.meetingTime) ? `商談日時：${info.meetingDate} ${info.meetingTime}` : null,
    info.construction ? `工事内容：${info.construction}` : null,
    supervisorLabel ? `現場に監督常駐している？：${supervisorLabel}` : null,
    info.rank       ? `ランク：${info.rank}` : null,
    info.note       ? `備考：${info.note}` : null,
  ].filter(Boolean);
  return lines.join('\n');
}
