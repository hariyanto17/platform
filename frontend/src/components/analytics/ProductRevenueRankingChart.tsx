"use client";

import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { ProductPerformanceItem } from "@/lib/api/dashboardApi";

interface ProductRevenueRankingChartProps {
  products: ProductPerformanceItem[];
}

export const ProductRevenueRankingChart: React.FC<ProductRevenueRankingChartProps> = ({ products }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [width, setWidth] = useState(600);
  const topProducts = products.slice(0, 7);
  const height = Math.max(220, topProducts.length * 42 + 40);

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
    if (!svgRef.current || topProducts.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const margin = { top: 10, right: 90, bottom: 25, left: 160 };
    const innerWidth = Math.max(100, width - margin.left - margin.right);
    const innerHeight = Math.max(100, height - margin.top - margin.bottom);

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const maxRevenue = d3.max(topProducts, (d) => d.netRevenue) || 1;

    const yScale = d3
      .scaleBand()
      .domain(topProducts.map((d) => d.productName))
      .range([0, innerHeight])
      .padding(0.3);

    const xScale = d3
      .scaleLinear()
      .domain([0, maxRevenue * 1.05])
      .range([0, innerWidth]);

    // Grid lines
    g.append("g")
      .attr("class", "grid")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(
        d3.axisBottom(xScale)
          .ticks(5)
          .tickSize(-innerHeight)
          .tickFormat(() => "")
      )
      .selectAll("line")
      .attr("stroke", "#1e293b")
      .attr("stroke-dasharray", "3,3");

    // Y Axis (Product Names)
    const yAxis = g.append("g")
      .call(d3.axisLeft(yScale).tickSize(0));
    
    yAxis.select(".domain").remove();
    yAxis.selectAll("text")
      .style("fill", "#94a3b8")
      .style("font-size", "12px")
      .style("font-weight", "500")
      .each(function () {
        const self = d3.select(this);
        const originalText = self.text();
        if (originalText.length > 20) {
          self.text(originalText.substring(0, 18) + "…");
        }
      });

    // Bars
    g.selectAll(".prod-bar")
      .data(topProducts)
      .enter()
      .append("rect")
      .attr("class", "prod-bar")
      .attr("y", (d) => yScale(d.productName) || 0)
      .attr("height", yScale.bandwidth())
      .attr("x", 0)
      .attr("width", (d) => xScale(d.netRevenue))
      .attr("rx", 5)
      .attr("fill", "url(#prod-bar-gradient)");

    // Labels
    g.selectAll(".prod-bar-label")
      .data(topProducts)
      .enter()
      .append("text")
      .attr("class", "prod-bar-label")
      .attr("y", (d) => (yScale(d.productName) || 0) + yScale.bandwidth() / 2 + 4)
      .attr("x", (d) => xScale(d.netRevenue) + 8)
      .style("fill", "#f472b6")
      .style("font-size", "11px")
      .style("font-weight", "700")
      .text((d) => `Rp ${(d.netRevenue / 1000).toLocaleString("id-ID")}k (${d.quantitySold} sold)`);

    // Gradient definition
    const defs = svg.append("defs");
    const gradient = defs
      .append("linearGradient")
      .attr("id", "prod-bar-gradient")
      .attr("x1", "0%")
      .attr("y1", "0%")
      .attr("x2", "100%")
      .attr("y2", "0%");

    gradient.append("stop").attr("offset", "0%").attr("stop-color", "#ec4899");
    gradient.append("stop").attr("offset", "100%").attr("stop-color", "#f43f5e");
  }, [topProducts, width, height]);

  if (topProducts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-slate-900/50 border border-slate-800 rounded-xl text-slate-400 text-sm">
        No concession product performance data available for this range.
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full bg-slate-900/50 border border-slate-800/80 rounded-xl p-5 backdrop-blur-sm">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-bold text-slate-100">Top Concession Products by Net Revenue</h3>
        <span className="text-xs text-slate-400">Sales Ranking</span>
      </div>
      <div className="overflow-x-auto">
        <svg ref={svgRef} width={width} height={height} />
      </div>
    </div>
  );
};
