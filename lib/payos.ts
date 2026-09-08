import "server-only";
import { PayOS } from "@payos/node";

let client: PayOS | null = null;

export function getPayOS() {
  if (client) return client;

  const clientId = process.env.PAYOS_CLIENT_ID;
  const apiKey = process.env.PAYOS_API_KEY;
  const checksumKey = process.env.PAYOS_CHECKSUM_KEY;

  if (!clientId || !apiKey || !checksumKey) {
    throw new Error(
      "Thiếu PAYOS_CLIENT_ID / PAYOS_API_KEY / PAYOS_CHECKSUM_KEY trong .env",
    );
  }

  client = new PayOS({ clientId, apiKey, checksumKey });
  return client;
}

export function appBaseUrl(request?: Request) {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (configured) return configured;

  if (request) {
    const host =
      request.headers.get("x-forwarded-host") ?? request.headers.get("host");
    if (host) {
      const proto = request.headers.get("x-forwarded-proto") ?? "http";
      return `${proto}://${host}`;
    }
  }

  return "http://localhost:3000";
}

/** PayOS mô tả chuyển khoản thường giới hạn ngắn (≈9 ký tự với TK không liên kết). */
export function payosDescription(orderCode: number) {
  const code = String(orderCode).slice(-7);
  return `TT${code}`.slice(0, 9);
}
