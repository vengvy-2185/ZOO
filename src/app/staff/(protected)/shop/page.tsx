import Link from "next/link";
import { ShieldAlert, Receipt, Banknote, QrCode, PackageX, Settings2 } from "lucide-react";
import { getVerifiedUserId } from "@/lib/auth/session";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { staffAccess, staffTitle } from "@/lib/server/staff";
import { CATEGORIES, canSell, dayStart, getProducts, shopPayConfig } from "@/lib/server/shop";
import { getI18n } from "@/lib/i18n/server";
import { StaffShell } from "@/components/staff/StaffShell";
import { ShopPos } from "@/components/shop/ShopPos";
import { ActionButton } from "@/components/staff/ActionButton";
import { cancelSale } from "./actions";

export const dynamic = "force-dynamic";
export const generateMetadata = () => staffTitle("Souvenir shop", "ហាងអនុស្សាវរីយ៍");

/** The souvenir shop till for sellers and admins, with today's sales. */
export default async function ShopPage() {
  const userId = getVerifiedUserId()!;
  const access = await staffAccess(userId);
  const { locale } = getI18n();
  const km = locale === "km";
  if (!canSell(access))
    return (
      <StaffShell title={km ? "ហាងអនុស្សាវរីយ៍" : "Souvenir shop"}>
        <p className="card flex items-center gap-3 p-5 text-sm font-semibold text-ink/70">
          <ShieldAlert size={20} className="text-amber-500" /> {km ? "ការលក់ត្រូវការសិទ្ធិ «ហាងវត្ថុអនុស្សាវរីយ៍»។ សូមសុំ Admin។" : "Selling needs the “Souvenir shop” permission. Ask an admin."}
        </p>
      </StaffShell>
    );
  const manager = access.admin || access.perms.has("reports");
  const db = createServiceRoleClient();
  const [products, pay, { data: sales }] = await Promise.all([
    getProducts(),
    shopPayConfig(),
    (() => {
      let q = db.from("shop_sales").select("id, code, total_usd, method, status, created_at, seller_id, shop_sale_items(name, qty)").gte("created_at", dayStart()).order("created_at", { ascending: false }).limit(100);
      if (!manager) q = q.eq("seller_id", userId);
      return q;
    })(),
  ]);
  const paid = (sales ?? []).filter((s: any) => s.status === "paid");
  const sum = (m: string) => paid.filter((s: any) => s.method === m).reduce((n: number, s: any) => n + Number(s.total_usd), 0);
  const items = paid.reduce((n: number, s: any) => n + (s.shop_sale_items ?? []).reduce((a: number, i: any) => a + i.qty, 0), 0);
  const low = products.filter((p) => p.stock <= p.low_stock);
  const time = (iso: string) => new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Phnom_Penh" }).format(new Date(iso));

  return (
    <StaffShell
      title={km ? "ហាងអនុស្សាវរីយ៍" : "Souvenir shop"}
      subtitle={km ? "ចុចទំនិញ ហើយយកប្រាក់ជាសាច់ប្រាក់ ឬ KHQR (គណនីហាងដាច់ដោយឡែក)។" : "Tap products, then take cash or KHQR (the shop's own account)."}
      hero={
        <div className="mt-4 flex flex-wrap gap-2">
          <Pill icon={<Receipt size={15} />} text={`${paid.length} ${km ? "ការលក់ថ្ងៃនេះ" : "sales today"} · ${items} ${km ? "មុខ" : "items"}`} />
          <Pill icon={<Banknote size={15} />} text={`${km ? "សាច់ប្រាក់" : "Cash"} $${sum("cash").toFixed(2)}`} />
          <Pill icon={<QrCode size={15} />} text={`KHQR $${sum("khqr").toFixed(2)}`} />
          {access.admin && <Link href="/admin/shop" className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-extrabold text-[#1D4ED8]"><Settings2 size={14} /> {km ? "គ្រប់គ្រងទំនិញ" : "Manage products"}</Link>}
        </div>
      }
    >
      {low.length > 0 && (
        <p className="card flex flex-wrap items-center gap-2 p-3 text-sm font-semibold text-amber-800">
          <PackageX size={18} /> {km ? "ជិតអស់ស្តុក៖" : "Running low:"} {low.map((p) => `${(km && p.name_km) || p.name} (${p.stock})`).join(", ")}
        </p>
      )}
      <ShopPos
        products={products.map((p) => ({ id: p.id, name: p.name, name_km: p.name_km, category: p.category, price_usd: p.price_usd, stock: p.stock, low_stock: p.low_stock, image_url: p.image_url }))}
        categories={CATEGORIES}
        khqrReady={pay.ready}
        rate={pay.rate}
        km={km}
      />
      <section className="card p-5">
        <h2 className="mb-3 font-display text-lg font-extrabold text-forest">{manager ? (km ? "ការលក់ថ្ងៃនេះ" : "Today's sales") : km ? "ការលក់របស់ខ្ញុំថ្ងៃនេះ" : "My sales today"}</h2>
        {(sales ?? []).length === 0 && <p className="text-sm text-ink/50">{km ? "មិនទាន់មានការលក់" : "No sales yet"}</p>}
        <ul className="divide-y divide-black/5">
          {(sales ?? []).map((s: any) => (
            <li key={s.id} className="flex flex-wrap items-center gap-3 py-2.5 text-sm">
              <span className="font-mono text-xs text-ink/50">{time(s.created_at)}</span>
              <Link href={`/staff/shop/receipt/${s.code}`} target="_blank" className="font-mono font-bold text-primary hover:underline">{s.code}</Link>
              <span className="min-w-0 flex-1 truncate text-ink/60">{(s.shop_sale_items ?? []).map((i: any) => `${i.name}×${i.qty}`).join(", ")}</span>
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${s.method === "cash" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-[#E1232E]"}`}>{s.method === "cash" ? (km ? "សាច់ប្រាក់" : "Cash") : "KHQR"}</span>
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${s.status === "paid" ? "bg-primary text-white" : s.status === "pending" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-ink/40 line-through"}`}>
                {s.status === "paid" ? (km ? "បានបង់" : "Paid") : s.status === "pending" ? (km ? "រង់ចាំ" : "Waiting") : km ? "បោះបង់" : "Cancelled"}
              </span>
              <b className="w-16 text-right text-forest">${Number(s.total_usd).toFixed(2)}</b>
              {s.status === "pending" && <ActionButton action={cancelSale.bind(null, s.id)} label={km ? "បោះបង់" : "Cancel"} confirm={km ? "បោះបង់ការលក់នេះ?" : "Cancel this sale?"} className="px-2 py-1 text-xs text-red-600 ring-1 ring-red-200" />}
            </li>
          ))}
        </ul>
      </section>
    </StaffShell>
  );
}

function Pill({ icon, text }: { icon: React.ReactNode; text: string }) {
  return <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold ring-1 ring-white/20">{icon} {text}</span>;
}
