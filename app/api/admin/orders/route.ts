import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { getPool } from "@/lib/db";
import mysql from "mysql2/promise";
import { OrderRecord } from "@/lib/types";

export async function GET(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").trim();
  const paymentStatus = url.searchParams.get("payment_status");
  const status = url.searchParams.get("status");

  const p = getPool();
  if (p) {
    try {
      let sql = "SELECT * FROM orders WHERE 1=1";
      const params: any[] = [];

      if (q) {
        sql += " AND (order_number LIKE ? OR phone LIKE ? OR name LIKE ? OR reg_number_bangla LIKE ?)";
        const term = `%${q}%`;
        params.push(term, term, term, term);
      }

      if (paymentStatus && paymentStatus !== "all") {
        sql += " AND payment_status = ?";
        params.push(paymentStatus);
      }

      if (status && status !== "all") {
        sql += " AND status = ?";
        params.push(status);
      }

      sql += " ORDER BY id DESC LIMIT 100";

      const [rows] = await p.execute<mysql.RowDataPacket[]>(sql, params);
      const orders = rows.map((r) => ({
        ...r,
        bracket: Boolean(r.bracket),
      })) as OrderRecord[];

      return NextResponse.json({ orders });
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  // Memory fallback sample for dev
  return NextResponse.json({ orders: [] });
}
