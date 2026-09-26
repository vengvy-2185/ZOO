import { cache } from "react";
import { createServiceRoleClient } from "@/lib/supabase/server";

export type Phone = { label: string; label_km: string; number: string };
export type StaffSettings = {
  /** SOS page: numbers to call */
  phones: Phone[];
  /** the zoo office / security desk, shown on SOS and lost & found */
  office_phone: string;
  sound_enabled: boolean;
  /** 0–100 */
  sound_volume: number;
  /** seconds between siren repeats */
  siren_every: number;
  /** chimes for everyday news */
  chime_tasks: boolean;
  chime_notices: boolean;
  chime_manager: boolean;
  kudos_per_day: number;
  default_leave_quota: number;
  /** handover notes younger than this are marked "new" */
  handover_new_hours: number;
  /** done tasks stay visible this many days */
  task_keep_days: number;
  /** a lost item waiting longer than this is flagged */
  lost_old_days: number;
  /** supply quick picks, one per line, "English | ខ្មែរ" */
  supplies: Record<"tickets" | "animals" | "cleaning" | "guide" | "general", string>;
};

export const DEFAULT_STAFF_SETTINGS: StaffSettings = {
  phones: [
    { label: "Police", label_km: "ប៉ូលីស", number: "117" },
    { label: "Ambulance", label_km: "សង្គ្រោះបន្ទាន់", number: "119" },
    { label: "Fire", label_km: "ពន្លត់អគ្គិភ័យ", number: "118" },
  ],
  office_phone: "",
  sound_enabled: true,
  sound_volume: 80,
  siren_every: 3,
  chime_tasks: true,
  chime_notices: true,
  chime_manager: true,
  kudos_per_day: 10,
  default_leave_quota: 12,
  handover_new_hours: 12,
  task_keep_days: 3,
  lost_old_days: 7,
  supplies: {
    tickets: "Receipt paper rolls | ក្រដាសបោះពុម្ព\nWristbands | ខ្សែដៃភ្ញៀវ\nPens | ប៊ិច\nChange money | ប្រាក់អាប់\nScanner batteries | ថ្មម៉ាស៊ីនស្កេន",
    animals: "Animal food | ចំណីសត្វ\nMedicine | ថ្នាំពេទ្យ\nBedding / straw | ចំបើង / កម្រាល\nGloves | ស្រោមដៃ\nVitamins | វីតាមីន",
    cleaning: "Trash bags | ថង់សំរាម\nSoap | សាប៊ូ\nDisinfectant | ថ្នាំសម្លាប់មេរោគ\nBroom | អំបោស\nTissue | ក្រដាសអនាម័យ",
    guide: "Microphone batteries | ថ្មមីក្រូហ្វូន\nBrochures | ខិត្តប័ណ្ណ\nPaper maps | ផែនទីក្រដាស\nDrinking water | ទឹកផឹក",
    general: "Uniform | ឯកសណ្ឋាន\nDrinking water | ទឹកផឹក\nFirst aid kit | ប្រអប់សង្គ្រោះបឋម\nRaincoat | អាវភ្លៀង",
  },
};

/** The saved settings on top of the defaults (once per request). */
export const getStaffSettings = cache(async (): Promise<StaffSettings> => {
  const { data } = await createServiceRoleClient().from("staff_settings").select("data").eq("id", 1).maybeSingle();
  const d = (data?.data ?? {}) as Partial<StaffSettings>;
  return { ...DEFAULT_STAFF_SETTINGS, ...d, supplies: { ...DEFAULT_STAFF_SETTINGS.supplies, ...(d.supplies ?? {}) }, phones: Array.isArray(d.phones) && d.phones.length ? d.phones : DEFAULT_STAFF_SETTINGS.phones };
});

/** "English | ខ្មែរ" lines → pairs for the quick-pick buttons. */
export function supplyPicks(text: string): [string, string][] {
  return text
    .split(/\r?\n/)
    .map((l) => l.split("|").map((x) => x.trim()))
    .filter((p) => p[0])
    .slice(0, 12)
    .map((p) => [p[0], p[1] || p[0]]);
}
