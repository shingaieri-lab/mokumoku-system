// アポ獲得一覧（全リストのアポ獲得リードをまとめて表示）
import { useState, useEffect, useCallback } from 'react';
import { fetchOutboundLists, fetchOutboundLeads, saveOutboundLeads, createOutboundList } from '../../lib/outboundApi.js';
import { acquireGmailToken, buildGmailDraftRaw, postGmailDraft } from '../../lib/oauth.js';
import { getEffectiveAiConfig } from '../../lib/accounts.js';
import { getMaster } from '../../lib/master.js';
import { GmailDraftModal } from './GmailDraftModal.jsx';
import { AppointmentImportModal } from './AppointmentImportModal.jsx';
import { Pagination } from '../ui/Pagination.jsx';

function applyTplVars(tpl, vars) {
  return Object.entries(vars).reduce((s, [k, v]) => s.replaceAll(`{{${k}}}`, v || ''), tpl);
}

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

const DEAL_STATUSES    = ['商談確定', '追客中', '契約', '保留/失注', '商談キャンセル'];
const APPOINT_TYPES    = ['決裁者アポ', '担当者アポ', '対象外'];
const APPOINT_PRICE_MAP = { '決裁者アポ': '35,000円', '担当者アポ': '20,000円', '対象外': '0円' };

const DEAL_STATUS_STYLE = {
  '商談確定':     { color: '#059669', bg: '#d1fae5', border: '#10b98155' },
  '追客中':       { color: '#f59e0b', bg: '#fef9ec', border: '#f59e0b55' },
  '契約':         { color: '#0284c7', bg: '#e0f2fe', border: '#0284c755' },
  '保留/失注':    { color: '#ef4444', bg: '#fef2f2', border: '#ef444455' },
  '商談キャンセル': { color: '#6b7280', bg: '#f3f4f6', border: '#6b728055' },
};

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const weekday = WEEKDAYS[new Date(dateStr + 'T00:00:00').getDay()];
  return `${dateStr}（${weekday}）`;
}

function todayJST() {
  return new Date().toLocaleDateString('sv', { timeZone: 'Asia/Tokyo' });
}

// 過去取込されたリードかどうかの判定
// - appointmentInfo.importedFromHistory フラグが立っている（取込時に付与）
// - もしくはリスト名が「過去アポ取込_」で始まる（フラグ追加前に取込まれた既存データのフォールバック）
// 過去取込は商談日や獲得日が既に過ぎているケースが大半で、アラートを発火させても意味がないため対象外にする
function isImportedHistory(ai, listName) {
  if (ai && ai.importedFromHistory) return true;
  if (listName && listName.startsWith('過去アポ取込_')) return true;
  return false;
}

// 商談開始日の前日になってもpreConfirmが未チェックかどうか（過去取込分は対象外）
function needsPreConfirmAlert(ai, listName) {
  if (isImportedHistory(ai, listName)) return false;
  if (ai.preConfirm || !ai.meetingDate) return false;
  const d = new Date(ai.meetingDate + 'T00:00:00');
  d.setDate(d.getDate() - 1);
  return todayJST() >= d.toLocaleDateString('sv', { timeZone: 'Asia/Tokyo' });
}

// アポ獲得日から3日経過しても案内メール未送信かどうか（過去取込分は対象外）
function needsGmailAlert(ai, listName) {
  if (isImportedHistory(ai, listName)) return false;
  if (ai.gmailDraftedAt || !ai.confirmedDate) return false;
  const d = new Date(ai.confirmedDate + 'T00:00:00');
  d.setDate(d.getDate() + 3);
  return todayJST() >= d.toLocaleDateString('sv', { timeZone: 'Asia/Tokyo' });
}

// 今月を YYYY-MM 形式で返す（JST基準）
function currentYearMonth() {
  return new Date().toLocaleDateString('sv', { timeZone: 'Asia/Tokyo' }).slice(0, 7);
}

// CSV用フィールドエスケープ（カンマ・改行・ダブルクォートを含む場合はダブルクォートで囲む）
function csvField(v) {
  const s = String(v ?? '');
  return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replaceAll('"', '""')}"` : s;
}

