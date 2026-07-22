import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getAll, put, del, clearAll as dbClearAll } from "../db/db";

const StoreCtx = createContext(null);

export function StoreProvider({ children }) {
  const [loading, setLoading] = useState(true);
  const [profile, setProfileState] = useState(null);
  const [interests, setInterests] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [entries, setEntries] = useState([]);

  useEffect(() => {
    Promise.all([getAll("meta"), getAll("interests"), getAll("photos"), getAll("entries")])
      .then(([meta, ints, ph, en]) => {
        setProfileState(meta.find((m) => m.key === "profile") || null);
        setInterests(ints.sort((a, b) => a.createdAt - b.createdAt));
        setPhotos(ph);
        // Entries written before durations existed get a nominal half hour,
        // once, so old logs still contribute to the hours shown on an orb.
        en.forEach((e) => {
          if (typeof e.minutes !== "number") { e.minutes = 30; put("entries", e); }
        });
        setEntries(en);
        setLoading(false);
      })
      .catch((e) => {
        console.error("Storage unavailable:", e);
        setLoading(false);
      });
  }, []);

  const actions = useMemo(() => ({
    saveProfile(rec) {
      setProfileState(rec);
      put("meta", rec);
    },
    setLangOnProfile(lang) {
      setProfileState((p) => {
        if (!p) return p;
        const next = { ...p, lang };
        put("meta", next);
        return next;
      });
    },
    updateProfile(patch) {
      setProfileState((p) => {
        if (!p) return p;
        const next = { ...p, ...patch };
        put("meta", next);
        return next;
      });
    },
    addInterest(rec) {
      setInterests((list) => [...list, rec]);
      put("interests", rec);
    },
    updateInterest(rec) {
      setInterests((list) => list.map((x) => (x.id === rec.id ? rec : x)));
      put("interests", rec);
    },
    deleteInterest(id) {
      setPhotos((list) => {
        list.filter((p) => p.interestId === id).forEach((p) => del("photos", p.id));
        return list.filter((p) => p.interestId !== id);
      });
      setEntries((list) => {
        list.filter((e) => e.interestId === id).forEach((e) => del("entries", e.id));
        return list.filter((e) => e.interestId !== id);
      });
      setInterests((list) => list.filter((x) => x.id !== id));
      del("interests", id);
    },
    addPhoto(rec) {
      setPhotos((list) => [...list, rec]);
      put("photos", rec);
    },
    deletePhoto(id) {
      setPhotos((list) => list.filter((x) => x.id !== id));
      del("photos", id);
    },
    addEntry(rec) {
      setEntries((list) => [...list, rec]);
      put("entries", rec);
    },
    deleteEntry(id) {
      setEntries((list) => list.filter((x) => x.id !== id));
      del("entries", id);
    },
    clearAllData() {
      dbClearAll();
      setProfileState(null);
      setInterests([]);
      setPhotos([]);
      setEntries([]);
    },
  }), []);

  const value = useMemo(
    () => ({ loading, profile, interests, photos, entries, ...actions }),
    [loading, profile, interests, photos, entries, actions]
  );

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreCtx);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
