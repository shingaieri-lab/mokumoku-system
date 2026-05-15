// デモモード用アプリ（サーバー不要・localStorageのみ）
import { useState, useEffect } from 'react';
import { useIsMobile } from './hooks/useIsMobile.js';
import { Nav } from './components/nav/Nav.jsx';
import { Splash } from './components/ui/Layout.jsx';
import { DashboardPage } from './pages/DashboardPage.jsx';
import { LeadsPage } from './pages/LeadsPage.jsx';
import { CSS } from './styles/css.js';
import { USER_COLORS } from './lib/accounts.js';
import { IS_COLORS } from './lib/master.js';
import { DEMO_DATA, DEMO_ACCOUNTS } from './lib/demoData.js';

const DEMO_LS_KEY = 'demo_leads';
const DEMO_USER = DEMO_ACCOUNTS[0]; // 田中 みなみ（admin）

const rootStyle = { display:"flex", height:"100vh", background:"#f0f5f2", fontFamily:"'Noto Sans JP','Hiragino Sans',sans-serif", color:"#1f5c40", overflow:"hidden" };
const mainStyle = { flex:1, overflow:"auto", background:"#f0f5f2", minHeight:0 };

function DemoBanner({ onReset }) {
  const [confirmed, setConfirmed] = useState(false);

  const handleReset = () => {
    if (!confirmed) { setConfirmed(true); return; }
    onReset();
    setConfirmed(false);
  };

  return (
    <div style={{background:"#f59e0b",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",gap:16,padding:"5px 16px",fontSize:12,fontWeight:700,flexShrink:0,flexWrap:"wrap"}}>
      <span>DEMO — データはブラウザ内のみに保存され、本番環境には影響しません</span>
      <button onClick={handleReset}
        style={{background:confirmed?"#dc2626":"#fff3",color:"#fff",border:"1px solid #fff9",borderRadius:5,padding:"3px 10px",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
        {confirmed ? "本当にリセット？（もう一度押す）" : "データをリセット"}
      </button>
    </div>
  );
}

function DemoPlaceholder({ label }) {
  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100%",gap:12,color:"#9ca3af",padding:40}}>
      <div style={{fontSize:40,lineHeight:1}}>--</div>
      <div style={{fontSize:16,fontWeight:700,color:"#6b7280"}}>{label}</div>
      <div style={{fontSize:13,color:"#9ca3af",textAlign:"center",maxWidth:280}}>
        デモ版では利用できません。<br />実際の環境では本機能を使用できます。
      </div>
    </div>
  );
}

export function DemoApp() {
  const isMobile = useIsMobile();
  const [page, setPage] = useState('dashboard');
  const [leads, setLeads] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [masterVer, setMasterVer] = useState(0);
  const [dashFilter, setDashFilter] = useState(null);
  const [aiOpenLeadId, setAiOpenLeadId] = useState(null);

  const navigate = (p) => setPage(p);

  const initAppData = () => {
    window.__appData = {
      accounts: DEMO_DATA.accounts,
      leads: [],
      masterSettings: DEMO_DATA.masterSettings,
      aiConfig: {},
      gcalConfig: {},
      emailTpls: null,
      zohoConfig: null,
      zohoAuthenticated: false,
    };
    DEMO_DATA.accounts.forEach(a => {
      USER_COLORS[a.name] = a.color;
      IS_COLORS[a.name] = { bg: a.color, text: a.color, border: a.color + "55" };
    });
  };

  useEffect(() => {
    initAppData();
    const saved = localStorage.getItem(DEMO_LS_KEY);
    const parsed = saved ? JSON.parse(saved) : DEMO_DATA.leads;
    setLeads(parsed);
    setMasterVer(v => v + 1);
    setLoaded(true);
  }, []);

  const saveLeadsLocal = (next) => {
    localStorage.setItem(DEMO_LS_KEY, JSON.stringify(next));
    setLeads(next);
  };

  const resetDemo = () => {
    localStorage.removeItem(DEMO_LS_KEY);
    setLeads(DEMO_DATA.leads);
  };

  const addLead    = (l)       => saveLeadsLocal([l, ...leads]);
  const updateLead = (id, p)   => saveLeadsLocal(leads.map(l => l.id === id ? { ...l, ...p } : l));
  const deleteLead = (id)      => saveLeadsLocal(leads.filter(l => l.id !== id));
  const addAction  = (id, act) => saveLeadsLocal(leads.map(l => l.id === id
    ? { ...l, actions: [{ ...act, recorded_by: DEMO_USER.name }, ...(l.actions || [])] } : l));

  if (!loaded) return <Splash />;

  return (
    <div style={{...rootStyle, flexDirection: isMobile ? "column" : "row"}}>
      <style>{CSS}</style>
      <Nav
        page={page} setPage={navigate} setSettingsTab={() => {}}
        count={leads.length} currentUser={DEMO_USER}
        onLogout={() => {}} onUpdateProfile={() => {}}
        isMobile={isMobile}
      />
      <div style={{flex:1, display:"flex", flexDirection:"column", overflow:"hidden"}}>
        {!isMobile && <DemoBanner onReset={resetDemo} />}
        <main style={{...mainStyle, paddingBottom: isMobile ? 65 : 0}}>
          {isMobile && <DemoBanner onReset={resetDemo} />}
          {page === "dashboard" && (
            <DashboardPage
              leads={leads} currentUser={DEMO_USER}
              onNavigate={(f) => { setDashFilter(f); navigate("leads"); }}
              masterVer={masterVer} isMobile={isMobile}
            />
          )}
          {page === "leads" && (
            <LeadsPage
              leads={leads}
              initialFilter={dashFilter} onFilterConsumed={() => setDashFilter(null)}
              initialOpenId={aiOpenLeadId} onOpenIdConsumed={() => setAiOpenLeadId(null)}
              onAdd={addLead} onUpdate={updateLead} onDelete={deleteLead} onAddAction={addAction}
              currentUser={DEMO_USER} isMobile={isMobile} readOnly={false}
              onBulkAdd={newLeads => saveLeadsLocal([...newLeads, ...leads])}
              onGoToZohoSettings={() => navigate("settings")}
            />
          )}
          {page === "ai"           && <DemoPlaceholder label="AI解析" />}
          {page === "calendar"     && <DemoPlaceholder label="候補日検索" />}
          {page === "email"        && <DemoPlaceholder label="メール作成" />}
          {page === "settings"     && <DemoPlaceholder label="設定" />}
          {page === "trend"        && <DemoPlaceholder label="トレンド" />}
          {page === "consultation" && <DemoPlaceholder label="相談ボード" />}
        </main>
      </div>
    </div>
  );
}
