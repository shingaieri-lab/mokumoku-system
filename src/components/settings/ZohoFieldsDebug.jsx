// 【開発用】ZohoのDealモジュールのフィールド一覧を表示するデバッグ画面
// 「営業確度（初回商談時）」「ステージ」などのAPI名（半角英数字）を確認するために使う。
// API名が確定したらこのコンポーネントは削除予定。
import { useState } from 'react';
import { fetchZohoModuleFields } from '../../lib/zoho.js';
import { SpinnerIcon, ExternalLinkIcon } from '../ui/Icons.jsx';

export function ZohoFieldsDebug() {
  const [module, setModule] = useState('Deals');
  const [fields, setFields] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [filter, setFilter] = useState('');
  const [expanded, setExpanded] = useState(false);

  const inp = { padding: '6px 10px', borderRadius: 6, border: '1px solid #c0dece', fontSize: 12, fontFamily: 'inherit', background: '#fff', outline: 'none' };
  const btn = { padding: '6px 14px', borderRadius: 6, border: 'none', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' };

  const handleFetch = async () => {
    setLoading(true);
    setErr('');
    setFields(null);
    try {
      const data = await fetchZohoModuleFields(module);
      setFields(data);
    } catch (e) {
      setErr(e.message);
    }
    setLoading(false);
  };

  // 表示用にフィルタを適用
  const filteredFields = (fields || []).filter(f => {
    if (!filter) return true;
    const q = filter.toLowerCase();
    return (f.label || '').toLowerCase().includes(q) || (f.apiName || '').toLowerCase().includes(q);
  });

  // クリップボードコピー
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).catch(() => {});
  };

  return (
    <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '12px 14px', marginBottom: 14 }}>
      {/* タイトル：折りたたみトリガー */}
      <div
        onClick={() => setExpanded(v => !v)}
        style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', userSelect: 'none' }}
      >
        <span style={{ fontSize: 14, transition: 'transform 0.15s', display: 'inline-block', transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#92400e', display: 'flex', alignItems: 'center', gap: 5 }}>
          <ExternalLinkIcon size={12} color="#92400e" />
          【開発用】Zoho フィールド一覧の確認
        </span>
        <span style={{ fontSize: 10, color: '#b45309', marginLeft: 4 }}>営業確度・ステージなどのAPI名を確認する場合に使います</span>
      </div>

      {expanded && (
        <div style={{ marginTop: 10 }}>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginBottom: 10 }}>
            <label style={{ fontSize: 11, color: '#92400e', fontWeight: 600 }}>モジュール</label>
            <select value={module} onChange={e => setModule(e.target.value)} style={inp}>
              <option value="Deals">商談（Deals）</option>
              <option value="Leads">リード（Leads）</option>
              <option value="Accounts">取引先（Accounts）</option>
              <option value="Contacts">取引先責任者（Contacts）</option>
            </select>
            <button onClick={handleFetch} disabled={loading} style={{ ...btn, opacity: loading ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: 5 }}>
              {loading ? <><SpinnerIcon size={12} color="#fff" /> 取得中…</> : 'フィールド一覧を取得'}
            </button>
          </div>

          {err && (
            <div style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: 6, padding: '6px 10px', fontSize: 11, marginBottom: 10 }}>
              {err}
            </div>
          )}

          {fields && (
            <>
              {/* 検索ボックス */}
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                <input
                  value={filter}
                  onChange={e => setFilter(e.target.value)}
                  placeholder="🔍 ラベルかAPI名で絞り込み（例：確度、Probability）"
                  style={{ ...inp, flex: 1 }}
                />
                <span style={{ fontSize: 11, color: '#92400e' }}>
                  {filteredFields.length} / {fields.length} 件
                </span>
              </div>

              {/* フィールド一覧テーブル */}
              <div style={{ background: '#fff', border: '1px solid #fde68a', borderRadius: 6, maxHeight: 360, overflowY: 'auto' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1.5fr 0.7fr 0.5fr 0.5fr', gap: 0, position: 'sticky', top: 0, background: '#fffbeb', padding: '6px 10px', borderBottom: '1px solid #fde68a', fontSize: 10, color: '#92400e', fontWeight: 700, zIndex: 1 }}>
                  <span>ラベル（日本語）</span>
                  <span>API名（半角英数字）</span>
                  <span>データ型</span>
                  <span style={{ textAlign: 'center' }}>カスタム</span>
                  <span style={{ textAlign: 'center' }}>選択肢</span>
                </div>
                {filteredFields.length === 0 ? (
                  <div style={{ padding: 20, textAlign: 'center', color: '#9ca3af', fontSize: 12 }}>該当するフィールドがありません</div>
                ) : (
                  filteredFields.map((f, i) => (
                    <div key={f.apiName + i} style={{
                      display: 'grid',
                      gridTemplateColumns: '1.5fr 1.5fr 0.7fr 0.5fr 0.5fr',
                      gap: 0,
                      padding: '6px 10px',
                      borderBottom: '1px solid #fef3c7',
                      fontSize: 11,
                      alignItems: 'center',
                    }}>
                      <span style={{ color: '#174f35', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.label}</span>
                      <span
                        onClick={() => copyToClipboard(f.apiName)}
                        title="クリックでコピー"
                        style={{ fontFamily: 'monospace', fontSize: 11, color: '#3b82f6', cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                      >
                        {f.apiName}
                      </span>
                      <span style={{ color: '#6a9a7a', fontSize: 10 }}>{f.dataType}</span>
                      <span style={{ textAlign: 'center', color: f.isCustom ? '#10b981' : '#9ca3af' }}>{f.isCustom ? '✓' : '—'}</span>
                      <span style={{ textAlign: 'center' }}>
                        {f.pickList && f.pickList.length > 0 ? (
                          <span title={f.pickList.join(' / ')} style={{ color: '#8b5cf6', fontSize: 10, cursor: 'help' }}>
                            {f.pickList.length}個
                          </span>
                        ) : (
                          <span style={{ color: '#d1d5db' }}>—</span>
                        )}
                      </span>
                    </div>
                  ))
                )}
              </div>
              <div style={{ fontSize: 10, color: '#92400e', marginTop: 6 }}>
                💡 API名をクリックするとクリップボードにコピーされます。選択肢の「N個」にホバーすると中身を確認できます。
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
