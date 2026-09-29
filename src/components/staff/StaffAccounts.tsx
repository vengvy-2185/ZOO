import { Lock, Unlock, UserX, ShieldAlert } from "lucide-react";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { ActionButton } from "@/components/staff/ActionButton";
import { setStaffAccount } from "@/app/staff/(protected)/actions";
import { cn } from "@/lib/utils/cn";

/** The on / off / remove buttons for one staff account (admins and managers). */
export function AccountButtons({ userId, name, status, km }: { userId: string; name: string; status: string; km: boolean }) {
  if (status === "active")
    return (
      <div className="flex flex-wrap justify-end gap-1.5">
        <ActionButton
          action={setStaffAccount.bind(null, userId, "suspended")}
          icon={<Lock size={14} />}
          label={km ? "បិទគណនី" : "Turn off"}
          doneLabel={km ? "បានបិទ" : "Turned off"}
          confirm={km ? `បិទគណនី ${name}?\n\nគាត់នឹងមិនអាចចូលប្រើបានទៀត ត្រូវចាកចេញពីគ្រប់ឧបករណ៍ ហើយត្រូវដកចេញពីកាលវិភាគចាប់ពីថ្ងៃនេះ។ ប្រវត្តិវត្តមាន និងប្រាក់ខែនៅរក្សាទុក។ បើចង់បើកវិញ ត្រូវជួប Admin ឬអ្នកគ្រប់គ្រង។` : `Turn off ${name}'s account?\n\nThey can't sign in any more, are signed out everywhere and are taken off the schedule from today. Attendance and pay history are kept. Only an admin or manager can turn it back on.`}
          className="bg-amber-50 text-amber-800 ring-1 ring-amber-200 hover:bg-amber-100"
        />
        <ActionButton
          action={setStaffAccount.bind(null, userId, "left")}
          icon={<UserX size={14} />}
          label={km ? "លុបចេញ" : "Remove"}
          doneLabel={km ? "បានលុប" : "Removed"}
          confirm={km ? `លុប ${name} ចេញពីប្រព័ន្ធ (លាឈប់)?\n\nគណនីត្រូវបិទ ហើយដកចេញពីកាលវិភាគ និងបញ្ជីបុគ្គលិក។ ប្រវត្តិប្រាក់ខែនៅរក្សាទុកសម្រាប់គណនេយ្យ។` : `Remove ${name} from the system (left)?\n\nThe account is turned off and taken off the schedule and staff lists. Pay history is kept for the accounts.`}
          className="bg-red-50 text-red-700 ring-1 ring-red-200 hover:bg-red-100"
        />
      </div>
    );
  return (
    <ActionButton
      action={setStaffAccount.bind(null, userId, "active")}
      icon={<Unlock size={14} />}
      label={km ? "បើកគណនីវិញ" : "Turn back on"}
      doneLabel={km ? "បានបើក" : "Turned on"}
      confirm={km ? `បើកគណនី ${name} ឡើងវិញ? គាត់អាចចូលប្រើបានម្តងទៀត ហើយកាលវិភាគនឹងរៀបវេនឲ្យដោយស្វ័យប្រវត្តិ។` : `Turn ${name}'s account back on? They can sign in again and the schedule plans their shifts.`}
      className="bg-emerald-600 text-white hover:bg-emerald-700"
    />
  );
}

/** Managers: every staff account with its state, to turn off, remove or turn back on. */
export async function StaffAccounts({ km, viewerId, viewerIsAdmin }: { km: boolean; viewerId: string; viewerIsAdmin: boolean }) {
  const { data } = await createServiceRoleClient().from("staff_members").select("user_id, staff_no, full_name, full_name_km, status, position:staff_positions(name, name_km, permissions)").order("status").order("full_name");
  const people = ((data ?? []) as any[]).filter((p) => p.user_id !== viewerId);
  const ST: Record<string, { km: string; en: string; cls: string }> = {
    active: { km: "សកម្ម", en: "Active", cls: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
    suspended: { km: "បានបិទ", en: "Turned off", cls: "bg-amber-50 text-amber-800 ring-amber-200" },
    left: { km: "បានលុបចេញ", en: "Removed", cls: "bg-red-50 text-red-700 ring-red-200" },
  };
  return (
    <section className="card p-4 md:p-5">
      <h2 className="flex items-center gap-2 font-display text-lg font-extrabold text-forest">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EEF2FF] text-[#1D4ED8]"><ShieldAlert size={20} /></span>
        {km ? "គណនីបុគ្គលិក" : "Staff accounts"}
      </h2>
      <p className="mt-1 text-xs font-semibold text-ink/50">
        {km ? "បិទ ឬលុបគណនី៖ មិនអាចចូលប្រើបានភ្លាមៗ ហើយដកចេញពីកាលវិភាគ។ បើកវិញបានតែដោយ Admin ឬអ្នកគ្រប់គ្រង។" : "Turn off or remove: sign-in stops at once and they leave the schedule. Only an admin or manager can turn it back on."}
      </p>
      <ul className="mt-3 divide-y divide-black/5 overflow-hidden rounded-2xl ring-1 ring-black/5">
        {people.map((p) => {
          const managerAccount = (p.position?.permissions ?? []).includes("reports");
          const st = ST[p.status] ?? ST.active;
          return (
            <li key={p.user_id} className={cn("flex flex-wrap items-center gap-3 px-3 py-2.5", p.status !== "active" && "bg-slate-50/70")}>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-forest">{(km && p.full_name_km) || p.full_name} <span className="font-mono text-xs text-ink/40">· {p.staff_no}</span></p>
                <p className="text-xs text-ink/50">{(km && p.position?.name_km) || p.position?.name || "—"}</p>
              </div>
              <span className={cn("rounded-full px-2.5 py-1 text-xs font-bold ring-1", st.cls)}>{km ? st.km : st.en}</span>
              {managerAccount && !viewerIsAdmin ? (
                <span className="text-[11px] font-semibold text-ink/40">{km ? "មានតែ Admin" : "Admin only"}</span>
              ) : (
                <AccountButtons userId={p.user_id} name={p.full_name} status={p.status} km={km} />
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
