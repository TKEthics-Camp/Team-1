import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useI18n } from "../../i18n/I18nContext";
import { useStore } from "../../store/StoreContext";
import { useUI } from "../../ui/UIContext";
import { uid } from "../../lib/id";
import { PALETTE } from "../../lib/constants";
import { SPECIES, DEFAULT_SPECIES } from "../../lib/species";
import { WEEKDAY_LABELS } from "../../i18n/strings";
import Sheet from "../shared/Sheet";
import Field from "../shared/Field";
import Tree from "../shared/Tree";

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

export default function OrbSheet({ interestId, preset = null }) {
  const { t, lang } = useI18n();
  const { interests, addInterest, updateInterest, deleteInterest } = useStore();
  const { closeSheet } = useUI();
  const navigate = useNavigate();

  const editing = interestId ? interests.find((x) => x.id === interestId) : null;

  const [name, setName] = useState(
    editing ? editing.name : preset ? (lang === "en" ? preset.name : preset.nameZh) : ""
  );
  const [why, setWhy] = useState(editing ? editing.why || "" : "");
  // Colour has no picker anymore — the tree icon itself is the hobby's
  // visual, so this is just an internal accent (used for blossom dots and a
  // few small UI touches) assigned automatically, never something to choose.
  const color = editing ? editing.color : preset ? preset.color : PALETTE[interests.length % PALETTE.length];
  const [species, setSpecies] = useState(editing ? editing.species || DEFAULT_SPECIES : DEFAULT_SPECIES);
  const [time, setTime] = useState(editing ? editing.time || "16:00" : "16:00");
  // Missing/empty `days` has always meant "every day" — treating it that way
  // here too means every interest saved before this existed keeps working
  // exactly as it did.
  const [days, setDays] = useState(editing && editing.days && editing.days.length ? editing.days : ALL_DAYS);
  const [friendsText, setFriendsText] = useState(editing ? (editing.friends || []).join(", ") : "");
  const nameRef = useRef(null);

  useEffect(() => { nameRef.current?.focus(); }, []);

  function toggleDay(d) {
    setDays((prev) => {
      if (prev.includes(d)) {
        const next = prev.filter((x) => x !== d);
        return next.length ? next : ALL_DAYS; // never let every day be turned off
      }
      return [...prev, d].sort();
    });
  }

  function save() {
    const nm = name.trim();
    if (!nm) { nameRef.current?.focus(); return; }
    const friends = friendsText.split(/[,，]/).map((x) => x.trim()).filter(Boolean);
    if (editing) {
      updateInterest({ ...editing, name: nm, why: why.trim(), color, species, time, days, friends, updatedAt: Date.now() });
    } else {
      // A preset knows both languages' names. If the field still holds the
      // preset's own label untouched, save the canonical English/Chinese
      // pair (not whichever single language happened to be showing) so the
      // tree's name actually changes when the language toggles later. A
      // hand-typed name has no known translation, so it's saved as-is and
      // shown unchanged in either language (see nameOf's fallback).
      const presetLabel = preset && (lang === "en" ? preset.name : preset.nameZh);
      const matchesPreset = preset && nm === presetLabel;
      addInterest({
        id: uid(),
        name: matchesPreset ? preset.name : nm,
        nameZh: matchesPreset ? preset.nameZh : undefined,
        why: why.trim(), color, species, time, days, friends,
        createdAt: Date.now(), updatedAt: Date.now(),
      });
    }
    closeSheet();
  }

  function remove() {
    deleteInterest(editing.id);
    closeSheet();
    navigate("/");
  }

  return (
    <Sheet onClose={closeSheet}>
      <h2>{editing ? t("editOrb") : t("newInterest")}</h2>
      <Field label={t("name")}>
        <input ref={nameRef} type="text" maxLength={24} placeholder={t("interestPh")} value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field label={t("why")}>
        <input type="text" maxLength={80} placeholder={t("whyPh")} value={why} onChange={(e) => setWhy(e.target.value)} />
      </Field>
      <Field label={t("speciesLabel")}>
        <div className="species-picker">
          {SPECIES.map((sp) => (
            <button
              key={sp.id}
              type="button"
              className="species-option"
              aria-pressed={species === sp.id}
              onClick={() => setSpecies(sp.id)}
            >
              <Tree interest={{ color, species: sp.id }} size={56} stage={2} health="healthy" />
              <span>{sp.name[lang === "en" ? 0 : 1]}</span>
            </button>
          ))}
        </div>
      </Field>
      <Field label={t("timeLabel")}>
        <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        <div className="day-picker">
          {WEEKDAY_LABELS.map(([enL, zhL], d) => (
            <button
              key={d}
              type="button"
              className="day-chip"
              aria-pressed={days.includes(d)}
              onClick={() => toggleDay(d)}
            >
              {lang === "en" ? enL : zhL}
            </button>
          ))}
        </div>
        <div className="sub">{days.length === 7 ? t("everyDay") : t("onlyDays")}</div>
      </Field>
      <Field label={t("friendsLabel")}>
        <input
          type="text"
          maxLength={60}
          placeholder={t("friendsPh")}
          value={friendsText}
          onChange={(e) => setFriendsText(e.target.value)}
        />
      </Field>

      <button className="btn" onClick={save}>{t("save")}</button>
      {editing && <button className="btn2 btn-danger" onClick={remove}>{t("deleteOrb")}</button>}
      <button className="btn2" onClick={closeSheet}>{t("cancel")}</button>
    </Sheet>
  );
}
