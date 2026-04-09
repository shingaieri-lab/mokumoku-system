import React from 'react';
import { PencilIcon, TrashIcon } from './icons.jsx';

export function SettingsSalesTab({ master, onSave, currentUser }) {
  const [newSales, setNewSales] = React.useState("");
  const [editSalesIdx, setEditSalesIdx] = React.useState(null);
  const [editSalesName, setEditSalesName] = React.useState("");

  const inp = { width:"100%", padding:"7px 10px", borderRadius:7, border:"1px solid #c0dece", fontSize:12, outline:"none", boxSizing:"border-box", fontFamily:"inherit", background:"#fff", color:"#174f35" };
  const addRow = { display:"flex", gap:8, marginBottom:12 };

  const addSales = () => {
    const s = newSales.trim(); if (!s) return;
    if (master.salesMembers.includes(s)) { alert("既に存在します"); return; }
    onSave({ ...master, salesMembers: [...master.salesMembers, s] });
    setNewSales("");
  };
  const removeSales = (m) => { onSave({ ...master, salesMembers: master.salesMembers.filter(x=>x!==m) }); };
  const renameSales = (idx) => {
    const newName = editSalesName.trim(); if (!newName) return;
    if (master.salesMembers.some((m,i) => m===newName && i!==idx)) { alert("既に存在します"); return; }
    onSave({ ...master, salesMembers: master.salesMembers.map((m,i) => i===idx ? newName : m) });
    setEditSalesIdx(null); setEditSalesName("");
  };

  return (
    <div>
      <div style={{fontSize:12,fontWeight:700,color:"#174f35",marginBottom:8}}>{currentUser?.role==="admin" ? "営業担当一覧" : "営業設定"}</div>
      <div style={addRow}>
        <input value={newSales} onChange={e=>setNewSales(e.target.value)} placeholder="担当者名" style={{...inp,flex:1}} onKeyDown={e=>e.key==="Enter"&&addSales()} />
        <button onClick={addSales} style={{padding:"7px 16px",borderRadius:7,border:"none",background:"linear-gradient(135deg,#10b981,#059669)",color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit",flexShrink:0}}>追加</button>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:6}}>
        {master.salesMembers.map((m, idx)=>(
          <div key={m} style={{display:"flex",alignItems:"center",gap:6,background:"#f0f5f2",border:"1px solid #d8ede1",borderRadius:8,padding:"6px 10px"}}>
            {editSalesIdx===idx ? (
              <>
                <input value={editSalesName} onChange={e=>setEditSalesName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&renameSales(idx)} style={{...inp,flex:1,padding:"4px 8px"}} autoFocus />
                <button onClick={()=>renameSales(idx)} style={{fontSize:11,padding:"3px 10px",borderRadius:6,border:"none",background:"#10b981",color:"#fff",cursor:"pointer",fontFamily:"inherit",flexShrink:0}}>保存</button>
                <button onClick={()=>setEditSalesIdx(null)} style={{fontSize:11,padding:"3px 8px",borderRadius:6,border:"1px solid #c0dece",background:"#fff",color:"#6a9a7a",cursor:"pointer",fontFamily:"inherit",flexShrink:0}}>✕</button>
              </>
            ) : (
              <>
                <span style={{fontSize:12,color:"#174f35",fontWeight:600,flex:1}}>{m}</span>
                <button onClick={()=>{setEditSalesIdx(idx);setEditSalesName(m)}} style={{padding:"3px 6px",borderRadius:6,background:"#f0fdf4",color:"#059669",border:"1px solid #86efac",cursor:"pointer",fontFamily:"inherit",flexShrink:0,display:"flex",alignItems:"center"}} title="編集"><PencilIcon color="#059669"/></button>
                <button onClick={()=>removeSales(m)} style={{padding:"3px 6px",borderRadius:5,background:"#fef2f2",color:"#dc2626",border:"1px solid #fca5a5",cursor:"pointer",fontFamily:"inherit",flexShrink:0,display:"flex",alignItems:"center"}} title="削除"><TrashIcon color="#dc2626"/></button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
