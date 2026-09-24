import Link from "next/link";
import { ClipboardList, CheckCircle2, Minus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { AdminPageHeader, AdminTable } from "@/components/admin/ui";
import { getI18n } from "@/lib/i18n/server";
import { formatFullDate, num } from "@/lib/utils/age";
import { cn } from "@/lib/utils/cn";

const STATUS_STYLE: Record<string, string> = {
  confirmed: "bg-light-green text-primary",
  pending: "bg-amber-100 text-amber-700",
  cancelled: "bg-red-100 text-red-700",
  used: "bg-black/5 text-ink/55",
};

export default async function AdminBookingsPage({ searchParams }: { searchParams: { status?: string } }) {
  const supabase = createClient();
  const { locale, t } = getI18n();
  let query = supabase
    .from("bookings")
    .select("*, booking_items(quantity), visitor_checkins(id)")
    .order("created_at", { ascending: false })
    .limit(50);
  if (searchParams.status) query = query.eq("status", searchParams.status);
  const { data: bookings } = await query;
  const b = t.admin.bookings;

  const chip = (active: boolean) =>
    cn("rounded-full px-4 py-2 text-sm font-semibold transition", active ? "bg-primary text-white shadow-soft" : "bg-white text-forest ring-1 ring-black/10 hover:bg-light-green");

  return (
    <div className="p-8">
      <AdminPageHeader icon={ClipboardList} title={b.title} subtitle={b.subtitle} />
      <div className="mb-5 flex flex-wrap gap-2">
        <Link href="/admin/bookings" className={chip(!searchParams.status)}>
          {b.all}
        </Link>
        {["pending", "confirmed", "cancelled"].map((s) => (
          <Link key={s} href={`/admin/bookings?status=${s}`} className={chip(searchParams.status === s)}>
            {t.ticket.status[s] ?? s}
          </Link>
        ))}
      </div>
      <AdminTable head={[b.booking, b.visitor, b.date, b.tickets, b.total, t.admin.status, b.checkedIn]} empty={(bookings ?? []).length === 0 && b.none}>
        {(bookings ?? []).map((row: any) => (
          <tr key={row.id} className="transition hover:bg-light-green/40">
            <td className="px-4 py-3 font-mono text-xs font-bold text-forest">{row.booking_code}</td>
            <td className="px-4 py-3">
              <div className="font-semibold text-forest">{row.visitor_name ?? "—"}</div>
              <div className="text-[11px] text-ink/45">{row.visitor_email}</div>
            </td>
            <td className="px-4 py-3 text-ink/70">{formatFullDate(row.visit_date, locale)}</td>
            <td className="px-4 py-3 text-ink/70">{num((row.booking_items ?? []).reduce((s: number, i: any) => s + i.quantity, 0), locale)}</td>
            <td className="px-4 py-3 font-bold text-forest">${Number(row.total_usd).toFixed(2)}</td>
            <td className="px-4 py-3">
              <span className={cn("rounded-full px-2.5 py-1 text-xs font-bold", STATUS_STYLE[row.status] ?? "bg-black/5")}>{t.ticket.status[row.status] ?? row.status}</span>
            </td>
            <td className="px-4 py-3">
              {[row.visitor_checkins].flat().filter(Boolean).length > 0 ? <CheckCircle2 size={18} className="text-primary" /> : <Minus size={18} className="text-ink/25" />}
            </td>
          </tr>
        ))}
      </AdminTable>
    </div>
  );
}
