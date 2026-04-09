import React from 'react';
import { PencilIcon, TrashIcon } from './icons.jsx';

export function SettingsPortalTab({ master, onSave }) {
  const [newSite, setNewSite] = React.useState("");
  const [editSite, setEditSite] = React.useState(null);
  const [editSiteName, setEditSiteName] = React.useState("");
  const [selSite, setSelSite] = React.useState(master.portalSites[0] || "");
  const [newPlan, setNewPlan] = React.useState({ label:"", price:"" });

  const inp = { width:"100%", padding:"7px 10px", borderRadius:7, border:"1px solid #c0dece", fontSize:12, outline:"none", boxSizing:"border-box", fontFamily:"inherit", background:"#fff", color:"#174f35" };
  const addRow = { display:"flex", gap:8, marginBottom:12 };

  const addSite = () => {
    const s = newSite.trim(); if (!s) return;
    if (master.portalSites.includes(s)) { alert("既に存在します"); return; }
    const pt = { ...master.portalTypes, [s]: [{ label:"一括請求", price:10000 }] };
    const ps = { ...(master.portalSiteSource||{}), [s]: "" };
    onSave({ ...master, portalSites: [...master.portalSites, s], portalTypes: pt, portalSiteSource: ps });
    setNewSite("");
  };
  const removeSite = (s) => {
    if (!window.confirm(`「${s}」を削除しますか？`)) return;
    const sites = master.portalSites.filter(x=>x!==s);
    const pt = { ...master.portalTypes }; delete pt[s];
    const ps = { ...(master.portalSiteSource||{}) }; delete ps[s];
    onSave({ ...master, portalSites: sites, portalTypes: pt, portalSiteSource: ps });
  };
  const renameSite = (oldName) => {
    const newName = editSiteName.trim(); if (!newName) return;
    if (newName !== oldName && master.portalSites.includes(newName)) { alert("既に存在します"); return; }
    const sites = master.portalSites.map(s => s === oldName ? newName : s);
    const pt = {}; Object.keys(master.portalTypes).forEach(k => { pt[k === oldName ? newName : k] = master.portalTypes[k]; });
    const ps = {}; Object.keys(master.portalSiteSource||{}).forEach(k => { ps[k === oldName ? newName : k] = (master.portalSiteSource||{})[k]; });
    onSave({ ...master, portalSites: sites, portalTypes: pt, portalSiteSource: ps });
    setEditSite(null); setEditSiteName("");
  };
  const moveSite = (site, dir) => {
    const idx = master.portalSites.indexOf(site); const sites = [...master.portalSites];
    if (dir==="up" && idx>0) { [sites[idx-1],sites[idx]]=[sites[idx],sites[idx-1]]; }
    else if (dir==="down" && idx<sites.length-1) { [sites[idx+1],sites[idx]]=[sites[idx],sites[idx+1]]; }
    else return; onSave({ ...master, portalSites: sites });
  };
  const addPlan = () => {
    const l = newPlan.label.trim(), p = parseInt(newPlan.price);
    if (!l || isNaN(p)) { alert("プラン名と金額を入力してください"); return; }
    const plans = [...(master.portalTypes[selSite]||[]), { label:l, price:p }];
    onSave({ ...master, portalTypes: { ...master.portalTypes, [selSite]: plans } });
    setNewPlan({ label:"", price:"" });
  };
  const removePlan = (site, idx) => {
    const plans = (master.portalTypes[site]||[]).filter((_,i)=>i!==idx);
    onSave({ ...master, portalTypes: { ...master.portalTypes, [site]: plans } });
  };
  const updatePlanPrice = (site, idx, price) => {
    const plans = (master.portalTypes[site]||[]).map((p,i)=>i===idx?{...p,price:parseInt(price)||0}:p);
    onSave({ ...master, portalTypes: { ...master.portalTypes, [site]: plans } });
  };
  const updatePlanLabel = (site, idx, label) => {
    if (!label.trim()) return;
    const plans = (master.portalTypes[site]||[]).map((p,i)=>i===idx?{...p,label:label.trim()}:p);
    onSave({ ...master, portalTypes: { ...master.portalTypes, [site]: plans } });
  };

  return (
    <div>
      <div style={{fontSize:12,fontWeight:700,color:"#174f35",marginBottom:8}}>ポータルサイト一覧</div>
      <div style={addRow}>
        <input value={newSite} onChange={e=>setNewSite(e.target.value)} placeholder="新しいポータルサイト名" style={{...inp, flex:1}} onKeyDown={e=>e.key==="Enter"&&addSite()} />
        <button onClick={addSite} style={{padding:"7px 16px",borderRadius:7,border:"none",background:"linear-gradient(135deg,#10b981,#059669)",color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit",flexShrink:0}}>追加</button>
      </div>
      {master.portalSites.map((site, siteIdx) => (
        <div key={site} style={{background:"#f8fbf9",borderRadius:10,border:"1px solid #e2f0e8",marginBottom:12,overflow:"hidden"}}>
          <div style={{display:"flex",alignItems:"center",gap:6,padding:"10px 14px",background:"#f0f5f2",borderBottom:"1px solid #e2f0e8"}}>
            <div style={{display:"flex",flexDirection:"column",gap:1,flexShrink:0}}>
              <button onClick={()=>moveSite(site,"up")} disabled={siteIdx===0} style={{fontSize:9,padding:"1px 5px",borderRadius:3,border:"1px solid #c0dece",background:siteIdx===0?"#f5f5f5":"#fff",color:siteIdx===0?"#ccc":"#6a9a7a",cursor:siteIdx===0?"default":"pointer",lineHeight:1.2,fontFamily:"inherit"}}>▲</button>
              <button onClick={()=>moveSite(site,"down")} disabled={siteIdx===master.portalSites.length-1} style={{fontSize:9,padding:"1px 5px",borderRadius:3,border:"1px solid #c0dece",background:siteIdx===master.portalSites.length-1?"#f5f5f5":"#fff",color:siteIdx===master.portalSites.length-1?"#ccc":"#6a9a7a",cursor:siteIdx===master.portalSites.length-1?"default":"pointer",lineHeight:1.2,fontFamily:"inherit"}}>▼</button>
            </div>
            {editSite===site ? (
              <div style={{display:"flex",alignItems:"center",gap:6,flex:1}}>
                <input value={editSiteName} onChange={e=>setEditSiteName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&renameSite(site)} style={{...inp,flex:1,padding:"4px 8px"}} autoFocus />
                <button onClick={()=>renameSite(site)} style={{fontSize:11,padding:"3px 10px",borderRadius:6,border:"none",background:"#10b981",color:"#fff",cursor:"pointer",fontFamily:"inherit",flexShrink:0}}>保存</button>
                <button onClick={()=>setEditSite(null)} style={{fontSize:11,padding:"3px 8px",borderRadius:6,border:"1px solid #c0dece",background:"#fff",color:"#6a9a7a",cursor:"pointer",fontFamily:"inherit",flexShrink:0}}>✕</button>
              </div>
            ) : (
              <>
                <span style={{fontWeight:700,color:"#174f35",fontSize:13,flex:1}}>🏢 {site}</span>
                <button onClick={()=>{setEditSite(site);setEditSiteName(site)}} style={{padding:"3px 6px",borderRadius:6,background:"#f0fdf4",color:"#059669",border:"1px solid #86efac",cursor:"pointer",fontFamily:"inherit",flexShrink:0,display:"flex",alignItems:"center"}} title="編集"><PencilIcon color="#059669"/></button>
                <button onClick={()=>removeSite(site)} style={{padding:"3px 6px",borderRadius:6,background:"#fef2f2",color:"#dc2626",border:"1px solid #fca5a5",cursor:"pointer",fontFamily:"inherit",flexShrink:0,display:"flex",alignItems:"center"}} title="削除"><TrashIcon color="#dc2626"/></button>
              </>
            )}
          </div>
          <div style={{padding:"12px 14px"}}>
            <div style={{fontSize:11,color:"#6a9a7a",marginBottom:6,fontWeight:600}}>流入元設定</div>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
              <select
                value={(master.portalSiteSource||{})[site]||""}
                onChange={e=>{
                  const ps = { ...(master.portalSiteSource||{}), [site]: e.target.value };
                  onSave({ ...master, portalSiteSource: ps });
                }}
                style={{flex:1,padding:"5px 8px",borderRadius:7,border:"1px solid #c0dece",fontSize:12,outline:"none",boxSizing:"border-box",fontFamily:"inherit",background:"#fff",color:"#174f35"}}>
                <option value="">（未設定）</option>
                {(master.sources||[]).map(srcObj=>{
                  const lbl = typeof srcObj==="string"?srcObj:srcObj.label;
                  return <option key={lbl} value={lbl}>{lbl}</option>;
                })}
              </select>
              <span style={{fontSize:11,color:"#6a9a7a",flexShrink:0}}>に連結</span>
            </div>
            <div style={{fontSize:11,color:"#6a9a7a",marginBottom:8,fontWeight:600}}>プラン・金額</div>
            {(master.portalTypes[site]||[]).map((plan,idx)=>(
              <div key={idx} style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                <input value={plan.label} onChange={e=>updatePlanLabel(site,idx,e.target.value)} style={{...inp,flex:1,padding:"4px 8px"}} />
                <span style={{fontSize:11,color:"#6a9a7a"}}>¥</span>
                <input type="number" value={plan.price} onChange={e=>updatePlanPrice(site,idx,e.target.value)} style={{...inp,width:100,padding:"4px 8px"}} />
                <button onClick={()=>removePlan(site,idx)} style={{padding:"3px 6px",borderRadius:5,background:"#fef2f2",color:"#dc2626",border:"1px solid #fca5a5",cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center"}} title="削除"><TrashIcon color="#dc2626"/></button>
              </div>
            ))}
            <div style={{display:"flex",gap:6,marginTop:8}} onClick={()=>setSelSite(site)}>
              <input value={selSite===site?newPlan.label:""} onFocus={()=>setSelSite(site)} onChange={e=>setNewPlan(p=>({...p,label:e.target.value}))} placeholder="プラン名" style={{...inp,flex:1,padding:"5px 8px"}} />
              <input type="number" value={selSite===site?newPlan.price:""} onFocus={()=>setSelSite(site)} onChange={e=>setNewPlan(p=>({...p,price:e.target.value}))} placeholder="金額" style={{...inp,width:90,padding:"5px 8px"}} />
              <button onClick={addPlan} style={{padding:"5px 12px",borderRadius:6,border:"none",background:"#10b981",color:"#fff",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit",flexShrink:0}}>追加</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
