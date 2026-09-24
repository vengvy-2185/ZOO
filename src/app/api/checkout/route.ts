import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth/session";
import { startKhqr } from "@/lib/server/payments";
import { checkDiscount, redeemDiscount, subtotalFor } from "@/lib/server/discounts";
import { cookies } from "next/headers";
import { REF_COOKIE, isReferralCode } from "@/lib/server/points";
import { pointsFor } from "@/lib/server/quote";

const CheckoutSchema = z.object({
  visitDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD"),
  visitorName: z.string().min(1),
  visitorEmail: z.string().email(),
  items: z
    .array(
      z.object({
        ticket_type_id: z.string().uuid(),
        quantity: z.number().int().min(1),
      })
    )
    .min(1),
  /** Optional discount code typed at checkout (validated and priced on the server). */
  discountCode: z.string().trim().max(40).optional(),
  /** Spend the signed-in visitor's points on this booking (worked out on the server). */
  usePoints: z.boolean().optional(),
});

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "signin" }, { status: 401 });
  const body = await req.json();
  const parsed = CheckoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid checkout payload", details: parsed.error.flatten() }, { status: 400 });
  }
  const { visitDate, visitorName, visitorEmail, items, discountCode, usePoints } = parsed.data;

  // If the person is signed in (visitor account), attach the booking to
  // their profile so it shows up under My Tickets — read from their own
  // session cookie, never trust a client-supplied user id.
  // (token signature verified locally — no extra round trip to Supabase Auth)
  // (checked first thing in POST: buying needs an account)

  const supabase = createServiceRoleClient();

  const { data: types, error: typesError } = await supabase
    .from("ticket_types")
    .select("id, price_usd, is_active")
    .eq("is_active", true)
    .in(
      "id",
      items.map((i) => i.ticket_type_id)
    );
  if (typesError || !types || types.length !== new Set(items.map((i) => i.ticket_type_id)).size) {
    return NextResponse.json({ error: "Could not verify ticket types." }, { status: 500 });
  }

  const priceById = new Map(types.map((t) => [t.id, t.price_usd]));

  // Check the discount code before creating anything, so a bad code is a clear error.
  if (discountCode) {
    const subtotal = await subtotalFor(items);
    const pre = subtotal == null ? null : await checkDiscount(discountCode, subtotal);
    if (!pre?.ok) return NextResponse.json({ error: "discount", reason: pre && !pre.ok ? pre.reason : "invalid" }, { status: 409 });
  }

  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .insert({
      visit_date: visitDate,
      visitor_name: visitorName,
      visitor_email: visitorEmail,
      visitor_id: user?.id ?? null,
      status: "pending",
      // Came through a friend's invite link? (checked again when the booking is paid)
      referral_code: isReferralCode(cookies().get(REF_COOKIE)?.value) ? cookies().get(REF_COOKIE)!.value : null,
    })
    .select()
    .single();
  if (bookingError || !booking) {
    return NextResponse.json({ error: "Could not create booking." }, { status: 500 });
  }

  const bookingItems = items.map((i) => {
    const unit = priceById.get(i.ticket_type_id) ?? 0;
    return {
      booking_id: booking.id,
      ticket_type_id: i.ticket_type_id,
      quantity: i.quantity,
      unit_price_usd: unit,
      line_total_usd: unit * i.quantity,
    };
  });
  const { error: itemsError } = await supabase.from("booking_items").insert(bookingItems);
  if (itemsError) {
    return NextResponse.json({ error: "Could not save ticket selection." }, { status: 500 });
  }

  // Record the discount (the code row is locked, so the last use can't be taken twice).
  let discountUsd = 0;
  if (discountCode) {
    const subtotal = bookingItems.reduce((s, i) => s + i.line_total_usd, 0);
    const res = await redeemDiscount(discountCode, booking.id, subtotal);
    if (!res.ok) {
      await supabase.from("bookings").delete().eq("id", booking.id); // items cascade
      return NextResponse.json({ error: "discount", reason: res.reason }, { status: 409 });
    }
    discountUsd = res.amount;
  }

  // Points: held against this booking under a lock, so they can't be spent twice.
  if (usePoints && user) {
    const subtotal = bookingItems.reduce((s, i) => s + i.line_total_usd, 0);
    const { data: balance } = await supabase.rpc("points_balance", { p_user: user.id });
    const p = pointsFor(Number(balance ?? 0), subtotal - discountUsd);
    if (p.used > 0) {
      const { data: ok } = await supabase.rpc("spend_points_for_booking", { p_user: user.id, p_booking: booking.id, p_points: p.used });
      if (!ok) {
        await supabase.from("bookings").delete().eq("id", booking.id);
        return NextResponse.json({ error: "points" }, { status: 409 });
      }
      discountUsd = Math.round((discountUsd + p.discount) * 100) / 100;
    }
  }

  const { data: total } = await supabase.rpc("calculate_booking_total", {
    p_booking_id: booking.id,
    p_discount_usd: discountUsd,
  });

  const amountUsd = Math.max(0, Math.round(Number(total ?? 0) * 100) / 100);

  // Real payment: a Bakong KHQR the visitor scans with any Cambodian banking
  // app. The booking stays "pending" until Bakong confirms the transfer.
  // Paid tickets are NEVER confirmed here: the booking stays "pending" and the
  // pay page shows the KHQR (or "not available yet" until Bakong is set up).
  if (amountUsd > 0) {
    try {
      await startKhqr("booking", booking.id, amountUsd, booking.booking_code);
    } catch (e: any) {
      return NextResponse.json({ error: e?.message ?? "Could not create the KHQR payment." }, { status: 502 });
    }
    return NextResponse.json({ bookingCode: booking.booking_code, accessKey: booking.qr_token, total: amountUsd, payWith: "khqr" });
  }

  // Free tickets only (e.g. under-3s): nothing to pay, confirm straight away.
  await supabase.from("payments").insert({
    booking_id: booking.id,
    provider: "free",
    provider_reference: `DEV-${Date.now()}`,
    amount_usd: amountUsd,
    status: "paid",
    paid_at: new Date().toISOString(),
  });
  await supabase.from("bookings").update({ status: "confirmed" }).eq("id", booking.id);

  // accessKey (the ticket's own random QR token) is only ever given to the
  // person who just paid; it's what lets a guest re-open their ticket page.
  return NextResponse.json({ bookingCode: booking.booking_code, accessKey: booking.qr_token, total: amountUsd, payWith: "none" });
}
