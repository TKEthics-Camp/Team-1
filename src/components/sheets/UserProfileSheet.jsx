import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useI18n } from "../../i18n/I18nContext";
import { useUI } from "../../ui/UIContext";
import { pullPublicProfile } from "../../lib/remote";
import { minutesOf, fmtHours } from "../../lib/derived";
import { treeStage } from "../../lib/tree";
import { PALETTE } from "../../lib/constants";
import { shade } from "../../lib/color";
import Sheet from "../shared/Sheet";
import Tree from "../shared/Tree";

// Tap a search result: their public trees only (interests_select's own RLS
// gate) — tapping one of those trees opens a read-only journal view (no
// photos yet, those still live local-only, see remote.js), and there's still
// no way to message them — same hands-off rule as the fake classmate sheet.
export default function UserProfileSheet({ userId, displayName, accountType }) {
  const { t, nameOf } = useI18n();
  const { closeSheet } = useUI();
  const navigate = useNavigate();
  const [state, setState] = useState({ loading: true, interests: [], entries: [] });

  useEffect(() => {
    let cancelled = false;
    setState({ loading: true, interests: [], entries: [] });
    pullPublicProfile(userId).then(({ interests, entries }) => {
      if (!cancelled) setState({ loading: false, interests, entries });
    });
    return () => { cancelled = true; };
  }, [userId]);

  const { loading, interests, entries } = state;

  return (
    <Sheet onClose={closeSheet}>
      <div className="row" style={{ gap: 12 }}>
        <div
          className="avatar"
          style={{
            width: 46, height: 46, fontSize: 18,
            background: `radial-gradient(circle at 34% 30%, ${shade(PALETTE[0], 40)}, ${shade(PALETTE[0], -45)})`,
          }}
        >
          {(displayName || "?").slice(0, 1).toUpperCase()}
        </div>
        <div className="grow">
          <h2>{displayName || t("someone")}</h2>
          {accountType === "org" && <div className="sub">{t("searchUsersOrg")}</div>}
        </div>
      </div>

      {loading ? (
        <div className="sub">{t("profileLoading")}</div>
      ) : interests.length === 0 ? (
        <div className="sub">{t("profileNoPublicTrees")}</div>
      ) : (
        <div className="ideas">
          {interests.map((it) => {
            const minutes = minutesOf(entries, it.id);
            // Photos never sync — health can't be judged fairly for someone
            // else's tree, so public listings always draw it healthy.
            const stage = treeStage(it, entries, []);
            return (
              <div
                className="idea"
                key={it.id}
                role="button"
                tabIndex={0}
                style={{ cursor: "pointer" }}
                onClick={() => { closeSheet(); navigate(`/user/${userId}/interest/${it.id}`); }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") { closeSheet(); navigate(`/user/${userId}/interest/${it.id}`); }
                }}
              >
                <div style={{ flex: "none" }}>
                  <Tree interest={it} size={46} stage={stage} health="healthy" />
                </div>
                <div className="grow">
                  <div className="idea-nm">{nameOf(it)}</div>
                  <div className="idea-cat">{fmtHours(minutes)}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <button className="btn2" onClick={closeSheet}>{t("close")}</button>
    </Sheet>
  );
}
