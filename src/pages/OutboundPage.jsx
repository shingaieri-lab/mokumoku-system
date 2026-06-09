// アウトバウンド管理ページ（リスト管理・架電記録・アポ獲得報告）
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { S } from '../styles/index.js';
import { OutboundListHeader } from '../components/outbound/OutboundListHeader.jsx';
import { OutboundLeadRow }    from '../components/outbound/OutboundLeadRow.jsx';
import { AppointmentModal }   from '../components/outbound/AppointmentModal.jsx';
import { AppointmentList }    from '../components/outbound/AppointmentList.jsx';
import { Pagination }         from '../components/ui/Pagination.jsx';
import { fetchOutboundLists, createOutboundList, deleteOutboundList, fetchOutboundLeads, saveOutboundLeads } from '../lib/outboundApi.js';
import { SignatureEditModal } from '../components/outbound/SignatureEditModal.jsx';

// リストを「新しい順（インポート順で新しいものが上）」に並べ替えるヘルパー
// 基準は createdAt（ISO文字列なので文字列比較で時系列順になる）。
// 古いデータで createdAt が無い場合は id（'obl_' + Date.now()）にフォールバックする。
function sortListsByNewest(lists) {
  return [...lists].sort((a, b) => {
    const ka = a.createdAt || a.id || '';
    const kb = b.createdAt || b.id || '';
    return kb.localeCompare(ka); // 降順 = 新しいものが先頭
  });
}

