import { NextRequest } from "next/server";

export function getRequestIp(req: NextRequest) {
  const forwardedFor = req.headers.get("x-forwarded-for");
  return (
    req.ip ??
    req.headers.get("x-real-ip") ??
    forwardedFor?.split(",").at(0)?.trim() ??
    ""
  );
}

export function getUserAgent(req: NextRequest) {
  return req.headers.get("user-agent") ?? "";
}
