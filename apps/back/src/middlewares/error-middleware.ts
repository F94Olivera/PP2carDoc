import type { ErrorRequestHandler } from "express";
import pino from "pino";

import { isInactiveSession } from "../database.js";

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
    res.status(413).json({ error: "Request body exceeds the allowed size." });
    return;
  }
  if (isInactiveSession(error)) {
    res.setHeader("WWW-Authenticate", "Bearer");
    res.status(401).json({ error: "Invalid or expired session." });
    return;
  }
  const code = error?.cause?.code ?? error?.code;
  if (code === "23505" || code === "23503") {
    res.status(409).json({ error: "Record conflicts with existing data or related records." });
    return;
  }
  if (code === "42501") {
    res.status(403).json({ error: "Operation not permitted." });
    return;
  }
  logger.error("Unhandled request error");
  res.status(500).json({ error: "Internal server error." });
};
