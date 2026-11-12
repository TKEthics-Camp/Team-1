import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useI18n } from "../../i18n/I18nContext";
import { useStore } from "../../store/StoreContext";
import { byEntryDate } from "../../lib/derived";
import TopBar from "../shared/TopBar";
import EmptyState from "../shared/EmptyState";
import JournalTab from "../interest/JournalTab";
import Insights from "./Insights";

// How many entries are drawn before "Show more". The list is finite either
// way; this just keeps a three-year journal from rendering in one go.
const PAGE = 40;

// Everything you've written, across every hobby, in one place — and what it
// adds up to. Each tree still has its own journal; this is the view a tree
// can't give: last week as a whole, or the one entry you half remember.
export default function JournalScreen() {
  const { t } = useI18n();
  const [params, setParams] = useSearchParams();
  const view = params.get("view") === "insights" ? "insights" : "entries";

  return (
    <>
      <TopBar>
        <h1>{t("journal")}</h1>
      </TopBar>
      <div className="view journal-view">
        <div className="seg">
          <button
            type="button"
            aria-pressed={view === "entries" ? "true" : "false"}
            onClick={() => setParams({}, { replace: true })}
          >
            {t("viewEntries")}
          </button>
          <button
            type="button"
            aria-pressed={view === "insights" ? "true" : "false"}
            onClick={() => setParams({ view: "insights" }, { replace: true })}
          >
            {t("viewInsights")}
          </button>
        </div>
        {view === "entries" ? <AllEntries /> : <Insights />}
      </div>
    </>
  );
}

function AllEntries() {
  const { t, nameOf } = useI18n();
  const { interests, entries } = useStore();
  const [query, setQuery] = useState("");
  const [only, setOnly] = useState(null); // an interest id, or null for all
  const [limit, setLimit] = useState(PAGE);

  const sorted = useMemo(() => entries.slice().sort(byEntryDate), [entries]);
  const names = useMemo(
    () => new Map(interests.map((it) => [it.id, (it.name + " " + (it.nameZh || "")).toLowerCase()])),
    [interests]
  );

  if (!entries.length) return <EmptyState text={t("journalNone")} />;

  // Matches the words of an entry, or the name of the hobby it belongs to —
  // "guitar" should find guitar entries that never say the word.
  const needle = query.trim().toLowerCase();
  const found = sorted.filter((e) => {
    if (only && e.interestId !== only) return false;
    if (!needle) return true;
    return (e.text || "").toLowerCase().includes(needle) || (names.get(e.interestId) || "").includes(needle);
  });

  function pick(id) {
    setOnly(id);
    setLimit(PAGE);
  }

  return (
    <>
      <input
        type="search"
        className="user-search-input journal-search"
        placeholder={t("searchJournal")}
        aria-label={t("searchJournal")}
        value={query}
        onChange={(e) => { setQuery(e.target.value); setLimit(PAGE); }}
      />
      {interests.length > 1 && (
        <div className="filter-row">
          <button type="button" className="chip" aria-pressed={only === null ? "true" : "false"} onClick={() => pick(null)}>
            {t("filterAll")}
          </button>
          {interests.map((it) => (
            <button
              key={it.id}
              type="button"
              className="chip"
              aria-pressed={only === it.id ? "true" : "false"}
              onClick={() => pick(it.id)}
            >
              {nameOf(it)}
            </button>
          ))}
        </div>
      )}

      {found.length === 0 ? (
        <div className="sub center">{t("journalNoMatch")}</div>
      ) : (
        <>
          <JournalTab entries={found.slice(0, limit)} interests={interests} />
          {found.length > limit && (
            <button type="button" className="btn2" onClick={() => setLimit((n) => n + PAGE)}>
              {t("showMore")}
            </button>
          )}
        </>
      )}
    </>
  );
}
