// The backend's error body is `{ error: { code, message } }`; axios puts it on `error.response.data`.
type ApiErrorLike = {
  message?: string;
  response?: { data?: { error?: { code?: string; message?: string } } };
};

export const AI_NOT_CONFIGURED_MESSAGE = "AI is not set up. Please contact the administrator to configure AI services.";

export function getApiErrorCode(error: unknown): string | undefined {
  return (error as ApiErrorLike | null | undefined)?.response?.data?.error?.code;
}

/** The message to show for a failed request, with the AI setup message for AI_NOT_CONFIGURED. */
export function getApiErrorMessage(error: unknown, fallback = "Something went wrong"): string {
  if (getApiErrorCode(error) === "AI_NOT_CONFIGURED") return AI_NOT_CONFIGURED_MESSAGE;
  const apiError = error as ApiErrorLike | null | undefined;
  return apiError?.response?.data?.error?.message || apiError?.message || fallback;
}
