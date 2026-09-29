import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Navbar } from "@/components/visitor/Navbar";
import { BottomNav } from "@/components/visitor/BottomNav";
import { SiteFooter } from "@/components/visitor/SiteFooter";
import { LiveWatch } from "@/components/live/LiveWatch";
import { getI18n } from "@/lib/i18n/server";
import { getSessionUser } from "@/lib/auth/session";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { onAir, type LiveRow } from "@/lib/server/live";
import { iceServers } from "@/lib/server/ice";

export const dynamic = "force-dynamic";

async function load(id: string) {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const { data } = await createServiceRoleClient().from("live_streams").select("*").eq("id", id).maybeSingle();
  return (data as LiveRow) ?? null;
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const s = await load(params.id);
  return s ? { title: `🔴 ${s.title}`, description: `Live from Green Wild Zoo${s.place ? ` · ${s.place}` : ""}` } : { title: "Live" };
}

export default async function WatchLive({ params }: { params: { id: string } }) {
  const s = await load(params.id);
  if (!s) notFound();
  const { locale } = getI18n();
  const [user, { data: comments }, ice] = await Promise.all([
    getSessionUser(),
    createServiceRoleClient().from("live_comments").select("id, name, avatar, staff, body, created_at").eq("stream_id", s.id).eq("hidden", false).order("created_at", { ascending: false }).limit(60),
    iceServers(),
  ]);
  return (
    <div className="pb-20 md:pb-0">
      <Navbar />
      <main className="mx-auto max-w-6xl px-3 py-4 md:px-6 md:py-6">
        <LiveWatch
          id={s.id}
          title={s.title}
          place={s.place}
          likes={s.likes}
          viewers={s.viewers_now}
          onAir={onAir(s)}
          comments={(comments ?? []).reverse() as any}
          ice={ice}
          km={locale === "km"}
          signedIn={Boolean(user)}
          liked={user ? Boolean((await createServiceRoleClient().from("live_likes").select("liker").eq("stream_id", s.id).eq("liker", `u:${user.id}`).maybeSingle()).data) : false}
        />
      </main>
      <SiteFooter />
      <BottomNav />
    </div>
  );
}
