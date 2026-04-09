import React, { useEffect, useRef } from 'react';

export const WIZARD_CARD  = { background: "#fff", borderRadius: 12, padding: "28px 32px", maxWidth: 520, width: "100%", boxShadow: "0 8px 32px #0002", maxHeight: "90vh", overflowY: "auto" };
export const WIZARD_BTN_P = { padding: "10px 28px", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#10b981,#059669)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" };
export const WIZARD_BTN_S = { padding: "10px 20px", borderRadius: 8, border: "1px solid #c0dece", background: "#fff", color: "#6a9a7a", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" };
export const WIZARD_INP   = { width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #c0dece", fontSize: 13, outline: "none", boxSizing: "border-box", fontFamily: "monospace", background: "#fff", color: "#174f35" };

export function WizardOverlay({ children, onDismiss }) {
  const dismissRef = useRef(onDismiss);
  useEffect(() => { dismissRef.current = onDismiss; }, [onDismiss]);
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") dismissRef.current?.(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);
  return (
    <div style={{ position: "fixed", inset: 0, background: "#0006", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={e => { if (e.target === e.currentTarget) dismissRef.current?.(); }}>
      {children}
    </div>
  );
}

export function WizardStepBar({ current, labels }) {
  const total = labels.length;
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 0, marginBottom: 24 }}>
      {labels.map((label, i) => (
        <React.Fragment key={i}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, minWidth: 0 }}>
            <div style={{ width: 26, height: 26, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: i <= current ? "#10b981" : "#e5e7eb", color: i <= current ? "#fff" : "#9ca3af", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
              {i < current ? "✓" : i + 1}
            </div>
            <div style={{ fontSize: 10, color: i === current ? "#174f35" : "#9ca3af", fontWeight: i === current ? 700 : 400, whiteSpace: "nowrap", textAlign: "center" }}>{label}</div>
          </div>
          {i < total - 1 && <div style={{ flex: 1, height: 2, background: i < current ? "#10b981" : "#e5e7eb", margin: "12px 3px 0" }} />}
        </React.Fragment>
      ))}
    </div>
  );
}

export function WizardStatusBadge({ ok }) {
  return ok
    ? <span style={{ fontSize: 11, background: "#d1fae5", color: "#059669", borderRadius: 20, padding: "2px 10px", fontWeight: 700 }}>✅ 設定済み</span>
    : <span style={{ fontSize: 11, background: "#fef3c7", color: "#d97706", borderRadius: 20, padding: "2px 10px", fontWeight: 700 }}>⚠️ 未設定</span>;
}
