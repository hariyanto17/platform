"use client";

import React, { useEffect, useRef } from "react";
import * as d3 from "d3";

interface ActivityChartProps {
  data: Array<{ date: string; value: number }>;
}

export default function SecurityActivityChart({ data }: ActivityChartProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!svgRef.current || !data || data.length === 0) return;

    // Clear previous SVG
    d3.select(svgRef.current).selectAll("*").remove();

    const margin = { top: 20, right: 20, bottom: 35, left: 45 };
    const width = 600 - margin.left - margin.right;
    const height = 240 - margin.top - margin.bottom;

    const svg = d3.select(svgRef.current)
      .attr("width", "100%")
      .attr("height", "100%")
      .attr("viewBox", `0 0 600 240`)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const parseTime = d3.timeParse("%Y-%m-%d");
    const formattedData = data.map(d => ({
      date: parseTime(d.date) || new Date(),
      value: d.value
    }));

    // Scales
    const x = d3.scaleTime()
      .domain(d3.extent(formattedData, d => d.date) as [Date, Date])
      .range([0, width]);

    const y = d3.scaleLinear()
      .domain([0, d3.max(formattedData, d => d.value) || 10])
      .range([height, 0]);

    // Axes
    svg.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(
        d3.axisBottom(x)
          .ticks(7)
          .tickFormat((domainValue) => d3.timeFormat("%b %d")(domainValue as Date))
      )
      .attr("color", "#475569")
      .selectAll("text")
      .style("font-size", "10px")
      .attr("fill", "#94a3b8");

    svg.append("g")
      .call(d3.axisLeft(y).ticks(5))
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

    // Line generator
    const line = d3.line<{ date: Date; value: number }>()
      .x(d => x(d.date))
      .y(d => y(d.value))
      .curve(d3.curveMonotoneX);

    // Area generator
    const area = d3.area<{ date: Date; value: number }>()
      .x(d => x(d.date))
      .y0(height)
      .y1(d => y(d.value))
      .curve(d3.curveMonotoneX);

    // Fill area
    svg.append("path")
      .datum(formattedData)
      .attr("fill", "url(#security-area-gradient)")
      .attr("d", area);

    // Draw line path
    svg.append("path")
      .datum(formattedData)
      .attr("fill", "none")
      .attr("stroke", "#6366f1")
      .attr("stroke-width", 2.5)
      .attr("d", line);

    // Points markers
    svg.selectAll("circle")
      .data(formattedData)
      .enter()
      .append("circle")
      .attr("cx", d => x(d.date))
      .attr("cy", d => y(d.value))
      .attr("r", 4)
      .attr("fill", "#6366f1")
      .attr("stroke", "#0f172a")
      .attr("stroke-width", 1.5);

  }, [data]);

  return (
    <div className="w-full h-full min-h-[240px] relative">
      <svg ref={svgRef} className="w-full h-full">
        <defs>
          <linearGradient id="security-area-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}
