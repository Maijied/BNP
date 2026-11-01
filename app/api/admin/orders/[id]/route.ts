import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { getPool } from "@/lib/db";
import mysql from "mysql2/promise";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = Number(params.id);
  if (!id) {
    return NextResponse.json({ error: "Invalid order ID" }, { status: 400 });
  }

  const body = await req.json();
  const { payment_status, status, notes } = body;

  const p = getPool();
  if (p) {
    try {
      const updates: string[] = [];
      const values: any[] = [];

      if (payment_status) {
        updates.push("payment_status = ?");
        values.push(payment_status);
      }
      if (status) {
        updates.push("status = ?");
        values.push(status);
      }
      if (notes !== undefined) {
        updates.push("notes = ?");
        values.push(notes);
      }

      if (updates.length === 0) {
        return NextResponse.json({ error: "No fields to update" }, { status: 400 });
      }

      values.push(id);
      await p.execute(
        `UPDATE orders SET ${updates.join(", ")} WHERE id = ?`,
        values
      );

      return NextResponse.json({ ok: true });
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
