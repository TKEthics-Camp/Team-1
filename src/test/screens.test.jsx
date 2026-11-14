// @vitest-environment jsdom
// Every main screen renders, in both languages, with a realistic garden —
// the same sample data the design preview uses (src/dev/mockStore). Catches
// a screen that crashes on render before anyone opens it on a phone.
import { describe, it, expect, vi, afterEach, beforeAll } from "vitest";
import { render, cleanup, screen } from "@testing-library/react";
import { Suspense, useLayoutEffect } from "react";
import { MemoryRouter, Routes, Route } from "react-router-dom";

vi.mock("../store/StoreContext", () => import("../dev/mockStore"));
vi.mock("../store/AuthContext", () => import("../dev/mockAuth"));
// Nothing leaves the test: every server call answers "nothing there".
vi.mock("../lib/supabase", () => ({ supabase: null }));
vi.mock("../lib/remote", async (importOriginal) => {
  const real = await importOriginal();
  const stubbed = {};
  for (const [k, v] of Object.entries(real)) {
    stubbed[k] = typeof v === "function" && k !== "parseAvatar" ? vi.fn(async () => null) : v;
  }
  return stubbed;
});

const { I18nProvider, useI18n } = await import("../i18n/I18nContext");

function Lang({ lang, children }) {
  const { lang: current, setLang } = useI18n();
  useLayoutEffect(() => { setLang(lang); }, [lang, setLang]);
  return current === lang ? children : null;
}
const { UIProvider } = await import("../ui/UIContext");
const screens = {
  "/": (await import("../components/home/HomeScreen")).default,
  "/journal": (await import("../components/journal/JournalScreen")).default,
  "/explore": (await import("../components/explore/ExploreScreen")).default,
  "/profile": (await import("../components/profile/ProfileScreen")).default,
  "/market": (await import("../components/market/MarketScreen")).default,
  "/interest/i1": (await import("../components/interest/InterestScreen")).default,
};

beforeAll(() => {
  // jsdom leaves these out; the screens only use them for polish.
  window.matchMedia ||= () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
  window.IntersectionObserver ||= class { observe() {} unobserve() {} disconnect() {} };
  window.ResizeObserver ||= class { observe() {} unobserve() {} disconnect() {} };
  window.scrollTo = () => {};
  HTMLElement.prototype.scrollIntoView ||= () => {};
});
afterEach(cleanup);

describe.each(["en", "zh"])("screens (%s)", (lang) => {
  it.each(Object.keys(screens))("%s renders", async (path) => {
    const Screen = screens[path];
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    const { container } = render(
      <I18nProvider><Lang lang={lang}>
        <MemoryRouter initialEntries={[path]}>
          <UIProvider>
            <Suspense fallback={null}>
              <Routes>
                <Route path={path === "/interest/i1" ? "/interest/:id" : path} element={<Screen />} />
              </Routes>
            </Suspense>
          </UIProvider>
        </MemoryRouter>
      </Lang></I18nProvider>,
    );
    await screen.findAllByRole("button");
    expect(container.textContent.length).toBeGreaterThan(0);
    // Really in that language. (English screens can still show some
    // Chinese on purpose — the language switch says 中文 — so only zh is checked.)
    if (lang === "zh") expect(container.textContent).toMatch(/[\u4e00-\u9fff]/);
    // No React warnings (missing keys, bad props) either.
    expect(errors.mock.calls.map((c) => String(c[0]))).toEqual([]);
    errors.mockRestore();
  });
});
