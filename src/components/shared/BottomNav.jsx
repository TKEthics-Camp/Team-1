import { useLocation, useNavigate } from "react-router-dom";
import { useI18n } from "../../i18n/I18nContext";

const ITEMS = [["/", "home"], ["/explore", "explore"], ["/profile", "me"]];

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
          {t(key)}
        </button>
      ))}
    </div>
  );
}
