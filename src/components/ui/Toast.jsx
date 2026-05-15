import { CheckCircleIcon, AlertIcon } from './Icons.jsx';

export function Toast({ message, type = 'success' }) {
  const ok = type === 'success';
  return (
    <div style={{
      position: 'fixed',
      bottom: 28,
      right: 28,
      zIndex: 9999,
      background: ok ? '#ecfdf5' : '#fef2f2',
      border: `1px solid ${ok ? '#10b98166' : '#ef444466'}`,
      borderRadius: 10,
      padding: '12px 20px',
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      boxShadow: '0 4px 20px #0569691a',
      fontSize: 14,
      fontWeight: 700,
      color: ok ? '#059669' : '#dc2626',
      minWidth: 220,
      pointerEvents: 'none',
    }}>
      {ok
        ? <CheckCircleIcon size={16} color="#059669" />
        : <AlertIcon size={16} color="#dc2626" />}
      {message}
    </div>
  );
}
