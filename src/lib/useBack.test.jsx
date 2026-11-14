// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import { useBack } from "./useBack";

function Screen() {
  const back = useBack("/");
  return <button onClick={back}>back</button>;
}
function Where() {
  return <p data-testid="where">{useLocation().pathname}</p>;
}
function app(entries) {
  render(
    <MemoryRouter initialEntries={entries} initialIndex={entries.length - 1}>
      <Routes>
        <Route path="/interest/:id" element={<Screen />} />
        <Route path="*" element={null} />
      </Routes>
      <Where />
    </MemoryRouter>,
  );
}

afterEach(cleanup);

describe("useBack", () => {
  it("goes back to wherever the screen was opened from", () => {
    app(["/journal", "/interest/piano"]);
    fireEvent.click(screen.getByText("back"));
    expect(screen.getByTestId("where").textContent).toBe("/journal");
  });

  it("goes to the fallback when the screen was opened directly", () => {
    app(["/interest/piano"]);
    fireEvent.click(screen.getByText("back"));
    expect(screen.getByTestId("where").textContent).toBe("/");
  });
});
