import type { RequestHandler } from "express";

// Bearer tokens are explicit; no cookies or ambient credentials cross origins.
export const corsMiddleware: RequestHandler = (req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "authorization, apikey, content-type, x-client-info, x-region",
  );
  res.setHeader(
    "Access-Control-Expose-Headers",
    "WWW-Authenticate, x-sb-edge-region, Content-Disposition",
  );
  if (req.method === "OPTIONS") {
    // Cache permission for preflights only; every actual request still authenticates.
    res.setHeader("Access-Control-Max-Age", "600");
    res.status(204).end();
    return;
  }
  next();
};
