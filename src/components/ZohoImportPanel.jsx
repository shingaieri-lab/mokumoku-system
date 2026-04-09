import React, { useState } from 'react';
import { importZohoLead } from '../lib/zoho.js';
import { S } from './styles.js';

export function ZohoImportPanel({ onAdd }) {
  const [zohoImportId, setZohoImportId] = useState('');
  const [zohoImporting, setZohoImporting] = useState(false);
  const [zohoImportMsg, setZohoImportMsg] = useState(null);

  return (
    <div style={{background:'#f0f7ff',border:'1px solid #bfdbfe',borderRadius:8,padding:'12px 16px',marginBottom:8,display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
      <span style={{fontSize:12,fontWeight:700,color:'#1e40af',flexShrink:0}}>🔗 ZohoリードIDで取込</span>
      <input
        value={zohoImportId}
        onChange={e => setZohoImportId(e.target.value)}
        placeholder="Zoho Lead ID（例：1234567890123456789）"
        style={{...S.sel, width:280, flexShrink:0}}
        onKeyDown={e => { if (e.key === 'Enter') document.getElementById('zoho-import-btn').click(); }}
      />
      <button
        id="zoho-import-btn"
        disabled={zohoImporting || !zohoImportId.trim()}
        onClick={async () => {
          setZohoImporting(true);
          setZohoImportMsg(null);
          try {
            const { ok: resOk, data } = await importZohoLead(zohoImportId.trim());
            if (!resOk) {
              setZohoImportMsg({ type: 'err', text: data.error || '取込に失敗しました' });
            } else {
              onAdd(data.lead);
              setZohoImportId('');
              setZohoImportMsg({ type: 'ok', text: `「${data.lead.company || data.lead.contact}」を取込みました` });
            }
          } catch (e) {
            setZohoImportMsg({ type: 'err', text: 'ネットワークエラー: ' + e.message });
          } finally {
            setZohoImporting(false);
          }
        }}
        style={{...S.btnP, opacity: (zohoImporting || !zohoImportId.trim()) ? 0.5 : 1}}
      >
        {zohoImporting ? '取込中…' : '取込'}
      </button>
      {zohoImportMsg && (
        <span style={{fontSize:12, fontWeight:700, color: zohoImportMsg.type === 'ok' ? '#059669' : '#dc2626'}}>
          {zohoImportMsg.type === 'ok' ? '✓ ' : '✗ '}{zohoImportMsg.text}
        </span>
      )}
    </div>
  );
}
