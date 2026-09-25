import Link from "next/link";
import { Search, Users, CheckCircle2, Clock, Store, QrCode, Ticket, XCircle } from "lucide-react";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { getI18n } from "@/lib/i18n/server";
import { zooToday } from "@/lib/data/gate";
import { StaffShell } from "@/components/staff/StaffShell";
import { cn } from "@/lib/utils/cn";

export const dynamic = "force-dynamic";

/** Counter staff: every booking for a day, searchable, with who has paid, who pays here and who is in. */
export default async function StaffBookingsPage({ searchParams }: { searchParams: { q?: string; d?: string; f?: string } }) {
  const { locale } = getI18n();
  const km = locale === "km";
  const day = /^\d{4}-\d{2}-\d{2}$/.test(searchParams.d ?? "") ? searchParams.d! : zooToday();
  const q = (searchParams.q ?? "").trim();
  const f = ["all", "paid", "unpaid", "in"].includes(searchParams.f ?? "") ? searchParams.f! : "all";

  let query = createServiceRoleClient()
    .from("bookings")
    .select("id, booking_code, qr_token, visitor_name, visitor_email, total_usd, status, pay_later, created_at, booking_items(quantity), visitor_checkins(checked_in_at)")
    .eq("visit_date", day)
    .neq("status", "cancelled")
    .order("created_at", { ascending: false })
    .limit(200);
  if (q) query = query.or(`booking_code.ilike.%${q.replace(/[%,()]/g, "")}%,visitor_name.ilike.%${q.replace(/[%,()]/g, "")}%`);
  const { data } = await query;
  const rows = (data ?? []).map((b: any) => ({
    ...b,
    people: (b.booking_items ?? []).reduce((s: number, i: any) => s + i.quantity, 0),
    inAt: ([b.visitor_checkins].flat()[0] as any)?.checked_in_at ?? null,
  }));
  const count = { all: rows.length, paid: rows.filter((r) => r.status === "confirmed").length, unpaid: rows.filter((r) => r.status === "pending").length, in: rows.filter((r) => r.inAt).length };
  const shown = rows.filter((r) => (f === "paid" ? r.status === "confirmed" : f === "unpaid" ? r.status === "pending" : f === "in" ? !!r.inAt : true));
  const people = rows.filter((r) => r.status === "confirmed").reduce((s, r) => s + r.people, 0);
  const time = (iso: string) => new Intl.DateTimeFormat(km ? "km-KH" : "en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Phnom_Penh", numberingSystem: "latn" }).format(new Date(iso));
  const L = km
    ? { title: "ការកក់សំបុត្រ", sub: "រាល់ការកក់សម្រាប់ថ្ងៃនេះ ស្វែងរកតាមលេខកូដ ឬឈ្មោះ។", search: "លេខកូដ ឬឈ្មោះ…", go: "ស្វែងរក", f: { all: "ទាំងអស់", paid: "បានបង់", unpaid: "មិនទាន់បង់", in: "បានចូលហើយ" }, people: "ភ្ញៀវ (បានបង់)", none: "មិនមានការកក់ទេ។", paid: "បានបង់", unpaid: "មិនទាន់បង់", later: "បង់នៅបញ្ជរ", inAt: "ចូល", ticket: "សំបុត្រ", payHere: "បង់ទីនេះ" }
    : { title: "Bookings", sub: "Every booking for the day. Search by code or name.", search: "Code or name…", go: "Search", f: { all: "All", paid: "Paid", unpaid: "Not paid", in: "Checked in" }, people: "Visitors (paid)", none: "No bookings.", paid: "Paid", unpaid: "Not paid", later: "Pays at counter", inAt: "In", ticket: "Ticket", payHere: "Pay here" };
  const href = (o: Record<string, string>) => `/staff/bookings?${new URLSearchParams({ d: day, ...(q ? { q } : {}), f, ...o })}`;

  return (
    <StaffShell title={L.title} subtitle={L.sub}>
      <div className="card space-y-3 p-4">
        <form className="flex gap-2" action="/staff/bookings">
          <input type="hidden" name="f" value={f} />
          <input type="date" name="d" defaultValue={day} className="w-[9.5rem] flex-shrink-0 rounded-2xl border border-black/10 bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-[#2563EB]" />
          <div className="relative min-w-0 flex-1">
            <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/35" />
            <input name="q" defaultValue={q} placeholder={L.search} className="w-full rounded-2xl border border-black/10 bg-white py-2.5 pl-10 pr-3 text-sm text-ink outline-none focus:border-[#2563EB]" />
          </div>
          <button className="flex-shrink-0 rounded-2xl bg-[#1D4ED8] px-4 text-sm font-bold text-white">{L.go}</button>
        </form>
        <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1">
          {(Object.keys(L.f) as (keyof typeof L.f)[]).map((k) => (
            <Link key={k} href={href({ f: k })} className={cn("flex-shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-bold", f === k ? "bg-[#1D4ED8] text-white" : "bg-[#EEF2FF] text-[#1E3A8A]")}>
              {L.f[k]} <span className="opacity-70">{count[k]}</span>
            </Link>
          ))}
          <span className="ml-auto flex flex-shrink-0 items-center gap-1 whitespace-nowrap rounded-full bg-white px-3 py-1.5 text-sm font-bold text-[#1E3A8A] ring-1 ring-black/5"><Users size={15} /> {people} {L.people}</span>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {shown.length === 0 && <p className="card p-8 text-center text-sm text-ink/55 md:col-span-2">{L.none}</p>}
        {shown.map((b) => {
          const paid = b.status === "confirmed";
          return (
            <div key={b.id} className="card p-4">
              <div className="flex items-start gap-3">
                <span className={cn("flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl", b.inAt ? "bg-[#1D4ED8] text-white" : paid ? "bg-[#EEF2FF] text-[#1D4ED8]" : "bg-red-50 text-red-600")}>
                  {b.inAt ? <CheckCircle2 size={20} /> : paid ? <Ticket size={20} /> : <XCircle size={20} />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-sm font-extrabold text-forest">{b.booking_code}</p>
                  <p className="truncate text-sm text-ink/70">{b.visitor_name || "—"}</p>
                  <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#EEF2FF] px-2 py-0.5 font-bold text-[#1E3A8A]"><Users size={12} /> {b.people}</span>
                    <span className="font-bold text-ink/60">${Number(b.total_usd).toFixed(2)}</span>
                    {paid ? (
                      <span className="rounded-full bg-[#1D4ED8] px-2 py-0.5 font-bold text-white">{L.paid}</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 font-bold text-red-600">{b.pay_later ? <Store size={11} /> : <Clock size={11} />} {b.pay_later ? L.later : L.unpaid}</span>
                    )}
                    {b.inAt && <span className="font-bold text-[#1D4ED8]">{L.inAt} {time(b.inAt)}</span>}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <Link href={`/ticket/${b.booking_code}?k=${b.qr_token}`} className="flex-1 rounded-xl bg-[#EEF2FF] py-2 text-center text-xs font-bold text-[#1E3A8A] hover:bg-[#E0E7FF]">{L.ticket}</Link>
                {!paid && (
                  <Link href={`/pay/${b.booking_code}?k=${b.qr_token}&now=1`} className="flex flex-1 items-center justify-center gap-1 rounded-xl bg-[#1D4ED8] py-2 text-xs font-bold text-white"><QrCode size={13} /> {L.payHere}</Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </StaffShell>
  );
}
