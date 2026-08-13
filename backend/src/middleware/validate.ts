import { NextFunction, Request, Response } from "express";
import { AnyZodObject } from "zod";

/**
 * Validates req.{body,query,params} against a Zod schema shaped as
 * { body?, query?, params? }. Throws ZodError on failure, which the
 * centralized errorHandler translates into a 400 with field-level detail.
 * Replaces req.body/query/params with the parsed (and type-coerced) result,
 * so downstream controllers get already-clean data.
 */
export function validate(schema: AnyZodObject) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const parsed = schema.parse({
      body: req.body,
      query: req.query,
      params: req.params,
    });

    if (parsed.body) req.body = parsed.body;
    if (parsed.query) req.query = parsed.query;
    if (parsed.params) req.params = parsed.params;

    next();
  };
}
