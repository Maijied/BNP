// Cloudflare Pages Function: /api/admin/login
export async function onRequestPost({ request, env }) {
  try {
    const { username, password } = await request.json().catch(() => ({}));
    const expectedUser = env.ADMIN_USER || "admin";
    const expectedPass = env.ADMIN_PASSWORD || "bnp2026";

    if (username === expectedUser && password === expectedPass) {
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Set-Cookie": "bnp_admin_session=authenticated; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400",
        },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid credentials" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
