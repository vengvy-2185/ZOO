"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getDeviceToken } from "@/lib/utils/device";
import type { FriendMarker } from "./ZooMap";

const STORAGE_KEY = "gwz_map_group";

interface StoredGroup {
  groupId: string;
  memberId: string;
  joinCode: string;
  displayName: string;
}

export function useFriendsGroup() {
  const [group, setGroup] = useState<StoredGroup | null>(null);
  const [friends, setFriends] = useState<FriendMarker[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // restore a group the person already joined earlier in this browser
  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) setGroup(JSON.parse(raw));
  }, []);

  // subscribe to live position updates for the current group via Supabase Realtime
  useEffect(() => {
    if (!group) {
      setFriends([]);
      return;
    }
    const supabase = createClient();

    async function loadInitial() {
      const res = await fetch(`/api/map-groups/${group!.groupId}/members`);
      const data = await res.json();
      setFriends(
        (data.members ?? []).map((m: any) => ({
          id: m.id,
          display_name: m.display_name,
          avatar_color: m.avatar_color,
          avatar_emoji: m.avatar_emoji,
          map_x: m.map_x,
          map_y: m.map_y,
          isMe: m.id === group!.memberId,
        }))
      );
    }
    loadInitial();

    const channel = supabase
      .channel(`map-group-${group.groupId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "map_group_members", filter: `group_id=eq.${group.groupId}` },
        (payload) => {
          setFriends((prev) => {
            if (payload.eventType === "DELETE") {
              return prev.filter((f) => f.id !== (payload.old as any).id);
            }
            const m = payload.new as any;
            const next: FriendMarker = {
              id: m.id,
              display_name: m.display_name,
              avatar_color: m.avatar_color,
              avatar_emoji: m.avatar_emoji,
              map_x: m.map_x,
              map_y: m.map_y,
              isMe: m.id === group!.memberId,
            };
            const idx = prev.findIndex((f) => f.id === m.id);
            if (idx === -1) return [...prev, next];
            const copy = [...prev];
            copy[idx] = next;
            return copy;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [group]);

  async function createGroup(displayName: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/map-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName, deviceToken: getDeviceToken() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not create group.");
      const next = { groupId: data.groupId, memberId: data.memberId, joinCode: data.joinCode, displayName };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setGroup(next);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function joinGroup(joinCode: string, displayName: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/map-groups/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ joinCode, displayName, deviceToken: getDeviceToken() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not join group.");
      const next = { groupId: data.groupId, memberId: data.memberId, joinCode: data.joinCode, displayName };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setGroup(next);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function shareLocation(x: number, y: number) {
    if (!group) return;
    await fetch("/api/map-groups/location", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groupId: group.groupId, memberId: group.memberId, mapX: x, mapY: y }),
    });
  }

  async function leaveGroup() {
    if (!group) return;
    await fetch("/api/map-groups/leave", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groupId: group.groupId, memberId: group.memberId }),
    });
    localStorage.removeItem(STORAGE_KEY);
    setGroup(null);
    setFriends([]);
  }

  return { group, friends, loading, error, createGroup, joinGroup, shareLocation, leaveGroup };
}
