import Link from "next/link";
import { ShoppingBag, Plus, PackagePlus, TrendingUp, Download, CheckCircle2, AlertTriangle, Store } from "lucide-react";
import { AdminPageHeader, FormSection, Field, SelectField } from "@/components/admin/ui";
import { SubmitButton, ImageUploadField } from "@/components/admin/ui-client";
import { ActionButton } from "@/components/staff/ActionButton";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { CATEGORIES, dayStart, getProducts, shopPayConfig, type Product } from "@/lib/server/shop";
import { saveProduct, adjustStock } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Souvenir shop" };

/** Admin: souvenirs (price, stock, photo) and how the shop is selling. */
export default async function AdminShopPage({ searchParams }: { searchParams: { msg?: string; days?: string } }) {
  const days = [1, 7, 30, 90].includes(Number(searchParams.days)) ? Number(searchParams.days) : 7;
  const db = createServiceRoleClient();
  const [products, pay, { data: sales }] = await Promise.all([
    getProducts(true),
    shopPayConfig(),
    db.from("shop_sales").select("id, total_usd, method, status, created_at, shop_sale_items(name, qty, price_usd, product_id)").eq("status", "paid").gte("created_at", dayStart(days - 1)).order("created_at", { ascending: false }).limit(5000),
  ]);
  const paid = sales ?? [];
  const revenue = paid.reduce((n: number, s: any) => n + Number(s.total_usd), 0);
  const cash = paid.filter((s: any) => s.method === "cash").reduce((n: number, s: any) => n + Number(s.total_usd), 0);
  const top = new Map<string, { name: string; qty: number; usd: number }>();
  for (const s of paid as any[])
    for (const i of s.shop_sale_items ?? []) {
      const t = top.get(i.product_id ?? i.name) ?? { name: i.name, qty: 0, usd: 0 };
      t.qty += i.qty;
      t.usd += i.qty * Number(i.price_usd);
      top.set(i.product_id ?? i.name, t);
    }
  const best = [...top.values()].sort((a, b) => b.usd - a.usd).slice(0, 8);
  const stockValue = products.reduce((n, p) => n + p.stock * p.price_usd, 0);

  return (
    <div className="mx-auto max-w-6xl p-4 md:p-8">
      <AdminPageHeader
        icon={ShoppingBag}
        title="Souvenir shop"
        subtitle="Products, stock and sales. Sellers use the till at Staff → Souvenir shop (cash or the shop's own KHQR)."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/staff/shop" className="btn-primary inline-flex items-center gap-2 px-4 py-2 text-sm"><Store size={16} /> Open the till</Link>
            <a href={`/api/admin/shop-export?days=${days}`} className="btn-outline inline-flex items-center gap-2 bg-white px-4 py-2 text-sm"><Download size={16} /> Sales CSV</a>
          </div>
        }
      />
      {searchParams.msg === "saved" && <p className="mb-5 flex items-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-bold text-white"><CheckCircle2 size={18} /> Saved ✓</p>}
      {searchParams.msg && searchParams.msg !== "saved" && <p className="mb-5 rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{searchParams.msg === "sku" ? "That SKU is already used by another product." : searchParams.msg === "invalid" ? "Name and a price are needed." : searchParams.msg}</p>}
      {!pay.ready && (
        <p className="mb-5 flex items-center gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
          <AlertTriangle size={18} /> Shop KHQR is off — sellers can take cash only. <Link href="/admin/integrations#shop" className="underline">Set up the shop&apos;s Bakong account</Link>
        </p>
      )}

      {/* sales */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        {[1, 7, 30, 90].map((d) => (
          <Link key={d} href={`/admin/shop?days=${d}`} className={`rounded-full px-4 py-1.5 text-sm font-bold ${d === days ? "bg-primary text-white" : "bg-white text-forest ring-1 ring-black/10"}`}>
            {d === 1 ? "Today" : `${d} days`}
          </Link>
        ))}
      </div>
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card label="Sales" value={`$${revenue.toFixed(2)}`} note={`${paid.length} receipts`} />
        <Card label="Cash" value={`$${cash.toFixed(2)}`} note="in the till" />
        <Card label="KHQR" value={`$${(revenue - cash).toFixed(2)}`} note="to the shop's Bakong" />
        <Card label="Stock value" value={`$${stockValue.toFixed(2)}`} note={`${products.reduce((n, p) => n + p.stock, 0)} items`} />
      </div>
      {best.length > 0 && (
        <div className="mb-8 rounded-3xl bg-white p-5 shadow-soft ring-1 ring-black/5">
          <p className="mb-3 flex items-center gap-2 font-display text-lg font-extrabold text-forest"><TrendingUp size={18} /> Best sellers</p>
          <ul className="space-y-2">
            {best.map((b) => (
              <li key={b.name} className="flex items-center gap-3 text-sm">
                <span className="min-w-0 flex-1 truncate font-semibold text-forest">{b.name}</span>
                <span className="h-2 w-40 overflow-hidden rounded-full bg-cream"><span className="block h-full rounded-full bg-primary" style={{ width: `${(b.usd / best[0].usd) * 100}%` }} /></span>
                <span className="w-14 text-right text-ink/55">{b.qty} pcs</span>
                <b className="w-20 text-right text-forest">${b.usd.toFixed(2)}</b>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* new product */}
      <form action={saveProduct} className="mb-8">
        <FormSection icon={PackagePlus} title="Add a product" hint="Prices in USD; the till also shows riel. Stock goes down by itself with every paid sale.">
          <ProductFields />
          <div className="flex justify-end"><SubmitButton label="Add product" pendingLabel="Saving…" /></div>
        </FormSection>
      </form>

      {/* products */}
      <div className="space-y-3">
        {products.map((p) => (
          <details key={p.id} className="group rounded-3xl bg-white shadow-soft ring-1 ring-black/5">
            <summary className="flex cursor-pointer list-none flex-wrap items-center gap-4 p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {p.image_url ? <img src={p.image_url} alt="" className="h-14 w-14 rounded-2xl bg-cream object-contain p-1" /> : <span className="h-14 w-14 rounded-2xl bg-cream" />}
              <span className="min-w-0 flex-1">
                <span className="block font-bold text-forest">{p.name} {!p.active && <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-ink/50">hidden</span>}</span>
                <span className="block text-xs text-ink/50">{p.name_km} · {CATEGORIES[p.category]?.[0] ?? p.category}{p.sku ? ` · ${p.sku}` : ""}</span>
              </span>
              <b className="text-lg text-primary">${p.price_usd.toFixed(2)}</b>
              <span className={`rounded-full px-3 py-1 text-sm font-bold ${p.stock === 0 ? "bg-red-100 text-red-700" : p.stock <= p.low_stock ? "bg-amber-100 text-amber-800" : "bg-light-green text-primary"}`}>{p.stock} in stock</span>
              <Plus size={18} className="text-ink/40 transition group-open:rotate-45" />
            </summary>
            <div className="flex flex-wrap items-center gap-2 border-t border-black/5 px-4 pt-4 text-sm font-bold text-forest">
              Quick stock:
              <ActionButton action={adjustStock.bind(null, p.id, 10)} label="+10" className="bg-cream px-3 py-1 text-xs text-forest" />
              <ActionButton action={adjustStock.bind(null, p.id, 1)} label="+1" className="bg-cream px-3 py-1 text-xs text-forest" />
              <ActionButton action={adjustStock.bind(null, p.id, -1)} label="−1" className="bg-cream px-3 py-1 text-xs text-forest" />
            </div>
            <form action={saveProduct} className="space-y-4 p-4">
              <input type="hidden" name="id" value={p.id} />
              <ProductFields p={p} />
              <div className="flex justify-end"><SubmitButton label="Save changes" pendingLabel="Saving…" /></div>
            </form>
          </details>
        ))}
      </div>
    </div>
  );
}

function ProductFields({ p }: { p?: Product }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Field label="Name (English)" name="name" required defaultValue={p?.name} maxLength={80} />
      <Field label="Name (Khmer)" name="name_km" defaultValue={p?.name_km ?? ""} maxLength={80} />
      <SelectField label="Category" name="category" defaultValue={p?.category ?? "gifts"}>
        {Object.entries(CATEGORIES).map(([k, [en, km]]) => <option key={k} value={k}>{en} · {km}</option>)}
      </SelectField>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Price (USD)" name="price_usd" type="number" step="0.01" min="0" required defaultValue={p?.price_usd} />
        <Field label="SKU (optional)" name="sku" defaultValue={p?.sku ?? ""} />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Stock" name="stock" type="number" min="0" defaultValue={p?.stock ?? 0} />
        <Field label="Warn below" name="low_stock" type="number" min="0" defaultValue={p?.low_stock ?? 5} />
        <Field label="Order" name="sort" type="number" defaultValue={p?.sort ?? 0} />
      </div>
      <Field label="Short description" name="description" defaultValue={p?.description ?? ""} maxLength={400} />
      <div className="md:col-span-2">
        <ImageUploadField name="image" label="Photo" current={p?.image_url} uploadLabel="Upload photo" urlLabel="…or paste an image link" aspect="aspect-square" transparent />
      </div>
      <label className="flex w-fit cursor-pointer items-center gap-3 rounded-2xl bg-cream px-4 py-3 text-sm font-semibold text-forest">
        <input type="checkbox" name="active" defaultChecked={p ? p.active : true} className="h-5 w-5 accent-[#176B3A]" /> On sale (shown at the till and on the website)
      </label>
    </div>
  );
}

function Card({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-3xl bg-white p-5 shadow-soft ring-1 ring-black/5">
      <p className="text-xs font-bold uppercase tracking-wider text-ink/45">{label}</p>
      <p className="mt-1 font-display text-3xl font-extrabold text-forest">{value}</p>
      <p className="text-xs text-ink/50">{note}</p>
    </div>
  );
}
