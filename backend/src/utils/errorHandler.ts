import { ErrorRequestHandler, Request, Response, NextFunction } from "express";
import { logger } from "./logger";
import { ErrorCode, ERROR_CODE } from "./interface";

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly httpStatus: number;

  constructor(errorCode: ErrorCode, message?: string) {
    super(ERROR_CODE[errorCode].message);
    this.message = message ?? ERROR_CODE[errorCode].message;
    this.code = ERROR_CODE[errorCode].code as ErrorCode;
    this.httpStatus = ERROR_CODE[errorCode].httpStatus;
  }
}

export const errorHandler: ErrorRequestHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  // Custom operational AppErrors
  if (err instanceof AppError) {
    const response = {
      status: "error",
      code: err.code,
      message: err.message,
    };
    logger.error(JSON.stringify(response));
    return res.status(err.httpStatus).json(response);
  }

  // JSON formatting issues from the parser
  if (
    err instanceof SyntaxError &&
    "status" in err &&
    err.status === 400 &&
    "body" in err
  ) {
    const response = {
      status: "error",
      code: ERROR_CODE.BAD_REQUEST.code,
      message: "Invalid JSON format",
    };
    logger.error(JSON.stringify(response));
    return res.status(ERROR_CODE.BAD_REQUEST.httpStatus).json(response);
  }

  // Generic runtime exceptions
  const response = {
    status: "error",
    code: ERROR_CODE.INTERNAL_SERVER_ERROR.code,
    message: err?.message || ERROR_CODE.INTERNAL_SERVER_ERROR.message,
  };
  logger.error(err?.stack || JSON.stringify(response));
  return res.status(ERROR_CODE.INTERNAL_SERVER_ERROR.httpStatus).json(response);
};
