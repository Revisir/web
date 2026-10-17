export const TOGGLE_THEME = "TOGGLE_THEME";
export const SET_THEME = "SET_THEME";

const THEME_KEY = "reviser-theme";

// The theme tokens in index.css switch on the `dark` class.
function applyTheme(theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

export function themeStateInit() {
  const saved = localStorage.getItem(THEME_KEY);
  const theme = saved || "light";
  applyTheme(theme);
  return { theme };
}

function themeReducer(state, { type, payload }) {
  switch (type) {
    case TOGGLE_THEME: {
      const next = state.theme === "light" ? "dark" : "light";
      localStorage.setItem(THEME_KEY, next);
      applyTheme(next);
      return { theme: next };
    }
    case SET_THEME: {
      const { theme } = payload;
      localStorage.setItem(THEME_KEY, theme);
      applyTheme(theme);
      return { theme };
    }
    default:
      return state;
  }
}

export default themeReducer;
