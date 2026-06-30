import { headers } from "next/headers";

export type RequestMetadata = {
  ip:        string;
  userAgent: string;
};

/** Captura IP e User-Agent a partir dos headers HTTP (server-side only). */
export async function getRequestMetadata(): Promise<RequestMetadata> {
  const h = await headers();

  const forwarded = h.get("x-forwarded-for");
  const realIp    = h.get("x-real-ip");
  const cfIp      = h.get("cf-connecting-ip");

  let ip = "unknown";
  if (forwarded) {
    ip = forwarded.split(",")[0].trim();
  } else if (realIp) {
    ip = realIp.trim();
  } else if (cfIp) {
    ip = cfIp.trim();
  }

  const userAgent = h.get("user-agent") ?? "unknown";

  return { ip, userAgent };
}
