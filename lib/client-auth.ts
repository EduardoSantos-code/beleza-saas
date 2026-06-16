import { cookies } from "next/headers";
import { jwtVerify, SignJWT } from "jose";

export type ClientSessionPayload = {
  tenantId: string;
  slug: string;
  phoneE164: string;
  clientId: string;
  purpose: "CLUB_PORTAL";
};

export function getClientSessionSecret() {
  const secret =
    process.env.CLIENT_SESSION_SECRET ||
    process.env.JWT_SECRET ||
    process.env.AUTH_SECRET ||
    "dev-only-client-session-secret";

  if (process.env.NODE_ENV === "production" && secret === "dev-only-client-session-secret") {
    throw new Error("CLIENT_SESSION_SECRET não configurado.");
  }

  return new TextEncoder().encode(secret);
}

export async function getClientSession(slug: string): Promise<ClientSessionPayload | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("club_portal_session");

    if (!sessionCookie) return null;

    const { payload } = await jwtVerify(
      sessionCookie.value,
      getClientSessionSecret(),
      { algorithms: ["HS256"] }
    );

    const isValid =
      payload.tenantId &&
      payload.slug === slug &&
      payload.phoneE164 &&
      payload.clientId &&
      payload.purpose === "CLUB_PORTAL";

    if (!isValid) return null;

    return {
      tenantId: payload.tenantId as string,
      slug: payload.slug as string,
      phoneE164: payload.phoneE164 as string,
      clientId: payload.clientId as string,
      purpose: payload.purpose as "CLUB_PORTAL",
    };
  } catch {
    return null;
  }
}

export async function setClientSession(slug: string, tenantId: string, clientId: string, phoneE164: string) {
  const secret = getClientSessionSecret();
  
  const token = await new SignJWT({
    tenantId,
    slug,
    phoneE164,
    clientId,
    purpose: "CLUB_PORTAL",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d") // 30 dias para comodidade do cliente
    .sign(secret);

  const cookieStore = await cookies();
  cookieStore.set("club_portal_session", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 dias
  });

  return token;
}

export async function deleteClientSession() {
  const cookieStore = await cookies();
  cookieStore.delete("club_portal_session");
}
