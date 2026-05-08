// 相談ボードページ（手動フラグ + 自動ピックアップ）
import { useState, useMemo } from 'react';
import { IS_COLORS, getStatusColor } from '../lib/master.js';
import { TODAY } from '../lib/holidays.js';
import { detectUnreachable, detectStalled, buildConsultationPrompt, extractText, ACTION_TYPE_LABEL } from '../lib/isReport.js';
import { analyzeWithAI } from '../lib/ai.js';
import { GearIcon, ChatIcon, SparkleIcon } from '../components/ui/Icons.jsx';

const STORAGE_KEY = 'consultation_settings';

function loadSettings() {
  try {
    const s = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return {
      stalledDays:    typeof s.stalledDays    === 'number' ? s.stalledDays    : 14,
      minUnreachable: typeof s.minUnreachable === 'number' ? s.minUnreachable : 2,
    };
  } catch {
    return { stalledDays: 14, minUnreachable: 2 };
  }
}

function saveSettings(s) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

const SECTIONS = [
  { key: 'flagged',     label: '相談フラグあり', color: '#f59e0b', bg: '#fffbeb', border: '#f59e0b33' },
  { key: 'unreachable', label: '繋がらない',     color: '#ef4444', bg: '#fef2f2', border: '#ef444433' },
  { key: 'stalled',     label: '停滞中',         color: '#8b5cf6', bg: '#faf5ff', border: '#8b5cf633' },
];

function buildCardSummary(actions) {
  if (!actions || actions.length === 0) return '';
  const last = actions[0];
  const date = last?.date ? last.date.slice(5).replace('-', '/') : '';
  const type = ACTION_TYPE_LABEL[last?.type] || last?.type || '';
  const result = last?.result || '';
  const memo = extractText(last?.summary || '');
  return [date, type, result, memo].filter(Boolean).join('  ');
}

function extractAIText(data) {
  if (!data?.candidates?.[0]?.content) return '';
  const raw = (data.candidates[0].content.parts || []).map(i => i.text || '').join('').trim();
  // APIがJSON形式で返す場合、使えるテキストフィールドを取り出す
  try {
    const parsed = JSON.parse(raw);
    return parsed.memo_for_zoho || parsed.action_summary || raw;
  } catch {
    return raw;
  }
}

// 相談メモ編集パネル（カード内インライン）
function ConsultEditor({ lead, section, onUpdate, onClose }) {
  const [aiText, setAiText]   = useState(lead.consultation_ai_summary || '');
  const [note, setNote]       = useState(lead.consultation_note || '');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const generate = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await analyzeWithAI(buildConsultationPrompt(lead, section.key));
      const text = extractAIText(data);
      if (!text) throw new Error('AIからの応答が空でした');
      setAiText(text);
    } catch {
      setError('AI生成に失敗しました。しばらく待って再試行してください。');
    } finally {
      setLoading(false);
    }
  };

  const save = () => {
    onUpdate({ consultation_ai_summary: aiText, consultation_note: note });
    onClose();
  };

  return (
    <div
      onClick={e => e.stopPropagation()}
      style={{ borderTop: '1px solid #e2f0e8', marginTop: 4, paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}
    >
      {/* AI生成 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <button
          onClick={generate}
          disabled={loading}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            fontSize: 12, fontWeight: 700, color: '#fff',
            background: loading ? '#a7bfb5' : 'linear-gradient(135deg,#059669,#047857)',
            border: 'none', borderRadius: 6, padding: '9px 14px',
            cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
          }}
        >
          <SparkleIcon size={12} color="#fff" />
          {loading ? '生成中…' : 'AI相談ドラフト生成'}
        </button>
        <span style={{ fontSize: 11, color: '#9ca3af' }}>上長への相談文を自動生成します</span>
      </div>

      {error && (
        <div style={{ fontSize: 12, color: '#ef4444', background: '#fef2f2', borderRadius: 5, padding: '4px 8px' }}>
          {error}
        </div>
      )}

      {/* AI生成テキスト */}
      <textarea
        value={aiText}
        onChange={e => setAiText(e.target.value)}
        placeholder="AI生成ボタンで自動生成、または直接入力"
        rows={3}
        style={{
          fontSize: 13, color: '#174f35', border: '1px solid #c6dfd0',
          borderRadius: 6, padding: '6px 9px', resize: 'vertical',
          fontFamily: 'inherit', lineHeight: 1.6, background: '#f8fbf9', width: '100%', boxSizing: 'border-box',
        }}
      />

      {/* 補足メモ */}
      <textarea
        value={note}
        onChange={e => setNote(e.target.value)}
        placeholder="補足メモ（スパイス）"
        rows={2}
        style={{
          fontSize: 13, color: '#174f35', border: '1px solid #c6dfd0',
          borderRadius: 6, padding: '6px 9px', resize: 'vertical',
          fontFamily: 'inherit', lineHeight: 1.6, background: '#fff', width: '100%', boxSizing: 'border-box',
        }}
      />

      {/* 保存・キャンセル */}
      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
        <button
          onClick={onClose}
          style={{ fontSize: 12, color: '#6a9a7a', background: 'transparent', border: '1px solid #d8ede1', borderRadius: 5, padding: '9px 16px', cursor: 'pointer', fontFamily: 'inherit' }}
        >
          キャンセル
        </button>
        <button
          onClick={save}
          style={{ fontSize: 12, fontWeight: 700, color: '#fff', background: '#059669', border: 'none', borderRadius: 5, padding: '9px 16px', cursor: 'pointer', fontFamily: 'inherit' }}
        >
          保存
        </button>
      </div>
    </div>
  );
}

