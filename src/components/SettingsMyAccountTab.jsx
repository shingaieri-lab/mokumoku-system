import React from 'react';
import { PALETTE } from '../lib/constants.js';

export function SettingsMyAccountTab({ profileForm, setProfileForm, saveProfile, profileMsg }) {
  const inp = { width:"100%", padding:"7px 10px", borderRadius:7, border:"1px solid #c0dece", fontSize:12, outline:"none", boxSizing:"border-box", fontFamily:"inherit", background:"#fff", color:"#174f35" };

  return (
    <div>
      <div style={{fontSize:14,fontWeight:700,color:"#174f35",marginBottom:16}}>👤 アカウント管理</div>
      <div style={{maxWidth:520}}>
        <div style={{marginBottom:16}}>
          <label style={{fontSize:11,fontWeight:700,color:"#6a9a7a",display:"block",marginBottom:4}}>ID</label>
          <input type="text" value={profileForm.id||""} readOnly
            style={{width:"100%",padding:"10px 14px",borderRadius:7,border:"1px solid #c0dece",fontSize:13,color:"#3d7a5e",outline:"none",boxSizing:"border-box",fontFamily:"inherit",background:"#f0f5f2",cursor:"not-allowed"}} />
        </div>
        {[["パスワード","password","password"],["表示名","name","text"],["メールアドレス","email","email"]].map(([lbl,key,type])=>(
          <div key={key} style={{marginBottom:16}}>
            <label style={{fontSize:11,fontWeight:700,color:"#6a9a7a",display:"block",marginBottom:4}}>{lbl}</label>
            <input type={type} value={profileForm[key]||""} onChange={e=>{ const v=e.target.value; if(key==="email"){ const prefix=v.includes("@")?v.split("@")[0]:v; setProfileForm(p=>({...p,email:v,id:prefix})); } else { setProfileForm(p=>({...p,[key]:v})); } }}
              style={{width:"100%",padding:"10px 14px",borderRadius:7,border:"1px solid #c0dece",fontSize:13,color:"#174f35",outline:"none",boxSizing:"border-box",fontFamily:"inherit",background:"#fff"}} />
          </div>
        ))}
        <div style={{marginBottom:16}}>
          <label style={{fontSize:11,fontWeight:700,color:"#6a9a7a",display:"block",marginBottom:6}}>🎨 アイコン色</label>
          <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
            {PALETTE.map(c => (
              <button key={c} onClick={()=>setProfileForm(p=>({...p,color:c}))}
                style={{width:26,height:26,borderRadius:"50%",background:c, border: profileForm.color===c ? "3px solid #174f35" : "2px solid #fff", cursor:"pointer", boxShadow: profileForm.color===c ? "0 0 0 2px "+c : "0 1px 3px #0002", flexShrink:0}} />
            ))}
          </div>
        </div>
        <div style={{marginBottom:16}}>
          <label style={{fontSize:11,fontWeight:700,color:"#6a9a7a",display:"block",marginBottom:4}}>✍️ メール署名</label>
          <textarea value={profileForm.signature||""} onChange={e=>setProfileForm(p=>({...p,signature:e.target.value}))}
            placeholder={"例：\n---\n田中 太郎\n〇〇株式会社\nTEL: 03-xxxx-xxxx"}
            style={{width:"100%",padding:"10px 14px",borderRadius:7,border:"1px solid #c0dece",fontSize:13,color:"#174f35",outline:"none",boxSizing:"border-box",fontFamily:"inherit",background:"#fff",resize:"vertical",minHeight:100,lineHeight:1.5}} />
        </div>
        {profileMsg && <div style={{fontSize:12,color:"#059669",fontWeight:700,marginBottom:10}}>{profileMsg}</div>}
        <button onClick={saveProfile}
          style={{padding:"8px 28px",borderRadius:8,border:"none",background:"linear-gradient(135deg,#10b981,#059669)",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
          保存
        </button>
      </div>
    </div>
  );
}
