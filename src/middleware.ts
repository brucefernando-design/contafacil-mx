import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { checkRateLimit } from "@/lib/rate-limit";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Extraer IP del cliente
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "127.0.0.1";

  // 1. Rate Limiting en memoria: login, registro, timbrar, upload cert (20/min por IP)
  let rateLimitAction: string | null = null;
  if (
    (pathname === "/api/auth/callback/credentials" ||
      pathname === "/api/auth/signin/credentials" ||
      pathname === "/login") &&
    req.method === "POST"
  ) {
    rateLimitAction = "login";
  } else if (pathname === "/api/auth/register" && req.method === "POST") {
    rateLimitAction = "registro";
  } else if (pathname === "/api/cfdi/timbrar" && req.method === "POST") {
    rateLimitAction = "timbrar";
  } else if (pathname === "/api/certificates/upload" && req.method === "POST") {
    rateLimitAction = "upload_cert";
  }

  if (rateLimitAction) {
    const rl = checkRateLimit(ip, rateLimitAction, 20, 60 * 1000);
    if (!rl.success) {
      return NextResponse.json(
        {
          error: "Demasiadas solicitudes. Límite de 20 peticiones por minuto excedido para esta acción.",
          action: rateLimitAction,
          retryAfter: Math.ceil((rl.reset - Date.now()) / 1000),
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.max(1, Math.ceil((rl.reset - Date.now()) / 1000))),
          },
        }
      );
    }
  }

  // 2. Rutas Públicas permitidas sin autenticación:
  // /, /login, /registro, /precios, /terminos, /privacidad, /api/auth/*
  // /api/payments/webhook (MercadoPago necesita llamar esto sin sesión)
  const publicExactPaths = [
    "/",
    "/login",
    "/registro",
    "/precios",
    "/terminos",
    "/privacidad",
  ];

  const isPublicPage = publicExactPaths.includes(pathname);
  const isPublicAuthApi = pathname.startsWith("/api/auth");
  // El webhook de MercadoPago llega sin sesión de usuario
  const isMpWebhook = pathname.startsWith("/api/payments/webhook");

  if (isPublicPage || isPublicAuthApi || isMpWebhook) {
    return NextResponse.next();
  }

  // 3. Verificación de Autenticación para rutas protegidas (/dashboard y /api)
  const isDashboard = pathname.startsWith("/dashboard");
  const isApi = pathname.startsWith("/api");

  if (isDashboard || isApi) {
    const secret = process.env.NEXTAUTH_SECRET;

    // Obtener token JWT de sesión verificando HTTP y HTTPS
    let token = null;
    try {
      token = await getToken({
        req,
        secret,
        secureCookie: req.url.startsWith("https://"),
      });
      if (!token) {
        token = await getToken({
          req,
          secret,
          secureCookie: !req.url.startsWith("https://"),
        });
      }
    } catch {
      token = null;
    }

    if (!token) {
      if (isDashboard) {
        const loginUrl = new URL("/login", req.url);
        loginUrl.searchParams.set("callbackUrl", req.url);
        return NextResponse.redirect(loginUrl);
      }
      if (isApi) {
        const headers: Record<string, string> = {};
        if (pathname.startsWith("/api/certificates/upload")) {
          headers["Cache-Control"] = "no-store, no-cache, must-revalidate";
          headers["Pragma"] = "no-cache";
        }
        return NextResponse.json(
          { error: "No autenticado. Inicie sesión para acceder a este recurso." },
          { status: 401, headers }
        );
      }
    }
  }

  const response = NextResponse.next();

  // En upload de certificados, asegurar siempre header no-store
  if (pathname.startsWith("/api/certificates/upload")) {
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
    response.headers.set("Pragma", "no-cache");
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for static files:
     * - _next/static, _next/image, favicon.ico, images/icons
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
