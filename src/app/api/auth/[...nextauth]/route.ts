import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextRequest } from "next/server";

async function handler(req: NextRequest, ctx: any) {
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") || (host?.includes("localhost") ? "http" : "https");

  if (host) {
    process.env.NEXTAUTH_URL = `${proto}://${host}`;
  }

  const isHttps = proto === "https";

  const dynamicOptions = {
    ...authOptions,
    useSecureCookies: isHttps,
    cookies: isHttps
      ? {
          sessionToken: {
            name: `__Secure-next-auth.session-token`,
            options: {
              httpOnly: true,
              sameSite: "none" as const,
              path: "/",
              secure: true,
            },
          },
          callbackUrl: {
            name: `__Secure-next-auth.callback-url`,
            options: {
              sameSite: "none" as const,
              path: "/",
              secure: true,
            },
          },
          csrfToken: {
            name: `__Host-next-auth.csrf-token`,
            options: {
              httpOnly: true,
              sameSite: "none" as const,
              path: "/",
              secure: true,
            },
          },
        }
      : undefined,
  };

  return NextAuth(dynamicOptions)(req as any, ctx);
}

export { handler as GET, handler as POST };

