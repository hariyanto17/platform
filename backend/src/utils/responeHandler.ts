import { Response } from "express";

export const responseHandler = {
  ok<T, M = any>(res: Response, data: T, message: string = "success", meta: M | null = null) {
    return res.status(200).json({
      status: "success",
      message,
      data,
      meta,
    });
  },

  created<T>(res: Response, data: T, message: string = "created") {
    return res.status(201).json({
      status: "success",
      message,
      data,
      // Note: meta is omitted from created in Consession
    });
  },
};
