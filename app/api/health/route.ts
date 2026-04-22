import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    app: "beleza-saas",
    time: new Date().toISOString(),
  });
}