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

  return (
    <div className="nav" data-tour="nav">
      {ITEMS.map(([path, key]) => (
        <button
          key={path}
          aria-current={isActive(path) ? "page" : undefined}
          onClick={() => navigate(path)}
        >
          <span className="dot" />
          <span>{t(key)}</span>
        </button>
      ))}
    </div>
  );
}
