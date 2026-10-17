import { describe, expect, it } from "vitest";
import { AI_NOT_CONFIGURED_MESSAGE, getApiErrorCode, getApiErrorMessage } from "./apiErrors";

const apiError = (code: string, message: string) => ({ message: "Request failed", response: { data: { error: { code, message } } } });

describe("apiErrors", () => {
  it("reads the error code from the response body", () => {
    expect(getApiErrorCode(apiError("ALREADY_REVIEWED_TODAY", "Already reviewed"))).toBe("ALREADY_REVIEWED_TODAY");
    expect(getApiErrorCode(new Error("Network Error"))).toBeUndefined();
    expect(getApiErrorCode(undefined)).toBeUndefined();
  });

  it("maps AI_NOT_CONFIGURED to the setup message", () => {
    expect(getApiErrorMessage(apiError("AI_NOT_CONFIGURED", "No LLM key"))).toBe(AI_NOT_CONFIGURED_MESSAGE);
  });

  it("passes other messages through, then falls back", () => {
    expect(getApiErrorMessage(apiError("NOT_DUE", "Topic is not due"))).toBe("Topic is not due");
    expect(getApiErrorMessage(new Error("Network Error"))).toBe("Network Error");
    expect(getApiErrorMessage(null, "Failed to start")).toBe("Failed to start");
  });
});
