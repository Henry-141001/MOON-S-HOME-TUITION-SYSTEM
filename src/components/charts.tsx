"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

// Muted series palette that sits well on cream/white.
const SERIES = ["#5b7a59", "#b08d57", "#5f86a3", "#b36f60", "#8a7aa8", "#7fa79c", "#a3a35f", "#c08a9a"];
const GRID = "#ece6da";
const AXIS = "#8b948c";

const tooltipStyle = {
  borderRadius: 12,
  border: "1px solid #e9e2d5",
  boxShadow: "0 4px 16px rgb(45 56 48 / 0.08)",
  fontSize: 12,
};

function EmptyChart({ height, text = "Belum ada data untuk dipaparkan." }: { height: number; text?: string }) {
  return (
    <div style={{ height }} className="grid place-items-center rounded-2xl bg-beige-50 text-[13px] text-muted">
      {text}
    </div>
  );
}

/** Percentage over time, one line per subject (or a single series). */
export function TrendLineChart({
  points,
  series,
  height = 260,
  emptyText,
}: {
  points: Record<string, string | number>[];
  series: string[];
  height?: number;
  emptyText?: string;
}) {
  if (points.length === 0 || series.length === 0) return <EmptyChart height={height} text={emptyText} />;
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: AXIS }} tickLine={false} axisLine={{ stroke: GRID }} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: AXIS }} tickLine={false} axisLine={false} unit="%" />
          <Tooltip contentStyle={tooltipStyle} formatter={(v) => `${Number(v).toFixed(1)}%`} />
          {series.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" iconSize={8} />}
          {series.map((s, i) => (
            <Line
              key={s}
              type="monotone"
              dataKey={s}
              name={s}
              stroke={SERIES[i % SERIES.length]}
              strokeWidth={2.25}
              dot={{ r: 3.5, strokeWidth: 0, fill: SERIES[i % SERIES.length] }}
              activeDot={{ r: 5 }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Horizontal-label bar chart of percentages, e.g. average per subject. */
export function PercentBarChart({
  data,
  bars,
  height = 260,
  emptyText,
  animate = true,
}: {
  data: Record<string, string | number | null>[];
  bars: { key: string; label: string }[];
  height?: number;
  emptyText?: string;
  /** Turn off for printable pages so bars are never caught mid-animation. */
  animate?: boolean;
}) {
  if (data.length === 0) return <EmptyChart height={height} text={emptyText} />;
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 12, left: -16, bottom: 0 }} barGap={4}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: AXIS }} tickLine={false} axisLine={{ stroke: GRID }} interval={0} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: AXIS }} tickLine={false} axisLine={false} unit="%" />
          <Tooltip
            contentStyle={tooltipStyle}
            cursor={{ fill: "#f7f2e9" }}
            formatter={(v) => (v === null || v === undefined ? "—" : `${Number(v).toFixed(1)}%`)}
          />
          {bars.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" iconSize={8} />}
          {bars.map((b, i) => (
            <Bar
              key={b.key}
              dataKey={b.key}
              name={b.label}
              fill={SERIES[i % SERIES.length]}
              radius={[6, 6, 0, 0]}
              maxBarSize={40}
              isAnimationActive={animate}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Stacked attendance counts per session date or month. */
export function AttendanceChart({
  data,
  height = 240,
}: {
  data: { label: string; present: number; absent: number; excused: number }[];
  height?: number;
}) {
  if (data.length === 0) return <EmptyChart height={height} text="Belum ada rekod kehadiran." />;
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 12, left: -20, bottom: 0 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: AXIS }} tickLine={false} axisLine={{ stroke: GRID }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: AXIS }} tickLine={false} axisLine={false} />
          <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "#f7f2e9" }} />
          <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" iconSize={8} />
          <Bar dataKey="present" name="Hadir" stackId="a" fill="#6f8f6c" maxBarSize={36} />
          <Bar dataKey="excused" name="Bersebab" stackId="a" fill="#d9b978" maxBarSize={36} />
          <Bar dataKey="absent" name="Tidak Hadir" stackId="a" fill="#c98c7d" radius={[6, 6, 0, 0]} maxBarSize={36} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
