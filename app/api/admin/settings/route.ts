import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { getStoreSettings, updateStoreSetting } from "@/lib/db";

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const settings = await getStoreSettings();
  return NextResponse.json({ settings });
}

export async function POST(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();

    // Allowed settings keys
    const allowed = [
      "price_a",
      "price_b",
      "price_preorder_a",
      "price_preorder_b",
      "bracket_price",
      "delivery_dhaka",
      "delivery_outside",
      "urgency_text",
      "hotline",
      "whatsapp",
    ];

    for (const key of allowed) {
      if (body[key] !== undefined) {
        await updateStoreSetting(key, String(body[key]));
      }
    }

    const updated = await getStoreSettings();
    return NextResponse.json({ ok: true, settings: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to update settings" }, { status: 500 });
  }
}
