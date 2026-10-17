import { useContext } from "react";
import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { useLocation } from "react-router-dom";
import { AppContext } from "../store/AppProvider";
import { renderWithProviders } from "./renderWithProviders";

function Probe() {
  const { theme } = useContext(AppContext);
  const location = useLocation();
  return (
    <p>
      theme:{theme} path:{location.pathname}
    </p>
  );
}

describe("renderWithProviders", () => {
  it("renders through the app, router and query providers", () => {
    renderWithProviders(<Probe />, { route: "/stats" });
    expect(screen.getByText("theme:light path:/stats")).toBeInTheDocument();
  });
});
