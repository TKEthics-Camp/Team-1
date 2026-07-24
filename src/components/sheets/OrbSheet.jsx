import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useI18n } from "../../i18n/I18nContext";
import { useStore } from "../../store/StoreContext";
import { useUI } from "../../ui/UIContext";
import { uid } from "../../lib/id";
import { PALETTE } from "../../lib/constants";
import { SPECIES, LEAF_COLORS, speciesOf, leafColorOf } from "../../lib/tree";
import { isBlockedHobby } from "../../lib/hobbyFilter";
import Sheet from "../shared/Sheet";
import Field from "../shared/Field";
import Tree from "../shared/Tree";
import DayPicker from "../shared/DayPicker";
import VisRow from "../shared/VisRow";

const SPECIES_ICON = {
  oak: "🌳", willow: "🌿", pine: "🌲", birch: "🌱",
  maple: "🍁", cherry: "🌸", cypress: "🌵", palm: "🌴", bamboo: "🎋",
};

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
  // Colour is assigned automatically (it only tints the tree's blossoms) — we
  // no longer ask the user for it. Existing trees keep whatever they had.
  const color = editing ? editing.color : preset ? preset.color : PALETTE[interests.length % PALETTE.length];
  const [time, setTime] = useState(editing ? editing.time || "16:00" : "16:00");
  const [days, setDays] = useState(editing ? editing.days || [] : []);
  const [friendsText, setFriendsText] = useState(editing ? (editing.friends || []).join(", ") : "");
  const [visibility, setVisibility] = useState(editing ? editing.visibility || "private" : "private");
  const nameRef = useRef(null);
  const previewId = useMemo(() => (editing ? editing.id : uid()), [editing]);
  const [species, setSpecies] = useState(editing ? editing.species || speciesOf(editing) : speciesOf({ id: previewId }));
  const [leafColor, setLeafColor] = useState(editing ? editing.leafColor || leafColorOf(editing) : leafColorOf({ id: previewId }));
  const [blocked, setBlocked] = useState(false);

  useEffect(() => { nameRef.current?.focus(); }, []);

  function save() {
    const nm = name.trim();
    if (!nm) { nameRef.current?.focus(); return; }
    if (isBlockedHobby(nm)) { setBlocked(true); nameRef.current?.focus(); return; }
    const friends = friendsText.split(/[,，]/).map((x) => x.trim()).filter(Boolean);
    if (editing) {
      updateInterest({ ...editing, name: nm, why: why.trim(), color, time, days, species, leafColor, friends, visibility, updatedAt: Date.now() });
    } else {
      addInterest({
        id: previewId, name: nm, why: why.trim(), color, time, days, species, leafColor, friends, visibility,
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
      <div className="orb-sheet-preview">
        <Tree interest={{ id: previewId, color }} size={92} stage={2} health="healthy" species={species} leafColor={leafColor} className="alive" />
      </div>
      <h2>{editing ? t("editOrb") : t("newInterest")}</h2>
      <Field label={t("name")}>
        <input
          ref={nameRef}
          type="text"
          maxLength={24}
          placeholder={t("interestPh")}
          value={name}
          onChange={(e) => { setName(e.target.value); setBlocked(false); }}
        />
        {blocked && <span className="field-error">{t("hobbyBlocked")}</span>}
      </Field>
      <Field label={t("why")}>
        <input type="text" maxLength={80} placeholder={t("whyPh")} value={why} onChange={(e) => setWhy(e.target.value)} />
      </Field>
      <Field label={t("speciesLabel")}>
        <div className="species-row">
          {SPECIES.map((sp) => (
            <button
              key={sp}
              type="button"
              className="species-btn"
              aria-pressed={species === sp}
              onClick={() => setSpecies(sp)}
            >
              <span className="ico" aria-hidden="true">{SPECIES_ICON[sp]}</span>
              <span>{t("species_" + sp)}</span>
            </button>
          ))}
        </div>
      </Field>
      <Field label={t("leafColorLabel")}>
        <div className="swatches">
          {Object.keys(LEAF_COLORS).map((k) => (
            <button
              key={k}
              type="button"
              className="swatch"
              aria-pressed={leafColor === k}
              style={{ background: LEAF_COLORS[k][0], "--c": LEAF_COLORS[k][0] }}
              aria-label={t("leaf_" + k)}
              onClick={() => setLeafColor(k)}
            />
          ))}
        </div>
      </Field>
      <Field label={t("timeLabel")}>
        <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
      </Field>
      <Field label={t("daysLabel")}>
        <DayPicker days={days} onChange={setDays} />
        <span className="hint">{t("daysNote")}</span>
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
      <VisRow value={visibility} onChange={setVisibility} />

      <button className="btn" onClick={save}>{t("save")}</button>
      {editing && <button className="btn2 btn-danger" onClick={remove}>{t("deleteOrb")}</button>}
      <button className="btn2" onClick={closeSheet}>{t("cancel")}</button>
    </Sheet>
  );
}
