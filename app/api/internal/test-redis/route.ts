import { NextResponse } from "next/server";
import { getRedis } from "@/lib/redis";

export async function GET() {
  try {
    const redis = getRedis();

    if (!redis) {
      return NextResponse.json(
        { ok: false, error: "REDIS_URL não configurada" },
        { status: 500 }
      );
    }

    await redis.set("test:redis", "ok", "EX", 60);
    const value = await redis.get("test:redis");

    return NextResponse.json({
      ok: true,
      value,
    });
  } catch (error: any) {
    console.error("[TEST_REDIS_ERROR]", error);

    return NextResponse.json(
      {
        ok: false,
        error: error?.message || "Erro ao conectar no Redis",
      },
      { status: 500 }
    );
  }
}
