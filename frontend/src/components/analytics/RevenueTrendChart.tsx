"use client";

import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";

interface DailyData {
  date: string;
  revenue: { total: number | null; ticketing: number | null; concession: number | null };
  transactions: { total: number | null; ticketing: number | null; concession: number | null };
  volume: { tickets: number | null; concessionItems: number | null };
}

interface RevenueTrendChartProps {
  data: DailyData[];
}

interface ParsedDaily {
  date: Date;
  total: number;
  ticketing: number;
  concession: number;
}

export const RevenueTrendChart: React.FC<RevenueTrendChartProps> = ({ data }) => {
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

    // Clear previous elements
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const margin = { top: 20, right: 30, bottom: 40, left: 65 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    const parsedData: ParsedDaily[] = data.map((d) => ({
      date: new Date(d.date),
      total: d.revenue.total || 0,
      ticketing: d.revenue.ticketing || 0,
      concession: d.revenue.concession || 0,
    }));

    const xScale = d3.scaleTime()
      .domain(d3.extent(parsedData, (d) => d.date) as [Date, Date])
      .range([0, chartWidth]);

    const maxVal = d3.max(parsedData, (d) => Math.max(d.total, d.ticketing, d.concession)) || 0;
    const yScale = d3.scaleLinear()
      .domain([0, maxVal * 1.1])
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
    const xAxis = d3.axisBottom(xScale)
      .ticks(Math.min(parsedData.length, 7))
      .tickFormat((d) => d3.timeFormat("%b %d")(d as Date));
    
    const yAxis = d3.axisLeft(yScale)
      .ticks(5)
      .tickFormat((v) => `Rp ${(Number(v) / 1000).toLocaleString("id-ID")}k`);

    chartGroup.append("g")
      .attr("transform", `translate(0, ${chartHeight})`)
      .call(xAxis)
      .attr("color", "#6b7280")
      .selectAll("text")
      .attr("fill", "#9ca3af");

    chartGroup.append("g")
      .call(yAxis)
      .attr("color", "#6b7280")
      .selectAll("text")
      .attr("fill", "#9ca3af");

    // Gradients
    const createGradient = (id: string, color: string) => {
      const grad = svg.append("defs")
        .append("linearGradient")
        .attr("id", id)
        .attr("x1", "0%")
        .attr("y1", "0%")
        .attr("x2", "0%")
        .attr("y2", "100%");
      grad.append("stop").attr("offset", "0%").attr("stop-color", color).attr("stop-opacity", 0.35);
      grad.append("stop").attr("offset", "100%").attr("stop-color", color).attr("stop-opacity", 0.0);
    };

    createGradient("grad-total", "#f59e0b");
    createGradient("grad-ticketing", "#3b82f6");
    createGradient("grad-concession", "#ec4899");

    // Area generators
    const areaGen = (key: "total" | "ticketing" | "concession", gradId: string) => {
      const area = d3.area<ParsedDaily>()
        .x((d) => xScale(d.date))
        .y0(chartHeight)
        .y1((d) => yScale(d[key]))
        .curve(d3.curveMonotoneX);

      chartGroup.append("path")
        .datum(parsedData)
        .attr("fill", `url(#${gradId})`)
        .attr("d", area);
    };

    // Line generators
    const lineGen = (key: "total" | "ticketing" | "concession", color: string, strokeWidth = 2) => {
      const line = d3.line<ParsedDaily>()
        .x((d) => xScale(d.date))
        .y((d) => yScale(d[key]))
        .curve(d3.curveMonotoneX);

      chartGroup.append("path")
        .datum(parsedData)
        .attr("fill", "none")
        .attr("stroke", color)
        .attr("stroke-width", strokeWidth)
        .attr("d", line);
    };

    // Draw Ticketing and Concession first, Total on top
    areaGen("ticketing", "grad-ticketing");
    lineGen("ticketing", "#3b82f6", 2);

    areaGen("concession", "grad-concession");
    lineGen("concession", "#ec4899", 2);

    areaGen("total", "grad-total");
    lineGen("total", "#f59e0b", 3);

    // Interactive overlay for tooltips
    const bisectDate = d3.bisector<ParsedDaily, Date>((d) => d.date).left;

    const focus = chartGroup.append("g")
      .style("display", "none");

    focus.append("line")
      .attr("class", "x-hover-line hover-line")
      .attr("y1", 0)
      .attr("y2", chartHeight)
      .attr("stroke", "rgba(255, 255, 255, 0.25)")
      .attr("stroke-width", "1px")
      .attr("stroke-dasharray", "3,3");

    const dotTotal = focus.append("circle").attr("r", 5).attr("fill", "#f59e0b").attr("stroke", "#111827").attr("stroke-width", 2);
    const dotTicketing = focus.append("circle").attr("r", 4).attr("fill", "#3b82f6").attr("stroke", "#111827").attr("stroke-width", 1.5);
    const dotConcession = focus.append("circle").attr("r", 4).attr("fill", "#ec4899").attr("stroke", "#111827").attr("stroke-width", 1.5);

    // Tooltip Card
    const tooltip = d3.select(containerRef.current)
      .append("div")
      .style("position", "absolute")
      .style("visibility", "hidden")
      .style("background-color", "rgba(15, 23, 42, 0.95)")
      .style("border", "1px solid rgba(51, 65, 85, 0.5)")
      .style("color", "#fff")
      .style("font-size", "12px")
      .style("padding", "12px")
      .style("border-radius", "8px")
      .style("pointer-events", "none")
      .style("z-index", "30")
      .style("min-width", "170px");

    svg.append("rect")
      .attr("transform", `translate(${margin.left}, ${margin.top})`)
      .attr("width", chartWidth)
      .attr("height", chartHeight)
      .attr("fill", "transparent")
      .on("mouseover", () => {
        focus.style("display", null);
        tooltip.style("visibility", "visible");
      })
      .on("mouseout", () => {
        focus.style("display", "none");
        tooltip.style("visibility", "hidden");
      })
      .on("mousemove", (event) => {
        const mouseX = d3.pointer(event)[0];
        const x0 = xScale.invert(mouseX);
        const i = bisectDate(parsedData, x0, 1);
        const d0 = parsedData[i - 1];
        const d1 = parsedData[i];
        if (!d0) return;
        const d = !d1 ? d0 : (x0.getTime() - d0.date.getTime() > d1.date.getTime() - x0.getTime() ? d1 : d0);

        const xPos = xScale(d.date);
        focus.select(".x-hover-line").attr("transform", `translate(${xPos}, 0)`);
        dotTotal.attr("cx", xPos).attr("cy", yScale(d.total));
        dotTicketing.attr("cx", xPos).attr("cy", yScale(d.ticketing));
        dotConcession.attr("cx", xPos).attr("cy", yScale(d.concession));

        const dateFormatted = d3.timeFormat("%B %d, %Y")(d.date);
        tooltip
          .html(`
            <div style="font-weight: 500; color: #cbd5e1; border-bottom: 1px solid #1e293b; padding-bottom: 4px; margin-bottom: 6px;">${dateFormatted}</div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px;">
              <span style="display: flex; align-items: center; gap: 6px;"><span style="width: 8px; height: 8px; border-radius: 50%; background-color: #f59e0b;"></span>Total</span>
              <span style="font-weight: bold;">Rp ${d.total.toLocaleString("id-ID")}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px;">
              <span style="display: flex; align-items: center; gap: 6px;"><span style="width: 8px; height: 8px; border-radius: 50%; background-color: #3b82f6;"></span>Ticketing</span>
              <span>Rp ${d.ticketing.toLocaleString("id-ID")}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="display: flex; align-items: center; gap: 6px;"><span style="width: 8px; height: 8px; border-radius: 50%; background-color: #ec4899;"></span>Concession</span>
              <span>Rp ${d.concession.toLocaleString("id-ID")}</span>
            </div>
          `)
          .style("left", `${xPos + margin.left + 15}px`)
          .style("top", `${yScale(d.total) + margin.top - 15}px`);
      });

    return () => {
      tooltip.remove();
    };
  }, [data, width, height]);

  return (
    <div ref={containerRef} className="relative w-full bg-slate-900/50 border border-slate-800/80 rounded-xl p-5 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-slate-100">Revenue Trends</h3>
          <p className="text-xs text-slate-400">Daily revenue trends across ticketing and F&B channels</p>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5 text-amber-500 font-medium">
            <span className="w-2.5 h-2.5 rounded bg-amber-500"></span> Total
          </div>
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
