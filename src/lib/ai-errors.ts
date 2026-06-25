export function getAiErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return "Something went wrong while contacting the AI service.";
}
