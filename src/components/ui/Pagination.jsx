// ページネーションバー
const PAGE_SIZE_OPTIONS = [10, 20, 30, 50, 100];

export function Pagination({ page, totalPages, total, pageSize, onPageChange, onPageSizeChange }) {
  const start = (page - 1) * pageSize + 1;
  const end   = Math.min(page * pageSize, total);

  const btn = (label, disabled, onClick) => (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        fontSize: 13, fontWeight: 700, padding: '6px 14px',
        border: '1px solid #d8ede1', borderRadius: 6, cursor: disabled ? 'default' : 'pointer',
        background: disabled ? '#f8fbf9' : '#fff', color: disabled ? '#c0dece' : '#059669',
        fontFamily: 'inherit',
      }}
    >
      {label}
    </button>
  );

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '8px 0', flexShrink: 0, flexWrap: 'wrap' }}>
      {btn('← 前へ', page === 1, () => onPageChange(page - 1))}
      <span style={{ fontSize: 13, color: '#6a9a7a' }}>
        {totalPages > 1 && (
          <>
            <span style={{ fontWeight: 700, color: '#174f35' }}>{page}</span>
            {' / '}{totalPages} ページ・
          </>
        )}
        <span style={{ color: '#a0b8ac' }}>{start}–{end} 件 / 全 {total} 件</span>
      </span>
      {btn('次へ →', page === totalPages, () => onPageChange(page + 1))}
      <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#6a9a7a', marginLeft: 8 }}>
        表示件数
        <select
          value={pageSize}
          onChange={e => onPageSizeChange(Number(e.target.value))}
          style={{ fontSize: 12, padding: '3px 6px', border: '1px solid #d8ede1', borderRadius: 5, fontFamily: 'inherit', color: '#174f35', cursor: 'pointer' }}
        >
          {PAGE_SIZE_OPTIONS.map(n => <option key={n} value={n}>{n}件</option>)}
        </select>
      </label>
    </div>
  );
}
