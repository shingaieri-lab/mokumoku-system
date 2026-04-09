import React, { useState, useEffect } from 'react';
import { getSalesMembers } from '../lib/master.js';
import { loadGCalConfig } from '../lib/gcal.js';
import { WizardOverlay, WizardStatusBadge, WIZARD_CARD, WIZARD_BTN_S } from './WizardParts.jsx';
import { GeminiWizard } from './GeminiWizard.jsx';
import { GmailWizard } from './GmailWizard.jsx';
import { CalendarWizard } from './CalendarWizard.jsx';

export function useIsMobile(bp=768) {
  const [m, setM] = useState(typeof window !== 'undefined' && window.innerWidth < bp);
  useEffect(() => {
    const h = () => setM(window.innerWidth < bp);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, [bp]);
  return m;
}

export function SetupWizard({ currentUser, onUpdateProfile, onSave, aiConfig, onClose }) {
  const [section, setSection] = useState("overview");
  const members = getSalesMembers();

  const gcal0 = loadGCalConfig();
  const geminiOk   = !!(currentUser?.geminiConfigured);
  const gmailOk    = !!(currentUser?.gmailClientId || window.__appData?.aiConfig?.gmailClientId);
  const calendarOk = !!(gcal0.apiKey && Object.keys(gcal0.calendarIds || {}).length > 0);

  const go = (sec) => setSection(sec);
  const dismiss = section === "overview" ? onClose : () => go("overview");

  if (section === "gemini") return <GeminiWizard go={go} dismiss={dismiss} onUpdateProfile={onUpdateProfile} currentUser={currentUser} />;
  if (section === "gmail")   return <GmailWizard  go={go} dismiss={dismiss} onUpdateProfile={onUpdateProfile} currentUser={currentUser} aiConfig={aiConfig} onSave={onSave} />;
  if (section === "calendar") return <CalendarWizard go={go} dismiss={dismiss} members={members} />;

  return (
    <WizardOverlay onDismiss={dismiss}>
      <div style={WIZARD_CARD}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
          <div style={{ fontSize: 17, fontWeight: 900, color: "#174f35" }}>🚀 初期設定ウィザード</div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#9ca3af", lineHeight: 1 }}>✕</button>
        </div>
        <div style={{ fontSize: 12, color: "#6a9a7a", marginBottom: 20 }}>設定したい機能を選んでください。不要な機能はスキップできます。</div>
        {[
          { icon: "🤖", title: "AIアシスタント", desc: "商談メモの分析・要約・次アクション提案", ok: geminiOk, sec: "gemini" },
          { icon: "📧", title: "Gmail連携", desc: "メール下書き自動作成・GoogleタスクTODO登録", ok: gmailOk, sec: "gmail" },
          { icon: "📅", title: "Googleカレンダー", desc: "空き時間の自動検索・商談予定の登録", ok: calendarOk, sec: "calendar" },
        ].map(item => (
          <div key={item.sec} onClick={() => go(item.sec)}
            style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", border: "1px solid #e2f0e8", borderRadius: 10, marginBottom: 8, cursor: "pointer", background: "#f8fbf9", transition: "background 0.15s" }}
            onMouseEnter={e => e.currentTarget.style.background = "#eef8f2"} onMouseLeave={e => e.currentTarget.style.background = "#f8fbf9"}>
            <div style={{ fontSize: 24, flexShrink: 0 }}>{item.icon}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#174f35" }}>{item.title}</div>
              <div style={{ fontSize: 11, color: "#6a9a7a" }}>{item.desc}</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
              <WizardStatusBadge ok={item.ok} />
              <span style={{ color: "#9ca3af", fontSize: 14 }}>›</span>
            </div>
          </div>
        ))}
        <div style={{ textAlign: "right", marginTop: 16 }}>
          <button onClick={onClose} style={WIZARD_BTN_S}>閉じる</button>
        </div>
      </div>
    </WizardOverlay>
  );
}
