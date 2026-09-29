import { notFound } from "next/navigation";
import { getVerifiedUserId } from "@/lib/auth/session";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { staffAccess } from "@/lib/server/staff";
import { canSell, shopPayConfig } from "@/lib/server/shop";
import { PrintButton } from "@/components/shop/PrintButton";

export const dynamic = "force-dynamic";
export const metadata = { title: "Receipt", robots: { index: false } };

/** A small printable receipt (fits an 80 mm receipt printer or a phone screen). */
export default async function ReceiptPage({ params }: { params: { code: string } }) {
  const userId = getVerifiedUserId()!;
  if (!canSell(await staffAccess(userId))) notFound();
  const db = createServiceRoleClient();
  const { data: s } = await db.from("shop_sales").select("*, shop_sale_items(name, qty, price_usd)").eq("code", params.code).maybeSingle();
  if (!s) notFound();
  const [{ data: seller }, pay] = await Promise.all([s.seller_id ? db.from("staff_members").select("full_name").eq("user_id", s.seller_id).maybeSingle() : Promise.resolve({ data: null }), shopPayConfig()]);
  const when = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Phnom_Penh" }).format(new Date(s.paid_at ?? s.created_at));
  const total = Number(s.total_usd);
  return (
    <div className="min-h-screen bg-slate-100 py-6 print:bg-white print:py-0">
      <div className="mx-auto w-[80mm] max-w-full bg-white p-5 font-mono text-[12px] leading-relaxed text-black shadow print:shadow-none">
        <div className="text-center">
          <p className="text-base font-black">GREEN WILD ZOO</p>
          <p>ហាងវត្ថុអនុស្សាវរីយ៍ · Souvenir shop</p>
          <p className="mt-1 text-[11px]">{when}</p>
          <p className="text-[11px]">#{s.code}</p>
        </div>
        <hr className="my-3 border-dashed border-black/40" />
        <table className="w-full">
          <tbody>
            {(s.shop_sale_items ?? []).map((i: any, k: number) => (
              <tr key={k} className="align-top">
                <td className="pr-2">{i.name}<br /><span className="text-[11px] text-black/60">{i.qty} × ${Number(i.price_usd).toFixed(2)}</span></td>
                <td className="text-right">${(i.qty * Number(i.price_usd)).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <hr className="my-3 border-dashed border-black/40" />
        <p className="flex justify-between text-base font-black"><span>TOTAL</span><span>${total.toFixed(2)}</span></p>
        <p className="flex justify-between text-[11px]"><span>≈ KHR</span><span>{Math.round(total * pay.rate).toLocaleString("en-US")}៛</span></p>
        <p className="mt-2 flex justify-between"><span>{s.method === "cash" ? "Cash / សាច់ប្រាក់" : "KHQR (Bakong)"}</span><span>{s.status === "paid" ? "PAID" : s.status.toUpperCase()}</span></p>
        {s.method === "cash" && s.cash_given != null && Number(s.cash_given) > total && (
          <>
            <p className="flex justify-between"><span>Given</span><span>${Number(s.cash_given).toFixed(2)}</span></p>
            <p className="flex justify-between"><span>Change</span><span>${(Number(s.cash_given) - total).toFixed(2)}</span></p>
          </>
        )}
        {s.provider_reference && <p className="break-all text-[10px] text-black/60">Ref {s.provider_reference}</p>}
        {seller?.full_name && <p className="text-[11px]">Seller: {seller.full_name}</p>}
        <hr className="my-3 border-dashed border-black/40" />
        <p className="text-center">អរគុណ! Thank you for supporting our animals 🐘</p>
      </div>
      <div className="mt-4 flex justify-center print:hidden">
        <PrintButton />
      </div>
    </div>
  );
}
