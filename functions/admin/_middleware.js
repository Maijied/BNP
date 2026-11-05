import { isAdmin } from "../_lib/admin-auth.js";

// Cloudflare Pages middleware applies to static admin URLs too.
// The Next.js middleware does not execute for Next static export on Pages.
export async function onRequest({ request, env, next }) {
  const url = new URL(request.url);
  if (url.pathname === "/admin/login" || url.pathname === "/admin/login/") {
    return next();
  }
  if (!(await isAdmin(request, env))) {
    const login = new URL("/admin/login", url.origin);
    login.searchParams.set("from", url.pathname.startsWith("/admin/") ? url.pathname : "/admin/orders");
    return Response.redirect(login.toString(), 302);
  }
  return next();
}
