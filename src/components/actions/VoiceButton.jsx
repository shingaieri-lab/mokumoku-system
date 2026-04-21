// 音声入力ボタン（別モジュール統合予定）
import { MicIcon } from '../ui/Icons.jsx';
export function VoiceButton({ onResult, style }) {
  return (
    <button style={{ ...style, opacity: 0.5, display:"flex", alignItems:"center", justifyContent:"center" }} title="音声入力（別モジュール）">
      <MicIcon size={14} color="currentColor" />
    </button>
  );
}
