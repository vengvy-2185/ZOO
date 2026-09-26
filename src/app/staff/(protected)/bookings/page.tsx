import Link from "next/link";
import { Search, Users, CheckCircle2, Clock, Store, Ticket, XCircle } from "lucide-react";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { getI18n } from "@/lib/i18n/server";
import { zooToday } from "@/lib/data/gate";
import { StaffShell } from "@/components/staff/StaffShell";
import { cn } from "@/lib/utils/cn";
import { BookingActions } from "@/components/staff/BookingActions";
import { PaidToast } from "@/components/staff/PaidToast";
import { catchUpPayments } from "@/lib/server/payments";

import { staffTitle } from "@/lib/server/staff";
export const dynamic = "force-dynamic";

/** Counter staff: every booking for a day, searchable, with who has paid, who pays here and who is in. */
export const generateMetadata = () => staffTitle("Bookings", "ការកក់");

export default async function StaffBookingsPage({ searchParams }: { searchParams: { q?: string; d?: string; f?: string } }) {
  // first visit of the day: confirm payments that Bakong couldn't be asked about yesterday
  await catchUpPayments().catch(() => {});
  const { locale } = getI18n();
  const km = locale === "km";
  const day = /^\d{4}-\d{2}-\d{2}$/.test(searchParams.d ?? "") ? searchParams.d! : zooToday();
  const q = (searchParams.q ?? "").trim();
  const f = ["all", "paid", "unpaid", "in"].includes(searchParams.f ?? "") ? searchParams.f! : "all";

  let query = createServiceRoleClient()
    .from("bookings")
    .select("id, booking_code, qr_token, visitor_name, visitor_email, total_usd, status, pay_later, created_at, booking_items(quantity, ticket_types(name, khmer_name)), visitor_checkins(checked_in_at)")
    .eq("visit_date", day)
    .neq("status", "cancelled")
    .order("created_at", { ascending: false })
    .limit(200);
  if (q) query = query.or(`booking_code.ilike.%${q.replace(/[%,()]/g, "")}%,visitor_name.ilike.%${q.replace(/[%,()]/g, "")}%`);
  // "Not paid" isn't only today: every unpaid booking from the last week and the days ahead
  const since = new Date(`${zooToday()}T12:00:00Z`);
  since.setUTCDate(since.getUTCDate() - 7);
  let unpaidQuery = createServiceRoleClient()
    .from("bookings")
    .select("id, booking_code, qr_token, visitor_name, visitor_email, total_usd, status, pay_later, created_at, visit_date, booking_items(quantity, ticket_types(name, khmer_name)), visitor_checkins(checked_in_at)")
    .eq("status", "pending")
    .gte("visit_date", since.toISOString().slice(0, 10))
    .order("visit_date", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(200);
  if (q) unpaidQuery = unpaidQuery.or(`booking_code.ilike.%${q.replace(/[%,()]/g, "")}%,visitor_name.ilike.%${q.replace(/[%,()]/g, "")}%`);
  const [{ data }, { data: unpaidAll }] = await Promise.all([query, unpaidQuery]);
  const shape = (b: any) => ({
    ...b,
    people: (b.booking_items ?? []).reduce((s: number, i: any) => s + i.quantity, 0),
    inAt: ([b.visitor_checkins].flat()[0] as any)?.checked_in_at ?? null,
  });
  const unpaidRows = (unpaidAll ?? []).map(shape);
  const rows = (data ?? []).map((b: any) => ({
    ...b,
    people: (b.booking_items ?? []).reduce((s: number, i: any) => s + i.quantity, 0),
    inAt: ([b.visitor_checkins].flat()[0] as any)?.checked_in_at ?? null,
  }));
  const count = { all: rows.length, paid: rows.filter((r) => r.status === "confirmed").length, unpaid: unpaidRows.length, in: rows.filter((r) => r.inAt).length };
  const shown = f === "unpaid" ? unpaidRows : rows.filter((r) => (f === "paid" ? r.status === "confirmed" : f === "in" ? !!r.inAt : true));
  const otherDayUnpaid = unpaidRows.filter((r) => r.visit_date !== day).length;
  const dateLabel = (d: string) => (d === zooToday() ? (km ? "ថ្ងៃនេះ" : "Today") : new Intl.DateTimeFormat(km ? "km-KH" : "en-GB", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${d}T12:00:00Z`)));
  const people = rows.filter((r) => r.status === "confirmed").reduce((s, r) => s + r.people, 0);
  const time = (iso: string) => new Intl.DateTimeFormat(km ? "km-KH" : "en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Phnom_Penh", numberingSystem: "latn" }).format(new Date(iso));
  const L = km
    ? { title: "ការកក់សំបុត្រ", sub: "រាល់ការកក់សម្រាប់ថ្ងៃនេះ ស្វែងរកតាមលេខកូដ ឬឈ្មោះ។", search: "លេខកូដ ឬឈ្មោះ…", go: "ស្វែងរក", f: { all: "ទាំងអស់", paid: "បានបង់", unpaid: "មិនទាន់បង់", in: "បានចូលហើយ" }, people: "ភ្ញៀវ (បានបង់)", none: "មិនមានការកក់ទេ។", paid: "បានបង់", unpaid: "មិនទាន់បង់", later: "បង់នៅបញ្ជរ", inAt: "ចូល", ticket: "សំបុត្រ", payHere: "បង់ទីនេះ" }
    : { title: "Bookings", sub: "Every booking for the day. Search by code or name.", search: "Code or name…", go: "Search", f: { all: "All", paid: "Paid", unpaid: "Not paid", in: "Checked in" }, people: "Visitors (paid)", none: "No bookings.", paid: "Paid", unpaid: "Not paid", later: "Pays at counter", inAt: "In", ticket: "Ticket", payHere: "Pay here" };
  const href = (o: Record<string, string>) => `/staff/bookings?${new URLSearchParams({ d: day, ...(q ? { q } : {}), f, ...o })}`;

  return (
    <StaffShell title={L.title} subtitle={L.sub}>
      <PaidToast km={km} paid={rows.filter((r) => r.status === "confirmed").map((r) => ({ code: r.booking_code, name: r.visitor_name, total: Number(r.total_usd) }))} />
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

      {f !== "unpaid" && otherDayUnpaid > 0 && (
        <Link href={href({ f: "unpaid" })} className="flex items-center gap-3 rounded-3xl bg-gradient-to-r from-amber-50 to-orange-50 p-4 ring-1 ring-amber-200 transition hover:shadow-soft">
          <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-white"><Clock size={20} /></span>
          <span className="min-w-0 flex-1 text-sm font-bold text-amber-900">
            {km ? `មាន ${otherDayUnpaid} ការកក់មិនទាន់បង់ នៅថ្ងៃផ្សេងទៀត` : `${otherDayUnpaid} unpaid bookings on other days`}
            <span className="block text-xs font-semibold text-amber-800/70">{km ? "ចុចដើម្បីមើល និងទទួលប្រាក់" : "Tap to see them and take payment"}</span>
          </span>
          <span className="rounded-full bg-amber-500 px-3 py-1 text-xs font-extrabold text-white">{km ? "មើល" : "View"}</span>
        </Link>
      )}
      {f === "unpaid" && <p className="px-1 text-xs font-semibold text-ink/50">{km ? "បង្ហាញការកក់មិនទាន់បង់ទាំងអស់ ចាប់ពី ៧ ថ្ងៃមុន ដល់ថ្ងៃខាងមុខ។" : "Showing every unpaid booking from 7 days ago onwards."}</p>}
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
                  <p className="flex flex-wrap items-center gap-2 font-mono text-sm font-extrabold text-forest">
                    {b.booking_code}
                    {b.visit_date && b.visit_date !== day && <span className="rounded-full bg-amber-100 px-2 py-0.5 font-sans text-[11px] font-extrabold text-amber-800">{dateLabel(b.visit_date)}</span>}
                  </p>
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
              <BookingActions
                code={b.booking_code}
                accessKey={b.qr_token}
                paid={paid}
                inAt={b.inAt}
                email={b.visitor_email}
                km={km}
                items={(b.booking_items ?? []).map((i: any) => ({ name: (km && i.ticket_types?.khmer_name) || i.ticket_types?.name || "—", quantity: i.quantity }))}
              />
            </div>
          );
        })}
      </div>
    </StaffShell>
  );
}
