export const AUTH_COOKIE = "ce_auth";

export function expectedToken(): string {
  // The cookie holds the app password; middleware compares equality.
  return process.env.APP_PASSWORD || "changeme-please";
}