export function OutboundPage({ currentUser }) {
  const [view,           setView]           = useState('list'); // 'list' | 'appointments'
  const [lists,          setLists]          = useState([]);
  const [currentListId,  setCurrentListId]  = useState('');
  const [leads,          setLeads]          = useState([]);
  const [loading,        setLoading]        = useState(false);
  const [appointLead,    setAppointLead]    = useState(null);
  const [selectedIds,    setSelectedIds]    = useState(new Set());
  const [confirmDelete,  setConfirmDelete]  = useState(false);
  const [showSignature,  setShowSignature]  = useState(false);
  const [filterStatus,   setFilterStatus]   = useState(null); // null = すべて表示
  const [searchQuery,    setSearchQuery]    = useState('');
  const [page,           setPage]           = useState(1);
  const [pageSize,       setPageSize]       = useState(30);

  const canWrite  = currentUser?.role === 'outbound' || currentUser?.role === 'admin';
  const isIS      = currentUser?.role === 'admin' || currentUser?.role === 'member';
  const prevViewRef = useRef(view);

  // 架電リスト画面で「リスト選択」に出すリスト一覧
  // 過去アポ取込（リスト名「過去アポ取込_」で始まる）はアポ一覧専用なので
  // 架電リスト UI からは除外する（スプシからの過去データ移行用で、もう架電しないため）
  // ※ アポ一覧側は AppointmentList が独自に fetchOutboundLists するので影響なし
  // 新しいものが上に来るように並べ替えてからフィルタする（プルダウンの並び順もこの順）
  const callableLists = useMemo(
    () => sortListsByNewest(lists).filter(l => !(l.name || '').startsWith('過去アポ取込_')),
    [lists]
  );

  // リスト一覧をロード
  useEffect(() => {
    fetchOutboundLists()
      .then(data => {
        setLists(data);
        // 初期選択は「架電可能なリスト」のうち新しい順で先頭を選ぶ
        // （アウトバウンドメニューを開いたとき、最新のリストがデフォルト表示になる）
        const firstCallable = sortListsByNewest(data)
          .find(l => !(l.name || '').startsWith('過去アポ取込_'));
        if (firstCallable && !currentListId) setCurrentListId(firstCallable.id);
      })
      .catch(e => console.error(e));
  }, []);

  // アポ一覧/未送信タブから架電リストに戻ったとき、他タブでの変更を反映するため再フェッチ
  useEffect(() => {
    const was = prevViewRef.current;
    prevViewRef.current = view;
    if (view === 'list' && was !== 'list' && currentListId) {
      fetchOutboundLeads(currentListId)
        .then(data => setLeads(data))
        .catch(e => console.error(e));
    }
  }, [view, currentListId]);

  // リスト選択時にリードをロード・選択リセット
  useEffect(() => {
    if (!currentListId) { setLeads([]); return; }
    setSelectedIds(new Set());
    setConfirmDelete(false);
    setFilterStatus(null);
    setSearchQuery('');
    setPage(1);
    setLoading(true);
    fetchOutboundLeads(currentListId)
      .then(data => setLeads(data))
      .catch(e => console.error(e))
      .finally(() => setLoading(false));
  }, [currentListId]);

  // リスト作成（CSVインポート）
  const handleCreateList = useCallback(async (name, csvLeads) => {
    const result = await createOutboundList(name, csvLeads);
    const newLists = await fetchOutboundLists();
    setLists(newLists);
    setCurrentListId(result.listId);
  }, []);

  // リスト削除
  const handleDeleteList = useCallback(async (listId) => {
    await deleteOutboundList(listId);
    const newLists = await fetchOutboundLists();
    setLists(newLists);
    // 削除後も「新しい順で先頭」を選ぶ（並び順の一貫性を保つ）
    const sorted = sortListsByNewest(newLists);
    setCurrentListId(sorted.length > 0 ? sorted[0].id : '');
  }, []);

  // リード更新（楽観的更新 + サーバー保存）
  const handleUpdateLead = useCallback(async (updatedLead) => {
    const newLeads = leads.map(l => l.id === updatedLead.id ? updatedLead : l);
    setLeads(newLeads);
    try {
      await saveOutboundLeads(currentListId, newLeads);
    } catch (e) {
      setLeads(leads); // ロールバック
      alert(e.message);
    }
  }, [leads, currentListId]);

  // アポ情報保存（リード更新経由）
  const handleSaveAppointment = useCallback(async (updatedLead) => {
    await handleUpdateLead(updatedLead);
  }, [handleUpdateLead]);

  // チェックボックス操作
  const handleToggleSelect = useCallback((id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedIds(prev => prev.size === leads.length ? new Set() : new Set(leads.map(l => l.id)));
  }, [leads]);

  // 選択した行を削除
  const handleDeleteSelected = useCallback(async () => {
    const newLeads = leads.filter(l => !selectedIds.has(l.id));
    setLeads(newLeads);
    setSelectedIds(new Set());
    setConfirmDelete(false);
    try {
      await saveOutboundLeads(currentListId, newLeads);
      setLists(prev => prev.map(l => l.id === currentListId ? { ...l, leadCount: newLeads.length } : l));
    } catch (e) {
      setLeads(leads);
      alert(e.message);
    }
  }, [leads, selectedIds, currentListId]);

  // フィルタ・ページネーション計算
  // バケット定義は OutboundListHeader 側の集計と一致させる。
  //   - 対応中: 不在 / 留守 / 再コール
  //   - 終了  : 受付NG / 本人NG / 現アナ / その他
  // それ以外（'未架電' / 'アポ'）は個別ステータス一致で絞り込む。
  const ACTIVE_STATUSES   = new Set(['不在', '留守', '再コール']);
  const TERMINAL_STATUSES = new Set(['受付NG', '本人NG', '現アナ', 'その他']);
  const q = searchQuery.trim().toLowerCase();
  const filteredLeads = leads.filter(l => {
    if (filterStatus) {
      if (filterStatus === '対応中')    { if (!ACTIVE_STATUSES.has(l.status))   return false; }
      else if (filterStatus === '終了') { if (!TERMINAL_STATUSES.has(l.status)) return false; }
      else                              { if (l.status !== filterStatus)         return false; }
    }
    if (q) {
      const hit = (l.company || '').toLowerCase().includes(q) || (l.contact || '').toLowerCase().includes(q);
      if (!hit) return false;
    }
    return true;
  });
  const totalPages  = Math.max(1, Math.ceil(filteredLeads.length / pageSize));
  const safePage    = Math.min(page, totalPages);
  const pagedLeads  = filteredLeads.slice((safePage - 1) * pageSize, safePage * pageSize);

  const handleFilterStatus = (s) => {
    setFilterStatus(s === null ? null : prev => prev === s ? null : s);
    setPage(1);
  };

  const paginationBar = filteredLeads.length > 0 && (
    <Pagination
      page={safePage}
      totalPages={totalPages}
      total={filteredLeads.length}
      pageSize={pageSize}
      onPageChange={setPage}
      onPageSizeChange={n => { setPageSize(n); setPage(1); }}
    />
  );

  return (
    /*
      LeadsPage と同じフルハイト構造：
      - ページ全体は overflow:hidden の縦flex
      - タイトル＋タブは flexShrink:0 で固定サイズ（スクロール領域の外なので絶対に動かない）
      - 各 view は flex:1 + overflowY:auto で独自スクロール領域を持つ
      - AppointmentList / 架電リスト内の sticky は、その独自スクロール領域内で top:0 として動く
    */
    <div style={{
      paddingLeft: 28, paddingRight: 28, height: '100%', overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* タイトル＋タブ：flexShrink:0 で固定サイズ。背景は親領域の色と合わせる */}
      <div style={{
        flexShrink: 0, background: '#f0f5f2',
        paddingTop: 24, paddingBottom: 8,
        marginLeft: -28, marginRight: -28, paddingLeft: 28, paddingRight: 28,
      }}>
        <div style={{ marginBottom: 12, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: '#174f35', margin: 0 }}>アウトバウンド管理</h1>
            <p style={{ fontSize: 12, color: '#6a9a7a', marginTop: 4 }}>
              {canWrite ? '架電・メール結果を記録し、アポ獲得時はChatworkに送信できます。' : '架電リストと進捗を閲覧できます（書き込みは業務委託先のみ）。'}
            </p>
          </div>
          {isIS && (
            <button onClick={() => setShowSignature(true)}
              style={{ background: '#f0f5f2', color: '#3d7a5e', border: '1px solid #c0dece', borderRadius: 8, padding: '7px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0, whiteSpace: 'nowrap' }}>
              ✏️ メールテンプレート編集
            </button>
          )}
        </div>

        {/* タブ切替 */}
        <div style={{ display: 'flex', gap: 4, borderBottom: '2px solid #e2f0e8', marginBottom: 0 }}>
          {[
            { key: 'list',         label: '架電リスト' },
            { key: 'appointments', label: 'アポ一覧' },
            ...(isIS ? [{ key: 'mail-pending', label: 'メール未送信' }] : []),
          ].map(({ key, label }) => (
            <button key={key} onClick={() => setView(key)}
              style={{ padding: '8px 20px', fontSize: 13, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer', border: 'none', borderBottom: view === key ? '2px solid #059669' : '2px solid transparent', background: 'none', color: view === key ? '#059669' : '#6a9a7a', marginBottom: -2, transition: 'color 0.15s' }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* スクロール領域：このコンテナがスクロールコンテナとなり、内部の sticky 要素は
          このコンテナの top に対して張り付く（外側のページ全体ではスクロールしない）。
          paddingTop は付けない：sticky 要素を scroll コンテナの top:0 にぴったり密着させ、
          padding 領域をデータ行が通過してチラ見えするのを防ぐため。
          上部の余白は sticky 領域内（paddingTop:16 等）で確保する。 */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'auto', marginLeft: -28, marginRight: -28, paddingLeft: 28, paddingRight: 28 }}>

      {/* アポ一覧ビュー */}
      {view === 'appointments' && (
        <AppointmentList currentUser={currentUser} />
      )}

      {/* メール未送信ビュー（ISのみ） */}
      {view === 'mail-pending' && isIS && (
        <AppointmentList currentUser={currentUser} mailPendingOnly={true} />
      )}

      {/* 架電リストビュー */}
      {view === 'list' && <>
      {/*
        架電リストの「ヘッダー領域（リスト選択・絞り込み・選択ツールバー・ページネーション上）」を
        スクロール領域の上部に固定する。最近接のスクロールコンテナはこのコンポーネント内の
        「flex:1, overflowY:auto」の div（タイトル＋タブの下のスクロール領域）。
        top:0 でスクロール領域の上端に張り付く（タイトル＋タブはスクロール領域の外なので独立）。
      */}
      <div style={{ position: 'sticky', top: 0, zIndex: 3, background: '#f0f5f2', paddingTop: 16, paddingBottom: 4 }}>
        <OutboundListHeader
          lists={callableLists}
          currentListId={currentListId}
          leads={leads}
          currentUser={currentUser}
          onSelectList={setCurrentListId}
          onCreateList={handleCreateList}
          onDeleteList={handleDeleteList}
          filterStatus={filterStatus}
          onFilterStatus={handleFilterStatus}
          searchQuery={searchQuery}
          onSearchChange={v => { setSearchQuery(v); setPage(1); }}
        />

        {currentListId && !loading && leads.length > 0 && (
          <>
            {/* 選択操作ツールバー（内容がある時のみ表示） */}
            {(isIS || filterStatus || selectedIds.size > 0) && <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              {isIS && (
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#6a9a7a', cursor: 'pointer', userSelect: 'none' }}>
                  <input
                    type="checkbox"
                    checked={selectedIds.size === leads.length}
                    ref={el => { if (el) el.indeterminate = selectedIds.size > 0 && selectedIds.size < leads.length; }}
                    onChange={handleSelectAll}
                    style={{ width: 15, height: 15, cursor: 'pointer', accentColor: '#059669' }}
                  />
                  全選択
                </label>
              )}
              {filterStatus && (
                <span style={{ fontSize: 12, color: '#6a9a7a' }}>
                  <span style={{ fontWeight: 700, color: '#174f35' }}>{filteredLeads.length}件</span>
                  {filteredLeads.length !== leads.length && <span style={{ marginLeft: 4 }}>/ 全{leads.length}件</span>}
                </span>
              )}
              {selectedIds.size > 0 && (
                <>
                  <span style={{ fontSize: 13, color: '#174f35', fontWeight: 700 }}>{selectedIds.size}件選択中</span>
                  {!confirmDelete ? (
                    <button onClick={() => setConfirmDelete(true)}
                      style={{ background: '#fef2f2', color: '#ef4444', border: '1px solid #ef444433', borderRadius: 6, padding: '4px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                      削除
                    </button>
                  ) : (
                    <>
                      <span style={{ fontSize: 13, color: '#ef4444' }}>本当に削除しますか？</span>
                      <button onClick={handleDeleteSelected}
                        style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                        削除する
                      </button>
                      <button onClick={() => setConfirmDelete(false)}
                        style={{ background: 'none', color: '#6a9a7a', border: '1px solid #c0dece', borderRadius: 6, padding: '4px 12px', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
                        キャンセル
                      </button>
                    </>
                  )}
                  <button onClick={() => { setSelectedIds(new Set()); setConfirmDelete(false); }}
                    style={{ background: 'none', color: '#9ca3af', border: 'none', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
                    選択解除
                  </button>
                </>
              )}
            </div>}

            {/* ページネーション（上） */}
            {paginationBar}
          </>
        )}
      </div>
      {/* sticky ラッパー end */}

      {!currentListId && (
        <div style={S.empty}>リストをインポートして架電を開始してください。</div>
      )}

      {currentListId && loading && (
        <div style={S.empty}>読み込み中...</div>
      )}

      {currentListId && !loading && leads.length === 0 && (
        <div style={S.empty}>このリストにデータがありません。</div>
      )}

      {currentListId && !loading && leads.length > 0 && (
        <div>
          {pagedLeads.map(lead => (
            <OutboundLeadRow
              key={lead.id}
              lead={lead}
              canWrite={canWrite}
              canEdit={isIS}
              currentUser={currentUser}
              selected={selectedIds.has(lead.id)}
              onToggleSelect={isIS ? handleToggleSelect : null}
              onUpdate={handleUpdateLead}
              onOpenAppointment={setAppointLead}
            />
          ))}

          {/* ページネーション（下） */}
          {paginationBar}
        </div>
      )}
      </>}

      </div>
      {/* スクロール領域 end */}

      {showSignature && (
        <SignatureEditModal onClose={() => setShowSignature(false)} />
      )}

      {appointLead && (
        <AppointmentModal
          lead={appointLead}
          listName={lists.find(l => l.id === currentListId)?.name || ''}
          currentUser={currentUser}
          onSave={async (updated) => {
            await handleSaveAppointment(updated);
            setAppointLead(updated);
          }}
          onClose={() => setAppointLead(null)}
        />
      )}
    </div>
  );
}
