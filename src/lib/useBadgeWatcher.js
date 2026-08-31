import { useEffect, useRef } from "react";
import { earnedIds } from "./badges";

// Badges are derived, so "newly earned" is the difference between what's true
// now and what the profile has already been told about. Without that record
// every reload would re-celebrate everything you'd ever earned.
//
// A brand-new profile is seeded silently: someone whose first run already
// clears a milestone shouldn't be met with a burst of toasts for things they
// didn't just do.
export function useBadgeWatcher({ profile, interests, entries, photos, updateProfile, showToast, t }) {
  const seeded = useRef(false);

  useEffect(() => {
    if (!profile) { seeded.current = false; return; }
    const now = earnedIds(interests, entries, photos);
    const known = profile.earnedBadges;

    if (!Array.isArray(known)) {
      // first run for this profile — record, don't announce
      updateProfile({ earnedBadges: now });
      seeded.current = true;
      return;
    }
    const fresh = now.filter((id) => !known.includes(id));
    if (!fresh.length) return;

    updateProfile({ earnedBadges: now });
    // one line even if several land at once, so a big session doesn't become
    // a queue of toasts fighting over the same slot
    showToast(
      fresh.length === 1
        ? t("badgeUnlocked").replace("{name}", t("badge_" + fresh[0]))
        : t("badgeUnlockedMany").replace("{n}", fresh.length),
      3200
    );
  }, [profile, interests, entries, photos, updateProfile, showToast, t]);
}
