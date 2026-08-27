import { useEffect, useState } from "react";
import { useI18n } from "../../i18n/I18nContext";
import { useStore } from "../../store/StoreContext";
import { useUI } from "../../ui/UIContext";
import { PALETTE, DECORATIONS } from "../../lib/constants";
import { paletteIndexFor } from "../../lib/color";
import { fetchClassmates } from "../../lib/remote";
import PersonAvatar from "../shared/PersonAvatar";

// The interconnected web: you at the centre, real classmates (anyone who's
// joined with the same class code) orbiting. Tapping a node opens their
// public profile — the same sheet Explore's user search opens, since a
// classmate is just another real account. No "shared hobby" highlighting
// yet (the old fixture drew a line to anyone with an overlapping orb) —
// that needs a second query per classmate for their public interests, left
// for a follow-up rather than N+1 queries here.
export default function SchoolTab() {
  const { t, nOf } = useI18n();
  const { profile } = useStore();
  const { openSheet } = useUI();
  const [state, setState] = useState({ loading: true, classmates: [] });
  const equippedDecoration = DECORATIONS.find((d) => d.id === (profile && profile.equippedDecoration)) || null;

  useEffect(() => {
    let cancelled = false;
    setState({ loading: true, classmates: [] });
    fetchClassmates(profile.userId, profile.classCode).then((classmates) => {
      if (!cancelled) setState({ loading: false, classmates });
    });
    return () => { cancelled = true; };
  }, [profile.userId, profile.classCode]);

  const { loading, classmates } = state;
  const cx = 50, cy = 50, R = 37;
  const placed = classmates.map((u, i) => {
    const ang = (i / classmates.length) * Math.PI * 2 - Math.PI / 2;
    return { u, x: cx + R * Math.cos(ang), y: cy + R * Math.sin(ang) };
  });

  return (
    <>
      <div className="safe-note">
        <span aria-hidden="true">🏫</span>
        <span>{t("schoolNote")}</span>
      </div>
      <div className="row">
        <div className="grow">
          <div className="sub">{classmates.length + " " + nOf(classmates.length, "classmates")}</div>
        </div>
      </div>

      {loading ? (
        <div className="sub">{t("profileLoading")}</div>
      ) : (
        <div className="web">
          {classmates.length === 0 && <div className="sub">{t("schoolEmpty")}</div>}
          <svg className="web-lines" viewBox="0 0 100 100" />

          {placed.map(({ u, x, y }) => (
            <button
              key={u.id}
              className="web-node"
              aria-label={u.display_name}
              style={{ left: `${x}%`, top: `${y}%` }}
              onClick={() => openSheet("userProfile", { userId: u.id, displayName: u.display_name, accountType: u.account_type, avatar: u.avatar })}
            >
              <PersonAvatar color={PALETTE[paletteIndexFor(u.id, PALETTE.length)]} avatar={u.avatar} size={44} />
            </button>
          ))}

          <div className="web-node me" style={{ left: `${cx}%`, top: `${cy}%` }}>
            <PersonAvatar color={PALETTE[0]} avatar={profile.avatar} decoration={equippedDecoration} size={52} />
          </div>
        </div>
      )}
    </>
  );
}
