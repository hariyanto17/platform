export type ErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "METHOD_NOT_ALLOWED"
  | "CONFLICT"
  | "INTERNAL_SERVER_ERROR"
  | "TOO_MANY_REQUESTS"
  | "SERVICE_UNAVAILABLE";

export const ERROR_CODE: Record<
  ErrorCode,
  { code: string; httpStatus: number; message: string }
> = {
  BAD_REQUEST: {
    code: "BAD_REQUEST",
    httpStatus: 400,
    message: "Bad Request",
  },
  UNAUTHORIZED: {
    code: "UNAUTHORIZED",
    httpStatus: 401,
    message: "Unauthorized",
  },
  FORBIDDEN: {
    code: "FORBIDDEN",
    httpStatus: 403,
    message: "Forbidden",
  },
  NOT_FOUND: {
    code: "NOT_FOUND",
    httpStatus: 404,
    message: "Not Found",
  },
  METHOD_NOT_ALLOWED: {
    code: "METHOD_NOT_ALLOWED",
    httpStatus: 405,
    message: "Method Not Allowed",
  },
  CONFLICT: {
    code: "CONFLICT",
    httpStatus: 409,
    message: "Conflict",
  },
  INTERNAL_SERVER_ERROR: {
    code: "INTERNAL_SERVER_ERROR",
    httpStatus: 500,
    message: "Internal Server Error",
  },
  TOO_MANY_REQUESTS: {
    code: "TOO_MANY_REQUESTS",
    httpStatus: 429,
    message: "Too Many Requests",
  },
  SERVICE_UNAVAILABLE: {
    code: "SERVICE_UNAVAILABLE",
    httpStatus: 503,
    message: "Service Unavailable",
  },
};
