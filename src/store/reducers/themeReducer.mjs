export const TOGGLE_THEME = "TOGGLE_THEME";
export const SET_THEME = "SET_THEME";

const THEME_KEY = "reviser-theme";

export function themeStateInit() {
  const saved = localStorage.getItem(THEME_KEY);
  const theme = saved || "light";
  document.documentElement.setAttribute("data-bs-theme", theme);
  return { theme };
}

function themeReducer(state, { type, payload }) {
  switch (type) {
    case TOGGLE_THEME: {
      const next = state.theme === "light" ? "dark" : "light";
      localStorage.setItem(THEME_KEY, next);
      document.documentElement.setAttribute("data-bs-theme", next);
      return { theme: next };
    }
    case SET_THEME: {
      const { theme } = payload;
      localStorage.setItem(THEME_KEY, theme);
      document.documentElement.setAttribute("data-bs-theme", theme);
      return { theme };
    }
    default:
      return state;
  }
}

export default themeReducer;
