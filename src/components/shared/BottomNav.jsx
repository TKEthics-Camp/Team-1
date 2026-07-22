import { useLocation, useNavigate } from "react-router-dom";
import { useI18n } from "../../i18n/I18nContext";

const ITEMS = [["/", "home"], ["/profile", "me"]];

export default function BottomNav() {
  const { t } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="nav">
      {ITEMS.map(([path, key]) => (
        <button
          key={path}
          aria-current={location.pathname === path ? "page" : undefined}
          onClick={() => navigate(path)}
        >
          <span className="dot" />
          <span>{t(key)}</span>
        </button>
      ))}
    </div>
  );
}
