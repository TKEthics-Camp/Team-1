import { Home, User } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useI18n } from "../../i18n/I18nContext";

const ITEMS = [
  ["/", "home", Home],
  ["/profile", "me", User],
];

export default function BottomNav() {
  const { t } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="nav">
      {ITEMS.map(([path, key, Icon]) => (
        <button
          key={path}
          aria-current={location.pathname === path ? "page" : undefined}
          onClick={() => navigate(path)}
        >
          <Icon size={20} strokeWidth={2.25} />
          <span>{t(key)}</span>
        </button>
      ))}
    </div>
  );
}
