import { describe, it, expect } from "vitest";
import {
  isOnboarded, rebuildProfile, profileFromServer, applyNewer, addAdopted, settlePlan,
} from "./reconcile";
import { newerSide } from "./newestEdit";

const none = { interests: [], entries: [], photos: [] };
const oneTree = { ...none, interests: [{ id: "t1", createdAt: 1 }] };

describe("isOnboarded", () => {
  it("is false with no server row", () => {
    expect(isOnboarded(null, oneTree)).toBe(false);
  });
  it("trusts the flag when the column exists", () => {
    expect(isOnboarded({ onboarding_completed: true }, none)).toBe(true);
    expect(isOnboarded({ onboarding_completed: false }, none)).toBe(false);
  });
  it("counts a planted tree even when the flag says false", () => {
    expect(isOnboarded({ onboarding_completed: false }, oneTree)).toBe(true);
  });
  it("ignores a class code when the flag exists (signup can set one)", () => {
    expect(isOnboarded({ onboarding_completed: false, class_code: "ABC" }, none)).toBe(false);
  });
  it("falls back to trees or a class code without the column", () => {
    expect(isOnboarded({ display_name: "x" }, none)).toBe(false);
    expect(isOnboarded({ class_code: "ABC" }, none)).toBe(true);
    expect(isOnboarded({}, oneTree)).toBe(true);
  });
});

describe("rebuildProfile", () => {
  it("maps the server row and claims it for the user", () => {
    const p = rebuildProfile({
      display_name: "Mei", lang: "zh", theme: "black", coins: 12, sound_on: false,
      avatar: '{"hair":"bob"}', class_code: "K1", created_at: "2026-01-01T00:00:00Z",
    }, none, "u1");
    expect(p).toMatchObject({
      key: "profile", name: "Mei", lang: "zh", theme: "black", coins: 12, soundOn: false,
      avatar: { hair: "bob" }, classCode: "K1", userId: "u1", accountType: "individual",
      ownedDecorations: [], equippedDecoration: null,
    });
    expect(p.createdAt).toBe(Date.parse("2026-01-01T00:00:00Z"));
    expect(Array.isArray(p.earnedBadges)).toBe(true);
  });
  it("falls back to defaults for an empty row", () => {
    const p = rebuildProfile({ display_name: "A", created_at: 0 }, none, "u1");
    expect(p.lang).toBe("en");
    expect(p.avatar).toEqual({});
    expect(p.soundOn).toBe(true);
    expect(p.discoverable).toBe(false);
  });
});

describe("profileFromServer", () => {
  const base = {
    name: "Mei", userId: "u1", discoverable: false, soundOn: true, lang: "en", theme: "light",
    coins: 10, ownedDecorations: [], ownedHair: [], ownedOutfits: [], classCode: null, avatar: {},
  };
  const row = {
    display_name: "Mei", discovery_enabled: false, sound_on: true, lang: "en", theme: "light",
    coins: 10, owned_decorations: [], owned_hair: [], owned_outfits: [], class_code: null, avatar: "",
  };

  it("changes nothing when both sides agree", () => {
    expect(profileFromServer(base, row, "u1")).toEqual({ patch: {}, push: {} });
  });

  it("pulls settings changed on another device", () => {
    const { patch } = profileFromServer(base, {
      ...row, discovery_enabled: true, sound_on: false, lang: "zh", theme: "black",
      equipped_decoration: "lantern", avatar: '{"hair":"bun"}',
    }, "u1");
    expect(patch).toEqual({
      discoverable: true, soundOn: false, lang: "zh", theme: "black",
      equippedDecoration: "lantern", avatar: { hair: "bun" },
    });
  });

  it("never pulls over a setting still waiting to be pushed", () => {
    const { patch } = profileFromServer(base, { ...row, lang: "zh", theme: "black" }, "u1", (f) => f === "lang");
    expect(patch).toEqual({ theme: "black" });
  });

  it("unions purchases and pushes back what the server lacks", () => {
    const { patch, push } = profileFromServer(
      { ...base, ownedDecorations: ["a"], ownedHair: ["h1"] },
      { ...row, owned_decorations: ["b"], owned_hair: ["h1"] }, "u1",
    );
    expect(patch.ownedDecorations).toEqual(["a", "b"]);
    expect(push.ownedDecorations).toEqual(["a", "b"]);
    expect(push.ownedHair).toBeUndefined();
  });

  it("keeps the higher coin total, whichever side has it", () => {
    expect(profileFromServer({ ...base, coins: 5 }, { ...row, coins: 9 }, "u1")).toEqual({ patch: { coins: 9 }, push: {} });
    expect(profileFromServer({ ...base, coins: 9 }, { ...row, coins: 5 }, "u1")).toEqual({ patch: {}, push: { coins: 9 } });
  });

  it("takes the server's class code, except an educator's own", () => {
    expect(profileFromServer(base, { ...row, class_code: "K1" }, "u1").patch.classCode).toBe("K1");
    const org = profileFromServer({ ...base, accountType: "org", classCode: "MINE" }, row, "u1");
    expect(org.push.classCode).toBe("MINE");
    expect(org.patch.classCode).toBeUndefined();
  });

  it("pulls a rename from another device, but pushes an unclaimed profile's name", () => {
    expect(profileFromServer(base, { ...row, display_name: "Mei2" }, "u1").patch.name).toBe("Mei2");
    const unclaimed = profileFromServer({ ...base, userId: undefined }, { ...row, display_name: null }, "u1");
    expect(unclaimed.push.displayName).toBe("Mei");
    expect(unclaimed.patch.userId).toBe("u1");
  });
});

describe("applyNewer", () => {
  const list = [{ id: "a", v: 1 }, { id: "b", v: 1 }];
  it("returns the same list when nothing is newer", () => {
    expect(applyNewer(list, [])).toBe(list);
  });
  it("replaces, drops trashed, and brings back restored", () => {
    const out = applyNewer(list, [{ id: "a", v: 2 }, { id: "b", deletedAt: 5 }, { id: "c", v: 1 }]);
    expect(out).toEqual([{ id: "a", v: 2 }, { id: "c", v: 1 }]);
  });
});

describe("addAdopted", () => {
  it("adds live rows once and leaves trashed ones out", () => {
    const list = [{ id: "a" }];
    expect(addAdopted(list, [{ id: "a" }, { id: "b" }, { id: "c", deletedAt: 1 }])).toEqual([{ id: "a" }, { id: "b" }]);
    expect(addAdopted(list, [{ id: "c", deletedAt: 1 }])).toBe(list);
  });
});

describe("settlePlan", () => {
  it("sorts shared records by which side is newer", () => {
    const local = [{ id: "a", updatedAt: 1 }, { id: "b", updatedAt: 9 }, { id: "c", updatedAt: 3 }, { id: "d", updatedAt: 1 }];
    const remote = [{ id: "a", updatedAt: 5 }, { id: "b", updatedAt: 2 }, { id: "c", updatedAt: 3 }];
    const plan = settlePlan(local, remote, newerSide);
    expect(plan.pull.map((x) => x.local.id)).toEqual(["a"]);
    expect(plan.pull[0].remote.updatedAt).toBe(5);
    expect(plan.push.map((r) => r.id)).toEqual(["b"]);
  });
});