function exportToCSV(rows, filterMonth) {
  const headers = ['会社名', '役職', '担当者名', '商談担当', 'ランク', '商談ステータス',
    'アポ獲得日', '商談開始日', '商談開始時刻', '前確認', '案内メール送信済み',
    'アポ種別', 'アポ単価', 'リスト名'];

  const dataRows = rows.map(({ lead, listName }) => {
    const ai = lead.appointmentInfo || {};
    return [
      lead.company,
      lead.position,
      lead.contact,
      ai.salesPerson,
      ai.rank,
      ai.dealStatus || '商談確定',
      ai.confirmedDate,
      ai.meetingDate,
      ai.meetingTime,
      ai.preConfirm ? '済' : '',
      ai.gmailDraftedAt ? '済' : '',
      ai.appointType,
      ai.appointPrice,
      listName,
    ].map(csvField).join(',');
  });

  const csv = '﻿' + [headers.join(','), ...dataRows].join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const label = filterMonth ? filterMonth.replace('-', '年') + '月' : '全期間';
  a.href = url;
  a.download = `アポ一覧_${label}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function AppointmentList({ currentUser, mailPendingOnly = false }) {
  const [rows,        setRows]        = useState([]); // { lead, listId, listName, leadsCache }
  const [loading,     setLoading]     = useState(true);
  const [filterMonth,  setFilterMonth]  = useState(''); // '' = すべて
  const [filterAlert,  setFilterAlert]  = useState(false);
  const [searchQuery,  setSearchQuery]  = useState('');
  const [page,         setPage]         = useState(1);
  const [pageSize,     setPageSize]     = useState(30);
  const [gmailPreview, setGmailPreview] = useState(null); // { subject, body, to, row }
  const [gmailToken,   setGmailToken]   = useState(null);
  const [gmailSending, setGmailSending] = useState(false);
  const [importOpen,   setImportOpen]   = useState(false);
  const [selectedIds,  setSelectedIds]  = useState(() => new Set()); // 選択中の lead.id
  const [deleteOpen,   setDeleteOpen]   = useState(false);            // 削除確認モーダル
  const [deleting,     setDeleting]     = useState(false);            // 削除中フラグ（多重クリック防止）
  // 削除モード: 'apoOnly'（アポ情報だけクリア＝架電リストに「未架電」として残る・デフォルト）
  //           / 'full'（架電リストからもリードごと完全削除）
  const [deleteMode,   setDeleteMode]   = useState('apoOnly');
  // 並び替え state
  // sortKey === null のときはデフォルト順（アポ獲得日の新しい順 = loadRows の初期ソート）
  const [sortKey,     setSortKey]     = useState(null);
  const [sortOrder,   setSortOrder]   = useState('asc'); // 'asc' | 'desc'

  const isIS       = currentUser?.role === 'admin' || currentUser?.role === 'member';
  const isOutbound = currentUser?.role === 'outbound';
  // 削除UIは通常アポ一覧でのみ表示（メール未送信タブでは混乱回避のため出さない）
  // ロール制限はかけない：IS（admin/member）・outbound 全員が削除可能
  const canDelete  = !mailPendingOnly;

  // 全リストのアポ獲得リードをロード（取込後の再読み込みでも呼ぶ）
  const loadRows = useCallback(async () => {
    setLoading(true);
    try {
      const lists = await fetchOutboundLists();
      const all = [];
      await Promise.all(lists.map(async list => {
        const leads = await fetchOutboundLeads(list.id);
        leads
          .filter(l => l.status === 'アポ獲得')
          .forEach(lead => all.push({ lead, listId: list.id, listName: list.name, leads }));
      }));
      // アポ獲得日の新しい順にソート
      all.sort((a, b) => {
        const da = a.lead.appointmentInfo?.confirmedDate || '';
        const db = b.lead.appointmentInfo?.confirmedDate || '';
        return db.localeCompare(da);
      });
      setRows(all);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadRows(); }, [loadRows]);

  // 過去アポデータの取込
  // 1. 空のリストを「過去アポ取込_YYYY-MM-DD」として作成
  // 2. PUT /api/outbound/leads/:listId で status='アポ獲得' + appointmentInfo を埋めたリードを上書き保存
  // 3. アポ一覧を再ロード（取込結果を即反映）
  const handleImportAppointments = useCallback(async (parsedLeads, listName) => {
    // ① 空のリストを作成（POSTは leads が空でも通る）
    const { listId } = await createOutboundList(listName, []);

    // ② サーバー側で createOutboundList が status='未架電' で書き込んでいるので、
    //    こちらで「アポ獲得」状態のリードに差し替える形で上書き保存する
    const leadsWithMeta = parsedLeads.map((l, i) => ({
      id: `ol_${listId}_${i}`,
      listId,
      company:  l.company,
      contact:  l.contact || '',
      position: l.position || '',
      phone:    '',
      mobile:   '',
      email:    '',
      industry: '',
      address:  '',
      memo:     '',
      status: 'アポ獲得',
      callHistory: [],
      // importedFromHistory: 過去取込分のマーカー
      // → 前確認・案内メールの「⚠ 要対応」アラート判定で対象外として扱うために使う
      //   （アポ獲得日や商談日が過去日付になっているケースが多く、無条件にアラートが大量発火するのを防ぐ）
      appointmentInfo: { ...l.appointmentInfo, importedFromHistory: true },
    }));
    await saveOutboundLeads(listId, leadsWithMeta);

    // ③ アポ一覧を再ロード
    await loadRows();
  }, [loadRows]);

  // 選択した行を一括削除
  // selectedIds (Set<lead.id>) を listId ごとにグルーピングし、
  // 各リストに対して deleteMode に応じた配列を作って saveOutboundLeads で上書き保存する
  //
  //  - 'apoOnly': 該当リードの status を '未架電' に戻し、appointmentInfo を null にする
  //               （リード自体は架電リストに残る／通話履歴も保持）
  //  - 'full'   : 該当リードを配列から除外（架電リストからもリードごと完全削除）
  const handleDeleteSelected = useCallback(async () => {
    if (selectedIds.size === 0) return;
    setDeleting(true);
    try {
      // listId ごとに、そのリストに属する rows を集約
      const byList = new Map();
      rows.forEach(r => {
        if (!selectedIds.has(r.lead.id)) return;
        if (!byList.has(r.listId)) {
          byList.set(r.listId, { leads: r.leads, removeIds: new Set() });
        }
        byList.get(r.listId).removeIds.add(r.lead.id);
      });

      // 各リストに対して、モードに応じた配列を保存
      await Promise.all([...byList.entries()].map(([listId, { leads, removeIds }]) => {
        const next = deleteMode === 'full'
          ? leads.filter(l => !removeIds.has(l.id))
          : leads.map(l =>
              removeIds.has(l.id)
                ? { ...l, status: '未架電', appointmentInfo: null }
                : l
            );
        return saveOutboundLeads(listId, next);
      }));

      // ローカル状態のアポ一覧から該当行を即削除（どちらのモードでもアポ獲得ではなくなるので一覧から消える）
      setRows(prev => prev.filter(r => !selectedIds.has(r.lead.id)));
      setSelectedIds(new Set());
      setDeleteOpen(false);
    } catch (e) {
      alert('削除に失敗しました: ' + (e.message || String(e)));
    } finally {
      setDeleting(false);
    }
  }, [rows, selectedIds, deleteMode]);

  // リード更新（楽観的更新 + 保存）
  const handleUpdate = useCallback(async (listId, updatedLead, allLeads) => {
    const newLeads = allLeads.map(l => l.id === updatedLead.id ? updatedLead : l);
    // ローカル状態を更新
    setRows(prev => prev.map(r =>
      r.listId === listId && r.lead.id === updatedLead.id
        ? { ...r, lead: updatedLead, leads: newLeads }
        : r.listId === listId
          ? { ...r, leads: newLeads }
          : r
    ));
    await saveOutboundLeads(listId, newLeads);
  }, []);

  const handleOpenGmailPreview = (row) => {
    const clientId = getEffectiveAiConfig(currentUser).gmailClientId || currentUser?.gmailClientId;
    if (!clientId) { alert('Gmail連携が設定されていません。'); return; }
    const ai = row.lead.appointmentInfo || {};
    const meetingDate = ai.meetingDate || '';
    const weekday = meetingDate ? WEEKDAYS[new Date(meetingDate + 'T00:00:00').getDay()] : '';
    const dateStr = meetingDate ? `${meetingDate}（${weekday}） ${ai.meetingTime || ''}〜` : '';
    const tpl = getMaster().outboundEmailTpl || {};
    const vars = {
      担当者名: row.lead.contact || 'ご担当者',
      企業名:   row.lead.company,
      商談日時: dateStr,
      Zoomリンク: ai.zoomText || '',
      商談担当: ai.salesPerson || '',
      送信者名: currentUser?.name || '',
      署名:     currentUser?.signature || '',
    };
    setGmailPreview({
      to:      row.lead.email || '',
      subject: applyTplVars(tpl.subject || '', vars),
      body:    applyTplVars(tpl.body || '', vars),
      row,
    });
  };

  const handleSendGmailDraft = async (subject, body) => {
    const clientId = getEffectiveAiConfig(currentUser).gmailClientId || currentUser?.gmailClientId;
    setGmailSending(true);
    try {
      const tokenObj = await acquireGmailToken(clientId, gmailToken);
      setGmailToken(tokenObj);
      const raw = buildGmailDraftRaw(gmailPreview.to, subject, body);
      await postGmailDraft(tokenObj.token, raw);
      const { row } = gmailPreview;
      const draftedAt = new Date().toISOString();
      await handleUpdate(row.listId, {
        ...row.lead,
        appointmentInfo: { ...(row.lead.appointmentInfo || {}), gmailDraftedAt: draftedAt },
      }, row.leads);
      setGmailPreview(null);
    } catch (e) {
      alert(e.message);
    } finally {
      setGmailSending(false);
    }
  };

  if (loading) return <div style={{ fontSize: 13, color: '#6a9a7a', padding: '40px 0', textAlign: 'center' }}>読み込み中...</div>;

  // データが0件のときも取込ボタンへ辿り着けるようにする（初回利用時のため）
  if (rows.length === 0) {
    return (
      <div style={{ padding: '40px 0', textAlign: 'center' }}>
        <div style={{ fontSize: 13, color: '#6a9a7a', marginBottom: 14 }}>アポ獲得のデータがありません。</div>
        {isIS && !mailPendingOnly && (
          <button
            onClick={() => setImportOpen(true)}
            style={{ background: '#ecfdf5', color: '#059669', border: '1px solid #10b98155', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', minHeight: 44 }}
          >
            📤 過去アポデータを取込む
          </button>
        )}
        {importOpen && (
          <AppointmentImportModal
            onClose={() => setImportOpen(false)}
            onImport={handleImportAppointments}
          />
        )}
      </div>
    );
  }

  // 商談開始日のある月一覧（降順）をデータから生成
  const months = [...new Set(
    rows
      .map(r => r.lead.appointmentInfo?.meetingDate?.slice(0, 7))
      .filter(Boolean)
  )].sort((a, b) => b.localeCompare(a));

  // 絞り込み・ページネーション計算
  // listName も渡すのは「過去アポ取込_」リスト名でもアラート対象外を判定できるようにするため
  const hasAlertFor = (ai, listName) =>
    (isOutbound && needsPreConfirmAlert(ai, listName)) || (isIS && needsGmailAlert(ai, listName));

  const q = searchQuery.trim().toLowerCase();
  const filtered = rows.filter(r => {
    const ai = r.lead.appointmentInfo || {};
    if (mailPendingOnly && ai.gmailDraftedAt) return false;
    // メール未送信タブでは過去取込分（リスト名「過去アポ取込_」or importedFromHistory フラグ）を除外する
    // 過去取込分はそもそも Gmail 案内を送る対象ではない（過去のアポを後から取り込んだだけ）ため
    if (mailPendingOnly && isImportedHistory(ai, r.listName)) return false;
    if (filterMonth && !(r.lead.appointmentInfo?.meetingDate || '').startsWith(filterMonth)) return false;
    if (filterAlert && !hasAlertFor(ai, r.listName)) return false;
    if (q) {
      const hit = (r.lead.company || '').toLowerCase().includes(q) || (r.lead.contact || '').toLowerCase().includes(q);
      if (!hit) return false;
    }
    return true;
  });

  // 並び替え（sortKey が null のときは filtered のまま＝ loadRows でのデフォルト順）
  // 各キーは「行から比較可能な値（文字列 or 数値）を取り出す」関数で定義
  const sortValueOf = (r, key) => {
    const ai = r.lead.appointmentInfo || {};
    switch (key) {
      case 'company':       return r.lead.company || '';
      case 'contact':       return [r.lead.position, r.lead.contact].filter(Boolean).join(' ');
      case 'salesPerson':   return ai.salesPerson || '';
      case 'rank':          return ai.rank || '';
      case 'dealStatus':    return DEAL_STATUSES.indexOf(ai.dealStatus || '商談確定');
      case 'confirmedDate': return ai.confirmedDate || '';
      // 商談開始日は「日付＋時刻」を結合して文字列比較
      case 'meetingDate':   return (ai.meetingDate || '') + ' ' + (ai.meetingTime || '');
      case 'preConfirm':    return ai.preConfirm ? 1 : 0;
      case 'gmail':         return ai.gmailDraftedAt || '';
      // 種別・単価は APPOINT_TYPES の並び順を保ち、未指定は末尾扱い（99）
      case 'appointType':   {
        const i = APPOINT_TYPES.indexOf(ai.appointType);
        return i >= 0 ? i : 99;
      }
      case 'appointPrice':  return parseInt((APPOINT_PRICE_MAP[ai.appointType] || '').replace(/[^\d]/g, ''), 10) || 0;
      case 'listName':      return r.listName || '';
      default:              return '';
    }
  };
  const sorted = sortKey
    ? [...filtered].sort((a, b) => {
        const va = sortValueOf(a, sortKey);
        const vb = sortValueOf(b, sortKey);
        let cmp;
        if (typeof va === 'number' && typeof vb === 'number') {
          cmp = va - vb;
        } else {
          // 空文字は常に末尾に来るよう調整（昇順・降順どちらでも空が後ろ）
          if (va === '' && vb !== '') return 1;
          if (va !== '' && vb === '') return -1;
          cmp = String(va).localeCompare(String(vb), 'ja');
        }
        return sortOrder === 'asc' ? cmp : -cmp;
      })
    : filtered;

  const totalPages  = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage    = Math.min(page, totalPages);
  const pagedRows   = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);

  // 列ヘッダークリック：同じキーなら昇順↔降順をトグル、別キーなら新しいキー＋昇順
  const handleSortClick = (key) => {
    if (sortKey === key) {
      setSortOrder(o => (o === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
    setPage(1);
  };

  const alertCount = rows.filter(r => {
    const ai = r.lead.appointmentInfo || {};
    if (filterMonth && !(r.lead.appointmentInfo?.meetingDate || '').startsWith(filterMonth)) return false;
    return hasAlertFor(ai, r.listName);
  }).length;

  const paginationBar = sorted.length > 0 && (
    <Pagination
      page={safePage}
      totalPages={totalPages}
      total={sorted.length}
      pageSize={pageSize}
      onPageChange={setPage}
      onPageSizeChange={n => { setPageSize(n); setPage(1); }}
    />
  );

  // ページ内の全選択状態（'all' | 'some' | 'none'）
  // - all  : 表示中の全行が選択済み
  // - some : 一部のみ選択 → ヘッダーチェックボックスを indeterminate にする
  // - none : 何も選択されていない
  const pageSelectionState = (() => {
    if (pagedRows.length === 0) return 'none';
    const selectedInPage = pagedRows.filter(r => selectedIds.has(r.lead.id)).length;
    if (selectedInPage === 0) return 'none';
    if (selectedInPage === pagedRows.length) return 'all';
    return 'some';
  })();

  // 表示中の全行をトグル（all なら全解除、それ以外なら表示中の全行を選択に追加）
  const toggleSelectPage = () => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (pageSelectionState === 'all') {
        pagedRows.forEach(r => next.delete(r.lead.id));
      } else {
        pagedRows.forEach(r => next.add(r.lead.id));
      }
      return next;
    });
  };

  // 1行単位のトグル
  const toggleSelectOne = (leadId) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(leadId)) next.delete(leadId);
      else next.add(leadId);
      return next;
    });
  };

  return (
    <div>
      {/* 検索バー */}
      <div style={{ marginBottom: 10 }}>
        <input
          type="text"
          value={searchQuery}
          onChange={e => { setSearchQuery(e.target.value); setPage(1); }}
          placeholder="会社名・氏名で検索..."
          style={{ border: '1px solid #c0dece', borderRadius: 8, padding: '7px 12px', fontSize: 13, fontFamily: 'inherit', color: '#174f35', background: '#fff', outline: 'none', width: 260 }}
        />
        {q && (
          <button onClick={() => { setSearchQuery(''); setPage(1); }} style={{ marginLeft: 8, fontSize: 12, color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>✕ クリア</button>
        )}
      </div>

      {/* 月絞り込みバー */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, color: '#6a9a7a', whiteSpace: 'nowrap' }}>商談開始月：</span>
        <select
          value={filterMonth}
          onChange={e => { setFilterMonth(e.target.value); setFilterAlert(false); setSearchQuery(''); setPage(1); }}
          style={{ border: '1px solid #c0dece', borderRadius: 6, padding: '5px 10px', fontSize: 12, fontFamily: 'inherit', color: '#174f35', background: '#fff', cursor: 'pointer', outline: 'none' }}
        >
          <option value="">すべて</option>
          {months.map(m => (
            <option key={m} value={m}>{m.replace('-', '年')}月</option>
          ))}
        </select>
        <button
          onClick={() => exportToCSV(sorted, filterMonth)}
          disabled={sorted.length === 0}
          style={{ background: '#f0f5f2', color: '#3d7a5e', border: '1px solid #c0dece', borderRadius: 6, padding: '5px 14px', fontSize: 12, fontWeight: 600, cursor: filtered.length === 0 ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: filtered.length === 0 ? 0.5 : 1, whiteSpace: 'nowrap' }}
        >
          ⬇ CSV書き出し
        </button>
        {/* 取込はISチーム（admin/member）のみ。outboundは閲覧のみ */}
        {isIS && !mailPendingOnly && (
          <button
            onClick={() => setImportOpen(true)}
            style={{ background: '#ecfdf5', color: '#059669', border: '1px solid #10b98155', borderRadius: 6, padding: '5px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}
          >
            📤 Excel取込
          </button>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 12, color: '#6a9a7a' }}>
          {filterMonth ? `${filterMonth.replace('-', '年')}月の商談` : '全期間'}
          <span style={{ fontWeight: 700, color: '#174f35', marginLeft: 4 }}>{filtered.length}件</span>
          {filterMonth && rows.length !== filtered.length && (
            <span style={{ marginLeft: 6, color: '#9ca3af' }}>（全{rows.length}件中）</span>
          )}
        </div>
        {alertCount > 0 && (
          <>
            <button
              onClick={() => { setFilterAlert(f => !f); setPage(1); }}
              style={{ fontSize: 12, fontWeight: 700, color: filterAlert ? '#fff' : '#d97706', background: filterAlert ? '#d97706' : '#fef3c7', border: '1px solid #fcd34d', borderRadius: 6, padding: '3px 10px', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              ⚠ 要対応 {alertCount}件{filterAlert ? '（絞り込み中）' : ''}
            </button>
            {/* 「要対応」の定義をロール別に明示（outbound と IS で意味が違うため） */}
            <span style={{ fontSize: 11, color: '#9ca3af' }}>
              {isOutbound
                ? '（商談前日になっても「前確認」未チェック）'
                : '（アポ獲得日から3日経過しても案内メール未送信）'}
            </span>
          </>
        )}
        {/* 選択中の件数表示＋削除ボタン（ISのみ） */}
        {canDelete && selectedIds.size > 0 && (
          <>
            <span style={{ fontSize: 12, color: '#174f35', fontWeight: 700 }}>
              {selectedIds.size}件選択中
            </span>
            <button
              onClick={() => setSelectedIds(new Set())}
              style={{ fontSize: 11, color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              選択解除
            </button>
            <button
              onClick={() => setDeleteOpen(true)}
              style={{ fontSize: 12, fontWeight: 700, color: '#fff', background: '#ef4444', border: '1px solid #dc2626', borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontFamily: 'inherit', minHeight: 32 }}
            >
              {selectedIds.size}件を削除
            </button>
          </>
        )}
      </div>

      {/* ページネーション（上） */}
      {paginationBar}

      <div style={{ overflowX: 'auto' }}>
        {/*
          tableLayout: 'fixed' + colgroup で各列の幅を明示的に固定する。
          これをしないと並び替えで表示行が変わるたびに「最長コンテンツ」が変わって列幅が伸縮する。
          幅の合計は約1600px。画面が狭い場合はラッパー側の overflowX: 'auto' で横スクロールになる。
        */}
        <table style={{ width: '100%', minWidth: 1600, borderCollapse: 'collapse', fontSize: 13, tableLayout: 'fixed' }}>
          <colgroup>
            {canDelete && <col style={{ width: 36 }} />}
            <col style={{ width: 200 }} />  {/* 会社名 */}
            <col style={{ width: 220 }} />  {/* 役職 / 名前 */}
            <col style={{ width: 90 }}  />  {/* 商談担当 */}
            <col style={{ width: 60 }}  />  {/* ランク */}
            <col style={{ width: 130 }} />  {/* ステータス */}
            <col style={{ width: 130 }} />  {/* アポ獲得日 */}
            <col style={{ width: 170 }} />  {/* 商談開始日 */}
            <col style={{ width: 80 }}  />  {/* 前確認 */}
            <col style={{ width: 100 }} />  {/* 案内メール */}
            <col style={{ width: 110 }} />  {/* アポ種別 */}
            <col style={{ width: 90 }}  />  {/* アポ単価 */}
            <col style={{ width: 220 }} />  {/* リスト */}
          </colgroup>
          <thead>
            <tr style={{ background: '#f0f5f2', borderBottom: '2px solid #c0dece' }}>
              {/* 全選択チェックボックス列（ISのみ） */}
              {canDelete && (
                <th style={{ padding: '9px 6px 9px 12px', textAlign: 'center', width: 36 }}>
                  <input
                    type="checkbox"
                    aria-label="表示中の全行を選択"
                    checked={pageSelectionState === 'all'}
                    // indeterminate は input.indeterminate プロパティ経由でのみ設定可
                    ref={el => { if (el) el.indeterminate = pageSelectionState === 'some'; }}
                    onChange={toggleSelectPage}
                    style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#10b981' }}
                  />
                </th>
              )}
              {[
                { label: '会社名',      key: 'company' },
                { label: '役職 / 名前', key: 'contact' },
                { label: '商談担当',    key: 'salesPerson' },
                { label: 'ランク',      key: 'rank' },
                { label: 'ステータス',  key: 'dealStatus' },
                { label: 'アポ獲得日',  key: 'confirmedDate' },
                { label: '商談開始日',  key: 'meetingDate' },
                { label: '前確認',      key: 'preConfirm',   center: true },
                { label: '案内メール',  key: 'gmail',        center: true },
                { label: 'アポ種別',    key: 'appointType' },
                { label: 'アポ単価',    key: 'appointPrice' },
                { label: 'リスト',      key: 'listName' },
              ].map(({ label, key, center }) => {
                const active = sortKey === key;
                const indicator = active ? (sortOrder === 'asc' ? '▲' : '▼') : '';
                return (
                  <th
                    key={key}
                    onClick={() => handleSortClick(key)}
                    title={`「${label}」で並び替え`}
                    style={{
                      padding: '9px 12px',
                      textAlign: center ? 'center' : 'left',
                      fontSize: 11,
                      fontWeight: active ? 800 : 700,
                      color: active ? '#10b981' : '#3d7a5e',
                      whiteSpace: 'nowrap',
                      cursor: 'pointer',
                      userSelect: 'none',
                    }}
                  >
                    {label}{indicator && <span style={{ fontSize: 9, marginLeft: 3 }}>{indicator}</span>}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {pagedRows.map(({ lead, listId, listName, leads }) => {
              const ai = lead.appointmentInfo || {};
              const ds = ai.dealStatus || '商談確定';
              const dsStyle = DEAL_STATUS_STYLE[ds] || DEAL_STATUS_STYLE['商談確定'];
              const preConfirmAlert = isOutbound && needsPreConfirmAlert(ai, listName);
              const gmailAlert      = isIS && needsGmailAlert(ai, listName);
              const hasAlert        = preConfirmAlert || gmailAlert;

              const isSelected = selectedIds.has(lead.id);

              return (
                <tr key={lead.id} style={{ borderBottom: '1px solid #e2f0e8', background: isSelected ? '#fef2f2' : (hasAlert ? '#fffbeb' : undefined) }}>

                  {/* 選択チェックボックス（ISのみ） */}
                  {canDelete && (
                    <td style={{ padding: '10px 6px 10px 12px', textAlign: 'center', width: 36 }}>
                      <input
                        type="checkbox"
                        aria-label={`${lead.company} を選択`}
                        checked={isSelected}
                        onChange={() => toggleSelectOne(lead.id)}
                        style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#ef4444' }}
                      />
                    </td>
                  )}

                  {/* 会社名 */}
                  <td style={{ padding: '10px 12px', fontWeight: 700, color: '#174f35', minWidth: 140 }}>
                    {lead.company}
                  </td>

                  {/* 役職 / 名前（長文は折り返し許可・列幅固定で隣に被らないよう nowrap は外す） */}
                  <td style={{ padding: '10px 12px', color: '#3d7a5e', wordBreak: 'break-word' }}>
                    {[lead.position, lead.contact].filter(Boolean).join(' / ') || '—'}
                  </td>

                  {/* 商談担当 */}
                  <td style={{ padding: '10px 12px', color: '#3d7a5e', whiteSpace: 'nowrap' }}>
                    {ai.salesPerson || '—'}
                  </td>

                  {/* ランク */}
                  <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                    {ai.rank
                      ? <span style={{ fontWeight: 800, color: '#174f35', fontSize: 14 }}>{ai.rank}</span>
                      : <span style={{ color: '#c0dece' }}>—</span>}
                  </td>

                  {/* 商談ステータス（ISのみ編集・mailPendingOnly時は読み取り専用） */}
                  <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                    {isIS && !mailPendingOnly ? (
                      <select
                        value={ds}
                        onChange={e => handleUpdate(listId, {
                          ...lead,
                          appointmentInfo: { ...ai, dealStatus: e.target.value },
                        }, leads)}
                        style={{ background: dsStyle.bg, color: dsStyle.color, border: `1px solid ${dsStyle.border}`, borderRadius: 6, padding: '4px 8px', fontSize: 12, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer', outline: 'none' }}
                      >
                        {DEAL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    ) : (
                      <span style={{ background: dsStyle.bg, color: dsStyle.color, border: `1px solid ${dsStyle.border}`, borderRadius: 6, padding: '4px 8px', fontSize: 12, fontWeight: 700 }}>
                        {ds}
                      </span>
                    )}
                  </td>

                  {/* アポ獲得日 */}
                  <td style={{ padding: '10px 8px', color: '#3d7a5e', whiteSpace: 'nowrap', fontSize: 12 }}>
                    {formatDate(ai.confirmedDate)}
                  </td>

                  {/* 商談開始日 */}
                  <td style={{ padding: '10px 8px', color: '#3d7a5e', whiteSpace: 'nowrap', fontSize: 12 }}>
                    {ai.meetingDate ? `${formatDate(ai.meetingDate)}${ai.meetingTime ? ' ' + ai.meetingTime : ''}` : '—'}
                  </td>

                  {/* 前確認（業務委託のみ編集） */}
                  <td style={{ padding: '10px 12px', background: preConfirmAlert ? '#fef3c7' : undefined }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                      {isOutbound ? (
                        <input
                          type="checkbox"
                          checked={!!ai.preConfirm}
                          onChange={e => handleUpdate(listId, {
                            ...lead,
                            appointmentInfo: { ...ai, preConfirm: e.target.checked },
                          }, leads)}
                          style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#059669' }}
                        />
                      ) : (
                        <span style={{ fontSize: 16, color: ai.preConfirm ? '#059669' : '#d1d5db' }}>
                          {ai.preConfirm ? '✓' : '—'}
                        </span>
                      )}
                      {preConfirmAlert && (
                        <span style={{ fontSize: 10, fontWeight: 700, color: '#d97706', whiteSpace: 'nowrap' }}>⚠ 要確認</span>
                      )}
                    </div>
                  </td>

                  {/* 案内メール */}
                  <td style={{ padding: '10px 12px', background: gmailAlert ? '#fef3c7' : undefined }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                      {mailPendingOnly ? (
                        ai.zoomText ? (
                          <button
                            onClick={() => handleOpenGmailPreview({ lead, listId, listName, leads })}
                            disabled={gmailSending}
                            style={{ background: ai.gmailDraftedAt ? '#d1fae5' : '#fef2f2', color: ai.gmailDraftedAt ? '#059669' : '#ea4335', border: `1px solid ${ai.gmailDraftedAt ? '#6ee7b7' : '#fca5a5'}`, borderRadius: 6, padding: '4px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}
                          >
                            {ai.gmailDraftedAt ? '✓ 下書き済' : 'Gmail下書き'}
                          </button>
                        ) : (
                          <span style={{ fontSize: 12, color: '#d1d5db' }}>—</span>
                        )
                      ) : (
                        <>
                          <span style={{ fontSize: 16, color: ai.gmailDraftedAt ? '#059669' : '#d1d5db' }} title={ai.gmailDraftedAt ? `${ai.gmailDraftedAt.slice(0, 10)} 送信済み` : '未送信'}>
                            {ai.gmailDraftedAt ? '✓' : '—'}
                          </span>
                          {gmailAlert && (
                            <span style={{ fontSize: 10, fontWeight: 700, color: '#d97706', whiteSpace: 'nowrap' }}>⚠ 未送信</span>
                          )}
                        </>
                      )}
                    </div>
                  </td>

                  {/* アポ種別（ISのみ編集・mailPendingOnly時は読み取り専用） */}
                  <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                    {isIS && !mailPendingOnly ? (
                      <select
                        value={ai.appointType || ''}
                        onChange={e => {
                          const newType = e.target.value;
                          handleUpdate(listId, {
                            ...lead,
                            appointmentInfo: {
                              ...ai,
                              appointType:  newType,
                              appointPrice: APPOINT_PRICE_MAP[newType] || '',
                            },
                          }, leads);
                        }}
                        style={{ border: '1px solid #c0dece', borderRadius: 6, padding: '4px 8px', fontSize: 12, fontFamily: 'inherit', cursor: 'pointer', outline: 'none', background: '#fff', color: '#174f35' }}
                      >
                        <option value="">—</option>
                        {APPOINT_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    ) : (
                      <span style={{ fontSize: 12, color: '#3d7a5e' }}>{ai.appointType || '—'}</span>
                    )}
                  </td>

                  {/* アポ単価（アポ種別から自動算出・編集不可） */}
                  <td style={{ padding: '10px 12px', whiteSpace: 'nowrap', fontSize: 12, color: '#3d7a5e', fontWeight: 600 }}>
                    {APPOINT_PRICE_MAP[ai.appointType] || '—'}
                  </td>

                  {/* リスト名（長文は折り返し） */}
                  <td style={{ padding: '10px 12px', fontSize: 12, color: '#6a9a7a', wordBreak: 'break-word' }}>
                    {listName}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ページネーション（下） */}
      {paginationBar}

      {gmailPreview && (
        <GmailDraftModal
          to={gmailPreview.to}
          initialSubject={gmailPreview.subject}
          initialBody={gmailPreview.body}
          onSend={handleSendGmailDraft}
          onClose={() => setGmailPreview(null)}
        />
      )}

      {importOpen && (
        <AppointmentImportModal
          onClose={() => setImportOpen(false)}
          onImport={handleImportAppointments}
        />
      )}

      {/* 削除確認モーダル */}
      {deleteOpen && (() => {
        // ラジオボタン用の共通スタイル
        const isApoOnly = deleteMode === 'apoOnly';
        const optionStyle = (active, accentColor) => ({
          display: 'block',
          border: `2px solid ${active ? accentColor : '#e2f0e8'}`,
          background: active ? accentColor + '11' : '#fff',
          borderRadius: 8,
          padding: '12px 14px',
          cursor: 'pointer',
          marginBottom: 8,
          transition: 'all 0.1s',
        });
        return (
          <div
            onClick={() => !deleting && setDeleteOpen(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(15, 42, 31, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}
          >
            <div
              onClick={e => e.stopPropagation()}
              style={{ background: '#fff', borderRadius: 12, padding: 24, maxWidth: 480, width: '100%', boxShadow: '0 20px 60px rgba(0, 0, 0, 0.25)', fontFamily: 'inherit' }}
            >
              <div style={{ fontWeight: 700, fontSize: 16, color: '#174f35', marginBottom: 8 }}>
                アポを削除
              </div>
              <div style={{ fontSize: 13, color: '#3d7a5e', marginBottom: 16, lineHeight: 1.6 }}>
                選択した <strong style={{ color: '#dc2626', fontSize: 15 }}>{selectedIds.size}件</strong> のアポをどう処理しますか？
              </div>

              {/* モード選択：アポ情報だけクリア */}
              <label style={optionStyle(isApoOnly, '#f59e0b')}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <input
                    type="radio"
                    name="deleteMode"
                    value="apoOnly"
                    checked={isApoOnly}
                    onChange={() => setDeleteMode('apoOnly')}
                    disabled={deleting}
                    style={{ marginTop: 3, cursor: 'pointer', accentColor: '#f59e0b' }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: '#92400e' }}>アポ情報だけクリア（推奨）</div>
                    <div style={{ fontSize: 12, color: '#6a9a7a', marginTop: 4, lineHeight: 1.5 }}>
                      架電リストに「未架電」として残ります。通話履歴は保持されます。アポ間違いだった・再アプローチしたい場合はこちら。
                    </div>
                  </div>
                </div>
              </label>

              {/* モード選択：完全削除 */}
              <label style={optionStyle(!isApoOnly, '#dc2626')}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <input
                    type="radio"
                    name="deleteMode"
                    value="full"
                    checked={!isApoOnly}
                    onChange={() => setDeleteMode('full')}
                    disabled={deleting}
                    style={{ marginTop: 3, cursor: 'pointer', accentColor: '#dc2626' }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: '#991b1b' }}>架電リストからも完全削除</div>
                    <div style={{ fontSize: 12, color: '#6a9a7a', marginTop: 4, lineHeight: 1.5 }}>
                      リードごと架電リストからも消えます。通話履歴も含めて完全に削除されます。「過去アポ取込_」リストのクリーンアップ・誤取込の取り消しに。
                    </div>
                  </div>
                </div>
              </label>

              <div style={{ fontSize: 11, color: '#9ca3af', margin: '14px 0 18px' }}>
                ※ どちらのモードもこの操作は取り消せません。
              </div>

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setDeleteOpen(false)}
                  disabled={deleting}
                  style={{ background: '#f3f4f6', color: '#6b7280', border: '1px solid #d1d5db', borderRadius: 8, padding: '9px 16px', fontSize: 13, fontWeight: 600, cursor: deleting ? 'not-allowed' : 'pointer', fontFamily: 'inherit', minHeight: 44 }}
                >
                  キャンセル
                </button>
                <button
                  onClick={handleDeleteSelected}
                  disabled={deleting}
                  style={{ background: isApoOnly ? '#f59e0b' : '#ef4444', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 20px', fontSize: 13, fontWeight: 700, cursor: deleting ? 'not-allowed' : 'pointer', fontFamily: 'inherit', minHeight: 44, opacity: deleting ? 0.6 : 1 }}
                >
                  {deleting ? '処理中...' : (isApoOnly ? 'アポ情報をクリア' : '完全削除する')}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
