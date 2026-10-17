import { useContext, useMemo } from "react";
import { AppContext } from "@/store/AppProvider";

export type ThemeMode = "light" | "dark";

/** The theme's color tokens from src/index.css, resolved for the active theme. */
export interface ThemeColors {
  mode: ThemeMode;
  /** `--chart-1` to `--chart-5`: primary, success, warning, destructive and muted foreground. */
  chart: string[];
  background: string;
  foreground: string;
  card: string;
  mutedForeground: string;
  border: string;
  primary: string;
  primaryForeground: string;
  success: string;
  warning: string;
  destructive: string;
  surfaceContainerLowest: string;
  surfaceContainerLow: string;
  surfaceContainer: string;
  surfaceContainerHigh: string;
  surfaceContainerHighest: string;
}

const CHART_VARIABLES = ["--chart-1", "--chart-2", "--chart-3", "--chart-4", "--chart-5"];

/** Reads the token variables from <html>, which carries the `dark` class for the dark theme. */
export function readThemeColors(mode: ThemeMode): ThemeColors {
  const style = getComputedStyle(document.documentElement);
  const read = (name: string) => style.getPropertyValue(name).trim();
  return {
    mode,
    chart: CHART_VARIABLES.map(read),
    background: read("--background"),
    foreground: read("--foreground"),
    card: read("--card"),
    mutedForeground: read("--muted-foreground"),
    border: read("--border"),
    primary: read("--primary"),
    primaryForeground: read("--primary-foreground"),
    success: read("--success"),
    warning: read("--warning"),
    destructive: read("--destructive"),
    surfaceContainerLowest: read("--surface-container-lowest"),
    surfaceContainerLow: read("--surface-container-low"),
    surfaceContainer: read("--surface-container"),
    surfaceContainerHigh: read("--surface-container-high"),
    surfaceContainerHighest: read("--surface-container-highest"),
  };
}

/**
 * Token colors for canvas and SVG drawing (charts, the mind map), which cannot use CSS variables.
 * The theme reducer switches the `dark` class on <html> before the provider re-renders, so the
 * values are read again whenever AppContext's theme changes.
 */
export default function useThemeColors(): ThemeColors {
  const { theme } = useContext(AppContext);
  return useMemo(() => readThemeColors(theme === "dark" ? "dark" : "light"), [theme]);
}
