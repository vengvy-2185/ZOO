// The planning rules for one team and one week, as a pure function (no
// database), so they can be checked on their own.
//
// Fairness rules:
// - leave days count as that person's days off for the week (no extra day off
//   on top, which would leave the others doing all the full days);
// - a day where someone is on leave is always covered: the others work the
//   full day if needed, so no shift is left empty;
// - full days go to whoever has worked the least so far;
// - at the end, mornings and afternoons are swapped between people until
//   each person has as many mornings as afternoons as far as possible.

export type Shift = "morning" | "afternoon" | "full" | "off";
export type PlanRow = { user_id: string; day: string; shift: Shift; note: string | null };

export type TeamInput = {
  team: string[];
  days: string[]; // the 7 days of the week
  closed: (d: string) => boolean; // zoo rest day or holiday
  onLeave: (u: string, d: string) => boolean;
  fixed: (u: string, d: string) => Shift | undefined; // boxes that stay as they are
  isFixed: (u: string, d: string) => boolean; // fixed, past, or not to be planned
  need: { am: number; pm: number };
  /** shifts of this team done that day by someone outside it (a cover by another team or an admin) */
  outside?: (d: string) => { am: number; pm: number };
  daysOff: number;
  allowFull: boolean;
  seed: number;
};

export function planTeam(x: TeamInput): PlanRow[] {
  const { team, days, closed, onLeave, fixed: fx, isFixed, need, daysOff, allowFull, seed, outside } = x;
  const n = team.length;
  if (!n) return [];
  const rot = (u: string) => (team.indexOf(u) + seed) % n;
  const open = days.filter((d) => !closed(d));
  const rows: PlanRow[] = [];

  // per open day: what fixed boxes already give, who can still be planned
  const day = new Map(
    open.map((d) => {
      let fAm = outside?.(d).am ?? 0;
      let fPm = outside?.(d).pm ?? 0;
      for (const u of team) {
        const f = fx(u, d);
        if (f === "morning" || f === "full") fAm++;
        if (f === "afternoon" || f === "full") fPm++;
      }
      const free = team.filter((u) => !isFixed(u, d) && !onLeave(u, d));
      return [d, { needAm: Math.max(0, need.am - fAm), needPm: Math.max(0, need.pm - fPm), free, leave: team.some((u) => onLeave(u, d)) }];
    })
  );

  // days off, where the team can spare someone most, spread over the week;
  // leave days and fixed "off" boxes already count
  const off = new Map<string, Set<string>>(team.map((u) => [u, new Set<string>()]));
  const slack = new Map(
    open.map((d) => {
      const v = day.get(d)!;
      const people = allowFull || v.leave ? Math.max(v.needAm, v.needPm) : v.needAm + v.needPm;
      return [d, v.free.length - people];
    })
  );
  // people with the fewest days away choose first
  const away = (u: string) => open.filter((d) => fx(u, d) === "off" || onLeave(u, d)).length;
  [...team]
    .sort((a, b) => away(a) - away(b) || rot(a) - rot(b))
    .forEach((u) => {
      const i = team.indexOf(u);
      for (let k = away(u); k < daysOff; k++) {
        const mine = [...off.get(u)!, ...open.filter((d) => fx(u, d) === "off" || onLeave(u, d))].map((d) => open.indexOf(d));
        const gap = (j: number) => (mine.length ? Math.min(...mine.map((m) => Math.abs(m - j))) : 0);
        const order = open
          .map((d, j) => ({ d, j }))
          .sort((a, b) => slack.get(b.d)! - slack.get(a.d)! || gap(b.j) - gap(a.j) || ((a.j + i * 2 + seed) % open.length) - ((b.j + i * 2 + seed) % open.length));
        const pick = order.find((o) => !off.get(u)!.has(o.d) && day.get(o.d)!.free.includes(u));
        if (!pick) break;
        off.get(u)!.add(pick.d);
        slack.set(pick.d, slack.get(pick.d)! - 1);
      }
    });

  // running totals (fixed boxes included)
  const count = new Map(team.map((u) => [u, { am: 0, pm: 0, full: 0 }]));
  for (const u of team)
    for (const d of open) {
      const f = fx(u, d);
      if (f === "morning" || f === "full") count.get(u)!.am++;
      if (f === "afternoon" || f === "full") count.get(u)!.pm++;
      if (f === "full") count.get(u)!.full++;
    }
  const work = (u: string) => count.get(u)!.am + count.get(u)!.pm;

  const planned: PlanRow[] = [];
  for (const d of days) {
    if (closed(d)) {
      team.filter((u) => !isFixed(u, d)).forEach((u) => rows.push({ user_id: u, day: d, shift: "off", note: null }));
      continue;
    }
    const { needAm, needPm, free, leave } = day.get(d)!;
    const working = free.filter((u) => !off.get(u)!.has(d));
    team.filter((u) => !isFixed(u, d) && !working.includes(u)).forEach((u) => rows.push({ user_id: u, day: d, shift: "off", note: onLeave(u, d) ? "leave" : null }));
    // short of people: someone works the full day (always when it covers someone's leave)
    const short = Math.max(0, needAm + needPm - working.length);
    const fulls = allowFull || leave ? Math.min(working.length, short) : 0;
    const fullSet = new Set([...working].sort((a, b) => work(a) - work(b) || count.get(a)!.full - count.get(b)!.full || rot(a) - rot(b)).slice(0, fulls));
    let amC = fullSet.size;
    let pmC = fullSet.size;
    for (const u of fullSet) {
      planned.push({ user_id: u, day: d, shift: "full", note: null });
      const c = count.get(u)!;
      c.full++;
      c.am++;
      c.pm++;
    }
    // the rest: fill what is missing first, then keep the two halves even,
    // each person getting the half they have done less
    const rest = working.filter((u) => !fullSet.has(u)).sort((a, b) => count.get(a)!.am - count.get(a)!.pm - (count.get(b)!.am - count.get(b)!.pm) || rot(a) - rot(b));
    for (const u of rest) {
      const c = count.get(u)!;
      let wantAm: boolean;
      if (amC < needAm && pmC >= needPm) wantAm = true;
      else if (pmC < needPm && amC >= needAm) wantAm = false;
      else if (amC < needAm && pmC < needPm) wantAm = needAm - amC !== needPm - pmC ? needAm - amC > needPm - pmC : c.am <= c.pm;
      else wantAm = amC - needAm !== pmC - needPm ? amC - needAm < pmC - needPm : c.am <= c.pm;
      if (wantAm) {
        amC++;
        c.am++;
      } else {
        pmC++;
        c.pm++;
      }
      planned.push({ user_id: u, day: d, shift: wantAm ? "morning" : "afternoon", note: null });
    }
  }

  // balance: swap a morning and an afternoon between two people on the same day
  // whenever that makes both closer to even (coverage stays exactly the same)
  const bad = (u: string) => Math.abs(count.get(u)!.am - count.get(u)!.pm);
  for (let pass = 0, changed = true; changed && pass < 50; pass++) {
    changed = false;
    for (const d of open) {
      const mo = planned.filter((r) => r.day === d && r.shift === "morning");
      const af = planned.filter((r) => r.day === d && r.shift === "afternoon");
      for (const a of mo)
        for (const b of af) {
          if (a.shift !== "morning" || b.shift !== "afternoon") continue;
          const ca = count.get(a.user_id)!;
          const cb = count.get(b.user_id)!;
          const before = bad(a.user_id) + bad(b.user_id);
          const after = Math.abs(ca.am - 1 - (ca.pm + 1)) + Math.abs(cb.am + 1 - (cb.pm - 1));
          if (after < before) {
            a.shift = "afternoon";
            b.shift = "morning";
            ca.am--;
            ca.pm++;
            cb.am++;
            cb.pm--;
            changed = true;
          }
        }
      // a day with one person more than needed: that person may change halves,
      // as long as both halves stay covered
      const fixedAm = team.filter((u) => fx(u, d) === "morning" || fx(u, d) === "full").length + (outside?.(d).am ?? 0);
      const fixedPm = team.filter((u) => fx(u, d) === "afternoon" || fx(u, d) === "full").length + (outside?.(d).pm ?? 0);
      for (const r of planned.filter((p) => p.day === d && (p.shift === "morning" || p.shift === "afternoon"))) {
        const today = planned.filter((p) => p.day === d);
        const amNow = fixedAm + today.filter((p) => p.shift === "morning" || p.shift === "full").length;
        const pmNow = fixedPm + today.filter((p) => p.shift === "afternoon" || p.shift === "full").length;
        const c = count.get(r.user_id)!;
        if (r.shift === "morning" && c.am - c.pm >= 2 && amNow - 1 >= need.am) {
          r.shift = "afternoon";
          c.am--;
          c.pm++;
          changed = true;
        } else if (r.shift === "afternoon" && c.pm - c.am >= 2 && pmNow - 1 >= need.pm) {
          r.shift = "morning";
          c.pm--;
          c.am++;
          changed = true;
        }
      }
    }
  }
  return [...rows, ...planned];
}