function LeadCard({ lead, section, onOpenLead, onUpdate, onCompleted }) {
  const [showEditor, setShowEditor] = useState(false);
  const c  = IS_COLORS[lead.is_member] || { bg: '#3d7a5e' };

  const handleComplete = e => {
    e.stopPropagation();
    const patch = {
      consultation_completed: true,
      consultation_completed_actions: (lead.actions || []).length,
      consultation_ai_summary: '',
      consultation_note: '',
    };
    if (section.key === 'flagged') patch.consultation_flag = false;
    onUpdate(patch);
    onCompleted?.();
  };
  const sc = getStatusColor(lead.status);
  const summary   = buildCardSummary(lead.actions);
  const callCount = (lead.actions || []).filter(a => a.type === 'call').length;
  const overdue  = lead.next_action_date && lead.next_action_date < TODAY;
  const isToday  = lead.next_action_date === TODAY;
  const nextColor = overdue ? '#ef4444' : isToday ? '#059669' : '#6a9a7a';
  const hasMemo   = lead.consultation_ai_summary || lead.consultation_note;

  return (
    <div
      onClick={() => { if (!showEditor) onOpenLead(lead.id); }}
      style={{
        background: '#fff',
        border: `1px solid ${section.border}`,
        borderLeft: `3px solid ${section.color}`,
        borderRadius: 8,
        padding: '12px 14px',
        cursor: showEditor ? 'default' : 'pointer',
        display: 'flex', flexDirection: 'column', gap: 8,
        boxShadow: '0 1px 4px #0001',
      }}
    >
      {/* 会社名 */}
      <div style={{ fontSize: 15, fontWeight: 800, color: '#174f35', lineHeight: 1.3, wordBreak: 'break-all' }}>
        {lead.company || '（会社名未設定）'}
      </div>

      {/* 担当者 + ステータス + 架電数 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        {lead.is_member && (
          <span style={{ fontSize: 12, fontWeight: 700, color: c.bg, background: c.bg + '15', border: `1px solid ${c.bg}44`, borderRadius: 5, padding: '1px 8px', whiteSpace: 'nowrap' }}>
            {lead.is_member}
          </span>
        )}
        {lead.status && (
          <span style={{ fontSize: 12, fontWeight: 700, color: sc, background: sc + '15', border: `1px solid ${sc}44`, borderRadius: 5, padding: '1px 8px', whiteSpace: 'nowrap' }}>
            {lead.status}
          </span>
        )}
        {callCount > 0 && (
          <span style={{ fontSize: 12, color: '#8b5cf6', background: '#8b5cf611', border: '1px solid #8b5cf633', borderRadius: 4, padding: '1px 7px' }}>
            架電{callCount}回
          </span>
        )}
      </div>

      {/* 現状（3行） */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#6a9a7a', flexShrink: 0, marginTop: 2 }}>現状</span>
        <span style={{
          fontSize: 13, color: '#4a8060', lineHeight: 1.6, flex: 1,
          display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {summary || '（アクション履歴なし）'}
        </span>
      </div>

      {/* 保存済み相談メモ */}
      {hasMemo && !showEditor && (
        <div style={{ background: '#f0fdf4', border: '1px solid #a7f3d033', borderRadius: 6, padding: '7px 10px', display: 'flex', flexDirection: 'column', gap: 5 }}>
          {lead.consultation_ai_summary && (
            <div style={{ fontSize: 12, color: '#047857', lineHeight: 1.5 }}>
              {lead.consultation_ai_summary}
            </div>
          )}
          {lead.consultation_note && (
            <div style={{ fontSize: 12, color: '#92400e' }}>
              {lead.consultation_note}
            </div>
          )}
        </div>
      )}

      {/* 次アクション + ボタン行 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#059669' }}>NEXT</span>
          {lead.next_action_date ? (
            <>
              {overdue && <span style={{ fontSize: 11, fontWeight: 700, color: '#ef4444', background: '#fef2f2', border: '1px solid #ef444433', borderRadius: 3, padding: '0 5px' }}>期限切れ</span>}
              {isToday && <span style={{ fontSize: 11, fontWeight: 700, color: '#059669', background: '#f0fdf4', border: '1px solid #05966933', borderRadius: 3, padding: '0 5px' }}>本日</span>}
              <span style={{ fontSize: 13, fontWeight: 600, color: nextColor }}>
                {lead.next_action_date.slice(5).replace('-', '/')}
              </span>
            </>
          ) : (
            <span style={{ fontSize: 12, color: '#c0dece' }}>未設定</span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
          <button
            onClick={e => { e.stopPropagation(); setShowEditor(v => !v); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              fontSize: 12, fontWeight: 700,
              color: showEditor ? '#fff' : '#059669',
              background: showEditor ? '#059669' : 'transparent',
              border: '1px solid #059669', borderRadius: 5, padding: '8px 12px',
              cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0,
            }}
          >
            <SparkleIcon size={11} color={showEditor ? '#fff' : '#059669'} />
            相談メモ
          </button>
          <button
            onClick={handleComplete}
            style={{
              fontSize: 12, fontWeight: 700, color: '#fff',
              background: '#6a9a7a', border: 'none',
              borderRadius: 5, padding: '8px 14px',
              cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0,
            }}
          >
            完了
          </button>
        </div>
      </div>

      {/* インラインエディタ */}
      {showEditor && (
        <ConsultEditor
          lead={lead}
          section={section}
          onUpdate={onUpdate}
          onClose={() => setShowEditor(false)}
        />
      )}
    </div>
  );
}

// 設定パネル
function SettingsPanel({ settings, onChange }) {
  const [draft, setDraft] = useState(settings);

  const apply = () => {
    const next = {
      stalledDays:    Math.max(1, Math.min(999, Number(draft.stalledDays)    || 14)),
      minUnreachable: Math.max(1, Math.min(99,  Number(draft.minUnreachable) || 2)),
    };
    saveSettings(next);
    onChange(next);
  };

  return (
    <div style={{ padding: '10px 24px', background: '#fff', borderBottom: '1px solid #e2f0e8', display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
      <span style={{ fontSize: 13, fontWeight: 700, color: '#6a9a7a' }}>自動ピックアップ条件</span>

      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#174f35' }}>
        <span style={{ color: '#8b5cf6', fontWeight: 700 }}>停滞中</span>
        最後のアクションから
        <input
          type="number" min="1" max="999" value={draft.stalledDays}
          onChange={e => setDraft(d => ({ ...d, stalledDays: e.target.value }))}
          style={{ width: 54, fontSize: 13, padding: '3px 6px', border: '1px solid #d8ede1', borderRadius: 5, textAlign: 'center', fontFamily: 'inherit', color: '#174f35' }}
        />
        日以上アクションなし
      </label>

      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#174f35' }}>
        <span style={{ color: '#ef4444', fontWeight: 700 }}>繋がらない</span>
        直近
        <input
          type="number" min="1" max="99" value={draft.minUnreachable}
          onChange={e => setDraft(d => ({ ...d, minUnreachable: e.target.value }))}
          style={{ width: 46, fontSize: 13, padding: '3px 6px', border: '1px solid #d8ede1', borderRadius: 5, textAlign: 'center', fontFamily: 'inherit', color: '#174f35' }}
        />
        回の架電がすべて不在
      </label>

      <button
        onClick={apply}
        style={{ fontSize: 13, color: '#fff', background: '#059669', border: 'none', borderRadius: 6, padding: '5px 16px', cursor: 'pointer', fontFamily: 'inherit' }}
      >
        適用
      </button>
    </div>
  );
}

export function ConsultationPage({ leads, onOpenLead, onUpdate }) {
  const [settings, setSettings] = useState(loadSettings);
  const [showSettings, setShowSettings] = useState(false);
  const [toast, setToast] = useState('');

  const showToast = msg => {
    setToast(msg);
    setTimeout(() => setToast(''), 5000);
  };

  const { flagged, unreachable, stalled } = useMemo(() => {
    const flagged = [];
    const unreachable = [];
    const stalled = [];
    const seen = new Set();

    // 完了済み：完了時より多くアクションが追加されるまでは非表示（削除は無視）
    const isCompleted = l =>
      l.consultation_completed &&
      (l.actions || []).length <= (l.consultation_completed_actions ?? -1);

    const targets = leads.filter(l => l.status !== '育成対象外' && !isCompleted(l));

    targets.forEach(lead => {
      if (lead.consultation_flag) {
        flagged.push(lead);
        seen.add(lead.id);
      }
    });

    targets.forEach(lead => {
      if (seen.has(lead.id)) return;
      if (detectUnreachable(lead, settings.minUnreachable)) {
        unreachable.push(lead);
        seen.add(lead.id);
        return;
      }
      if (detectStalled(lead, settings.stalledDays)) {
        stalled.push(lead);
      }
    });

    return { flagged, unreachable, stalled };
  }, [leads, settings]);

  const todayLabel = new Date().toLocaleDateString('ja-JP', { timeZone: 'Asia/Tokyo', month: 'long', day: 'numeric', weekday: 'short' });
  const total = flagged.length + unreachable.length + stalled.length;
  const sectionData = { flagged, unreachable, stalled };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* 完了トースト */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)',
          background: '#059669', color: '#fff', fontWeight: 700, fontSize: 13,
          padding: '10px 22px', borderRadius: 24, boxShadow: '0 4px 16px #05966944',
          zIndex: 1000, whiteSpace: 'nowrap', pointerEvents: 'none',
        }}>
          ✓ {toast}
        </div>
      )}

      {/* ヘッダー */}
      <div style={{ padding: '24px 28px 8px', borderBottom: showSettings ? 'none' : '1px solid #d8ede1', background: '#f0f5f2', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <span style={{ fontSize: 22, fontWeight: 800, color: '#174f35', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 7 }}><ChatIcon size={20} color="#174f35" /> 相談ボード</span>
            <span style={{ fontSize: 12, color: '#6a9a7a', marginLeft: 10 }}>{todayLabel}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
            <span style={{ fontSize: 12, color: '#6a9a7a' }}>ピックアップ</span>
            <span style={{ fontSize: 18, fontWeight: 900, color: '#174f35' }}>{total}</span>
            <span style={{ fontSize: 12, color: '#174f35' }}>件</span>
          </div>
          <span style={{ fontSize: 12, color: '#b0cfc0', flex: 1 }}>
            リード詳細のピンアイコンでフラグを立てると「相談フラグあり」に表示されます
          </span>
          <button
            onClick={() => setShowSettings(v => !v)}
            style={{ background: showSettings ? '#e2f0e8' : 'transparent', border: '1px solid #d8ede1', borderRadius: 7, padding: '5px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}
          >
            <GearIcon size={15} color="#6a9a7a" />
            <span style={{ fontSize: 13, color: '#6a9a7a', fontFamily: 'inherit' }}>条件設定</span>
          </button>
        </div>
      </div>

      {/* 設定パネル（開閉） */}
      {showSettings && <SettingsPanel settings={settings} onChange={setSettings} />}

      {/* ボード（3列） */}
      <div style={{ flex: 1, overflowX: 'auto', overflowY: 'hidden', padding: '16px 20px', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        {SECTIONS.map(section => {
          const items = sectionData[section.key] || [];
          const description = section.key === 'stalled'
            ? `${settings.stalledDays}日以上アクションなし`
            : section.key === 'unreachable'
            ? `直近${settings.minUnreachable}回の架電がすべて不在`
            : '手動でフラグを立てたリード';

          return (
            <div key={section.key} style={{ flex: 1, minWidth: 280, display: 'flex', flexDirection: 'column' }}>
              {/* 列ヘッダー */}
              <div style={{
                background: section.bg, border: `1px solid ${section.border}`,
                borderRadius: '8px 8px 0 0', padding: '10px 14px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <div>
                  <span style={{ fontSize: 14, fontWeight: 800, color: section.color }}>{section.label}</span>
                  <div style={{ fontSize: 12, color: section.color + 'aa', marginTop: 2 }}>{description}</div>
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, color: section.color, background: '#fff', borderRadius: 10, padding: '2px 10px', border: `1px solid ${section.border}` }}>
                  {items.length}件
                </span>
              </div>

              {/* カードリスト */}
              <div style={{
                flex: 1, overflowY: 'auto',
                background: section.bg + '88',
                border: `1px solid ${section.border}`, borderTop: 'none',
                borderRadius: '0 0 8px 8px', padding: 10,
                display: 'flex', flexDirection: 'column', gap: 8,
                maxHeight: 'calc(100vh - 200px)', minHeight: 80,
              }}>
                {items.length === 0 ? (
                  <div style={{ color: section.color + '66', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>
                    該当なし
                  </div>
                ) : (
                  items.map(lead => (
                    <LeadCard
                      key={lead.id}
                      lead={lead}
                      section={section}
                      onOpenLead={onOpenLead}
                      onUpdate={patch => onUpdate(lead.id, patch)}
                      onCompleted={() => showToast(`${lead.company || 'リード'} の相談を完了しました`)}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
