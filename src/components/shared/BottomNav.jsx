import { useLocation, useNavigate } from "react-router-dom";
import { useI18n } from "../../i18n/I18nContext";
import { useStore } from "../../store/StoreContext";

const ITEMS = [["/", "home"], ["/journal", "journal"], ["/explore", "explore"], ["/profile", "me"]];

// Outline icons in one stroke weight, drawn inline so they take the label's
// colour and need no icon font or image request.
const ICONS = {
  home: <path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z" />,
  journal: (
    <path d="M12 7v14M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z" />
  ),
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
  const { profile } = useStore();
  const location = useLocation();
  const navigate = useNavigate();
  // An educator keeps no journal of their own, so has no Journal tab.
  const items = profile && profile.accountType === "org"
    ? ITEMS.filter(([, key]) => key !== "journal")
    : ITEMS;

  // Home stays lit while browsing an interest, matching the original app.
  function isActive(path) {
    if (path === "/") return location.pathname === "/" || location.pathname.startsWith("/interest/");
    return location.pathname === path;
  }

  return (
    <div className="nav">
      {items.map(([path, key]) => (
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
