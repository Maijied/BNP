// Cloudflare Pages Function: /api/admin/logout
export async function onRequestPost() {
  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": "bnp_admin_session=; Path=/; HttpOnly; Max-Age=0",
    },
  });
}
