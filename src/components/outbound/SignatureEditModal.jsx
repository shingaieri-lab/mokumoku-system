// メールテンプレート編集モーダル（アウトバウンドページ右上のIS担当専用ボタンから開く）
import { useState } from 'react';
import { S } from '../../styles/index.js';
import { getMaster, saveMasterSettings } from '../../lib/master.js';

const VARIABLES = ['{{担当者名}}', '{{企業名}}', '{{商談日時}}', '{{Zoomリンク}}', '{{商談担当}}', '{{送信者名}}', '{{署名}}'];

export function SignatureEditModal({ onClose }) {
  const master = getMaster();
  const tpl = master.outboundEmailTpl || {};

  const [subject, setSubject] = useState(tpl.subject || '');
  const [body,    setBody]    = useState(tpl.body    || '');
  const [saved,   setSaved]   = useState(false);

  const handleSave = () => {
    const next = { ...master, outboundEmailTpl: { subject, body } };
    saveMasterSettings(next);
    setSaved(true);
    setTimeout(() => { setSaved(false); onClose(); }, 800);
  };

  const inp = { width: '100%', padding: '8px 12px', borderRadius: 7, border: '1px solid #c0dece', fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', background: '#fff', color: '#174f35' };

  return (
    <div style={S.overlay}>
      <div style={{ ...S.modal, maxWidth: 680, width: '94vw' }}>
        <div style={S.modalHead}>
          <span style={{ fontWeight: 700, fontSize: 14, color: '#174f35' }}>メールテンプレートの編集</span>
          <button onClick={onClose} style={S.closeX}>✕</button>
        </div>

        <div style={{ ...S.modalBody, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* 変数チップ */}
          <div style={{ fontSize: 11, color: '#6a9a7a', display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <span>使用できる変数：</span>
            {VARIABLES.map(v => (
              <code key={v} style={{ background: '#f0f5f2', border: '1px solid #c0dece', borderRadius: 4, padding: '1px 6px', fontSize: 11, color: '#174f35' }}>{v}</code>
            ))}
          </div>

          {/* 件名 */}
          <div>
            <label style={{ fontSize: 12, color: '#3d7a5e', fontWeight: 600, display: 'block', marginBottom: 4 }}>件名</label>
            <input value={subject} onChange={e => setSubject(e.target.value)} style={inp} />
          </div>

          {/* 本文 */}
          <div>
            <label style={{ fontSize: 12, color: '#3d7a5e', fontWeight: 600, display: 'block', marginBottom: 4 }}>本文</label>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              rows={20}
              style={{ ...inp, resize: 'vertical', lineHeight: 1.6 }}
            />
          </div>
        </div>

        <div style={S.modalFoot}>
          <button onClick={onClose} style={S.btnSec}>キャンセル</button>
          <button onClick={handleSave} style={S.btnP}>
            {saved ? '保存しました ✓' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
}
