import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { HttpError } from "./repo";

export async function handle<T>(fn: () => Promise<T>): Promise<NextResponse> {
  try {
    return NextResponse.json(await fn());
  } catch (err) {
    if (err instanceof HttpError) return NextResponse.json({ error: err.message }, { status: err.status });
    if (err instanceof ZodError) return NextResponse.json({ error: "요청 형식이 올바르지 않아요." }, { status: 400 });
    console.error(err);
    return NextResponse.json({ error: "서버에서 문제가 생겼어요. 잠시 후 다시 시도해 주세요." }, { status: 500 });
  }
}
