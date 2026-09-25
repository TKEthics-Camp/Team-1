import { useLocation, useNavigate } from "react-router-dom";
import { useI18n } from "../../i18n/I18nContext";

const ITEMS = [["/", "home"], ["/explore", "explore"], ["/profile", "me"]];

// Outline icons in one stroke weight, drawn inline so they take the label's
// colour and need no icon font or image request.
const ICONS = {
  home: <path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z" />,
  explore: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="m15.2 8.8-2 4.4-4.4 2 2-4.4z" />
    </>
  ),
  me: (
    <>
      <circle cx="12" cy="8.5" r="3.5" />
      <path d="M5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5" />
    </>
  ),
};

export default function BottomNav() {
  const { t } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();

  // Home stays lit while browsing an interest, matching the original app.
  function isActive(path) {
    if (path === "/") return location.pathname === "/" || location.pathname.startsWith("/interest/");
    return location.pathname === path;
  }

  // The glass thumb slides to whichever tab is lit. -1 on a route that isn't
  // a tab at all (/market), where it hides rather than parking on the wrong
  // one — see .nav-thumb[hidden] in apple.css.
  const active = ITEMS.findIndex(([path]) => isActive(path));

  return (
    <div className="nav">
      <span
        className="nav-thumb"
        aria-hidden="true"
        hidden={active < 0}
        style={{ "--i": active < 0 ? 0 : active }}
      >
        {/* keyed so it remounts on every tab change: a CSS animation only
            plays once per element, so the squash would otherwise fire on
            first paint and never again. The travel lives on the parent,
            which persists, so the slide still transitions rather than
            jumping. */}
        <span className="nav-thumb-skin" key={active} />
      </span>
      {ITEMS.map(([path, key]) => (
        <button
          key={path}
          aria-current={isActive(path) ? "page" : undefined}
          onClick={() => navigate(path)}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
               strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            {ICONS[key]}
          </svg>
          {t(key)}
        </button>
      ))}
    </div>
  );
}
