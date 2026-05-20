// Gmail下書きプレビュー・編集モーダル
import { useState } from 'react';
import { S } from '../../styles/index.js';

export function GmailDraftModal({ to, initialSubject, initialBody, onSend, onClose }) {
  const [subject,  setSubject]  = useState(initialSubject);
  const [body,     setBody]     = useState(initialBody);
  const [sending,  setSending]  = useState(false);

  const handleSend = async () => {
    setSending(true);
    try {
      await onSend(subject, body);
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={S.overlay}>
      <div style={{ ...S.modal, maxWidth: 640, width: '92vw' }}>
        <div style={S.modalHead}>
          <span style={{ fontWeight: 700, fontSize: 14, color: '#174f35' }}>Gmail下書き確認・編集</span>
          <button onClick={onClose} style={S.closeX}>✕</button>
        </div>

        <div style={{ ...S.modalBody, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* 宛先（読み取り専用） */}
          <div>
            <label style={S.lbl}>宛先</label>
            <div style={{ padding: '8px 12px', borderRadius: 7, border: '1px solid #c0dece', background: '#f0f5f2', fontSize: 13, color: '#3d7a5e' }}>
              {to || '（メールアドレス未登録）'}
            </div>
          </div>

          {/* 件名 */}
          <div>
            <label style={S.lbl}>件名</label>
            <input
              value={subject}
              onChange={e => setSubject(e.target.value)}
              style={S.inp}
            />
          </div>

          {/* 本文 */}
          <div>
            <label style={S.lbl}>本文</label>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              rows={18}
              style={{ ...S.inp, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.7, fontSize: 13 }}
            />
          </div>
        </div>

        <div style={S.modalFoot}>
          <button onClick={onClose} style={S.btnSec}>キャンセル</button>
          <button
            onClick={handleSend}
            disabled={sending}
            style={{ ...S.btnP, background: sending ? '#ccc' : 'linear-gradient(135deg,#ea4335,#c62828)', opacity: sending ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 6 }}
          >
            {sending ? '保存中...' : 'Gmail下書きに保存'}
          </button>
        </div>
      </div>
    </div>
  );
}
