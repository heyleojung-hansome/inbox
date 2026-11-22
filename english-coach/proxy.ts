import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE, passcodeToken } from "@/lib/auth";

/** APP_PASSCODE가 설정되어 있으면 비밀번호를 입력한 기기만 접속할 수 있습니다. */
export default async function proxy(req: NextRequest) {
  const passcode = process.env.APP_PASSCODE;
  if (!passcode) return NextResponse.next();
  const path = req.nextUrl.pathname;
  if (path === "/login" || path === "/api/login") return NextResponse.next();
  const token = req.cookies.get(AUTH_COOKIE)?.value;
  if (token && token === (await passcodeToken(passcode))) return NextResponse.next();
  if (path.startsWith("/api/")) return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  return NextResponse.redirect(new URL("/login", req.nextUrl));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png|icon-192.png|icon-512.png|manifest.webmanifest).*)"],
};
