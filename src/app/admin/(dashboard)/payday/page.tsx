import Link from "next/link";
import QRCode from "qrcode";
import { HandCoins, Wallet, CheckCircle2, Clock3, Users, QrCode, CalendarClock, MapPin, Inbox, Landmark, UserRoundCheck, ScanLine } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/ui";
import { getI18n } from "@/lib/i18n/server";
import { getPositions, thisMonth } from "@/lib/server/staff";
import { ensurePaydays, monthLabel, nextMonth, paydayFor, paydayTable, qrUrl, requestDeadline, sameDayNextMonth, today, type PaydayRow } from "@/lib/server/payday";
import { PaydayForm, PaydayControls, RowActions, RequestActions, AutoRefresh, QrDownload } from "@/components/admin/PaydayBits";
import { cn } from "@/lib/utils/cn";

export const dynamic = "force-dynamic";
export const metadata = { title: "Payday" };

const usd = (n: number) => `$${n.toFixed(2)}`;

/** Payday: set the day, the QR code of each department, and who has collected. */
export default async function PaydayPage({ searchParams }: { searchParams: { month?: string } }) {
  const km = getI18n().locale === "km";
  const L = (en: string, k: string) => (km ? k : en);
  const month = /^\d{4}-\d{2}$/.test(searchParams.month ?? "") ? searchParams.month! : thisMonth();
  const shift = (n: number) => {
    const [y, m] = month.split("-").map(Number);
    const d = new Date(Date.UTC(y, m - 1 + n, 1));
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  };
  const monthName = monthLabel(month, km);
  const dateName = (d: string) => new Intl.DateTimeFormat(km ? "km-KH" : "en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${d}T00:00:00Z`));
  await ensurePaydays();
  const p = await paydayFor(month);
  const t = p ? await paydayTable(p) : null;
  const positions = await getPositions();

  // one QR per department (that has staff), plus one for anyone without a department
  const depts = t ? [...new Set(t.rows.map((r) => r.dept))] : [];
  const qrs = p && p.status !== "closed"
    ? await Promise.all(
        depts.map(async (d) => {
          const pos = positions.find((x) => x.id === d);
          const rows = t!.rows.filter((r) => r.dept === d);
          return {
            d,
            name: pos ? (km && pos.name_km) || pos.name : L("Everyone else", "ផ្សេងៗ"),
            color: pos?.color ?? "#64748B",
            img: await QRCode.toDataURL(qrUrl(p, d), { margin: 1, width: 900, errorCorrectionLevel: "H", color: { dark: "#0E3F24", light: "#ffffff" } }),
            count: rows.length,
            done: rows.filter((r) => r.received_at).length,
          };
        })
      )
    : [];

  const status = p?.status ?? "none";
  const STATUS: Record<string, [string, string, string]> = {
    none: ["Not set", "មិនទាន់កំណត់", "bg-slate-100 text-slate-600"],
    scheduled: ["Scheduled", "បានកំណត់ថ្ងៃ", "bg-amber-100 text-amber-800"],
    open: ["Open · collecting", "កំពុងបើកប្រាក់ខែ", "bg-emerald-100 text-emerald-800"],
    closed: ["Closed", "បានបិទ", "bg-slate-800 text-white"],
  };
  const VIA: Record<string, [string, string]> = { scan: ["QR scan", "ស្កេន QR"], manual: ["In person", "ផ្ទាល់ដៃ"], proxy: ["Someone collected", "អ្នកជំនួស"], transfer: ["Bank transfer", "ផ្ទេរធនាគារ"] };
  const METHOD: Record<string, [string, string]> = { later: ["Collect later", "មកយកពេលក្រោយ"], proxy: ["Someone collects", "ឲ្យអ្នកផ្សេងយកជំនួស"], transfer: ["Bank transfer", "ផ្ទេរតាមធនាគារ"] };
  const time = (iso: string) => (iso === "before" ? L("before", "មុននេះ") : new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Phnom_Penh" }).format(new Date(iso)));

  const Row = ({ r }: { r: PaydayRow }) => (
    <tr className="border-t border-black/5">
      <td className="px-3 py-2.5">
        <span className="font-bold text-forest">{(km && r.name_km) || r.name}</span>
        <span className="block text-[11px] text-ink/45">{r.staff_no}</span>
      </td>
      <td className="px-3 py-2.5"><span className="inline-flex items-center gap-1.5 text-xs font-bold"><span className="h-2.5 w-2.5 rounded-full" style={{ background: r.color }} />{(km && r.dept_name_km) || r.dept_name}</span></td>
      <td className="px-3 py-2.5 text-right font-display font-extrabold text-forest">{usd(r.amount)}</td>
      <td className="px-3 py-2.5">
        {r.received_at ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-emerald-800"><CheckCircle2 size={12} /> {L("Collected", "បានបើក")} · {time(r.received_at)}{r.received_via ? ` · ${VIA[r.received_via]?.[km ? 1 : 0] ?? ""}` : ""}</span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700"><Clock3 size={12} /> {L("Not yet", "មិនទាន់បើក")}{r.request ? ` · ${r.request.status === "approved" ? "✓ " : ""}${METHOD[r.request.method][km ? 1 : 0]}` : ""}</span>
        )}
      </td>
      <td className="px-3 py-2.5 text-right">{p && p.status !== "scheduled" && r.issued && <RowActions km={km} paydayId={p.id} userId={r.user_id} received={Boolean(r.received_at)} closed={p.status === "closed"} />}</td>
    </tr>
  );

  return (
    <div className="p-4 md:p-8">
      {p?.status === "open" && <AutoRefresh />}
      <AdminPageHeader icon={HandCoins} title={L("Payday", "ថ្ងៃបើកប្រាក់ខែ")} subtitle={L("Set the day pay is handed out. Each department scans its own QR code in the staff app to collect; you see who has and who hasn't.", "កំណត់ថ្ងៃបើកប្រាក់ខែ។ ផ្នែកនីមួយៗស្កេន QR របស់ខ្លួនក្នុងកម្មវិធីបុគ្គលិក ដើម្បីទទួលប្រាក់ ហើយអ្នកឃើញថាអ្នកណាបើកហើយ អ្នកណាមិនទាន់។")} />

      <div className="mb-5 flex items-center justify-between gap-3 print:hidden">
        <Link href={`/admin/payday?month=${shift(-1)}`} aria-label="previous month" className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-forest ring-1 ring-black/10 hover:bg-light-green">←</Link>
        <div className="text-center">
          <p className="font-display text-xl font-extrabold text-forest">{L("Pay for", "ប្រាក់ខែ")} {monthLabel(month, km)}</p>
          <span className={cn("mt-1 inline-block rounded-full px-3 py-1 text-xs font-extrabold", STATUS[status][2])}>{STATUS[status][km ? 1 : 0]}</span>
        </div>
        <Link href={`/admin/payday?month=${shift(1)}`} aria-label="next month" className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-forest ring-1 ring-black/10 hover:bg-light-green">→</Link>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_1.4fr]">
        <div className="space-y-5 print:hidden">
          <PaydayForm key={month} km={km} month={month} monthName={monthLabel(month, km)} p={p} />
          {p && (
            <div className="card space-y-3 p-5">
              <p className="flex items-center gap-2 text-sm text-ink/70"><CalendarClock size={16} className="text-primary" /> <b className="text-forest">{dateName(p.pay_date)}</b>{p.start_time ? ` · ${p.start_time.slice(0, 5)}–${p.end_time?.slice(0, 5) ?? ""}` : ""}</p>
              {p.place && <p className="flex items-center gap-2 text-sm text-ink/70"><MapPin size={16} className="text-primary" /> {p.place}</p>}
              <p className="text-xs text-ink/50">{L("Requests (can't come / on leave) close on", "សំណើ (មកមិនបាន / ច្បាប់) បិទនៅ")} <b>{dateName(requestDeadline(p))}</b> ({L("4 days before", "៤ ថ្ងៃមុន")}){today() > requestDeadline(p) ? ` · ${L("closed", "បានបិទ")}` : ""}</p>
              <PaydayControls km={km} id={p.id} status={p.status} />
              {p.status === "scheduled" && <p className="rounded-2xl bg-amber-50 px-3 py-2 text-xs text-amber-800">{L("It opens by itself on the pay date (payslips are worked out, the QR codes work). You can also open it earlier.", "វានឹងបើកដោយខ្លួនឯងនៅថ្ងៃបើកប្រាក់ខែ (វិក្កយបត្រត្រូវគិត ហើយ QR ដំណើរការ)។ អាចចុចបើកមុនក៏បាន។")}</p>}
              <p className="text-xs text-ink/50">{L("Next:", "ខែបន្ទាប់៖")} <b>{L("pay for", "ប្រាក់ខែ")} {monthLabel(nextMonth(month), km)}</b> · {dateName(sameDayNextMonth(p.pay_date))} ({L("set up by itself", "កំណត់ដោយស្វ័យប្រវត្តិ")})</p>
            </div>
          )}
        </div>

        {t && (
          <div className="space-y-5">
            {/* the money */}
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {[
                [Wallet, L("Total pay", "ទឹកប្រាក់សរុប"), usd(t.total), "text-forest", "bg-light-green text-primary"],
                [CheckCircle2, L("Handed out", "បានបើករួច"), usd(t.paid), "text-emerald-700", "bg-emerald-50 text-emerald-600"],
                [Clock3, L("Still to give", "នៅត្រូវឲ្យ"), usd(t.owed), "text-amber-700", "bg-amber-50 text-amber-600"],
                [Users, L("Collected", "អ្នកបានបើក"), `${t.collected}/${t.count}`, "text-forest", "bg-sky-50 text-sky-600"],
              ].map(([Icon, label, v, tone, chip]: any, i) => (
                <div key={i} className="card p-4">
                  <span className={cn("flex h-9 w-9 items-center justify-center rounded-xl", chip)}><Icon size={18} /></span>
                  <p className="mt-2 text-xs font-bold text-ink/50">{label}</p>
                  <p className={cn("font-display text-2xl font-extrabold", tone)}>{v}</p>
                </div>
              ))}
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-black/5"><div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-primary transition-all" style={{ width: `${t.total ? (t.paid / t.total) * 100 : 0}%` }} /></div>

            {/* requests */}
            {t.requests.length > 0 && (
              <section className="card p-5">
                <h2 className="flex items-center gap-2 font-display text-lg font-extrabold text-forest"><Inbox size={18} className="text-primary" /> {L("Requests", "សំណើ")} <span className="text-sm text-ink/45">({t.requests.filter((r) => r.status === "pending").length} {L("waiting", "រង់ចាំ")})</span></h2>
                <ul className="mt-3 space-y-3">
                  {t.requests.map((r) => {
                    const who = t.rows.find((x) => x.user_id === r.user_id);
                    return (
                      <li key={r.id} className="rounded-2xl bg-cream/60 p-3 text-sm">
                        <div className="flex flex-wrap items-center gap-2">
                          <b className="text-forest">{who ? (km && who.name_km) || who.name : "—"}</b>
                          <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-bold text-ink/60">{r.kind === "leave" ? L("On leave", "ឈប់សម្រាក/ច្បាប់") : L("Can't come", "មកមិនបាន")}</span>
                          <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[11px] font-bold text-ink/60">{r.method === "transfer" ? <Landmark size={11} /> : r.method === "proxy" ? <UserRoundCheck size={11} /> : <Clock3 size={11} />} {METHOD[r.method][km ? 1 : 0]}{r.method === "later" && r.pickup_date ? ` · ${r.pickup_date.split("-").reverse().join("/")}` : ""}{r.method === "proxy" && r.proxy_name ? ` · ${r.proxy_name}` : ""}</span>
                          <span className={cn("ml-auto rounded-full px-2 py-0.5 text-[11px] font-extrabold", r.status === "approved" ? "bg-emerald-100 text-emerald-800" : r.status === "rejected" ? "bg-slate-200 text-slate-600" : "bg-amber-100 text-amber-800")}>{r.status === "approved" ? L("Approved", "បានយល់ព្រម") : r.status === "rejected" ? L("Refused", "បានបដិសេធ") : L("Waiting", "រង់ចាំ")}</span>
                        </div>
                        <p className="mt-1 text-ink/70">{r.reason}</p>
                        {r.admin_note && <p className="mt-1 text-xs text-ink/50">↳ {r.admin_note}</p>}
                        {r.status === "pending" && <RequestActions km={km} id={r.id} />}
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}

            {/* the table */}
            <section className="card overflow-hidden">
              <div className="flex items-center justify-between gap-2 p-4">
                <h2 className="font-display text-lg font-extrabold text-forest">{L("Who has collected", "តារាងបើកប្រាក់ខែ")}</h2>
                {p?.status === "open" && <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 print:hidden"><span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" /> {L("live", "បច្ចុប្បន្នភាព")}</span>}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead className="bg-cream/60 text-left text-xs font-bold text-ink/50">
                    <tr><th className="px-3 py-2">{L("Name", "ឈ្មោះ")}</th><th className="px-3 py-2">{L("Department", "ផ្នែក")}</th><th className="px-3 py-2 text-right">{L("Amount", "ទឹកប្រាក់")}</th><th className="px-3 py-2">{L("Status", "ស្ថានភាព")}</th><th className="px-3 py-2" /></tr>
                  </thead>
                  <tbody>
                    {t.rows.filter((r) => !r.received_at).length > 0 && (
                      <tr><td colSpan={5} className="bg-amber-50/70 px-3 py-1.5 text-xs font-extrabold text-amber-800">{L("Not collected yet", "មិនទាន់បើក")} · {t.rows.filter((r) => !r.received_at).length} · {usd(t.owed)}</td></tr>
                    )}
                    {t.rows.filter((r) => !r.received_at).map((r) => <Row key={r.user_id} r={r} />)}
                    {t.collected > 0 && (
                      <tr><td colSpan={5} className="bg-emerald-50/70 px-3 py-1.5 text-xs font-extrabold text-emerald-800">{L("Collected", "បានបើករួច")} · {t.collected} · {usd(t.paid)}</td></tr>
                    )}
                    {t.rows.filter((r) => r.received_at).map((r) => <Row key={r.user_id} r={r} />)}
                  </tbody>
                  <tfoot className="border-t-2 border-black/10 bg-cream/40 font-bold">
                    <tr><td className="px-3 py-2.5" colSpan={2}>{L("Total", "សរុប")}</td><td className="px-3 py-2.5 text-right font-display text-lg font-extrabold text-forest">{usd(t.total)}</td><td className="px-3 py-2.5 text-xs text-ink/60" colSpan={2}>{L("handed out", "បានបើក")} {usd(t.paid)} · {L("still to give", "នៅត្រូវឲ្យ")} <b className="text-amber-700">{usd(t.owed)}</b></td></tr>
                  </tfoot>
                </table>
              </div>
            </section>
          </div>
        )}
      </div>

      {/* QR per department */}
      {qrs.length > 0 && (
        <section className="mt-6 break-before-page">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 font-display text-xl font-extrabold text-forest"><QrCode size={20} className="text-primary" /> {L("QR code for each department", "QR សម្រាប់ផ្នែកនីមួយៗ")}</h2>
            <QrDownload km={km} month={monthName} qrs={qrs.map(({ d, img, name, color }) => ({ d, img, name, color }))} />
          </div>
          <p className="mt-1 text-sm text-ink/55 print:hidden">{L("Print them or show them on a screen at the pay desk. Staff open the app → Pay → Scan; a code only works for its own department, on the pay date, once per person.", "បោះពុម្ព ឬបង្ហាញលើអេក្រង់នៅកន្លែងបើកប្រាក់។ បុគ្គលិកបើកកម្មវិធី → ប្រាក់ខែ → ស្កេន។ QR នីមួយៗប្រើបានតែផ្នែករបស់ខ្លួន នៅថ្ងៃបើកប្រាក់ខែ ហើយម្នាក់បានតែម្តង។")}</p>
          {p?.status === "scheduled" && <p className="mt-2 rounded-2xl bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800 print:hidden">{L("The codes start working once payday is opened.", "QR នឹងដំណើរការ ពេលចុចបើកការបើកប្រាក់ខែ។")}</p>}
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {qrs.map((q) => (
              <div key={q.d} className="card break-inside-avoid overflow-hidden text-center">
                <div className="px-4 py-3 text-white" style={{ background: q.color }}>
                  <p className="text-xs font-bold uppercase tracking-wider opacity-80">{L("Payday", "ថ្ងៃបើកប្រាក់ខែ")} · {monthName}</p>
                  <p className="font-display text-xl font-extrabold">{q.name}</p>
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={q.img} alt={`QR ${q.name}`} className="mx-auto w-full max-w-[260px] p-4" />
                <p className="flex items-center justify-center gap-1.5 pb-1 text-sm font-bold text-forest"><ScanLine size={15} /> {L("Scan in the staff app to collect", "ស្កេនក្នុងកម្មវិធីបុគ្គលិក ដើម្បីទទួលប្រាក់")}</p>
                <p className="pb-3 text-xs text-ink/50">{q.done}/{q.count} {L("collected", "បានបើក")}</p>
                <div className="px-4 pb-4"><QrDownload km={km} month={monthName} qrs={[{ d: q.d, img: q.img, name: q.name, color: q.color }]} one /></div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
