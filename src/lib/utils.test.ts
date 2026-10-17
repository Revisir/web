import { describe, expect, it } from "vitest";
import { cn } from "./utils";

describe("cn", () => {
  it("keeps a Stitch text size beside a text color", () => {
    expect(cn("text-mono-sm", "text-warning-foreground")).toBe("text-mono-sm text-warning-foreground");
    expect(cn("text-muted-foreground text-body-md")).toBe("text-muted-foreground text-body-md");
  });

  it("still lets a later size or color win", () => {
    expect(cn("text-body-md", "text-headline-sm")).toBe("text-headline-sm");
    expect(cn("text-sm", "text-body-md")).toBe("text-body-md");
    expect(cn("text-foreground", "text-muted-foreground")).toBe("text-muted-foreground");
  });
});
