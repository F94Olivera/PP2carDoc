export type ApiErrorResponse = {
  code:
    | "VALIDATION_ERROR"
    | "INVALID_CREDENTIALS"
    | "UNAUTHORIZED"
    | "FORBIDDEN"
    | "NOT_FOUND"
    | "CONFLICT"
    | "RATE_LIMITED";
  message: string;
};
