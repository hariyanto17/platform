"use client";

import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { MoviePerformanceItem } from "@/lib/api/dashboardApi";

interface MovieRevenueRankingChartProps {
  movies: MoviePerformanceItem[];
}

export const MovieRevenueRankingChart: React.FC<MovieRevenueRankingChartProps> = ({ movies }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [width, setWidth] = useState(600);
  const topMovies = movies.slice(0, 7);
  const height = Math.max(220, topMovies.length * 42 + 40);

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
    if (!svgRef.current || topMovies.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const margin = { top: 10, right: 90, bottom: 25, left: 160 };
    const innerWidth = Math.max(100, width - margin.left - margin.right);
    const innerHeight = Math.max(100, height - margin.top - margin.bottom);

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const maxRevenue = d3.max(topMovies, (d) => d.netRevenue) || 1;

    const yScale = d3
      .scaleBand()
      .domain(topMovies.map((d) => d.movieTitle))
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

    // Y Axis (Movie Titles)
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
    g.selectAll(".bar")
      .data(topMovies)
      .enter()
      .append("rect")
      .attr("class", "bar")
      .attr("y", (d) => yScale(d.movieTitle) || 0)
      .attr("height", yScale.bandwidth())
      .attr("x", 0)
      .attr("width", (d) => xScale(d.netRevenue))
      .attr("rx", 5)
      .attr("fill", "url(#movie-bar-gradient)");

    // Labels at the end of bars
    g.selectAll(".bar-label")
      .data(topMovies)
      .enter()
      .append("text")
      .attr("class", "bar-label")
      .attr("y", (d) => (yScale(d.movieTitle) || 0) + yScale.bandwidth() / 2 + 4)
      .attr("x", (d) => xScale(d.netRevenue) + 8)
      .style("fill", "#38bdf8")
      .style("font-size", "11px")
      .style("font-weight", "700")
      .text((d) => `Rp ${(d.netRevenue / 1000000).toFixed(1)}M (${d.ticketsSold} tix)`);

    // Gradient definition
    const defs = svg.append("defs");
    const gradient = defs
      .append("linearGradient")
      .attr("id", "movie-bar-gradient")
      .attr("x1", "0%")
      .attr("y1", "0%")
      .attr("x2", "100%")
      .attr("y2", "0%");

    gradient.append("stop").attr("offset", "0%").attr("stop-color", "#3b82f6");
    gradient.append("stop").attr("offset", "100%").attr("stop-color", "#0ea5e9");
  }, [topMovies, width, height]);

  if (topMovies.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-slate-900/50 border border-slate-800 rounded-xl text-slate-400 text-sm">
        No movie performance data available for this range.
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full bg-slate-900/50 border border-slate-800/80 rounded-xl p-5 backdrop-blur-sm">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-bold text-slate-100">Top Movies by Net Revenue</h3>
        <span className="text-xs text-slate-400">Box Office Rank</span>
      </div>
      <div className="overflow-x-auto">
        <svg ref={svgRef} width={width} height={height} />
      </div>
    </div>
  );
};
