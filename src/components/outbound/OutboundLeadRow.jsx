// 架電リストの1行コンポーネント（表示・架電記録・項目編集）
import { useState } from 'react';
import { S } from '../../styles/index.js';
import { PhoneIcon, MobileIcon, EnvelopeIcon, MemoIcon } from '../ui/icons/NavIcons.jsx';

const STATUSES = ['未架電', '不在', '折り返し待ち', '担当者不在', 'お断り', 'アポ獲得', 'NG'];

const STATUS_COLOR = {
  '未架電':       { color: '#6a9a7a', bg: '#f0f5f2' },
  '不在':         { color: '#f59e0b', bg: '#fef9ec' },
  '折り返し待ち': { color: '#3b82f6', bg: '#eff6ff' },
  '担当者不在':   { color: '#8b5cf6', bg: '#f5f3ff' },
  'お断り':       { color: '#ef4444', bg: '#fef2f2' },
  'アポ獲得':     { color: '#059669', bg: '#d1fae5' },
  'NG':           { color: '#9ca3af', bg: '#f9fafb' },
};

// 編集フォーム（基本情報の修正）
function EditPanel({ lead, onSave, onCancel }) {
  const [form, setForm] = useState({
    company:  lead.company  || '',
    contact:  lead.contact  || '',
    position: lead.position || '',
    phone:    lead.phone    || '',
    mobile:   lead.mobile   || '',
    email:    lead.email    || '',
    industry: lead.industry || '',
    memo:     lead.memo     || '',
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div style={{ padding: '14px 16px', borderTop: '1px solid #e2f0e8', background: '#f8fbf9' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 14px' }}>
        <div>
          <label style={S.lbl}>会社名 <span style={{ color: '#ef4444' }}>*</span></label>
          <input value={form.company} onChange={e => set('company', e.target.value)} style={S.inp} />
        </div>
        <div>
          <label style={S.lbl}>業種</label>
          <input value={form.industry} onChange={e => set('industry', e.target.value)} placeholder="例: IT・通信" style={S.inp} />
        </div>
        <div>
          <label style={S.lbl}>担当者名</label>
          <input value={form.contact} onChange={e => set('contact', e.target.value)} style={S.inp} />
        </div>
        <div>
          <label style={S.lbl}>役職</label>
          <input value={form.position} onChange={e => set('position', e.target.value)} placeholder="例: 部長" style={S.inp} />
        </div>
        <div>
          <label style={S.lbl}>電話番号</label>
          <input value={form.phone} onChange={e => set('phone', e.target.value)} style={S.inp} />
        </div>
        <div>
          <label style={S.lbl}>携帯番号</label>
          <input value={form.mobile} onChange={e => set('mobile', e.target.value)} style={S.inp} />
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={S.lbl}>メールアドレス</label>
          <input value={form.email} onChange={e => set('email', e.target.value)} style={S.inp} />
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={S.lbl}>メモ</label>
          <input value={form.memo} onChange={e => set('memo', e.target.value)} style={S.inp} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
        <button onClick={onCancel} style={S.btnSec}>キャンセル</button>
        <button onClick={() => { if (!form.company.trim()) { alert('会社名は必須です'); return; } onSave(form); }}
          style={S.btnP}>保存</button>
      </div>
    </div>
  );
}

export function OutboundLeadRow({ lead, canWrite, selected, onToggleSelect, onUpdate, onOpenAppointment }) {
  const [mode, setMode]         = useState(null); // null | 'record' | 'edit'
  const [method, setMethod]     = useState('phone');
  const [memo, setMemo]         = useState('');
  const [saving, setSaving]     = useState(false);
  const [memoOpen, setMemoOpen] = useState(false);

  const sc       = STATUS_COLOR[lead.status] || STATUS_COLOR['未架電'];
  const lastCall = lead.callHistory?.[0];

  const handleRecord = async () => {
    setSaving(true);
    const entry = {
      id: `ch_${Date.now()}`,
      date: new Date().toLocaleDateString('sv', { timeZone: 'Asia/Tokyo' }) + ' ' +
            new Date().toLocaleTimeString('sv', { timeZone: 'Asia/Tokyo', hour: '2-digit', minute: '2-digit' }),
      method,
      result: lead.status,
      memo,
    };
    await onUpdate({ ...lead, callHistory: [entry, ...(lead.callHistory || [])] });
    setMemo(''); setSaving(false); setMode(null);
  };

  const handleEditSave = async (fields) => {
    setSaving(true);
    await onUpdate({ ...lead, ...fields });
    setSaving(false); setMode(null);
  };

  const handleStatusChange = (newStatus) => onUpdate({ ...lead, status: newStatus });

  return (
    <div style={{ background: selected ? '#f0fdf4' : '#fff', border: `1px solid ${selected ? '#10b98155' : '#e2f0e8'}`, borderRadius: 10, marginBottom: 8, overflow: 'hidden', transition: 'background 0.1s' }}>
      {/* メイン行 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', flexWrap: 'wrap' }}>
        {onToggleSelect && (
          <input
            type="checkbox"
            checked={!!selected}
            onChange={() => onToggleSelect(lead.id)}
            onClick={e => e.stopPropagation()}
            style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#059669', flexShrink: 0 }}
          />
        )}

        {/* 会社名・担当者・役職・業種 */}
        <div style={{ width: 600, flexShrink: 0, minWidth: 0 }}>
          {(lead.industry || lead.address) && (
            <div style={{ fontSize: 12, color: '#6a9a7a', marginBottom: 2 }}>
              {[lead.industry, lead.address].filter(Boolean).join('　')}
            </div>
          )}
          <div style={{ fontWeight: 700, fontSize: 16, color: '#174f35', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {lead.company}
          </div>
          {(lead.contact || lead.position) && (
            <div style={{ fontSize: 14, color: '#6a9a7a', marginTop: 2 }}>
              {[lead.contact, lead.position].filter(Boolean).join(' / ')}
            </div>
          )}
          {lead.memo && (
            <div
              onClick={() => setMemoOpen(v => !v)}
              style={{ display: 'flex', alignItems: 'flex-start', gap: 4, fontSize: 12, color: '#3d7a5e', marginTop: 3, cursor: 'pointer' }}
            >
              <MemoIcon size={13} color="#3d7a5e" />
              {memoOpen ? (
                <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                  {lead.memo}<span style={{ color: '#6a9a7a', marginLeft: 4 }}>▲</span>
                </span>
              ) : (
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 400 }}>
                  {lead.memo}<span style={{ color: '#6a9a7a', marginLeft: 4 }}>▼</span>
                </span>
              )}
            </div>
          )}
        </div>

        {/* 電話・携帯・メール（横並び） */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', gap: 18, flexWrap: 'wrap', alignItems: 'center' }}>
          {lead.phone  && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#059669', fontWeight: 700, fontSize: 14 }}>
              <PhoneIcon size={15} color="#059669" />{lead.phone}
            </span>
          )}
          {lead.mobile && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#0284c7', fontWeight: 700, fontSize: 14 }}>
              <MobileIcon size={15} color="#0284c7" />{lead.mobile}
            </span>
          )}
          {lead.email  && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#6a9a7a', fontSize: 14 }}>
              <EnvelopeIcon size={15} color="#6a9a7a" />{lead.email}
            </span>
          )}
        </div>

        {/* ステータス */}
        {canWrite ? (
          <select value={lead.status} onChange={e => handleStatusChange(e.target.value)}
            style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.color}55`, borderRadius: 6, padding: '5px 10px', fontSize: 13, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer', outline: 'none' }}>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        ) : (
          <span style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.color}55`, borderRadius: 6, padding: '5px 10px', fontSize: 13, fontWeight: 700 }}>
            {lead.status}
          </span>
        )}

        {/* アポ情報入力ボタン */}
        {lead.status === 'アポ獲得' && (
          <button onClick={() => onOpenAppointment(lead)}
            style={{ background: '#d1fae5', color: '#059669', border: '1px solid #10b98155', borderRadius: 7, padding: '6px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
            アポ情報入力
          </button>
        )}

        {/* 操作ボタン群 */}
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          {canWrite && (
            <button onClick={() => setMode(mode === 'record' ? null : 'record')}
              style={{ ...S.btnSec, fontSize: 13, padding: '5px 12px' }}>
              {mode === 'record' ? '閉じる' : '記録する'}
            </button>
          )}
          <button onClick={() => setMode(mode === 'edit' ? null : 'edit')}
            style={{ background: 'none', border: '1px solid #c0dece', borderRadius: 6, padding: '5px 12px', fontSize: 13, color: '#6a9a7a', cursor: 'pointer', fontFamily: 'inherit' }}>
            {mode === 'edit' ? '閉じる' : '編集'}
          </button>
        </div>
      </div>

      {/* 最終架電履歴（通常時） */}
      {lastCall && mode === null && (
        <div style={{ padding: '5px 14px 7px', borderTop: '1px solid #f0f5f2', fontSize: 12, color: '#6a9a7a' }}>
          最終: {lastCall.date} ／ {lastCall.method === 'phone' ? '電話' : 'メール'} ／ {lastCall.result}
          {lastCall.memo && <span style={{ marginLeft: 6, color: '#3d7a5e' }}>「{lastCall.memo}」</span>}
        </div>
      )}

      {/* 架電記録フォーム */}
      {mode === 'record' && (
        <div style={{ padding: '12px 14px', borderTop: '1px solid #e2f0e8', background: '#f8fbf9' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div>
              <label style={S.lbl}>連絡手段</label>
              <select value={method} onChange={e => setMethod(e.target.value)} style={{ ...S.sel, fontSize: 12, padding: '6px 10px' }}>
                <option value="phone">電話</option>
                <option value="email">メール</option>
              </select>
            </div>
            <div style={{ flex: 1, minWidth: 180 }}>
              <label style={S.lbl}>メモ（任意）</label>
              <input value={memo} onChange={e => setMemo(e.target.value)} placeholder="例: 折り返し15時以降希望" style={S.inp} />
            </div>
            <div style={{ alignSelf: 'flex-end' }}>
              <button onClick={handleRecord} disabled={saving}
                style={{ ...S.btnP, fontSize: 12, padding: '8px 14px', opacity: saving ? 0.6 : 1 }}>
                {saving ? '保存中...' : '記録する'}
              </button>
            </div>
          </div>
          {lead.callHistory?.length > 0 && (
            <div style={{ marginTop: 10, borderTop: '1px solid #e2f0e8', paddingTop: 8 }}>
              <div style={{ fontSize: 11, color: '#6a9a7a', fontWeight: 700, marginBottom: 4 }}>架電履歴</div>
              {lead.callHistory.map(h => (
                <div key={h.id} style={{ fontSize: 11, color: '#3d7a5e', padding: '3px 0', borderBottom: '1px solid #f0f5f2' }}>
                  {h.date} ／ {h.method === 'phone' ? '電話' : 'メール'} ／ {h.result}
                  {h.memo && <span style={{ marginLeft: 6, color: '#6a9a7a' }}>「{h.memo}」</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 項目編集フォーム */}
      {mode === 'edit' && (
        <EditPanel
          lead={lead}
          onSave={handleEditSave}
          onCancel={() => setMode(null)}
        />
      )}
    </div>
  );
}
