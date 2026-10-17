import { describe, expect, it } from "vitest";
import themeReducer, { SET_THEME, TOGGLE_THEME, themeStateInit } from "./themeReducer.mjs";

const html = document.documentElement;

describe("themeReducer", () => {
  it("starts light without a stored preference", () => {
    expect(themeStateInit()).toEqual({ theme: "light" });
    expect(html.classList.contains("dark")).toBe(false);
  });

  it("toggles the dark class and stores the choice", () => {
    const dark = themeReducer(themeStateInit(), { type: TOGGLE_THEME, payload: undefined });
    expect(dark).toEqual({ theme: "dark" });
    expect(html.classList.contains("dark")).toBe(true);
    expect(localStorage.getItem("reviser-theme")).toBe("dark");

    themeReducer(dark, { type: TOGGLE_THEME, payload: undefined });
    expect(html.classList.contains("dark")).toBe(false);
  });

  it("restores a stored dark preference", () => {
    themeReducer({ theme: "light" }, { type: SET_THEME, payload: { theme: "dark" } });
    expect(themeStateInit()).toEqual({ theme: "dark" });
    expect(html.classList.contains("dark")).toBe(true);
  });
});
