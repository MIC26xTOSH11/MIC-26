"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  Tooltip,
} from "recharts";
import { Button } from "@/components/ui/button";
import CountUp from "react-countup";
import Link from "next/link";

export default function RuixenStats() {
  const data = [
    { month: "Jan", users: 40, revenue: 10 },
    { month: "Feb", users: 65, revenue: 25 },
    { month: "Mar", users: 90, revenue: 50 },
    { month: "Apr", users: 120, revenue: 80 },
    { month: "May", users: 150, revenue: 90 },
    { month: "Jun", users: 180, revenue: 120 },
  ];

  return (
    <section className="w-full max-w-7xl mx-auto px-4 py-20 grid lg:grid-cols-2 gap-12 items-center">
      
      {/* Left: Text & CTA */}
      <div className="flex flex-col justify-center gap-6">
        <h3 className="text-lg sm:text-xl lg:text-3xl font-normal text-gray-900 dark:text-white leading-relaxed">
          Intuitive Dashboard Experience{" "}
          <span className="text-emerald-400">TattvaDrishti Shield</span>{" "}
          <span className="text-gray-500 dark:text-gray-400 text-sm sm:text-base lg:text-3xl">
            Experience an analytics UI that blends speed, clarity, and design
            precision—giving your team everything they need to make decisions faster.
          </span>
        </h3>
      </div>

      {/* Right: Stacked Bar Chart + Stats */}
      <div className="relative w-full h-[400px] bg-white dark:bg-slate-900 rounded-2xl overflow-hidden border border-white/10 shadow-2xl">

        {/* Chart */}
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barSize={28}>
            <XAxis
              dataKey="month"
              tick={{ fill: "#9ca3af", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              cursor={{ fill: "rgba(16,185,129,0.08)" }}
              contentStyle={{
                background: "#020617",
                border: "1px solid #10b981",
                borderRadius: "10px",
              }}
            />
            <Bar
              dataKey="users"
              stackId="a"
              fill="#10b981"
              radius={[6, 6, 0, 0]}
            />
            <Bar
              dataKey="revenue"
              stackId="a"
              fill="#34d399"
              radius={[6, 6, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
