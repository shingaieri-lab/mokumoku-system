// 基本設定タブ（会社名・カレンダー登録タイトルテンプレート）
export function GeneralTab({ master, save }) {
  const inp = { width:"100%", padding:"7px 10px", borderRadius:7, border:"1px solid #c0dece", fontSize:12, outline:"none", boxSizing:"border-box", fontFamily:"inherit", background:"#fff", color:"#174f35" };
  const lbl = { fontSize:11, fontWeight:700, color:"#6a9a7a", display:"block", marginBottom:4 };
  const hint = { fontSize:11, color:"#3d7a5e", marginTop:4 };

  return (
    <div>
      <div style={{fontSize:13,fontWeight:700,color:"#174f35",marginBottom:16}}>基本設定</div>

      <div style={{display:"flex",flexDirection:"column",gap:20}}>
        <div>
          <label style={lbl}>会社名</label>
          <input
            value={master.companyName || ""}
            onChange={e => save({ ...master, companyName: e.target.value })}
            placeholder="例：株式会社〇〇"
            style={inp}
          />
          <div style={hint}>メールテンプレートの <code style={{background:"#f0f5f2",padding:"1px 4px",borderRadius:3}}>{"{{送信者会社名}}"}</code> に自動で入ります</div>
        </div>

        <div>
          <label style={lbl}>カレンダー登録タイトルテンプレート</label>
          <input
            value={master.calRegTitleTpl || ""}
            onChange={e => save({ ...master, calRegTitleTpl: e.target.value })}
            placeholder="例：仮WEB営1）【{{会社名}}様】"
            style={inp}
          />
          <div style={hint}><code style={{background:"#f0f5f2",padding:"1px 4px",borderRadius:3}}>{"{{会社名}}"}</code> は相手先の企業名に置き換わります</div>
        </div>
      </div>
    </div>
  );
}
