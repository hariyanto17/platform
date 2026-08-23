import { Request, Response, NextFunction } from "express";

export const catchAsync =
  (fn: any) => (request: Request, response: Response, next: NextFunction) => {
    Promise.resolve(fn(request, response, next)).catch((error: Error) => {
      console.error("Error caught in catchAsync:", error);
      console.log("request body =>", request.body);
      next(error);
    });
  };
