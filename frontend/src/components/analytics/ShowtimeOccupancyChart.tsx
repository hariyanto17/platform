"use client";

import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { ShowtimePerformanceItem } from "@/lib/api/dashboardApi";

interface ShowtimeOccupancyChartProps {
  schedules: ShowtimePerformanceItem[];
}

export const ShowtimeOccupancyChart: React.FC<ShowtimeOccupancyChartProps> = ({ schedules }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [width, setWidth] = useState(600);
  const topSchedules = schedules.slice(0, 10);
  const height = 240;

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      if (entries[0]) {
        setWidth(entries[0].contentRect.width || 600);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!svgRef.current || topSchedules.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const margin = { top: 20, right: 20, bottom: 45, left: 45 };
    const innerWidth = Math.max(100, width - margin.left - margin.right);
    const innerHeight = Math.max(100, height - margin.top - margin.bottom);

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const xScale = d3
      .scaleBand()
      .domain(topSchedules.map((_, i) => i.toString()))
      .range([0, innerWidth])
      .padding(0.3);

    const yScale = d3
      .scaleLinear()
      .domain([0, 100])
      .range([innerHeight, 0]);

    // Grid lines
    g.append("g")
      .attr("class", "grid")
      .call(
        d3.axisLeft(yScale)
          .ticks(5)
          .tickSize(-innerWidth)
          .tickFormat(() => "")
      )
      .selectAll("line")
      .attr("stroke", "#1e293b")
      .attr("stroke-dasharray", "3,3");

    // Y Axis (%)
    const yAxis = g.append("g").call(
      d3.axisLeft(yScale).ticks(5).tickFormat((d) => `${d}%`)
    );
    yAxis.select(".domain").remove();
    yAxis.selectAll("text").style("fill", "#94a3b8").style("font-size", "10px");

    // X Axis (Showtimes / Studios)
    const xAxis = g
      .append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(
        d3.axisBottom(xScale).tickFormat((i) => {
          const item = topSchedules[parseInt(i, 10)];
          if (!item) return "";
          const time = new Date(item.startTime).toLocaleTimeString("id-ID", {
            hour: "2-digit",
            minute: "2-digit",
          });
          return `${item.studioCode} ${time}`;
        })
      );
    xAxis.select(".domain").attr("stroke", "#334155");
    xAxis.selectAll("text")
      .style("fill", "#94a3b8")
      .style("font-size", "10px")
      .style("font-weight", "500");

    // Bars
    g.selectAll(".occ-bar")
      .data(topSchedules)
      .enter()
      .append("rect")
      .attr("class", "occ-bar")
      .attr("x", (_, i) => xScale(i.toString()) || 0)
      .attr("y", (d) => yScale(d.occupancyRate || 0))
      .attr("width", xScale.bandwidth())
      .attr("height", (d) => innerHeight - yScale(d.occupancyRate || 0))
      .attr("rx", 4)
      .attr("fill", (d) => {
        const rate = d.occupancyRate || 0;
        if (rate >= 80) return "#10b981"; // high green
        if (rate >= 40) return "#3b82f6"; // medium blue
        return "#f59e0b"; // amber low
      });

    // Value Labels
    g.selectAll(".occ-label")
      .data(topSchedules)
      .enter()
      .append("text")
      .attr("class", "occ-label")
      .attr("x", (_, i) => (xScale(i.toString()) || 0) + xScale.bandwidth() / 2)
      .attr("y", (d) => yScale(d.occupancyRate || 0) - 5)
      .attr("text-anchor", "middle")
      .style("fill", "#f8fafc")
      .style("font-size", "10px")
      .style("font-weight", "700")
      .text((d) => d.occupancyRate !== null ? `${Math.round(d.occupancyRate)}%` : "N/A");
  }, [topSchedules, width, height]);

  if (topSchedules.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-slate-900/50 border border-slate-800 rounded-xl text-slate-400 text-sm">
        No showtime occupancy data available for this range.
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full bg-slate-900/50 border border-slate-800/80 rounded-xl p-5 backdrop-blur-sm">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-bold text-slate-100">Seat Occupancy by Showtime</h3>
        <span className="text-xs text-slate-400">Peak Occupancy Highlights</span>
      </div>
      <div className="overflow-x-auto">
        <svg ref={svgRef} width={width} height={height} />
      </div>
    </div>
  );
};
