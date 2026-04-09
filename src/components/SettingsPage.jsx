import React from 'react';
import { PALETTE } from '../lib/constants.js';
import { getMaster, saveMasterSettings } from '../lib/master.js';
import { AccountManager } from './AccountManager.jsx';
import { ZohoCrmSettings } from './ZohoCrmSettings.jsx';
import { SettingsPortalTab } from './SettingsPortalTab.jsx';
import { SettingsSalesTab } from './SettingsSalesTab.jsx';
import { SettingsLeadMgmtTab } from './SettingsLeadMgmtTab.jsx';
import { SettingsApiKeyTab } from './SettingsApiKeyTab.jsx';
import { SettingsMyAccountTab } from './SettingsMyAccountTab.jsx';

export function SettingsPage({ aiConfig, onSave, currentUser, onUpdateProfile, initialTab, onLeadsChange, onMasterSave, onOpenWizard }) {
  const [master, setMaster] = React.useState(() => getMaster());
  const [tab, setTab] = React.useState(initialTab || (currentUser?.role === "admin" ? "leadmgmt" : "apikey"));
  const [msg, setMsg] = React.useState("");
  const [profileForm, setProfileForm] = React.useState({ name: currentUser?.name||"", password: currentUser?.password||"", email: currentUser?.email||"", color: currentUser?.color||PALETTE[0], id: currentUser?.id||"", signature: currentUser?.signature||"", geminiKey: currentUser?.geminiKey||"", gmailClientId: currentUser?.gmailClientId||"", calendarId: currentUser?.calendarId||"" });
  const [profileMsg, setProfileMsg] = React.useState("");

  const save = (next) => { setMaster(next); saveMasterSettings(next); onMasterSave?.(); setMsg("保存しました ✓"); setTimeout(()=>setMsg(""),2000); };
  const saveProfile = () => {
    if (!profileForm.name.trim()) return;
    onUpdateProfile(profileForm);
    if (currentUser?.role === "admin" && profileForm.gmailClientId !== undefined) {
      onSave({ ...aiConfig, gmailClientId: profileForm.gmailClientId });
    }
    setProfileMsg("保存しました ✓");
    setTimeout(() => setProfileMsg(""), 2000);
  };

  const tabBtn = (key, label) => (
    <button onClick={()=>setTab(key)} style={{padding:"7px 18px",borderRadius:"8px 8px 0 0",border:"1px solid #d8ede1",borderBottom: tab===key ? "1px solid #fff" : "1px solid #d8ede1", background: tab===key ? "#fff" : "#f0f5f2", color: tab===key ? "#174f35" : "#6a9a7a", fontWeight: tab===key ? 700 : 400, fontSize:12, cursor:"pointer", fontFamily:"inherit", marginRight:4, marginBottom:-1}}>
      {label}
    </button>
  );

  return (
    <div className="settings-page" style={{padding:"24px 28px", width:"60vw", maxWidth:"100%"}}>
      <div style={{fontSize:17,fontWeight:900,color:"#174f35",marginBottom:4}}>⚙️ 設定</div>
      <div style={{fontSize:12,color:"#6a9a7a",marginBottom:20}}>{currentUser?.role === "admin" ? "リード管理・ポータルサイト・営業担当・API設定・アカウントを管理できます。" : "API設定・アカウントを管理できます。"}</div>
      {msg && <div style={{background:"#d1fae5",color:"#059669",border:"1px solid #6ee7b7",borderRadius:8,padding:"8px 16px",marginBottom:16,fontSize:12,fontWeight:700}}>{msg}</div>}
      <div className="settings-tabs" style={{display:"flex", flexWrap:"wrap", gap:0, marginBottom:0}}>
        {currentUser?.role==="admin" && tabBtn("leadmgmt","📋 リード管理")}
        {currentUser?.role==="admin" && tabBtn("portal","🏢 ポータルサイト")}
        {currentUser?.role==="admin" && tabBtn("sales","👤 営業担当")}
        {tabBtn("apikey","🔑 API設定")}
        {currentUser?.role==="admin" && tabBtn("zoho","🔗 Zoho CRM連携")}
        {currentUser?.role==="admin" && tabBtn("accounts","👥 アカウント管理（管理者）")}
        {tabBtn("myaccount","👤 アカウント管理")}
      </div>
      <div style={{background:"#fff",borderRadius:"0 8px 8px 8px",border:"1px solid #d8ede1",padding:"20px"}}>
        {tab === "portal" && currentUser?.role==="admin" && <SettingsPortalTab master={master} onSave={save} />}
        {tab === "sales" && currentUser?.role==="admin" && <SettingsSalesTab master={master} onSave={save} currentUser={currentUser} />}
        {tab === "apikey" && <SettingsApiKeyTab currentUser={currentUser} onOpenWizard={onOpenWizard} profileForm={profileForm} setProfileForm={setProfileForm} saveProfile={saveProfile} profileMsg={profileMsg} />}
        {tab === "leadmgmt" && currentUser?.role==="admin" && <SettingsLeadMgmtTab master={master} onSave={save} onLeadsChange={onLeadsChange} />}
        {tab === "zoho" && currentUser?.role==="admin" && <ZohoCrmSettings />}
        {tab === "accounts" && currentUser?.role==="admin" && <AccountManager currentUser={currentUser} onClose={null} inline={true} onUpdateProfile={onUpdateProfile} />}
        {tab === "myaccount" && <SettingsMyAccountTab profileForm={profileForm} setProfileForm={setProfileForm} saveProfile={saveProfile} profileMsg={profileMsg} />}
      </div>
    </div>
  );
}
