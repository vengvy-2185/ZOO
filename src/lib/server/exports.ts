import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { payroll, PAY_TYPE } from "./staff";
import { attendanceMonth } from "./attendance";

// Monthly reports for accounting, as plain tables: attendance, payroll and
// cash closes. The same table becomes an Excel file (CSV) or a printable page.

export type ReportType = "attendance" | "payroll" | "cash";
export const REPORTS: Record<ReportType, { km: string; en: string }> = {
  attendance: { km: "វត្តមានបុគ្គលិក", en: "Staff attendance" },
  payroll: { km: "ប្រាក់ខែ", en: "Payroll" },
  cash: { km: "ការបិទបញ្ជីប្រាក់", en: "Cash closes" },
};
export type Report = { title: string; month: string; columns: string[]; rows: (string | number)[][]; totals?: (string | number)[] };

const money = (n: number) => Math.round(n * 100) / 100;

export async function buildReport(type: ReportType, month: string): Promise<Report> {
  const title = `${REPORTS[type].km} · ${month}`;
  if (type === "attendance") {
    const { people } = await attendanceMonth(month);
    const rows = people.map((p) => [p.name, p.staffNo, p.positionKm || p.position || "", p.present, p.late, p.lateMinutes, p.absent, p.leaveDays, money(p.deduction)]);
    return {
      title,
      month,
      columns: ["ឈ្មោះ", "លេខសម្គាល់", "តួនាទី", "វត្តមាន (វេន)", "យឺត (ដង)", "យឺត (នាទី)", "អវត្តមាន (វេន)", "ច្បាប់ (ថ្ងៃ)", "កាត់ប្រាក់ ($)"],
      rows,
      totals: ["សរុប", "", "", sum(rows, 3), sum(rows, 4), sum(rows, 5), sum(rows, 6), sum(rows, 7), money(sum(rows, 8))],
    };
  }
  if (type === "payroll") {
    const lines = await payroll(month);
    const rows = lines.map((l) => [
      l.staff.full_name,
      l.staff.staff_no,
      l.staff.position?.name_km || l.staff.position?.name || "",
      l.staff.position ? PAY_TYPE[l.staff.position.pay_type].km : "",
      l.days,
      l.hours,
      money(l.base),
      money(l.allowance),
      money(l.adjTotal),
      money(l.attendance.deduction),
      money(l.gross),
      l.payslip ? `បានបើក ${l.payslip.paid_at.slice(0, 10)}` : "មិនទាន់",
    ]);
    return {
      title,
      month,
      columns: ["ឈ្មោះ", "លេខសម្គាល់", "តួនាទី", "របៀបគិតប្រាក់", "ថ្ងៃធ្វើការ", "ម៉ោង", "ប្រាក់គោល ($)", "ឧបត្ថម្ភ ($)", "បន្ថែម/កាត់ ($)", "កាត់វត្តមាន ($)", "សរុប ($)", "ស្ថានភាព"],
      rows,
      totals: ["សរុប", "", "", "", sum(rows, 4), money(sum(rows, 5)), money(sum(rows, 6)), money(sum(rows, 7)), money(sum(rows, 8)), money(sum(rows, 9)), money(sum(rows, 10)), ""],
    };
  }
  const next = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 1)).toISOString().slice(0, 10);
  const db = createServiceRoleClient();
  const { data } = await db.from("staff_cash_closes").select("*").gte("day", `${month}-01`).lt("day", next).order("day");
  const ids = [...new Set((data ?? []).map((c: any) => c.user_id))];
  const { data: people } = ids.length ? await db.from("staff_members").select("user_id, full_name, staff_no").in("user_id", ids) : { data: [] as any[] };
  const who = (id: string) => (people ?? []).find((p: any) => p.user_id === id);
  const ST: Record<string, string> = { submitted: "រង់ចាំពិនិត្យ", approved: "បានអនុម័ត", flagged: "ត្រូវពិនិត្យបន្ថែម" };
  const rows = (data ?? []).map((c: any) => [c.day, who(c.user_id)?.full_name ?? "Admin", who(c.user_id)?.staff_no ?? "", c.visitors, money(Number(c.expected_usd)), money(Number(c.counted_usd)), Number(c.counted_khr), money(Number(c.total_usd)), money(Number(c.diff_usd)), ST[c.status] ?? c.status, c.edits ?? 0, c.note ?? ""]);
  return {
    title,
    month,
    columns: ["ថ្ងៃ", "ឈ្មោះ", "លេខសម្គាល់", "ភ្ញៀវ", "ត្រូវមាន ($)", "រាប់បាន ($)", "រាប់បាន (៛)", "សរុប ($)", "ខុសគ្នា ($)", "ស្ថានភាព", "កែ (ដង)", "កំណត់ចំណាំ"],
    rows,
    totals: ["សរុប", "", "", sum(rows, 3), money(sum(rows, 4)), money(sum(rows, 5)), sum(rows, 6), money(sum(rows, 7)), money(sum(rows, 8)), "", "", ""],
  };
}

function sum(rows: (string | number)[][], i: number) {
  return rows.reduce((n, r) => n + (Number(r[i]) || 0), 0);
}

/** CSV that Excel opens with Khmer letters intact (UTF-8 with a BOM). */
export function toCsv(r: Report) {
  const cell = (v: string | number) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [[r.title], [], r.columns, ...r.rows, ...(r.totals ? [r.totals] : [])].map((row) => row.map(cell).join(","));
  return "﻿" + lines.join("\r\n");
}
