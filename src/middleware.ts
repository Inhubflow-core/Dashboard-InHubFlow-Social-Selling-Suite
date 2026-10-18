import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Coincidir con todas las rutas excepto archivos estáticos y API routes
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
