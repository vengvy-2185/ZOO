"use client";

import { LineChart, Line, ResponsiveContainer, XAxis, Tooltip, BarChart, Bar, PieChart, Pie, Cell } from "recharts";

const PIE_COLORS = ["#176B3A", "#2E8B57", "#F4C95D", "#8FB8F0", "#EF9A9A"];

export function VisitorsTrendChart({ data }: { data: { date: string; visitors: number }[] }) {
  if (data.length === 0) return <EmptyChart label="No visitor data yet" />;
  return (
    <ResponsiveContainer width="100%" height={140}>
      <LineChart data={data}>
        <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#17231A99" }} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12, border: "1px solid rgba(0,0,0,.08)" }} />
        <Line type="monotone" dataKey="visitors" stroke="#176B3A" strokeWidth={2.5} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function TicketSalesChart({ data }: { data: { name: string; value: number }[] }) {
  if (data.length === 0 || data.every((d) => d.value === 0)) return <EmptyChart label="No tickets sold yet" />;
  return (
    <ResponsiveContainer width="100%" height={140}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={35} outerRadius={55} paddingAngle={2}>
          {data.map((_, i) => (
            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12, border: "1px solid rgba(0,0,0,.08)" }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function RevenueChart({ data }: { data: { date: string; revenue: number }[] }) {
  if (data.length === 0) return <EmptyChart label="No revenue yet" />;
  return (
    <ResponsiveContainer width="100%" height={140}>
      <BarChart data={data}>
        <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#17231A99" }} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12, border: "1px solid rgba(0,0,0,.08)" }} />
        <Bar dataKey="revenue" fill="#F4C95D" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="flex h-[140px] items-center justify-center text-xs text-ink/40">{label}</div>
  );
}
