"use client";

import { useState } from "react";
import { Users, MapPin, Satellite, LogOut, Copy } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";

interface Props {
  group: { joinCode: string; displayName: string } | null;
  friendsCount: number;
  loading: boolean;
  error: string | null;
  placingPin: boolean;
  hasCalibration: boolean;
  onCreate: (name: string) => void;
  onJoin: (code: string, name: string) => void;
  onStartPlacing: () => void;
  onUseGps: () => void;
  onLeave: () => void;
}

export function FriendsPanel({
  group,
  friendsCount,
  loading,
  error,
  placingPin,
  hasCalibration,
  onCreate,
  onJoin,
  onStartPlacing,
  onUseGps,
  onLeave,
}: Props) {
  const { t } = useI18n();
  const [mode, setMode] = useState<"closed" | "create" | "join">("closed");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");

  const icon = (
    <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-light-green text-primary">
      <Users size={21} />
    </span>
  );

  if (group) {
    return (
      <div className="card mb-4 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {icon}
            <div>
              <p className="flex flex-wrap items-center gap-2 text-sm font-bold text-forest">
                {t.friends.shareCode}
                <button
                  onClick={() => navigator.clipboard?.writeText(group.joinCode)}
                  className="inline-flex items-center gap-1 rounded-lg bg-primary px-2.5 py-0.5 font-mono text-sm tracking-widest text-white"
                >
                  {group.joinCode} <Copy size={12} />
                </button>
              </p>
              <p className="text-xs text-ink/55">{t.friends.people(friendsCount)}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={onStartPlacing} className="btn-primary px-4 py-2 text-xs hover:translate-y-0">
              <MapPin size={14} /> {placingPin ? t.friends.tapMap : t.friends.updateLocation}
            </button>
            {hasCalibration && !placingPin && (
              <button onClick={onUseGps} className="btn-outline px-4 py-2 text-xs">
                <Satellite size={14} /> {t.friends.useGps}
              </button>
            )}
            <button onClick={onLeave} className="btn border border-black/10 px-4 py-2 text-xs text-ink/60 hover:text-red-600">
              <LogOut size={14} /> {t.friends.leave}
            </button>
          </div>
        </div>
        {!hasCalibration && <p className="mt-2 text-[11px] text-ink/45">{t.friends.noGps}</p>}
      </div>
    );
  }

  return (
    <div className="card mb-4 p-4">
      {mode === "closed" && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {icon}
            <div>
              <p className="text-sm font-bold text-forest">{t.friends.title}</p>
              <p className="text-xs text-ink/55">{t.friends.subtitle}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setMode("create")} className="btn-primary px-4 py-2 text-xs hover:translate-y-0">
              {t.friends.start}
            </button>
            <button onClick={() => setMode("join")} className="btn-outline px-4 py-2 text-xs">
              {t.friends.join}
            </button>
          </div>
        </div>
      )}

      {mode === "create" && (
        <div className="flex flex-wrap items-center gap-2">
          <input placeholder={t.friends.yourName} value={name} onChange={(e) => setName(e.target.value)} className="input flex-1" />
          <button disabled={!name || loading} onClick={() => onCreate(name)} className="btn-primary hover:translate-y-0">
            {loading ? t.friends.creating : t.friends.create}
          </button>
          <button onClick={() => setMode("closed")} className="px-2 text-xs font-semibold text-ink/45">
            {t.friends.cancel}
          </button>
        </div>
      )}

      {mode === "join" && (
        <div className="flex flex-wrap items-center gap-2">
          <input
            placeholder={t.friends.groupCode}
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            maxLength={6}
            className="input w-36 font-mono uppercase tracking-widest"
          />
          <input placeholder={t.friends.yourName} value={name} onChange={(e) => setName(e.target.value)} className="input flex-1" />
          <button disabled={!name || !code || loading} onClick={() => onJoin(code, name)} className="btn-primary hover:translate-y-0">
            {loading ? t.friends.joining : t.friends.joinBtn}
          </button>
          <button onClick={() => setMode("closed")} className="px-2 text-xs font-semibold text-ink/45">
            {t.friends.cancel}
          </button>
        </div>
      )}

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
