import { CalendarPlus, Download } from "lucide-react";
import { OPENING } from "@/lib/data/events";

/**
 * "Add to calendar" for a ticket: a Google Calendar link and an .ics file
 * (Apple / Outlook / Samsung calendars), with a reminder the day before.
 * Times are the zoo's opening hours in Phnom Penh time (UTC+7).
 */
export function AddToCalendar({ date, code, url, km }: { date: string; code: string; url: string; km: boolean }) {
  const d = date.replace(/-/g, "");
  const hm = (t: string) => t.replace(":", "") + "00";
  const title = km ? "ទស្សនាសួនសត្វ Green Wild Zoo" : "Visit Green Wild Zoo";
  const details = km ? `សំបុត្រ ${code}។ បង្ហាញ QR នៅច្រកចូល។ ${url}` : `Ticket ${code}. Show the QR at the gate. ${url}`;
  const place = "Green Wild Zoo, Phnom Penh, Cambodia";

  const google =
    "https://calendar.google.com/calendar/render?" +
    new URLSearchParams({
      action: "TEMPLATE",
      text: title,
      dates: `${d}T${hm(OPENING.open)}/${d}T${hm(OPENING.close)}`,
      ctz: "Asia/Phnom_Penh",
      details,
      location: place,
    }).toString();

  const esc = (s: string) => s.replace(/[\\,;]/g, (c) => "\\" + c).replace(/\n/g, "\\n");
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Green Wild Zoo//Ticket//EN",
    "BEGIN:VEVENT",
    `UID:${code}@greenwildzoo`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`,
    `DTSTART;TZID=Asia/Phnom_Penh:${d}T${hm(OPENING.open)}`,
    `DTEND;TZID=Asia/Phnom_Penh:${d}T${hm(OPENING.close)}`,
    `SUMMARY:${esc(title)}`,
    `DESCRIPTION:${esc(details)}`,
    `LOCATION:${esc(place)}`,
    `URL:${url}`,
    "BEGIN:VALARM",
    "TRIGGER:-PT15H",
    "ACTION:DISPLAY",
    `DESCRIPTION:${esc(title)}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  return (
    <div className="grid grid-cols-2 gap-2">
      <a href={google} target="_blank" rel="noreferrer" className="btn-outline justify-center bg-white px-3 py-2.5 text-xs">
        <CalendarPlus size={15} /> Google Calendar
      </a>
      <a href={`data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`} download={`green-wild-zoo-${code}.ics`} className="btn-outline justify-center bg-white px-3 py-2.5 text-xs">
        <Download size={15} /> {km ? "ដាក់ក្នុងប្រតិទិន" : "Add to calendar"}
      </a>
    </div>
  );
}
