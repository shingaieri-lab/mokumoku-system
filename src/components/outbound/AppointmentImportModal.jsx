// 過去アポデータの取込モーダル（.xlsx / .csv 対応）
// 動作：ファイル選択 → プレビュー → 確定 → 「過去アポ取込_YYYY-MM-DD」新リスト自動生成 → リード一括保存

import { useState } from 'react';
import { parseAppointmentExcel, parseAppointmentCSV } from '../../lib/outboundApi.js';

// JST基準の今日日付（'YYYY-MM-DD'）
function todayJST() {
  return new Date().toLocaleDateString('sv', { timeZone: 'Asia/Tokyo' });
}

function downloadTemplate() {
  const headers = ['会社名', '役職', '担当者名', '商談担当', 'ランク', '商談ステータス',
    'アポ獲得日', '商談開始日', '商談開始時刻', '前確認', '案内メール送信済み',
    'アポ種別', 'アポ単価', 'リスト名'];
  const example = ['株式会社サンプル', '部長', '田中太郎', '山田', 'A', '商談確定',
    '2026-05-20', '2026-06-10', '14:00', '済', '',
    '決裁者アポ', '35,000円', '（取込時は無視されます）'];
  const note = '# アポ単価は「アポ種別」から自動算出されます / リスト名列は無視されます（取込先は新規リスト「過去アポ取込_日付」に集約）';
  const csv = '﻿' + note + '\r\n' + [headers.join(','), example.join(',')].join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = '過去アポ取込テンプレート.csv';
  a.click();
  URL.revokeObjectURL(url);
}

