import { useI18n } from "../../i18n/I18nContext";
import { useObjectURL } from "../../lib/image";
import { fmtClock } from "../../lib/useRecorder";

// Playback for a recorded note. useObjectURL is the same helper photos use —
// it revokes the URL on unmount, which matters here because a journal can
// hold a lot of these.
export default function VoiceNote({ blob, ms, onRemove }) {
  const { t } = useI18n();
  const url = useObjectURL(blob);
  if (!blob) return null;

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
