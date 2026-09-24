import { NextResponse } from "next/server";

// Profile photos come from Google, Facebook or our own storage. Browsers won't
// let a page save a picture drawn from another site, so ID cards fetch the
// photo through here. Only these hosts are allowed (never an open proxy).
const ALLOWED = [/\.googleusercontent\.com$/, /\.fbcdn\.net$/, /\.fbsbx\.com$/, /\.supabase\.co$/];

/** Ask Google for a big, sharp version instead of the tiny 96px default. */
function sharper(url: URL) {
  if (/googleusercontent\.com$/.test(url.hostname)) url.href = url.href.replace(/=s\d+(-c)?$/, "=s600-c").replace(/\/s\d+(-c)?\//, "/s600-c/");
  return url;
}

export async function GET(req: Request) {
  const raw = new URL(req.url).searchParams.get("u");
  let target: URL;
  try {
    target = new URL(raw ?? "");
  } catch {
    return new NextResponse("bad url", { status: 400 });
  }
  if (target.protocol !== "https:" || !ALLOWED.some((re) => re.test(target.hostname))) return new NextResponse("not allowed", { status: 403 });
  const res = await fetch(sharper(target), { cache: "no-store" }).catch(() => null);
  if (!res?.ok) return new NextResponse("not found", { status: 404 });
  const type = res.headers.get("content-type") ?? "";
  if (!type.startsWith("image/")) return new NextResponse("not an image", { status: 415 });
  const body = await res.arrayBuffer();
  if (body.byteLength > 5 * 1024 * 1024) return new NextResponse("too large", { status: 413 });
  return new NextResponse(body, { headers: { "content-type": type, "cache-control": "public, max-age=86400" } });
}
