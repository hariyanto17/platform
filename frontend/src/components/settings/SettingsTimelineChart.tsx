"use client";

import React, { useEffect, useRef } from "react";
import * as d3 from "d3";

interface TimelineChartProps {
  data: Array<{ date: Date; count: number }>;
}

export default function SettingsTimelineChart({ data }: TimelineChartProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!svgRef.current || !data || data.length === 0) return;

    // Clear previous SVG
    d3.select(svgRef.current).selectAll("*").remove();

    const margin = { top: 20, right: 20, bottom: 35, left: 45 };
    const width = 600 - margin.left - margin.right;
    const height = 200 - margin.top - margin.bottom;

    const svg = d3.select(svgRef.current)
      .attr("width", "100%")
      .attr("height", "100%")
      .attr("viewBox", `0 0 600 200`)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleTime()
      .domain(d3.extent(data, d => d.date) as [Date, Date])
      .range([0, width]);

    const y = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.count) || 5])
      .range([height, 0]);

    // Axes
    svg.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(
        d3.axisBottom(x)
          .ticks(5)
          .tickFormat((domainValue) => d3.timeFormat("%b %d")(domainValue as Date))
      )
      .attr("color", "#475569")
      .selectAll("text")
      .style("font-size", "10px")
      .attr("fill", "#94a3b8");

    svg.append("g")
      .call(d3.axisLeft(y).ticks(3))
      .attr("color", "#475569")
      .selectAll("text")
      .style("font-size", "10px")
      .attr("fill", "#94a3b8");

    // Gridlines
    svg.append("g")
      .attr("class", "grid")
      .attr("opacity", 0.1)
      .call(
        d3.axisLeft(y)
          .tickSize(-width)
          .tickFormat(() => "")
      )
      .attr("color", "#94a3b8");

    // Points markers
    svg.selectAll("circle")
      .data(data)
      .enter()
      .append("circle")
      .attr("cx", d => x(d.date))
      .attr("cy", d => y(d.count))
      .attr("r", 5)
      .attr("fill", "#fb7185")
      .attr("stroke", "#0f172a")
      .attr("stroke-width", 1.5);

    // Line path generator
    const line = d3.line<{ date: Date; count: number }>()
      .x(d => x(d.date))
      .y(d => y(d.count))
      .curve(d3.curveMonotoneX);

    svg.append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", "#fb7185")
      .attr("stroke-width", 2)
      .attr("d", line);

  }, [data]);

  return (
    <div className="w-full h-full min-h-[200px] relative">
      <svg ref={svgRef} className="w-full h-full"></svg>
    </div>
  );
}