export function AppointmentImportModal({ onClose, onImport }) {
  const [preview,   setPreview]   = useState(null);   // 解析後のリード配列
  const [errors,    setErrors]    = useState([]);     // 行レベルの警告（スキップ理由）
  const [fileName,  setFileName]  = useState('');
  const [dragging,  setDragging]  = useState(false);
  const [importing, setImporting] = useState(false);  // 取込中フラグ（多重クリック防止）
  const [result,    setResult]    = useState(null);   // { count, listName } 完了表示
  const [fatal,     setFatal]     = useState('');     // 致命的エラー（ファイル読込失敗・パース失敗）

  // ファイル受け取り（.xlsx / .csv で処理を分岐）
  const handleFile = async (file) => {
    if (!file) return;
    setFileName(file.name);
    setFatal('');
    try {
      const isExcel = /\.xlsx?$/i.test(file.name);
      if (isExcel) {
        const buf = await file.arrayBuffer();
        const { leads, errors } = await parseAppointmentExcel(buf);
        setPreview(leads);
        setErrors(errors);
      } else {
        // CSVの場合は文字コード自動判定（CSVImport.jsxと同じ方式）
        const buf = await file.arrayBuffer();
        const bytes = new Uint8Array(buf);
        const isUTF8BOM = bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF;
        let sjisScore = 0;
        for (let i = 0; i < Math.min(bytes.length - 1, 499); i++) {
          const b = bytes[i];
          const isLeadByte = (b >= 0x81 && b <= 0x9F) || (b >= 0xE0 && b <= 0xFC);
          if (isLeadByte) {
            const next = bytes[i + 1];
            const isTrailByte = (next >= 0x40 && next <= 0x7E) || (next >= 0x80 && next <= 0xFC);
            if (isTrailByte) { sjisScore++; i++; }
          }
        }
        const enc = isUTF8BOM ? 'utf-8' : sjisScore > 3 ? 'shift-jis' : 'utf-8';
        const text = new TextDecoder(enc).decode(buf);
        const { leads, errors } = parseAppointmentCSV(text);
        setPreview(leads);
        setErrors(errors);
      }
    } catch (e) {
      setFatal('ファイルの読み込みに失敗しました：' + (e.message || String(e)));
    }
  };

  // 取込確定（呼び出し元の onImport に解析済みリードを渡す）
  const handleConfirm = async () => {
    if (!preview || preview.length === 0) return;
    setImporting(true);
    setFatal('');
    try {
      const listName = `過去アポ取込_${todayJST()}`;
      await onImport(preview, listName);
      setResult({ count: preview.length, listName });
    } catch (e) {
      setFatal('取込に失敗しました：' + (e.message || String(e)));
    } finally {
      setImporting(false);
    }
  };

  // モーダル背景
  const overlay = {
    position: 'fixed', inset: 0, background: 'rgba(15, 42, 31, 0.4)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000, padding: 20,
  };
  // モーダル本体
  const panel = {
    background: '#fff', borderRadius: 12, padding: 24,
    maxWidth: 720, width: '100%', maxHeight: '90vh', overflow: 'auto',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.25)', fontFamily: 'inherit',
  };

  return (
    <div style={overlay} onClick={onClose}>
      <div style={panel} onClick={e => e.stopPropagation()}>

        {/* ヘッダー */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: '#174f35' }}>📤 過去アポデータの取込</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 18, color: '#9ca3af', cursor: 'pointer', minWidth: 44, minHeight: 44 }}>✕</button>
        </div>

        {/* 致命的エラー */}
        {fatal && (
          <div style={{ background: '#fef2f2', border: '1px solid #ef444433', borderRadius: 8, padding: '10px 12px', marginBottom: 12, fontSize: 13, color: '#ef4444' }}>
            {fatal}
          </div>
        )}

        {/* 完了画面 */}
        {result && (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>✨</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#10b981', marginBottom: 6 }}>
              {result.count}件のアポを取込みました
            </div>
            <div style={{ fontSize: 13, color: '#6a9a7a', marginBottom: 16 }}>
              新規リスト「{result.listName}」に保存されました
            </div>
            <button onClick={onClose} style={{ background: '#10b981', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', minHeight: 44 }}>
              閉じる
            </button>
          </div>
        )}

        {/* 説明 + テンプレDL */}
        {!preview && !result && (
          <>
            <div style={{ background: '#f0f5f2', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 12, color: '#3d7a5e', lineHeight: 1.7 }}>
              ・対応形式：<strong>.xlsx</strong> または <strong>.csv</strong><br/>
              ・列フォーマットは「⬇ CSV書き出し」と同じ14列<br/>
              ・取込先は <strong>「過去アポ取込_{todayJST()}」</strong> という新リストを自動生成して全件まとめます（既存リストとは混ざりません）
            </div>
            <div style={{ marginBottom: 12 }}>
              <button onClick={downloadTemplate} style={{ background: '#ecfdf5', color: '#059669', border: '1px solid #10b98155', borderRadius: 7, padding: '7px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                ⬇ テンプレートCSVをダウンロード
              </button>
            </div>

            {/* ドロップゾーン */}
            <div
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={e => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); }}
              onClick={() => document.getElementById('apo-import-input').click()}
              style={{
                border: `2px dashed ${dragging ? '#10b981' : '#c0dece'}`,
                borderRadius: 10, padding: '36px 20px', textAlign: 'center',
                background: dragging ? '#d1fae522' : 'transparent',
                cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              <div style={{ fontSize: 32, marginBottom: 8 }}>📁</div>
              <div style={{ fontSize: 14, color: '#2d6b4a', fontWeight: 600 }}>ファイルをドロップ</div>
              <div style={{ fontSize: 12, color: '#6a9a7a', marginTop: 4 }}>または クリックして選択（.xlsx / .csv）</div>
              <input
                id="apo-import-input"
                type="file"
                accept=".xlsx,.xls,.csv"
                style={{ display: 'none' }}
                onChange={e => handleFile(e.target.files[0])}
              />
            </div>
          </>
        )}

        {/* 警告（行レベル） */}
        {errors.length > 0 && !result && (
          <div style={{ marginTop: 12, background: '#fef9ec', border: '1px solid #f59e0b55', borderRadius: 7, padding: '10px 12px' }}>
            <div style={{ fontSize: 12, color: '#d97706', fontWeight: 700, marginBottom: 6 }}>
              ⚠ {errors.length}件の警告（スキップされた行）
            </div>
            <div style={{ maxHeight: 80, overflow: 'auto' }}>
              {errors.map((e, i) => <div key={i} style={{ fontSize: 11, color: '#92400e' }}>{e}</div>)}
            </div>
          </div>
        )}

        {/* プレビュー */}
        {preview && !result && (
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 13, color: '#2d6b4a', marginBottom: 8 }}>
              <strong>{fileName}</strong> から <strong style={{ color: '#10b981' }}>{preview.length}件</strong> のアポを検出しました。
            </div>
            <div style={{ maxHeight: 220, overflow: 'auto', border: '1px solid #e2f0e8', borderRadius: 8, marginBottom: 14 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                <thead>
                  <tr style={{ background: '#fff', position: 'sticky', top: 0, borderBottom: '2px solid #c0dece' }}>
                    {['会社名', '担当者', '商談担当', 'ランク', '獲得日', '商談開始日', 'アポ種別'].map(h => (
                      <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#3d7a5e', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.slice(0, 50).map((l, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #e2f0e8' }}>
                      <td style={{ padding: '7px 10px', color: '#174f35', fontWeight: 600 }}>{l.company}</td>
                      <td style={{ padding: '7px 10px', color: '#3d7a5e' }}>{[l.position, l.contact].filter(Boolean).join(' / ') || '—'}</td>
                      <td style={{ padding: '7px 10px', color: '#3d7a5e' }}>{l.appointmentInfo.salesPerson || '—'}</td>
                      <td style={{ padding: '7px 10px', color: '#3d7a5e' }}>{l.appointmentInfo.rank || '—'}</td>
                      <td style={{ padding: '7px 10px', color: '#3d7a5e' }}>{l.appointmentInfo.confirmedDate || '—'}</td>
                      <td style={{ padding: '7px 10px', color: '#3d7a5e' }}>
                        {l.appointmentInfo.meetingDate || '—'}
                        {l.appointmentInfo.meetingTime ? ' ' + l.appointmentInfo.meetingTime : ''}
                      </td>
                      <td style={{ padding: '7px 10px', color: '#3d7a5e' }}>{l.appointmentInfo.appointType || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {preview.length > 50 && (
                <div style={{ padding: '8px 10px', fontSize: 11, color: '#9ca3af', background: '#fafafa', textAlign: 'center' }}>
                  ※ プレビューは先頭50件のみ表示（取込は全{preview.length}件）
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={() => { setPreview(null); setErrors([]); setFileName(''); }}
                disabled={importing}
                style={{ background: '#f3f4f6', color: '#6b7280', border: '1px solid #d1d5db', borderRadius: 8, padding: '9px 16px', fontSize: 13, fontWeight: 600, cursor: importing ? 'not-allowed' : 'pointer', fontFamily: 'inherit', minHeight: 44 }}
              >
                やり直す
              </button>
              <button
                onClick={handleConfirm}
                disabled={importing || preview.length === 0}
                style={{ background: '#10b981', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 20px', fontSize: 13, fontWeight: 700, cursor: importing ? 'not-allowed' : 'pointer', fontFamily: 'inherit', minHeight: 44, opacity: importing ? 0.6 : 1 }}
              >
                {importing ? '取込中...' : `✓ ${preview.length}件を取り込む`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
