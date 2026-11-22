import { NextResponse } from "next/server";
import { AUTH_COOKIE, passcodeToken } from "@/lib/auth";

export async function POST(req: Request) {
  const expected = process.env.APP_PASSCODE;
  const { passcode } = (await req.json().catch(() => ({}))) as { passcode?: string };
  if (!expected) return NextResponse.json({ ok: true });
  if (!passcode || passcode !== expected) {
    return NextResponse.json({ error: "비밀번호가 맞지 않아요." }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTH_COOKIE, await passcodeToken(expected), {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 180,
  });
  return res;
}
