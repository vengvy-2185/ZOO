"use client";

import { useEffect, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Send, CheckCircle2, MapPin, Siren, Loader2 } from "lucide-react";
import { createTask, addLostItem, addHandover, sendSos, type TaskState, type LostState, type HandoverState, type SosState } from "@/app/staff/(protected)/actions";
import { LOST_CATS, SOS_KINDS, SUPPLY_SECTIONS, TASK_SECTIONS, type LostCat, type SosKind, type Section } from "@/lib/staff-extras";
import { cn } from "@/lib/utils/cn";
import { playSound } from "@/lib/client-sound";

const field = "w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-ink outline-none focus:border-[#2563EB]";
const label = "mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink/45";

function Submit({ text, busy, className, icon = true }: { text: string; busy: string; className?: string; icon?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending} className={cn("inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#1D4ED8] px-5 py-3 text-sm font-bold text-white shadow-soft transition hover:bg-[#1E40AF] active:scale-[.98] disabled:opacity-60", className)}>
      {pending ? <Loader2 size={16} className="animate-spin" /> : icon && <Send size={16} />} {pending ? busy : text}
    </button>
  );
}
const Done = ({ text }: { text: string }) => <p className="flex animate-[gwzPop_.35s_ease-out_both] items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-2.5 text-sm font-bold text-emerald-700 ring-1 ring-emerald-200"><CheckCircle2 size={16} /> {text}</p>;
const Err = ({ text }: { text: string }) => <p className="rounded-2xl bg-red-50 px-4 py-2.5 text-sm font-bold text-red-700 ring-1 ring-red-200">{text}</p>;

function useReset<T extends { ok?: boolean }>(state: T, extra?: () => void) {
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) {
      ref.current?.reset();
      extra?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);
  return ref;
}

// ── Manager: give a task ──────────────────────────────────────────────
export function TaskForm({ km, people }: { km: boolean; people: { id: string; name: string }[] }) {
  const [state, action] = useFormState<TaskState, FormData>(createTask, {});
  const [prio, setPrio] = useState("normal");
  const ref = useReset(state, () => setPrio("normal"));
  const L = km
    ? { title: "ការងារ", titlePh: "ឧ. ពិនិត្យរបងតំបន់ B", to: "ចាត់ឲ្យ", section: "ផ្នែកទាំងមូល", person: "បុគ្គលិកម្នាក់", prio: "អាទិភាព", p: { low: "ទាប", normal: "ធម្មតា", high: "បន្ទាន់" }, due: "ត្រូវរួចមុនម៉ោង (ស្រេចចិត្ត)", note: "ព័ត៌មានបន្ថែម (ស្រេចចិត្ត)", send: "ចាត់ការងារ", busy: "កំពុងផ្ញើ…", done: "បានចាត់ការងាររួចហើយ!", invalid: "សូមបំពេញការងារ និងអ្នកទទួល។" }
    : { title: "Task", titlePh: "e.g. Check the fence in zone B", to: "Give to", section: "A whole section", person: "One person", prio: "Priority", p: { low: "Low", normal: "Normal", high: "Urgent" }, due: "Done by (optional)", note: "Details (optional)", send: "Give task", busy: "Sending…", done: "Task given!", invalid: "Please fill in the task and who it's for." };
  return (
    <form ref={ref} action={action} className="space-y-4">
      <input type="hidden" name="priority" value={prio} />
      <label className="block"><span className={label}>{L.title}</span><input name="title" required maxLength={120} placeholder={L.titlePh} className={field} /></label>
      <label className="block">
        <span className={label}>{L.to}</span>
        <select name="target" required defaultValue="" className={field}>
          <option value="" disabled>—</option>
          <optgroup label={L.section}>
            {(Object.keys(TASK_SECTIONS) as (keyof typeof TASK_SECTIONS)[]).map((k) => <option key={k} value={`s:${k}`}>{km ? TASK_SECTIONS[k].km : TASK_SECTIONS[k].en}</option>)}
          </optgroup>
          <optgroup label={L.person}>
            {people.map((p) => <option key={p.id} value={`u:${p.id}`}>{p.name}</option>)}
          </optgroup>
        </select>
      </label>
      <div>
        <span className={label}>{L.prio}</span>
        <div className="grid grid-cols-3 gap-2">
          {(["low", "normal", "high"] as const).map((k) => (
            <button key={k} type="button" onClick={() => setPrio(k)} className={cn("rounded-2xl py-2.5 text-sm font-bold ring-1 transition", prio === k ? (k === "high" ? "bg-red-500 text-white ring-transparent" : k === "normal" ? "bg-[#1D4ED8] text-white ring-transparent" : "bg-slate-500 text-white ring-transparent") : "bg-white text-ink/60 ring-black/10")}>
              {L.p[k]}
            </button>
          ))}
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-[10rem_1fr]">
        <label className="block"><span className={label}>{L.due}</span><input name="due" type="time" className={field} /></label>
        <label className="block"><span className={label}>{L.note}</span><input name="note" maxLength={500} className={field} /></label>
      </div>
      {state.ok && <Done text={L.done} />}
      {state.error && <Err text={state.error === "invalid" ? L.invalid : state.error} />}
      <Submit text={L.send} busy={L.busy} />
    </form>
  );
}

