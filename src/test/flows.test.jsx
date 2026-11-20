// @vitest-environment jsdom
// What a student actually does, clicked through the real screens and sheets
// on top of the real store — this device's database (an in-memory
// IndexedDB) and a fake server. Each test checks what's on screen and what
// was saved, the two things a student would notice going wrong.
import "fake-indexeddb/auto";
import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup, act } from "@testing-library/react";
import { Suspense } from "react";
import { MemoryRouter, Routes, Route } from "react-router-dom";

const h = vi.hoisted(() => ({ auth: { user: null } }));
vi.mock("../store/AuthContext", () => ({ useAuth: () => ({ user: h.auth.user }) }));
vi.mock("../lib/remote", async () => (await import("./fakeServer")).remoteModule());
vi.mock("../lib/supabase", () => ({ supabase: null }));

const { server, stubBrowser } = await import("./fakeServer");
const { clearAll, getAll, put } = await import("../db/db");
const { StoreProvider, useStore } = await import("../store/StoreContext");
const { I18nProvider } = await import("../i18n/I18nContext");
const { UIProvider, useUI } = await import("../ui/UIContext");
const { COINS_PER_LOG } = await import("../lib/constants");
const HomeScreen = (await import("../components/home/HomeScreen")).default;
const InterestScreen = (await import("../components/interest/InterestScreen")).default;
const SheetHost = (await import("../components/sheets/SheetHost")).default;
const UndoToast = (await import("../components/shared/UndoToast")).default;

// App shows nothing until the garden has loaded; the screens rely on it.
function Loaded({ children }) {
  const { loading, profile } = useStore();
  return loading || !profile ? null : children;
}
function Sheets() {
  const { sheet } = useUI();
  return sheet ? <SheetHost /> : null;
}
function app(path = "/") {
  return render(
    <I18nProvider>
      <MemoryRouter initialEntries={[path]}>
        <StoreProvider>
          <UIProvider>
            <Suspense fallback={null}><Loaded>
              <Routes>
                <Route path="/" element={<HomeScreen />} />
                <Route path="/interest/:id" element={<InterestScreen />} />
              </Routes>
              <Sheets />
            </Loaded></Suspense>
            <UndoToast />
          </UIProvider>
        </StoreProvider>
      </MemoryRouter>
    </I18nProvider>,
  );
}
const profile = { key: "profile", name: "Mei", coins: 10, lang: "en", theme: "white", accountType: "individual" };
const piano = { id: "piano", name: "Piano", color: "#5AA8F2", days: [], createdAt: Date.now() - 86400000, updatedAt: 1 };

beforeAll(stubBrowser);
beforeEach(async () => {
  await clearAll();
  localStorage.clear();
  server.reset();
  h.auth.user = null;
  await put("meta", profile);
});
afterEach(cleanup);

