import { useEffect, useState } from "react";
import { useI18n } from "../../i18n/I18nContext";
import { useAuth } from "../../store/AuthContext";
import { useUI } from "../../ui/UIContext";
import { searchUsers } from "../../lib/remote";
import { PALETTE } from "../../lib/constants";
import { shade } from "../../lib/color";

// A minimal name search over other discoverable accounts (users with
// discovery_enabled = true — see the Me screen toggle and the users_select
// RLS policy). Read-only: it just finds people, there's no chat/friending.
export default function UserSearch() {
  const { t } = useI18n();
  const { user } = useAuth();
  const { openSheet } = useUI();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) { setResults([]); setSearched(false); return; }
    let cancelled = false;
    const timer = setTimeout(() => {
      searchUsers(q, user.id).then((rows) => {
        if (!cancelled) { setResults(rows); setSearched(true); }
      });
    }, 300);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [query, user.id]);

  return (
    <div className="user-search">
      <input
        type="text"
        className="user-search-input"
        placeholder={t("searchUsersPh")}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label={t("searchUsersPh")}
      />

      {results.length > 0 && (
        <div className="user-search-results">
          {results.map((u) => (
            <div
              className="idea"
              key={u.id}
              role="button"
              tabIndex={0}
              onClick={() => openSheet("userProfile", { userId: u.id, displayName: u.display_name, accountType: u.account_type })}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  openSheet("userProfile", { userId: u.id, displayName: u.display_name, accountType: u.account_type });
                }
              }}
            >
              <div
                className="avatar"
                style={{
                  width: 40, height: 40, fontSize: 16,
                  background: `radial-gradient(circle at 34% 30%, ${shade(PALETTE[0], 40)}, ${shade(PALETTE[0], -45)})`,
                }}
              >
                {(u.display_name || "?").slice(0, 1).toUpperCase()}
              </div>
              <div className="grow">
                <div className="idea-nm">{u.display_name || t("someone")}</div>
                {u.account_type === "org" && <div className="idea-cat">{t("searchUsersOrg")}</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      {searched && results.length === 0 && (
        <div className="sub">{t("searchUsersEmpty")}</div>
      )}
      {!searched && query.trim().length < 2 && (
        <div className="sub">{t("searchUsersHint")}</div>
      )}
    </div>
  );
}
