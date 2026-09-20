import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useI18n } from "../../i18n/I18nContext";
import { useAuth } from "../../store/AuthContext";
import { useUI } from "../../ui/UIContext";
import { pullWatchedInterests } from "../../lib/remote";
import Sheet from "../shared/Sheet";
import Tree from "../shared/Tree";
import PersonAvatar from "../shared/PersonAvatar";

// The hobbies you've kept an eye on. Watching points at a hobby, never at a
// person (PRD §7) — so this is a list of trees, and whose they are is
// context rather than the subject.
//
// A tree that's since been made private just isn't here any more:
// interests_select stops returning it and pullWatchedInterests drops it.
// The count line says so rather than letting the list quietly shrink.
export default function WatchingSheet() {
  const { t, nameOf } = useI18n();
  const { user } = useAuth();
  const { closeSheet } = useUI();
  const navigate = useNavigate();
  const location = useLocation();
  const [state, setState] = useState({ loading: true, items: [] });

  useEffect(() => {
    if (!user) { setState({ loading: false, items: [] }); return; }
    let cancelled = false;
    pullWatchedInterests(user.id).then((items) => {
      if (!cancelled) setState({ loading: false, items });
    });
    return () => { cancelled = true; };
  }, [user]);

  const { loading, items } = state;

  function open(item) {
    closeSheet();
    navigate(`/user/${item.ownerId}/interest/${item.id}`, {
      state: { from: location.pathname },
    });
  }

  return (
    <Sheet onClose={closeSheet}>
      <h2>{t("watchingTitle")}</h2>

      {loading ? (
        <div className="sub">{t("profileLoading")}</div>
      ) : items.length === 0 ? (
        <div className="sub">{t("watchingEmpty")}</div>
      ) : (
        <div className="ideas">
          {items.map((item) => (
            <div
              className="idea"
              key={item.id}
              role="button"
              tabIndex={0}
              style={{ cursor: "pointer" }}
              onClick={() => open(item)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") open(item);
              }}
            >
              <div style={{ flex: "none" }}>
                <Tree interest={item} size={46} stage={3} health="healthy" />
              </div>
              <div className="grow">
                <div className="idea-nm">{nameOf(item)}</div>
                <div className="idea-cat">{item.ownerName}</div>
              </div>
              <PersonAvatar avatar={item.ownerAvatar} size={26} />
            </div>
          ))}
        </div>
      )}

      <button className="btn2" onClick={closeSheet}>{t("close")}</button>
    </Sheet>
  );
}
