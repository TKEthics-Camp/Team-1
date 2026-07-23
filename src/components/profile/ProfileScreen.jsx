import { Settings, Pencil, Sparkles } from "lucide-react";
import { useI18n } from "../../i18n/I18nContext";
import { useStore } from "../../store/StoreContext";
import { useUI } from "../../ui/UIContext";
import { PALETTE } from "../../lib/constants";
import { globalStreak } from "../../lib/derived";
import { fmtMonthYear } from "../../lib/dates";
import TopBar from "../shared/TopBar";
import LangToggle from "../shared/LangToggle";
import Stats from "../shared/Stats";
import Avatar from "../shared/Avatar";

export default function ProfileScreen() {
  const { t, lang } = useI18n();
  const { profile, interests, photos, entries } = useStore();
  const { openSheet } = useUI();

  return (
    <>
      <TopBar>
        <div className="grow" />
        <LangToggle />
        <button className="icon-btn" aria-label={t("settings")}>
          <Settings size={17} />
        </button>
      </TopBar>
      <div className="view">
        <div className="center">
          <Avatar color={profile.color || PALETTE[0]} initial={profile.name} size={110} />
          <div className="page-title" style={{ marginTop: 14 }}>{profile.name}</div>
          <div className="sub" style={{ marginTop: 4, fontSize: 13 }}>
            {t("orbKeeperSince").replace("{date}", fmtMonthYear(profile.createdAt, lang))}
          </div>
          <button className="btn2 accent" style={{ marginTop: 16 }} onClick={() => openSheet("profile")}>
            <Pencil size={15} /> {t("editProfile")}
          </button>
        </div>

        <div className="section-label">{t("journeyStats")}</div>
        <Stats layout="grid" items={[
          { n: interests.length, k: t("interestsLabel") },
          { n: entries.length, k: t("memories") },
          { n: photos.length, k: t("photosSaved") },
          { n: globalStreak(entries), k: t("totalStreak"), flame: true },
        ]} />

        <div className="quote-card">
          <Sparkles size={16} style={{ flex: "none", marginTop: 2 }} />
          <span>{`"${t("philosophyQuote")}"`}</span>
        </div>
      </div>
    </>
  );
}
