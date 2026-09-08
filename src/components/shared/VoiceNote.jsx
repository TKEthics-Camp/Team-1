import { useI18n } from "../../i18n/I18nContext";
import { fmtClock } from "../../lib/useRecorder";

// Playback for a recorded note. The caller resolves the URL — useObjectURL
// for a blob already in hand (mid-recording, mid-edit), useAudioURL for a
// synced entry that might need fetching from Storage first — the same
// split PhotoViewer/AlbumTab use for images (see lib/image.js).
export default function VoiceNote({ url, ms, onRemove }) {
  const { t } = useI18n();
  if (!url) return null;

  return (
    <div className="voice-note">
      <span className="voice-ico" aria-hidden="true">🎙️</span>
      {/* the browser's own control: real scrubbing and duration for free,
          and it stays accessible without reimplementing a player */}
      <audio className="voice-audio" src={url} controls preload="metadata" />
      {typeof ms === "number" && ms > 0 && <span className="voice-len">{fmtClock(ms)}</span>}
      {onRemove && (
        <button type="button" className="icon" aria-label={t("del")} onClick={onRemove}>×</button>
      )}
    </div>
  );
}
