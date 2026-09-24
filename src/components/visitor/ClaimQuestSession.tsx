"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

const SESSION_KEY = "gwz_quest_session_id";

// Quest points earned before signing in are tracked against a device-local
// session id (visitor_id = null). The moment someone signs in, this claims
// that session so it shows up in their account — allowed by RLS because the
// update policy permits claiming a row where visitor_id is currently null.
export function ClaimQuestSession() {
  useEffect(() => {
    const sessionId = localStorage.getItem(SESSION_KEY);
    if (!sessionId) return;

    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      await supabase
        .from("quest_sessions")
        .update({ visitor_id: user.id })
        .eq("id", sessionId)
        .is("visitor_id", null);
    })();
  }, []);

  return null;
}
