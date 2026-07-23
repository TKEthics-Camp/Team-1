import { useRef } from "react";
import { Calendar, ChevronDown } from "lucide-react";
import { useI18n } from "../../i18n/I18nContext";
import { fmtDateFieldLabel } from "../../lib/dates";

// A pill that looks like a custom date picker but wraps a real (visually
// hidden) native <input type="date"> so browser date-picking still works.
export default function DateField({ value, onChange }) {
  const { lang } = useI18n();
  const inputRef = useRef(null);

  function open() {
    const el = inputRef.current;
    if (!el) return;
    if (typeof el.showPicker === "function") {
      try { el.showPicker(); return; } catch (e) { /* fall through */ }
    }
    el.focus();
  }

  return (
    <div className="date-field" onClick={open}>
      <Calendar size={16} />
      <span>{fmtDateFieldLabel(value, lang)}</span>
      <ChevronDown size={16} className="chev" />
      <input
        ref={inputRef}
        type="date"
        value={value}
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