// ── Lost and found: log an item ───────────────────────────────────────
export function LostForm({ km }: { km: boolean }) {
  const [state, action] = useFormState<LostState, FormData>(addLostItem, {});
  const [cat, setCat] = useState<LostCat>("phone");
  const ref = useReset(state, () => setCat("phone"));
  const L = km
    ? { cat: "ប្រភេទ", item: "របស់អ្វី?", itemPh: "ឧ. iPhone ពណ៌ខ្មៅ", place: "រកឃើញនៅណា?", placePh: "ឧ. ក្បែរទ្រុងសិង្ហ", desc: "ពិពណ៌នា (ពណ៌ ម៉ាក …)", send: "កត់ត្រារបស់រកឃើញ", busy: "កំពុងរក្សាទុក…", done: "បានកត់ត្រារួច! រក្សាទុកនៅការិយាល័យ។", invalid: "សូមបំពេញរបស់ និងទីកន្លែង។" }
    : { cat: "Type", item: "What is it?", itemPh: "e.g. Black iPhone", place: "Where was it found?", placePh: "e.g. Near the lion enclosure", desc: "Description (colour, brand…)", send: "Log found item", busy: "Saving…", done: "Logged! Keep it at the office.", invalid: "Please fill in the item and place." };
  return (
    <form ref={ref} action={action} className="space-y-4">
      <input type="hidden" name="category" value={cat} />
      <div>
        <span className={label}>{L.cat}</span>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
          {(Object.keys(LOST_CATS) as LostCat[]).map((k) => {
            const C = LOST_CATS[k];
            const on = cat === k;
            return (
              <button key={k} type="button" onClick={() => setCat(k)} className={cn("flex flex-col items-center gap-1 rounded-2xl p-2 text-center transition", on ? "bg-white shadow-soft ring-2" : "hover:bg-white")} style={on ? { ["--tw-ring-color" as any]: C.color } : undefined}>
                <span className={cn("flex h-10 w-10 items-center justify-center rounded-xl text-white transition-transform", on && "scale-110")} style={{ background: C.color }}><C.Icon size={19} /></span>
                <span className="text-[10px] font-bold leading-tight text-ink/70">{km ? C.km : C.en}</span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block"><span className={label}>{L.item}</span><input name="item" required maxLength={100} placeholder={L.itemPh} className={field} /></label>
        <label className="block"><span className={label}>{L.place}</span><input name="place" required maxLength={100} placeholder={L.placePh} className={field} /></label>
      </div>
      <label className="block"><span className={label}>{L.desc}</span><input name="description" maxLength={400} className={field} /></label>
      {state.ok && <Done text={L.done} />}
      {state.error && <Err text={state.error === "invalid" ? L.invalid : state.error} />}
      <Submit text={L.send} busy={L.busy} />
    </form>
  );
}

// ── Shift handover note ───────────────────────────────────────────────
export function HandoverForm({ km, sections }: { km: boolean; sections: Section[] }) {
  const [state, action] = useFormState<HandoverState, FormData>(addHandover, {});
  const [section, setSection] = useState<Section>(sections[0]);
  const ref = useReset(state);
  const L = km
    ? { section: "សម្រាប់ផ្នែក", note: "អ្វីដែលវេនបន្ទាប់ត្រូវដឹង", notePh: "ឧ. ដំរីញ៉ាំតិចជាងធម្មតា សូមពិនិត្យម្តងទៀតម៉ោង ៣។", send: "ប្រគល់វេន", busy: "កំពុងរក្សាទុក…", done: "បានរក្សាទុក! វេនបន្ទាប់នឹងឃើញ។", invalid: "សូមសរសេរកំណត់ចំណាំ។" }
    : { section: "For section", note: "What the next shift should know", notePh: "e.g. The elephant ate less than usual, please check again at 3pm.", send: "Hand over", busy: "Saving…", done: "Saved! The next shift will see it.", invalid: "Please write a note." };
  return (
    <form ref={ref} action={action} className="space-y-4">
      <input type="hidden" name="section" value={section} />
      <div>
        <span className={label}>{L.section}</span>
        <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {sections.map((k) => {
            const X = SUPPLY_SECTIONS[k];
            const on = k === section;
            return (
              <button key={k} type="button" onClick={() => setSection(k)} className={cn("inline-flex flex-shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-bold ring-1 transition", on ? "text-white ring-transparent shadow-soft" : "bg-white text-ink/60 ring-black/10")} style={on ? { background: X.color } : undefined}>
                <X.Icon size={15} /> {km ? X.km : X.en}
              </button>
            );
          })}
        </div>
      </div>
      <label className="block"><span className={label}>{L.note}</span><textarea name="note" required maxLength={600} rows={4} placeholder={L.notePh} className={cn(field, "resize-none")} /></label>
      {state.ok && <Done text={L.done} />}
      {state.error && <Err text={state.error === "invalid" ? L.invalid : state.error} />}
      <Submit text={L.send} busy={L.busy} />
    </form>
  );
}

// ── SOS ───────────────────────────────────────────────────────────────
export function SosForm({ km }: { km: boolean }) {
  const [state, action] = useFormState<SosState, FormData>(sendSos, {});
  const [kind, setKind] = useState<SosKind | null>(null);
  const [geo, setGeo] = useState<{ lat: number; lng: number } | null>(null);
  // the sender hears a short "sent" tone
  useEffect(() => {
    if (state.ok) playSound("ok", 0.8);
  }, [state]);
  useEffect(() => {
    navigator.geolocation?.getCurrentPosition((p) => setGeo({ lat: p.coords.latitude, lng: p.coords.longitude }), () => {}, { enableHighAccuracy: true, timeout: 8000 });
  }, []);
  const L = km
    ? { pick: "តើមានអ្វីកើតឡើង?", place: "នៅឯណា?", placePh: "ឧ. ក្បែរច្រកចូលខាងជើង", note: "ព័ត៌មានខ្លី (ស្រេចចិត្ត)", send: "ផ្ញើ SOS ឥឡូវនេះ", busy: "កំពុងផ្ញើ…", done: "បានផ្ញើ SOS! អ្នកគ្រប់គ្រងទាំងអស់បានឃើញហើយ។ សូមនៅកន្លែងសុវត្ថិភាព។", gps: "ទីតាំងរបស់អ្នកនឹងត្រូវផ្ញើទៅជាមួយ", nogps: "មិនអាចយកទីតាំងបាន សូមសរសេរទីកន្លែង" }
    : { pick: "What is happening?", place: "Where?", placePh: "e.g. Near the north gate", note: "Short details (optional)", send: "Send SOS now", busy: "Sending…", done: "SOS sent! Every manager can see it. Stay somewhere safe.", gps: "Your location will be sent too", nogps: "No location, please write the place" };
  if (state.ok)
    return (
      <div className="flex animate-[gwzPop_.4s_ease-out_both] flex-col items-center gap-3 rounded-3xl bg-emerald-50 p-6 text-center ring-1 ring-emerald-200">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lift"><CheckCircle2 size={34} /></span>
        <p className="font-display text-lg font-extrabold text-emerald-800">{L.done}</p>
      </div>
    );
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="kind" value={kind ?? ""} />
      {geo && <input type="hidden" name="lat" value={geo.lat} />}
      {geo && <input type="hidden" name="lng" value={geo.lng} />}
      <div>
        <span className={label}>{L.pick}</span>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {(Object.keys(SOS_KINDS) as SosKind[]).map((k) => {
            const S = SOS_KINDS[k];
            const on = kind === k;
            return (
              <button key={k} type="button" onClick={() => setKind(k)} className={cn("flex items-center gap-2.5 rounded-2xl p-3 text-left text-sm font-bold ring-1 transition", on ? "text-white shadow-lift ring-transparent" : "bg-white text-ink/75 ring-black/10 hover:-translate-y-0.5")} style={on ? { background: S.color } : undefined}>
                <span className={cn("flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl", on ? "bg-white/20" : "text-white")} style={on ? undefined : { background: S.color }}><S.Icon size={20} /></span>
                <span className="leading-tight">{km ? S.km : S.en}</span>
              </button>
            );
          })}
        </div>
      </div>
      <label className="block"><span className={label}>{L.place}</span><input name="place" maxLength={100} placeholder={L.placePh} className={field} /></label>
      <input name="note" maxLength={300} placeholder={L.note} className={field} />
      <p className="flex items-center gap-1.5 text-xs font-semibold text-ink/50"><MapPin size={13} /> {geo ? L.gps : L.nogps}</p>
      {state.error && <Err text={state.error} />}
      <div className={cn("transition", !kind && "pointer-events-none opacity-40")}>
        <SosButton text={L.send} busy={L.busy} />
      </div>
    </form>
  );
}
function SosButton({ text, busy }: { text: string; busy: string }) {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending} className="relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-3xl bg-gradient-to-r from-red-500 to-red-700 px-5 py-5 font-display text-xl font-extrabold text-white shadow-lift transition active:scale-[.98]">
      <span className="absolute inset-0 animate-pulse bg-white/10" />
      {pending ? <Loader2 size={24} className="animate-spin" /> : <Siren size={24} />} {pending ? busy : text}
    </button>
  );
}
