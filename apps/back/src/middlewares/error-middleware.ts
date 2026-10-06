import type { ErrorRequestHandler } from "express";
import pino from "pino";

const logger = pino({ level: process.env.LOG_LEVEL ?? "info" });

export const errorMiddleware: ErrorRequestHandler = (error, _req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }
  res.setHeader("Cache-Control", "no-store");
  if (error?.type === "entity.parse.failed") {
    res.status(400).json({ error: "Invalid JSON body." });
    return;
  }
  if (error?.type === "entity.too.large") {
    res.status(413).json({ error: "Request body exceeds 8 KB." });
    return;
  }
  logger.error("Unhandled request error");
  res.status(500).json({ error: "Internal server error." });
};
