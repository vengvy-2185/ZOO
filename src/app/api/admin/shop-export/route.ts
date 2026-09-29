import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { getCachedRole } from "@/lib/auth/role";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { toCsv } from "@/lib/server/exports";
import { dayStart } from "@/lib/server/shop";
import { audit } from "@/lib/server/audit";

// Admin: souvenir sales as an Excel file (one line per item sold).
export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user || (await getCachedRole(user.id)).role !== "admin") return NextResponse.json({ error: "Admins only" }, { status: 403 });
  const days = Math.max(1, Math.min(366, Number(new URL(req.url).searchParams.get("days")) || 30));
  const db = createServiceRoleClient();
  const { data: sales } = await db.from("shop_sales").select("code, created_at, method, total_usd, provider_reference, seller_id, shop_sale_items(name, qty, price_usd)").eq("status", "paid").gte("created_at", dayStart(days - 1)).order("created_at").limit(10000);
  const sellers = [...new Set((sales ?? []).map((s: any) => s.seller_id).filter(Boolean))];
  const { data: names } = sellers.length ? await db.from("staff_members").select("user_id, full_name").in("user_id", sellers) : { data: [] as any[] };
  const nameOf = new Map((names ?? []).map((n: any) => [n.user_id, n.full_name]));
  const when = (iso: string) => new Intl.DateTimeFormat("en-GB", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Phnom_Penh" }).format(new Date(iso));
  const rows = (sales ?? []).flatMap((s: any) =>
    (s.shop_sale_items ?? []).map((i: any) => [when(s.created_at), s.code, i.name, i.qty, Number(i.price_usd), Math.round(i.qty * Number(i.price_usd) * 100) / 100, s.method === "cash" ? "Cash" : "KHQR", nameOf.get(s.seller_id) ?? "Admin", s.provider_reference ?? ""])
  );
  const total = rows.reduce((n: number, r: any[]) => n + Number(r[5]), 0);
  await audit("report.export", "shop_sales", null, { days }, user.id);
  return new NextResponse(
    toCsv({ title: `ការលក់វត្ថុអនុស្សាវរីយ៍ · ${days} ថ្ងៃចុងក្រោយ`, month: "", columns: ["Date", "Receipt", "Item", "Qty", "Price $", "Line $", "Paid by", "Seller", "Bakong ref"], rows, totals: ["", "", "TOTAL", "", "", Math.round(total * 100) / 100, "", "", ""] }),
    { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="gwz-shop-${days}d.csv"`, "Cache-Control": "no-store" } }
  );
}