describe("planting a tree", () => {
  it("adds it to Home and keeps it", async () => {
    await put("interests", piano);
    app("/");
    fireEvent.click(await screen.findByRole("button", { name: /plant/i }));
    await waitFor(() => expect(document.querySelector(".tree-sheet input")).toBeTruthy());
    fireEvent.change(document.querySelector(".tree-sheet input"), { target: { value: "Chess" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(async () => expect((await getAll("interests")).map((i) => i.name).sort()).toEqual(["Chess", "Piano"]));
    expect((await screen.findAllByText("Chess")).length).toBeGreaterThan(0);
  });

  it("refuses a screen-time hobby and keeps the sheet open", async () => {
    await put("interests", piano);
    app("/");
    fireEvent.click(await screen.findByRole("button", { name: /plant/i }));
    await waitFor(() => expect(document.querySelector(".tree-sheet input")).toBeTruthy());
    fireEvent.change(document.querySelector(".tree-sheet input"), { target: { value: "Video games" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(document.querySelector(".tree-sheet")).toBeTruthy();
    expect((await getAll("interests")).map((i) => i.name)).toEqual(["Piano"]);
  });
});

describe("logging", () => {
  it("saves the entry, shows it, and pays coins", async () => {
    await put("interests", piano);
    app("/interest/piano");
    const logButtons = await screen.findAllByRole("button", { name: /log/i });
    fireEvent.click(logButtons[0]);
    const words = await waitFor(() => {
      const el = document.querySelector(".log-sheet textarea");
      if (!el) throw new Error("no sheet yet");
      return el;
    });
    fireEvent.change(words, { target: { value: "Played the scale without stopping" } });
    fireEvent.click(document.querySelector(".log-go"));
    await waitFor(async () => {
      const [entry] = await getAll("entries");
      expect(entry).toMatchObject({ interestId: "piano", text: "Played the scale without stopping" });
    });
    await waitFor(async () => {
      const [meta] = await getAll("meta");
      expect(meta.coins).toBe(profile.coins + COINS_PER_LOG);
    });
    expect(await screen.findByText("Played the scale without stopping")).toBeTruthy();
  });
});

describe("deleting a tree", () => {
  async function deletePiano() {
    await put("interests", piano);
    await put("entries", { id: "e1", interestId: "piano", date: "2026-11-01", text: "scales", minutes: 20, createdAt: 1 });
    app("/interest/piano");
    fireEvent.click(await screen.findByRole("button", { name: "Edit tree" }));
    fireEvent.click(await screen.findByRole("button", { name: /cut down this tree/i }));
  }

  it("can be undone", async () => {
    await deletePiano();
    fireEvent.click(await screen.findByRole("button", { name: "Undo" }));
    expect((await screen.findAllByText("Piano")).length).toBeGreaterThan(0);
    await new Promise((r) => setTimeout(r, 50));
    expect((await getAll("interests"))[0].deletedAt).toBeUndefined();
  });

  it("goes to Recently Deleted, with its logs, once the undo window passes", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      await deletePiano();
      await screen.findByRole("button", { name: "Undo" });
      expect(screen.queryByText("Piano")).toBeNull();
      await act(async () => { vi.advanceTimersByTime(7000); });
    } finally {
      vi.useRealTimers();
    }
    await waitFor(async () => {
      const [tree] = await getAll("interests");
      const [entry] = await getAll("entries");
      expect(tree.deletedAt).toBeGreaterThan(0);
      expect(entry.deletedAt).toBe(tree.deletedAt);
    });
    expect(screen.queryByRole("button", { name: "Undo" })).toBeNull();
  });
});

describe("onboarding", () => {
  it("turns a new account into a garden, here and on the server", async () => {
    const srv = server;
    const remote = await import("../lib/remote");
    const Onboarding = (await import("../components/onboarding/Onboarding")).default;
    const { STR } = await import("../i18n/strings");
    const en = (key) => STR[key][0];
    await clearAll();
    srv.userRow = { display_name: "mei", onboarding_completed: false, created_at: new Date().toISOString() };
    h.auth.user = { id: "u1", user_metadata: { username: "mei", accountType: "individual" } };

    render(
      <I18nProvider>
        <MemoryRouter><StoreProvider><UIProvider><Onboarding /></UIProvider></StoreProvider></MemoryRouter>
      </I18nProvider>,
    );
    const next = () => fireEvent.click(screen.getByRole("button", { name: en("sfContinue") }));
    next();                                                     // intro
    fireEvent.click(screen.getByRole("button", { name: en("sfFemale") }));
    next();                                                     // gender
    const hobby = document.querySelector(".sf-check");
    const hobbyName = hobby.textContent.trim();
    fireEvent.click(hobby);
    next();                                                     // hobbies
    next();                                                     // confirm
    next();                                                     // schedule
    next();                                                     // look
    fireEvent.click(screen.getByRole("button", { name: en("sfNotNow") }));

    await waitFor(async () => {
      const [meta] = await getAll("meta");
      expect(meta).toMatchObject({ name: "mei", userId: "u1", accountType: "individual", coins: 0 });
    });
    await waitFor(() => expect(srv.rows.interests.map((i) => i.name)).toEqual([hobbyName]));
    expect(remote.markOnboardingComplete).toHaveBeenCalledWith("u1");
    expect(srv.userRow.onboarding_completed).toBe(true);
  });
});
