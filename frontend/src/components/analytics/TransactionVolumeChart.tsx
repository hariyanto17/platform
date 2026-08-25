"use client";

import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";

interface DailyData {
  date: string;
  revenue: { total: number | null; ticketing: number | null; concession: number | null };
  transactions: { total: number | null; ticketing: number | null; concession: number | null };
  volume: { tickets: number | null; concessionItems: number | null };
}

interface TransactionVolumeChartProps {
  data: DailyData[];
}

interface ParsedVolume {
  dateStr: string;
  ticketing: number;
  concession: number;
}

export const TransactionVolumeChart: React.FC<TransactionVolumeChartProps> = ({ data }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [width, setWidth] = useState(500);
  const height = 320;

  useEffect(() => {
    if (!containerRef.current) return;
    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      setWidth(entries[0].contentRect.width || 500);
    });
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    if (!svgRef.current || data.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const margin = { top: 20, right: 30, bottom: 40, left: 55 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    const parsedData: ParsedVolume[] = data.map((d) => ({
      dateStr: d3.timeFormat("%b %d")(new Date(d.date)),
      ticketing: d.transactions.ticketing || 0,
      concession: d.transactions.concession || 0,
    }));

    const xScale0 = d3.scaleBand()
      .domain(parsedData.map((d) => d.dateStr))
      .rangeRound([0, chartWidth])
      .paddingInner(0.25);

    const xScale1 = d3.scaleBand()
      .domain(["ticketing", "concession"])
      .rangeRound([0, xScale0.bandwidth()])
      .padding(0.05);

    const maxVal = d3.max(parsedData, (d) => Math.max(d.ticketing, d.concession)) || 0;
    const yScale = d3.scaleLinear()
      .domain([0, Math.max(maxVal * 1.1, 5)]) // Ensure scale has some height
      .range([chartHeight, 0]);

    const chartGroup = svg
      .append("g")
      .attr("transform", `translate(${margin.left}, ${margin.top})`);

    // Gridlines
    chartGroup.append("g")
      .attr("class", "grid")
      .attr("color", "rgba(255, 255, 255, 0.05)")
      .call(d3.axisLeft(yScale)
        .tickSize(-chartWidth)
        .tickFormat(() => "")
      );

    // Axes
    chartGroup.append("g")
      .attr("transform", `translate(0, ${chartHeight})`)
      .call(d3.axisBottom(xScale0))
      .attr("color", "#6b7280")
      .selectAll("text")
      .attr("fill", "#9ca3af");

    chartGroup.append("g")
      .call(d3.axisLeft(yScale).ticks(5))
      .attr("color", "#6b7280")
      .selectAll("text")
      .attr("fill", "#9ca3af");

    // Colors
    const colors = {
      ticketing: "#3b82f6",
      concession: "#ec4899",
    };

    // Tooltip elements
    const tooltip = d3.select(containerRef.current)
      .append("div")
      .style("position", "absolute")
      .style("visibility", "hidden")
      .style("background-color", "rgba(15, 23, 42, 0.95)")
      .style("border", "1px solid rgba(51, 65, 85, 0.5)")
      .style("color", "#fff")
      .style("font-size", "12px")
      .style("padding", "10px")
      .style("border-radius", "8px")
      .style("pointer-events", "none")
      .style("z-index", "30")
      .style("min-width", "130px");

    // Draw Bars
    const dateGroups = chartGroup.selectAll(".date-group")
      .data(parsedData)
      .enter()
      .append("g")
      .attr("class", "date-group")
      .attr("transform", (d) => `translate(${xScale0(d.dateStr)}, 0)`);

    // Ticketing Bars
    dateGroups.append("rect")
      .attr("x", xScale1("ticketing") as number)
      .attr("y", (d) => yScale(d.ticketing))
      .attr("width", xScale1.bandwidth())
      .attr("height", (d) => chartHeight - yScale(d.ticketing))
      .attr("fill", colors.ticketing)
      .attr("rx", 3)
      .on("mouseover", () => tooltip.style("visibility", "visible"))
      .on("mouseout", () => tooltip.style("visibility", "hidden"))
      .on("mousemove", (event, d) => {
        tooltip
          .html(`
            <div style="font-weight: 500; color: #9ca3af; margin-bottom: 4px;">${d.dateStr}</div>
            <div style="font-weight: bold; color: #60a5fa;">Ticketing</div>
            <div>${d.ticketing} Transactions</div>
          `)
          .style("left", `${event.offsetX + 15}px`)
          .style("top", `${event.offsetY - 15}px`);
      });

    // Concession Bars
    dateGroups.append("rect")
      .attr("x", xScale1("concession") as number)
      .attr("y", (d) => yScale(d.concession))
      .attr("width", xScale1.bandwidth())
      .attr("height", (d) => chartHeight - yScale(d.concession))
      .attr("fill", colors.concession)
      .attr("rx", 3)
      .on("mouseover", () => tooltip.style("visibility", "visible"))
      .on("mouseout", () => tooltip.style("visibility", "hidden"))
      .on("mousemove", (event, d) => {
        tooltip
          .html(`
            <div style="font-weight: 500; color: #9ca3af; margin-bottom: 4px;">${d.dateStr}</div>
            <div style="font-weight: bold; color: #f472b6;">Concession</div>
            <div>${d.concession} Transactions</div>
          `)
          .style("left", `${event.offsetX + 15}px`)
          .style("top", `${event.offsetY - 15}px`);
      });

    return () => {
      tooltip.remove();
    };
  }, [data, width, height]);

  return (
    <div ref={containerRef} className="relative w-full bg-slate-900/50 border border-slate-800/80 rounded-xl p-5 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-slate-100">Transaction Volumes</h3>
          <p className="text-xs text-slate-400">Daily number of purchases completed per channel</p>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5 text-blue-400">
            <span className="w-2.5 h-2.5 rounded bg-blue-500"></span> Ticketing
          </div>
          <div className="flex items-center gap-1.5 text-pink-400">
            <span className="w-2.5 h-2.5 rounded bg-pink-500"></span> Concession
          </div>
        </div>
      </div>
      <div className="w-full overflow-hidden">
        <svg ref={svgRef} width={width} height={height} className="overflow-visible" />
      </div>
    </div>
  );
};
