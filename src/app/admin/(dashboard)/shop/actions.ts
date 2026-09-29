"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getVerifiedUserId } from "@/lib/auth/session";
import { getCachedRole } from "@/lib/auth/role";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { resolveImage } from "@/lib/admin/upload";
import { CATEGORIES } from "@/lib/server/shop";
import { audit } from "@/lib/server/audit";

async function requireAdmin() {
  const id = getVerifiedUserId();
  if (!id || (await getCachedRole(id)).role !== "admin") throw new Error("Admins only.");
  return id;
}
const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

/** Add or change a product (prices in USD). */
export async function saveProduct(formData: FormData) {
  await requireAdmin();
  const id = str(formData, "id");
  const price = Number(str(formData, "price_usd"));
  const row = {
    name: str(formData, "name").slice(0, 80),
    name_km: str(formData, "name_km").slice(0, 80) || null,
    description: str(formData, "description").slice(0, 400) || null,
    category: Object.keys(CATEGORIES).includes(str(formData, "category")) ? str(formData, "category") : "gifts",
    price_usd: Math.round(price * 100) / 100,
    stock: Math.max(0, Math.round(Number(str(formData, "stock")) || 0)),
    low_stock: Math.max(0, Math.round(Number(str(formData, "low_stock")) || 5)),
    sort: Math.round(Number(str(formData, "sort")) || 0),
    sku: str(formData, "sku").toUpperCase().slice(0, 30) || null,
    active: formData.get("active") === "on",
    image_url: (await resolveImage(formData, "image", "shop")) ?? null,
  };
  if (!row.name || !(price >= 0)) redirect("/admin/shop?msg=invalid");
  const db = createServiceRoleClient();
  const { data, error } = id ? await db.from("shop_products").update(row).eq("id", id).select("id").single() : await db.from("shop_products").insert(row).select("id").single();
  if (error) redirect(`/admin/shop?msg=${encodeURIComponent(error.code === "23505" ? "sku" : error.message)}`);
  await audit("shop.product", "shop_products", data?.id, { name: row.name, price: row.price_usd });
  revalidatePath("/admin/shop");
  revalidatePath("/staff/shop");
  revalidatePath("/shop");
  redirect("/admin/shop?msg=saved");
}

/** New stock arrived (+) or items broke / went missing (−). */
export async function adjustStock(productId: string, delta: number) {
  await requireAdmin();
  const db = createServiceRoleClient();
  const { data: p } = await db.from("shop_products").select("stock").eq("id", productId).single();
  if (!p) return;
  const stock = Math.max(0, p.stock + Math.round(delta));
  await db.from("shop_products").update({ stock }).eq("id", productId);
  await audit("shop.stock", "shop_products", productId, { from: p.stock, to: stock });
  revalidatePath("/admin/shop");
  revalidatePath("/staff/shop");
}
