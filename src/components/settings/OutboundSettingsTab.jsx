// アウトバウンド設定タブ（メールテンプレート・Chatwork設定）
import { useState } from 'react';
import { fetchOutboundConfig, saveOutboundConfig } from '../../lib/outboundApi.js';

const VARIABLES = ['{{担当者名}}', '{{企業名}}', '{{商談日時}}', '{{Zoomリンク}}', '{{商談担当}}', '{{送信者名}}', '{{署名}}'];

export function OutboundSettingsTab({ master, save }) {
  const inp = { width: '100%', padding: '7px 10px', borderRadius: 7, border: '1px solid #c0dece', fontSize: 12, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', background: '#fff', color: '#174f35' };

  const tpl = master.outboundEmailTpl || {};

  const setSubject = (v) => save({ ...master, outboundEmailTpl: { ...tpl, subject: v } });
  const setBody    = (v) => save({ ...master, outboundEmailTpl: { ...tpl, body: v } });

  return (
    <div style={{ maxWidth: 720 }}>

      {/* メールテンプレート */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#174f35', marginBottom: 4 }}>メールテンプレート</div>
        <div style={{ fontSize: 11, color: '#6a9a7a', marginBottom: 12, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <span>使用できる変数：</span>
          {VARIABLES.map(v => (
            <code key={v} style={{ background: '#f0f5f2', border: '1px solid #c0dece', borderRadius: 4, padding: '1px 6px', fontSize: 11, color: '#174f35' }}>{v}</code>
          ))}
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 12, color: '#3d7a5e', fontWeight: 600, display: 'block', marginBottom: 4 }}>件名</label>
          <input
            value={tpl.subject || ''}
            onChange={e => setSubject(e.target.value)}
            placeholder="例: 【商談のご案内】{{企業名}} 様 {{商談日時}}〜"
            style={inp}
          />
        </div>

        <div>
          <label style={{ fontSize: 12, color: '#3d7a5e', fontWeight: 600, display: 'block', marginBottom: 4 }}>本文</label>
          <textarea
            value={tpl.body || ''}
            onChange={e => setBody(e.target.value)}
            rows={30}
            style={{ ...inp, resize: 'vertical' }}
            placeholder="本文テンプレートを入力..."
          />
        </div>
      </div>

    </div>
  );
}
