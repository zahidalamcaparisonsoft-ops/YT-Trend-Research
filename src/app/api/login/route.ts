import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const password = String(form.get("password") || "");
  const expected = process.env.APP_PASSWORD || "changeme-please";
  const base = req.nextUrl.origin;

  if (password !== expected) {
    return NextResponse.redirect(`${base}/login?error=1`, { status: 303 });
  }
  const res = NextResponse.redirect(`${base}/`, { status: 303 });
  res.cookies.set("ce_auth", expected, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
