// アウトバウンド管理ページ（リスト管理・架電記録・アポ獲得報告）
import { useState, useEffect, useCallback } from 'react';
import { S } from '../styles/index.js';
import { OutboundListHeader } from '../components/outbound/OutboundListHeader.jsx';
import { OutboundLeadRow }    from '../components/outbound/OutboundLeadRow.jsx';
import { AppointmentModal }   from '../components/outbound/AppointmentModal.jsx';
import { fetchOutboundLists, createOutboundList, deleteOutboundList, fetchOutboundLeads, saveOutboundLeads } from '../lib/outboundApi.js';
import { SignatureEditModal } from '../components/outbound/SignatureEditModal.jsx';

export function OutboundPage({ currentUser }) {
  const [lists,          setLists]          = useState([]);
  const [currentListId,  setCurrentListId]  = useState('');
  const [leads,          setLeads]          = useState([]);
  const [loading,        setLoading]        = useState(false);
  const [appointLead,    setAppointLead]    = useState(null);
  const [selectedIds,    setSelectedIds]    = useState(new Set());
  const [confirmDelete,  setConfirmDelete]  = useState(false);
  const [showSignature,  setShowSignature]  = useState(false);

  const canWrite = currentUser?.role === 'outbound' || currentUser?.role === 'admin';
  const isIS     = currentUser?.role === 'admin' || currentUser?.role === 'member';

  // リスト一覧をロード
  useEffect(() => {
    fetchOutboundLists()
      .then(data => {
        setLists(data);
        if (data.length > 0 && !currentListId) setCurrentListId(data[0].id);
      })
      .catch(e => console.error(e));
  }, []);

  // リスト選択時にリードをロード・選択リセット
  useEffect(() => {
    if (!currentListId) { setLeads([]); return; }
    setSelectedIds(new Set());
    setConfirmDelete(false);
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
    setCurrentListId(newLists.length > 0 ? newLists[0].id : '');
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

  return (
    <div style={S.page}>
      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
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

      <OutboundListHeader
        lists={lists}
        currentListId={currentListId}
        leads={leads}
        currentUser={currentUser}
        onSelectList={setCurrentListId}
        onCreateList={handleCreateList}
        onDeleteList={handleDeleteList}
      />

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
          {/* 選択操作ツールバー */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8, minHeight: 32 }}>
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
          </div>

          {leads.map(lead => (
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
        </div>
      )}

      {showSignature && (
        <SignatureEditModal
          onClose={() => setShowSignature(false)}
        />
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
