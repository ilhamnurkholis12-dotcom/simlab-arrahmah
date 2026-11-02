import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import * as d3 from 'd3';
import { LabActivityRecord, LabId, LAB_DEFINITIONS } from '../types/inventory';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Calendar,
  Layers,
  Sparkles,
  BarChart3,
  Activity,
  Maximize2,
  Clock,
  User,
  GraduationCap,
  Users,
  Eye,
  Info,
  ChevronRight,
  SlidersHorizontal,
} from 'lucide-react';

interface LabTimelineD3Props {
  activities: LabActivityRecord[];
  selectedLab: LabId;
  onSelectActivity?: (activity: LabActivityRecord) => void;
  onSelectLab?: (labId: LabId) => void;
  className?: string;
}

interface DateAggregatedSessions {
  dateStr: string;
  dateObj: Date;
  totalSessions: number;
  byLab: Record<LabId, number>;
  activities: LabActivityRecord[];
}

export const LabTimelineD3: React.FC<LabTimelineD3Props> = ({
  activities,
  selectedLab,
  onSelectActivity,
  onSelectLab,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);

  // View & Filter states
  const [activeFilterLab, setActiveFilterLab] = useState<LabId | 'ALL'>('ALL');
  const [viewMode, setViewMode] = useState<'histogram' | 'swimlane'>('histogram');
  const [selectedSession, setSelectedSession] = useState<LabActivityRecord | null>(null);
  const [hoveredDateData, setHoveredDateData] = useState<DateAggregatedSessions | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  // Palette colors for laboratories matching institutional design
  const labColors: Record<LabId, { main: string; light: string; border: string }> = {
    FISIKA: { main: '#0284c7', light: '#e0f2fe', border: '#7dd3fc' }, // Sky Blue
    KIMIA: { main: '#d97706', light: '#fef3c7', border: '#fcd34d' }, // Amber/Gold
    BIOLOGI: { main: '#059669', light: '#d1fae5', border: '#6ee7b7' }, // Emerald
    SMP_TERPADU: { main: '#0d9488', light: '#ccfbf1', border: '#5eead4' }, // Teal
  };

  // 1. Prepare and filter activity records
  const filteredActivities = useMemo(() => {
    if (activeFilterLab === 'ALL') return activities;
    return activities.filter((a) => a.laboratorium === activeFilterLab);
  }, [activities, activeFilterLab]);

  // 2. Aggregate practical sessions by date for histogram and density curve
  const aggregatedByDate = useMemo<DateAggregatedSessions[]>(() => {
    const map = new Map<string, { byLab: Record<LabId, number>; activities: LabActivityRecord[] }>();

    filteredActivities.forEach((act) => {
      const d = act.tanggal_kegiatan;
      if (!map.has(d)) {
        map.set(d, {
          byLab: { FISIKA: 0, KIMIA: 0, BIOLOGI: 0, SMP_TERPADU: 0 },
          activities: [],
        });
      }
      const entry = map.get(d)!;
      entry.byLab[act.laboratorium] = (entry.byLab[act.laboratorium] || 0) + 1;
      entry.activities.push(act);
    });

    const list: DateAggregatedSessions[] = Array.from(map.entries()).map(([dateStr, val]) => {
      const total =
        val.byLab.FISIKA + val.byLab.KIMIA + val.byLab.BIOLOGI + val.byLab.SMP_TERPADU;
      return {
        dateStr,
        dateObj: new Date(dateStr),
        totalSessions: total,
        byLab: val.byLab,
        activities: val.activities,
      };
    });

    // Sort chronologically
    return list.sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());
  }, [filteredActivities]);

  // 3. Semester bounds & metrics
  const semesterMetrics = useMemo(() => {
    const totalSessions = filteredActivities.length;
    let peakDate = '-';
    let peakCount = 0;
    aggregatedByDate.forEach((d) => {
      if (d.totalSessions > peakCount) {
        peakCount = d.totalSessions;
        peakDate = d.dateStr;
      }
    });

    const labCounts: Record<LabId, number> = { FISIKA: 0, KIMIA: 0, BIOLOGI: 0, SMP_TERPADU: 0 };
    filteredActivities.forEach((a) => {
      labCounts[a.laboratorium] = (labCounts[a.laboratorium] || 0) + 1;
    });

    let topLab: LabId = 'KIMIA';
    let topCount = -1;
    (Object.keys(labCounts) as LabId[]).forEach((l) => {
      if (labCounts[l] > topCount) {
        topCount = labCounts[l];
        topLab = l;
      }
    });

    return {
      totalSessions,
      peakDate,
      peakCount,
      topLab,
      labCounts,
    };
  }, [filteredActivities, aggregatedByDate]);

  // 4. D3 Chart Drawing with Zoom & Pan Lifecycle
  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth || 900;
    const height = viewMode === 'swimlane' ? 380 : 340;
    const margin = { top: 28, right: 36, bottom: 48, left: 52 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    svg.attr('width', width).attr('height', height).attr('viewBox', `0 0 ${width} ${height}`);

    // Determine initial date domain spanning the semester (July to December 2026, or derived from data)
    let minDate = new Date('2026-07-01T00:00:00');
    let maxDate = new Date('2026-12-31T23:59:59');

    if (aggregatedByDate.length > 0) {
      const dataMin = aggregatedByDate[0].dateObj;
      const dataMax = aggregatedByDate[aggregatedByDate.length - 1].dateObj;
      if (dataMin < minDate) {
        minDate = new Date(dataMin.getTime() - 7 * 86400000);
      }
      if (dataMax > maxDate) {
        maxDate = new Date(dataMax.getTime() + 7 * 86400000);
      }
    }

    // Base Scales
    const xScale = d3.scaleTime().domain([minDate, maxDate]).range([0, innerWidth]);

    const maxFrequency = d3.max(aggregatedByDate, (d) => d.totalSessions) || 3;
    const yScale = d3
      .scaleLinear()
      .domain([0, Math.max(3, maxFrequency + 1)])
      .range([innerHeight, 0])
      .nice();

    // Defs: Gradients and ClipPath
    const defs = svg.append('defs');

    const clip = defs
      .append('clipPath')
      .attr('id', 'timeline-clip-rect')
      .append('rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', innerWidth)
      .attr('height', innerHeight + 10);

    // Background gradient for frequency area curve
    const areaGrad = defs
      .append('linearGradient')
      .attr('id', 'timeline-area-grad')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');

    areaGrad.append('stop').attr('offset', '0%').attr('stop-color', '#0d9488').attr('stop-opacity', 0.28);
    areaGrad.append('stop').attr('offset', '100%').attr('stop-color', '#0d9488').attr('stop-opacity', 0.0);

    // Main Chart Canvas Group
    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    // Grid lines in background
    const yGrid = g
      .append('g')
      .attr('class', 'grid y-grid opacity-30')
      .call(
        d3
          .axisLeft(yScale)
          .ticks(4)
          .tickSize(-innerWidth)
          .tickFormat(() => '')
      );

    yGrid.select('.domain').remove();
    yGrid.selectAll('line').attr('stroke', '#cbd5e1').attr('stroke-dasharray', '3 3');

    // Content container protected by clip-path for zoom/pan
    const contentG = g.append('g').attr('clip-path', 'url(#timeline-clip-rect)');

    // Axes groups
    const xAxisGroup = g
      .append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0,${innerHeight})`);

    const yAxisGroup = g.append('g').attr('class', 'y-axis');

    // Indonesian Date Formatter for Axis Ticks
    const formatIndoDate = (date: Date) => {
      return date.toLocaleDateString('id-ID', { month: 'short', day: 'numeric' });
    };

    const updateAxes = (currXScale: d3.ScaleTime<number, number>) => {
      const xAxis = d3
        .axisBottom(currXScale)
        .ticks(Math.max(4, Math.floor(innerWidth / 110)))
        .tickFormat((d) => formatIndoDate(d as Date));

      xAxisGroup
        .call(xAxis)
        .call((group) => {
          group.select('.domain').attr('stroke', '#94a3b8');
          group.selectAll('text').attr('fill', '#475569').attr('font-size', '11px').attr('font-weight', '600');
          group.selectAll('line').attr('stroke', '#cbd5e1');
        });

      if (viewMode === 'histogram') {
        const yAxis = d3
          .axisLeft(yScale)
          .ticks(4)
          .tickFormat((d) => `${d} sesi`);

        yAxisGroup
          .call(yAxis)
          .call((group) => {
            group.select('.domain').attr('stroke', '#94a3b8');
            group.selectAll('text').attr('fill', '#475569').attr('font-size', '10.5px').attr('font-weight', '600');
            group.selectAll('line').attr('stroke', '#cbd5e1');
          });
      } else {
        yAxisGroup.selectAll('*').remove();
      }
    };

    updateAxes(xScale);

    // =========================================================================
    // RENDER MODE 1: HISTOGRAM & CONTINUOUS FREQUENCY AREA CURVE
    // =========================================================================
    let renderHistogram = (currXScale: d3.ScaleTime<number, number>) => {
      contentG.selectAll('*').remove();

      if (aggregatedByDate.length === 0) {
        contentG
          .append('text')
          .attr('x', innerWidth / 2)
          .attr('y', innerHeight / 2)
          .attr('text-anchor', 'middle')
          .attr('fill', '#94a3b8')
          .attr('font-size', '13px')
          .text('Belum ada riwayat aktivitas praktikum terdaftar pada rentang ini.');
        return;
      }

      // 1. Continuous Frequency Density Area Curve in background
      const areaGenerator = d3
        .area<DateAggregatedSessions>()
        .x((d) => currXScale(d.dateObj))
        .y0(innerHeight)
        .y1((d) => yScale(d.totalSessions))
        .curve(d3.curveMonotoneX);

      const lineGenerator = d3
        .line<DateAggregatedSessions>()
        .x((d) => currXScale(d.dateObj))
        .y((d) => yScale(d.totalSessions))
        .curve(d3.curveMonotoneX);

      contentG
        .append('path')
        .datum(aggregatedByDate)
        .attr('class', 'density-area')
        .attr('fill', 'url(#timeline-area-grad)')
        .attr('d', areaGenerator);

      contentG
        .append('path')
        .datum(aggregatedByDate)
        .attr('class', 'density-line')
        .attr('fill', 'none')
        .attr('stroke', '#0d9488')
        .attr('stroke-width', 2.5)
        .attr('stroke-linecap', 'round')
        .attr('d', lineGenerator);

      // 2. Stacked / Segmented Vertical Frequency Bars per Date
      const barWidth = Math.max(12, Math.min(32, innerWidth / (aggregatedByDate.length * 2 + 10)));

      aggregatedByDate.forEach((dateData) => {
        const xPos = currXScale(dateData.dateObj) - barWidth / 2;
        let currentStackY = innerHeight;

        const labsOrder: LabId[] = ['SMP_TERPADU', 'BIOLOGI', 'KIMIA', 'FISIKA'];

        labsOrder.forEach((labKey) => {
          const count = dateData.byLab[labKey] || 0;
          if (count === 0) return;

          const segHeight = (count / (yScale.domain()[1] || 1)) * innerHeight;
          const yPos = currentStackY - segHeight;
          currentStackY = yPos;

          const barRect = contentG
            .append('rect')
            .attr('class', `bar-seg bar-${labKey}`)
            .attr('x', xPos)
            .attr('y', yPos)
            .attr('width', barWidth)
            .attr('height', segHeight)
            .attr('fill', labColors[labKey].main)
            .attr('rx', 4)
            .attr('stroke', '#ffffff')
            .attr('stroke-width', 1.2)
            .style('cursor', 'pointer')
            .style('transition', 'opacity 0.15s ease');

          // Interaction: Hover & Click
          barRect
            .on('mouseenter', (event) => {
              d3.select(event.currentTarget as SVGRectElement).attr('opacity', 0.82);
              setHoveredDateData(dateData);
              const [mx, my] = d3.pointer(event, container);
              setTooltipPos({ x: mx, y: my });
            })
            .on('mousemove', (event) => {
              const [mx, my] = d3.pointer(event, container);
              setTooltipPos({ x: mx, y: my });
            })
            .on('mouseleave', (event) => {
              d3.select(event.currentTarget as SVGRectElement).attr('opacity', 1.0);
              setHoveredDateData(null);
            })
            .on('click', () => {
              if (dateData.activities.length > 0) {
                setSelectedSession(dateData.activities[0]);
              }
            });
        });

        // Top Activity Bubble on each date
        const topY = yScale(dateData.totalSessions);
        const node = contentG
          .append('g')
          .attr('transform', `translate(${currXScale(dateData.dateObj)},${topY})`)
          .style('cursor', 'pointer');

        node
          .append('circle')
          .attr('r', 8.5)
          .attr('fill', '#ffffff')
          .attr('stroke', '#0f766e')
          .attr('stroke-width', 2.5)
          .attr('class', 'shadow-xs');

        node
          .append('text')
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', 'central')
          .attr('fill', '#0f766e')
          .attr('font-size', '9.5px')
          .attr('font-weight', 'bold')
          .text(dateData.totalSessions);

        node
          .on('mouseenter', (event) => {
            setHoveredDateData(dateData);
            const [mx, my] = d3.pointer(event, container);
            setTooltipPos({ x: mx, y: my });
          })
          .on('mouseleave', () => setHoveredDateData(null))
          .on('click', () => {
            if (dateData.activities.length > 0) {
              setSelectedSession(dateData.activities[0]);
            }
          });
      });
    };

    // =========================================================================
    // RENDER MODE 2: MULTI-TRACK SWIMLANES PER LABORATORIUM
    // =========================================================================
    let renderSwimlanes = (currXScale: d3.ScaleTime<number, number>) => {
      contentG.selectAll('*').remove();

      const swimlaneLabs: LabId[] = ['FISIKA', 'KIMIA', 'BIOLOGI', 'SMP_TERPADU'];
      const trackHeight = innerHeight / swimlaneLabs.length;

      swimlaneLabs.forEach((labId, trackIdx) => {
        const trackY = trackIdx * trackHeight;
        const labInfo = LAB_DEFINITIONS[labId];

        // Track Background Stripe
        contentG
          .append('rect')
          .attr('x', 0)
          .attr('y', trackY + 4)
          .attr('width', innerWidth)
          .attr('height', trackHeight - 8)
          .attr('fill', trackIdx % 2 === 0 ? '#f8fafc' : '#ffffff')
          .attr('rx', 8)
          .attr('stroke', '#e2e8f0');

        // Track Label Left
        contentG
          .append('text')
          .attr('x', 10)
          .attr('y', trackY + trackHeight / 2 - 4)
          .attr('fill', labColors[labId].main)
          .attr('font-size', '11px')
          .attr('font-weight', 'bold')
          .text(labInfo.shortName);

        contentG
          .append('text')
          .attr('x', 10)
          .attr('y', trackY + trackHeight / 2 + 10)
          .attr('fill', '#94a3b8')
          .attr('font-size', '9.5px')
          .text(labInfo.roomLocation.split('·')[0].trim());

        // Plot practical sessions along this track
        const trackActivities = filteredActivities.filter((a) => a.laboratorium === labId);

        trackActivities.forEach((act) => {
          const actDate = new Date(act.tanggal_kegiatan);
          const xPos = currXScale(actDate);
          const nodeWidth = 84;
          const nodeHeight = 32;

          const nodeGroup = contentG
            .append('g')
            .attr('transform', `translate(${xPos - nodeWidth / 2},${trackY + (trackHeight - nodeHeight) / 2})`)
            .style('cursor', 'pointer');

          nodeGroup
            .append('rect')
            .attr('width', nodeWidth)
            .attr('height', nodeHeight)
            .attr('rx', 8)
            .attr('fill', labColors[labId].light)
            .attr('stroke', labColors[labId].border)
            .attr('stroke-width', 1.5)
            .attr('class', 'shadow-2xs hover:shadow-xs transition-shadow');

          nodeGroup
            .append('text')
            .attr('x', 8)
            .attr('y', 14)
            .attr('fill', labColors[labId].main)
            .attr('font-size', '10px')
            .attr('font-weight', 'bold')
            .text(act.judul_percobaan.slice(0, 12) + '...');

          nodeGroup
            .append('text')
            .attr('x', 8)
            .attr('y', 25)
            .attr('fill', '#475569')
            .attr('font-size', '8.5px')
            .text(`Hadir: ${act.jumlah_hadir}`);

          nodeGroup
            .on('mouseenter', (event) => {
              const matched = aggregatedByDate.find((a) => a.dateStr === act.tanggal_kegiatan);
              if (matched) setHoveredDateData(matched);
              const [mx, my] = d3.pointer(event, container);
              setTooltipPos({ x: mx, y: my });
            })
            .on('mouseleave', () => setHoveredDateData(null))
            .on('click', () => setSelectedSession(act));
        });
      });
    };

    // Initial Render of chosen mode
    if (viewMode === 'histogram') {
      renderHistogram(xScale);
    } else {
      renderSwimlanes(xScale);
    }

    // =========================================================================
    // D3.ZOOM & PAN BEHAVIOR (ANTI-LAG TRANSFORM)
    // =========================================================================
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.6, 12]) // Zoom range from full semester up to close-up single week
      .translateExtent([
        [-innerWidth * 1.5, -innerHeight],
        [innerWidth * 2.5, innerHeight * 2],
      ])
      .on('zoom', (event) => {
        const transform = event.transform;
        const newXScale = transform.rescaleX(xScale);

        // Update Axis with new scale
        updateAxes(newXScale);

        // Redraw Content with transformed scale
        if (viewMode === 'histogram') {
          renderHistogram(newXScale);
        } else {
          renderSwimlanes(newXScale);
        }
      });

    svg.call(zoom);
    zoomBehaviorRef.current = zoom;

    // Overlay to catch wheel & drag across the whole chart area
    svg
      .append('rect')
      .attr('class', 'zoom-overlay')
      .attr('x', margin.left)
      .attr('y', margin.top)
      .attr('width', innerWidth)
      .attr('height', innerHeight)
      .attr('fill', 'none')
      .attr('pointer-events', 'all')
      .lower(); // Keep below buttons
  }, [aggregatedByDate, filteredActivities, viewMode, activeFilterLab]);

  // Zoom Button Handlers
  const handleZoomIn = () => {
    if (svgRef.current && zoomBehaviorRef.current) {
      d3.select(svgRef.current).transition().duration(350).call(zoomBehaviorRef.current.scaleBy, 1.4);
    }
  };

  const handleZoomOut = () => {
    if (svgRef.current && zoomBehaviorRef.current) {
      d3.select(svgRef.current).transition().duration(350).call(zoomBehaviorRef.current.scaleBy, 0.7);
    }
  };

  const handleResetZoom = () => {
    if (svgRef.current && zoomBehaviorRef.current) {
      d3.select(svgRef.current).transition().duration(400).call(zoomBehaviorRef.current.transform, d3.zoomIdentity);
    }
  };

  return (
    <div className={`bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden ${className}`}>
      {/* Top Header Card & Controls Bar */}
      <div className="p-5 sm:p-6 pb-4 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-50/70">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-900 text-xs font-bold uppercase tracking-wider">
              <Activity className="w-3.5 h-3.5 text-teal-700" />
              <span>Timeline D3.js Frekuensi Penggunaan Laboratorium</span>
            </span>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600 font-semibold">
              Semester Ganjil TA 2026/2027
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
            Distribusi Waktu & Ritme Sesi Praktikum
          </h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            Gunakan mouse wheel untuk <strong>Zoom In/Out</strong> dan klik-geser (drag) untuk <strong>Pan</strong> sepanjang kalender semester.
          </p>
        </div>

        {/* Action Toolbar */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {/* Mode View Switcher: Histogram vs Swimlane */}
          <div className="inline-flex p-1 bg-white border border-slate-200 rounded-xl shadow-2xs">
            <button
              type="button"
              onClick={() => setViewMode('histogram')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                viewMode === 'histogram'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Histogram &amp; Kurva</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('swimlane')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                viewMode === 'swimlane'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Jalur Multi-Track</span>
            </button>
          </div>

          {/* Zoom Buttons */}
          <div className="inline-flex items-center gap-1 bg-white border border-slate-200 p-1 rounded-xl shadow-2xs">
            <button
              type="button"
              onClick={handleZoomIn}
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              title="Perbesar Rentang Waktu (Zoom In)"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleZoomOut}
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              title="Perkecil Rentang Waktu (Zoom Out)"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleResetZoom}
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              title="Reset Tampilan Kalender (Reset Zoom/Pan)"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Quick KPI Metrics Strip */}
      <div className="p-4 sm:px-6 bg-slate-50/40 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Lab Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-1">
            Filter Lab:
          </span>
          <button
            type="button"
            onClick={() => setActiveFilterLab('ALL')}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
              activeFilterLab === 'ALL'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            Semua Laboratorium ({activities.length})
          </button>
          {(['FISIKA', 'KIMIA', 'BIOLOGI', 'SMP_TERPADU'] as LabId[]).map((labId) => {
            const count = activities.filter((a) => a.laboratorium === labId).length;
            const isSelected = activeFilterLab === labId;
            return (
              <button
                key={labId}
                type="button"
                onClick={() => setActiveFilterLab(labId)}
                className={`px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                  isSelected
                    ? 'bg-emerald-800 text-white shadow-2xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: labColors[labId].main }}
                />
                <span>{LAB_DEFINITIONS[labId].shortName}</span>
                <span className="font-mono text-[10px] opacity-75">({count})</span>
              </button>
            );
          })}
        </div>

        {/* Quick Highlights Summary */}
        <div className="flex items-center gap-4 text-xs font-medium text-slate-600">
          <div>
            Total Sesi: <strong className="font-bold text-slate-900">{semesterMetrics.totalSessions}</strong>
          </div>
          <span className="text-slate-300">·</span>
          <div>
            Lab Terpadat:{' '}
            <strong className="font-bold text-teal-800">
              {LAB_DEFINITIONS[semesterMetrics.topLab].shortName}
            </strong>
          </div>
          {semesterMetrics.peakDate !== '-' && (
            <>
              <span className="text-slate-300">·</span>
              <div>
                Puncak: <strong className="font-mono text-slate-800">{semesterMetrics.peakDate}</strong> ({semesterMetrics.peakCount} sesi)
              </div>
            </>
          )}
        </div>
      </div>

      {/* SVG Canvas Container */}
      <div ref={containerRef} className="relative w-full overflow-hidden bg-white select-none">
        <svg ref={svgRef} className="w-full h-auto cursor-grab active:cursor-grabbing block" />

        {/* Floating Tooltip Hover */}
        {hoveredDateData && tooltipPos && (
          <div
            className="absolute z-20 pointer-events-none transform -translate-x-1/2 -translate-y-full mb-3 bg-slate-950/95 backdrop-blur-md text-white p-3.5 rounded-2xl shadow-2xl border border-slate-700/80 text-xs space-y-2 max-w-xs animate-in fade-in duration-100"
            style={{ left: `${tooltipPos.x}px`, top: `${tooltipPos.y}px` }}
          >
            <div className="flex items-center justify-between border-b border-slate-700/80 pb-1.5 gap-2">
              <span className="font-bold text-teal-400 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                <span>
                  {new Date(hoveredDateData.dateStr).toLocaleDateString('id-ID', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
              </span>
              <span className="font-mono text-[10.5px] px-2 py-0.5 rounded-md bg-teal-500/20 text-teal-300 font-bold border border-teal-400/30">
                {hoveredDateData.totalSessions} Sesi
              </span>
            </div>

            <div className="space-y-1.5">
              {hoveredDateData.activities.map((act) => (
                <div key={act.id} className="text-[11px] leading-snug">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: labColors[act.laboratorium]?.main }}
                    />
                    <strong className="text-slate-100 truncate">{act.judul_percobaan}</strong>
                  </div>
                  <div className="text-[10px] text-slate-400 pl-3.5">
                    {LAB_DEFINITIONS[act.laboratorium].shortName} · Guru: {act.nama_guru} · Hadir: {act.jumlah_hadir}
                  </div>
                </div>
              ))}
            </div>
            <div className="text-[9.5px] text-slate-400 italic pt-1 border-t border-slate-800 text-center">
              Klik pada bar atau bubble untuk menginspeksi berita acara ini
            </div>
          </div>
        )}
      </div>

      {/* Selected Session Drawer/Card if user clicked an activity */}
      {selectedSession && (
        <div className="p-5 sm:p-6 bg-gradient-to-r from-teal-50/70 via-slate-50 to-white border-t border-teal-100 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="px-2.5 py-0.5 rounded-md text-[11px] font-bold text-white shadow-2xs"
                style={{ backgroundColor: labColors[selectedSession.laboratorium]?.main }}
              >
                {LAB_DEFINITIONS[selectedSession.laboratorium]?.name}
              </span>
              <span className="font-mono text-xs font-semibold text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                {selectedSession.tanggal_kegiatan}
              </span>
              <span className="text-slate-400">·</span>
              <span className="text-xs text-slate-600 font-medium">
                Ruang: {LAB_DEFINITIONS[selectedSession.laboratorium]?.roomLocation}
              </span>
            </div>
            <h4 className="text-base font-extrabold text-slate-900">
              {selectedSession.judul_percobaan}
            </h4>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-1 text-slate-700">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>Guru: <strong>{selectedSession.nama_guru}</strong></span>
              </span>
              <span className="text-slate-300">·</span>
              <span className="flex items-center gap-1 text-slate-700">
                <GraduationCap className="w-3.5 h-3.5 text-teal-700" />
                <span>Kelas ID: #{selectedSession.kelas_id}</span>
              </span>
              <span className="text-slate-300">·</span>
              <span className="flex items-center gap-1 text-slate-700">
                <Users className="w-3.5 h-3.5 text-emerald-600" />
                <span>Kehadiran: <strong>{selectedSession.jumlah_hadir}</strong> Siswa</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onSelectActivity && (
              <button
                type="button"
                onClick={() => onSelectActivity(selectedSession)}
                className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
              >
                <Eye className="w-4 h-4" />
                <span>Buka Formulir / Tinjau Berita Acara</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setSelectedSession(null)}
              className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-600 rounded-xl text-xs font-bold border border-slate-200 transition-colors"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
