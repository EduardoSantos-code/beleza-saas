import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      console.error("[CLUB_SUBSCRIPTIONS_EXPIRE_CRON_ERROR] CRON_SECRET não configurado.");
      return NextResponse.json(
        { error: "CRON_SECRET não configurado." },
        { status: 500 }
      );
    }

    const expected = `Bearer ${cronSecret}`;
    if (authHeader !== expected) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    }

    const now = new Date();

    const result = await prisma.clubSubscription.updateMany({
      where: {
        status: "ACTIVE",
        currentPeriodEnd: {
          lt: now,
        },
      },
      data: {
        status: "EXPIRED",
      },
    });

    const executedAt = new Date().toISOString();

    console.log("[CLUB_SUBSCRIPTIONS_EXPIRE_CRON]", {
      expiredCount: result.count,
      executedAt,
    });

    return NextResponse.json({
      ok: true,
      expiredCount: result.count,
      executedAt,
    });
  } catch (error) {
    console.error("[CLUB_SUBSCRIPTIONS_EXPIRE_CRON_ERROR]", error);
    return NextResponse.json(
      { error: "Não foi possível processar expiração de assinaturas." },
      { status: 500 }
    );
  }
}