import { NextFunction, Request, Response } from "express";

export class InvalidParameterError extends Error {
  public details;
  constructor(message: string, details: {}[] | null = []) {
    super(message);
    this.name = "InvalidParameterError";
    this.details = details === null ? [] : details;
  }
}
export class UnAuthorizedError extends InvalidParameterError {
  public details;
  constructor(message: string, details: {}[] | null = []) {
    super(message);
    this.name = "UnAuthorizedError";
    this.details = details === null ? [] : details;
  }
}

export function logErrors(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.error(err.stack);
  next(err);
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (err instanceof UnAuthorizedError) {
    res.status(401);
    res.json({
      error: {
        name: err.name,
        message: err.message,
        details: (err as UnAuthorizedError).details,
      },
    });
  } else if (err instanceof InvalidParameterError) {
    res.status(400);
    res.json({
      error: {
        name: err.name,
        message: err.message,
        details: (err as InvalidParameterError).details,
      },
    });
  } else {
    res.status(500);
    res.json({
      error: {
        name: err.name,
        message: err.message,
      },
    });
  }
}
