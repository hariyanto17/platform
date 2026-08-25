"use client";

import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";

interface RevenueContributionChartProps {
  ticketingRevenue: number;
  concessionRevenue: number;
}

interface ContributionItem {
  name: string;
  value: number;
  color: string;
}

export const RevenueContributionChart: React.FC<RevenueContributionChartProps> = ({
  ticketingRevenue,
  concessionRevenue,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [width, setWidth] = useState(250);
  const height = 240;

  useEffect(() => {
    if (!containerRef.current) return;
    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      setWidth(Math.min(entries[0].contentRect.width || 250, 320));
    });
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const total = ticketingRevenue + concessionRevenue;
    const data: ContributionItem[] = [
      { name: "Ticketing", value: total > 0 ? ticketingRevenue : 1, color: "#3b82f6" },
      { name: "Concession", value: total > 0 ? concessionRevenue : 1, color: "#ec4899" },
    ];

    const radius = Math.min(width, height) / 2 - 10;
    const chartGroup = svg
      .append("g")
      .attr("transform", `translate(${width / 2}, ${height / 2})`);

    const pie = d3.pie<ContributionItem>()
      .value((d) => d.value)
      .sort(null);

    const arc = d3.arc<d3.PieArcDatum<ContributionItem>>()
      .innerRadius(radius * 0.6)
      .outerRadius(radius);

    const arcs = chartGroup.selectAll(".arc")
      .data(pie(data))
      .enter()
      .append("g")
      .attr("class", "arc");

    arcs.append("path")
      .attr("d", arc)
      .attr("fill", (d) => d.data.color)
      .attr("stroke", "#111827")
      .attr("stroke-width", 2);

    // Center Text
    const ticketingPct = total > 0 ? Math.round((ticketingRevenue / total) * 100) : 50;

    const centerGroup = chartGroup.append("g");
    
    if (total > 0) {
      centerGroup.append("text")
        .attr("text-anchor", "middle")
        .attr("dy", "-0.2em")
        .style("font-size", "22px")
        .style("font-weight", "800")
        .style("fill", "#f8fafc")
        .text(`${ticketingPct}%`);

      centerGroup.append("text")
        .attr("text-anchor", "middle")
        .attr("dy", "1.2em")
        .style("font-size", "11px")
        .style("font-weight", "500")
        .style("fill", "#64748b")
        .text("TICKETING");
    } else {
      centerGroup.append("text")
        .attr("text-anchor", "middle")
        .attr("dy", "0.3em")
        .style("font-size", "14px")
        .style("font-weight", "600")
        .style("fill", "#64748b")
        .text("NO DATA");
    }
  }, [ticketingRevenue, concessionRevenue, width, height]);

  const total = ticketingRevenue + concessionRevenue;
  const ticketingPct = total > 0 ? Math.round((ticketingRevenue / total) * 100) : 0;
  const concessionPct = total > 0 ? Math.round((concessionRevenue / total) * 100) : 0;

  return (
    <div ref={containerRef} className="flex flex-col items-center justify-center bg-slate-900/50 border border-slate-800/80 rounded-xl p-5 backdrop-blur-sm h-full">
      <h3 className="text-sm font-bold text-slate-100 mb-2 self-start">Revenue Contribution</h3>
      <div className="relative">
        <svg ref={svgRef} width={width} height={height} />
      </div>
      <div className="flex gap-6 text-xs mt-2">
        <div className="flex flex-col items-center">
          <span className="text-blue-400 font-bold">{ticketingPct}%</span>
          <span className="text-slate-400 text-[10px]">Ticketing</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-pink-400 font-bold">{concessionPct}%</span>
          <span className="text-slate-400 text-[10px]">Concession</span>
        </div>
      </div>
    </div>
  );
};
