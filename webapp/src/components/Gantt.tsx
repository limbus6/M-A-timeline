import React, { useMemo, useState } from 'react';
import type { Project } from '../lib/logic';
import { addDays, format, differenceInDays, isWeekend } from 'date-fns';
import Holidays from 'date-holidays';
import { Eye, EyeOff } from 'lucide-react';

interface GanttProps {
    project: Project;
    absences: { name: string; start: Date; end: Date }[];
}

// Colors for Phases
const PHASE_COLORS: Record<string, string> = {
    "Phase 1: Preparation": "#3b82f6", // Blue
    "Phase 2: Marketing & Round 1": "#10b981", // Green
    "Phase 2: Deep Dive & Closing": "#059669", // Darker Green
    "Phase 3: Confirmatory Due Diligence": "#f59e0b", // Amber
    "Phase 4: Closing & Signing": "#8b5cf6", // Violet
};

const getColor = (phase: string) => {
    if (PHASE_COLORS[phase]) return PHASE_COLORS[phase];
    let hash = 0;
    for (let i = 0; i < phase.length; i++) {
        hash = phase.charCodeAt(i) + ((hash << 5) - hash);
    }
    const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
    return '#' + "00000".substring(0, 6 - c.length) + c;
}

export const Gantt: React.FC<GanttProps> = ({ project, absences }) => {
    const [hideNames, setHideNames] = useState(false);

    // 1. Determine Date Range
    const { startDate, endDate, weeks } = useMemo(() => {
        let start = new Date(project.startDate);
        // Align to Monday
        const day = start.getDay();
        const diff = start.getDate() - day + (day === 0 ? -6 : 1);
        start = new Date(start.setDate(diff));

        // Find absolute end
        let end = addDays(start, 28);
        project.tasks.forEach(t => {
            if (t.computedEnd && t.computedEnd > end) {
                end = t.computedEnd;
            }
        });
        end = addDays(end, 7); // Buffer

        // Generate Weeks
        const weeks: Date[] = [];
        let curr = new Date(start);
        while (curr < end) {
            weeks.push(new Date(curr));
            curr = addDays(curr, 7);
        }

        return { startDate: start, endDate: end, weeks };
    }, [project]);

    // 2. Holiday Logic (Multi-Calendar)
    const holidayDates = useMemo(() => {
        const res: Date[] = [];
        const countries = project.country; // Array

        if (!countries || countries.length === 0) return [];

        // Initialize holidays for all selected countries
        const hds = countries.map(c => {
            try { return new Holidays(c); } catch { return null; }
        }).filter(Boolean);

        let curr = new Date(startDate);
        while (curr <= endDate) {
            // Check if ANY country has a holiday
            let isHol = false;
            for (const hd of hds) {
                if (hd && hd.isHoliday(curr)) {
                    isHol = true;
                    break;
                }
            }

            if (isHol && !isWeekend(curr)) {
                res.push(new Date(curr));
            }
            curr = addDays(curr, 1);
        }
        return res;
    }, [startDate, endDate, project.country]);

    // 3. Grid sizing
    // Reduced width: was 30, now 10 (approx 66% reduction)
    const dayWidth = 10;
    const totalDays = differenceInDays(endDate, startDate);
    const totalWidth = totalDays * dayWidth;

    return (
        <div className="flex flex-col space-y-2">
            {/* Toolbar */}
            <div className="flex justify-end">
                <button
                    onClick={() => setHideNames(!hideNames)}
                    className="flex items-center gap-2 text-xs font-semibold text-gray-600 bg-gray-100 px-3 py-1 rounded hover:bg-gray-200"
                >
                    {hideNames ? <Eye size={14} /> : <EyeOff size={14} />}
                    {hideNames ? "Show Task Names" : "Hide Task Names"}
                </button>
            </div>

            <div className="border rounded-lg bg-white shadow-sm overflow-hidden flex flex-col">
                {/* Main Container: Flex Row */}
                <div className="flex flex-1 overflow-hidden">

                    {/* LEFT COLUMN: Task Number (+ Name) */}
                    <div className={`flex-none border-r border-gray-200 bg-white z-20 flex flex-col transition-all duration-300 ${hideNames ? 'w-12' : 'w-64'}`}>
                        <div className="h-10 border-b border-gray-200 bg-gray-50 flex items-center px-4 font-bold text-xs text-gray-500 truncate">
                            {hideNames ? "#" : "TASK NAME"}
                        </div>

                        <div className="flex-1 overflow-hidden pt-2">
                            {project.tasks.map(t => {
                                if (!t.computedStart || !t.computedEnd) return null;
                                let marker = "";
                                if (t.type === "Milestone") marker = "▲";
                                else if (t.type === "Key Decision") marker = "★";
                                else if (t.type === "Bottleneck") marker = "⚠️";
                                else if (t.type === "External Dependency") marker = "🔗";

                                return (
                                    <div key={t.id} className="h-8 flex items-center px-4 text-xs text-gray-700 whitespace-nowrap overflow-hidden text-ellipsis border-b border-transparent hover:bg-gray-50" title={t.name}>
                                        <span className="font-mono font-bold text-gray-400 mr-2 min-w-[1.5rem]">{t.serialNumber}.</span>
                                        {!hideNames && (
                                            <>
                                                <span className="w-5 inline-block text-center font-bold text-gray-500 flex-shrink-0">{marker}</span>
                                                <span className="truncate">{t.name}</span>
                                            </>
                                        )}
                                        {hideNames && marker && <span className="ml-1 text-gray-500">{marker}</span>}
                                        {t.compressionRatio <= 0.5 && <span className="ml-2 text-red-500 font-bold flex-shrink-0" title="Compressed Phase!">⚠️</span>}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* RIGHT COLUMN: Timeline */}
                    <div className="flex-1 overflow-x-auto relative">
                        <div style={{ width: totalWidth, minWidth: '100%' }} className="relative bg-white pb-4">

                            {/* Header (Weeks) */}
                            <div className="flex border-b border-gray-200 h-10 sticky top-0 bg-white z-10">
                                {weeks.map((w, i) => (
                                    <div
                                        key={i}
                                        className="border-r border-gray-100 text-[10px] font-semibold text-gray-400 flex items-center justify-center overflow-hidden"
                                        style={{ width: dayWidth * 7 }}
                                        title={format(w, 'd MMM')}
                                    >
                                        {dayWidth * 7 > 40 ? format(w, 'd MMM') : format(w, 'd')}
                                    </div>
                                ))}
                            </div>

                            {/* Background Grid & Holidays */}
                            <div className="absolute top-10 bottom-0 left-0 right-0 z-0">
                                {holidayDates.map((d, i) => {
                                    const offset = differenceInDays(d, startDate) * dayWidth;
                                    return (
                                        <div
                                            key={`hol-${i}`}
                                            className="absolute top-0 bottom-0 bg-gray-100 border-l border-r border-gray-200 opacity-50"
                                            style={{ left: offset, width: dayWidth }}
                                            title="Holiday"
                                        />
                                    );
                                })}

                                {absences.map((ab, i) => {
                                    const startOffset = Math.max(0, differenceInDays(ab.start, startDate));
                                    const duration = differenceInDays(ab.end, ab.start) + 1;
                                    const left = startOffset * dayWidth;
                                    const width = duration * dayWidth;

                                    if (left + width < 0 || left > totalWidth) return null;

                                    return (
                                        <div
                                            key={`ab-${i}`}
                                            className="absolute top-0 bottom-0 bg-red-100 border-l border-r border-red-200 opacity-30 flex items-start justify-center pt-2"
                                            style={{ left, width }}
                                        >
                                            <span className="text-[10px] text-red-600 font-bold -rotate-90 origin-center whitespace-nowrap mt-10">{ab.name}</span>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Tasks Lines */}
                            <div className="pt-2 z-10 relative">
                                {project.tasks.map(t => {
                                    if (!t.computedStart || !t.computedEnd) return null;

                                    const startOffset = differenceInDays(t.computedStart, startDate);
                                    const duration = differenceInDays(t.computedEnd, t.computedStart);

                                    const left = startOffset * dayWidth;
                                    const width = Math.max(dayWidth, duration * dayWidth);

                                    // Override color if compressed
                                    let bgColor = getColor(t.phase);
                                    if (t.compressionRatio <= 0.5) {
                                        bgColor = "#EF4444"; // Red
                                    }

                                    const isMarker = ["Milestone", "Key Decision", "Bottleneck", "External Dependency"].includes(t.type);

                                    return (
                                        <div key={t.id} className="relative h-8 flex items-center group">
                                            {!isMarker && (
                                                <div
                                                    className="absolute rounded-sm h-5 text-[10px] flex items-center justify-center text-white shadow-sm opacity-90 hover:opacity-100 transition-opacity"
                                                    style={{ left, width, backgroundColor: bgColor }}
                                                    title={`${t.phase}: ${format(t.computedStart, 'd MMM')} - ${format(t.computedEnd, 'd MMM')} (Ratio: ${t.compressionRatio.toFixed(2)})`}
                                                >
                                                    {width > 30 && <span className="truncate px-1 opacity-70 text-[9px]">{t.phase}</span>}
                                                </div>
                                            )}

                                            {isMarker && (
                                                <div
                                                    className="absolute w-3 h-3 rotate-45 border border-white shadow-sm"
                                                    style={{ left: left + (width / 2) - 6, backgroundColor: bgColor }}
                                                    title={`${t.type} (${format(t.computedStart, 'd MMM')})`}
                                                />
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
