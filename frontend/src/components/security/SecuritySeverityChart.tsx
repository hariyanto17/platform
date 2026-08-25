"use client";

import React, { useEffect, useRef } from "react";
import * as d3 from "d3";

interface SeverityChartProps {
  data: Array<{ category: string; count: number }>;
}

export default function SecuritySeverityChart({ data }: SeverityChartProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!svgRef.current || !data || data.length === 0) return;

    // Clear previous SVG
    d3.select(svgRef.current).selectAll("*").remove();

    const margin = { top: 10, right: 30, bottom: 30, left: 100 };
    const width = 450 - margin.left - margin.right;
    const height = 180 - margin.top - margin.bottom;

    const svg = d3.select(svgRef.current)
      .attr("width", "100%")
      .attr("height", "100%")
      .attr("viewBox", `0 0 450 180`)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.count) || 5])
      .range([0, width]);

    const y = d3.scaleBand()
      .range([0, height])
      .domain(data.map(d => d.category))
      .padding(0.2);

    svg.append("g")
      .call(d3.axisLeft(y).tickSize(0))
      .attr("color", "#94a3b8")
      .selectAll("text")
      .style("font-size", "10px")
      .style("font-weight", "bold");

    svg.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x).ticks(5).tickSize(-height))
      .attr("color", "#334155")
      .selectAll("text")
      .style("font-size", "9px")
      .attr("fill", "#64748b");

    svg.selectAll("rect")
      .data(data)
      .enter()
      .append("rect")
      .attr("x", x(0))
      .attr("y", d => y(d.category) || 0)
      .attr("width", d => x(d.count))
      .attr("height", y.bandwidth())
      .attr("fill", "#6366f1")
      .attr("rx", 3);

  }, [data]);

  return (
    <div className="w-full h-full min-h-[180px]">
      <svg ref={svgRef} className="w-full h-full"></svg>
    </div>
  );
}
