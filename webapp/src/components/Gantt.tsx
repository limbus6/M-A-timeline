import React, { useMemo } from 'react';
import type { Project } from '../lib/logic';
import { addDays, format, differenceInDays, isWeekend } from 'date-fns';
import Holidays from 'date-holidays';

interface GanttProps {
    project: Project;
    absences: { name: string; start: Date; end: Date }[];
}

export const Gantt: React.FC<GanttProps> = ({ project, absences }) => {
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

    // 2. Holiday Logic
    const hd = new Holidays(project.country);
    const holidayDates = useMemo(() => {
        const res: Date[] = [];
        let curr = new Date(startDate);
        while (curr <= endDate) {
            // Only mark weekdays as holidays for visual clarity
            const h = hd.isHoliday(curr);
            if (h && !isWeekend(curr)) {
                res.push(new Date(curr));
            }
            curr = addDays(curr, 1);
        }
        return res;
    }, [startDate, endDate, project.country]);

    // 3. Grid sizing
    // 1 Day = 30px
    const dayWidth = 30;
    const totalDays = differenceInDays(endDate, startDate);
    const totalWidth = totalDays * dayWidth;

    return (
        <div className="overflow-x-auto border rounded-lg bg-white shadow-sm relative">
            <div style={{ width: totalWidth, minWidth: '100%' }} className="relative bg-white pb-4">

                {/* Header (Weeks) */}
                <div className="flex border-b border-gray-200 h-10 sticky top-0 bg-white z-10">
                    {weeks.map((w, i) => (
                        <div
                            key={i}
                            className="border-r border-gray-100 text-xs font-semibold text-gray-500 flex items-center justify-center"
                            style={{ width: dayWidth * 7 }}
                        >
                            {format(w, 'd MMM')}
                        </div>
                    ))}
                </div>

                {/* Holiday Overlays (Vertical Lines) */}
                {holidayDates.map((d, i) => {
                    const offset = differenceInDays(d, startDate) * dayWidth;
                    return (
                        <div
                            key={i}
                            className="absolute top-10 bottom-0 bg-gray-100 border-l border-r border-gray-200 opacity-50 z-0 pointer-events-none"
                            style={{ left: offset, width: dayWidth }}
                            title="Holiday"
                        />
                    );
                })}

                {/* Absences Overlays */}
                {absences.map((ab, i) => {
                    const startOffset = Math.max(0, differenceInDays(ab.start, startDate));
                    const duration = differenceInDays(ab.end, ab.start) + 1; // inclusive
                    const left = startOffset * dayWidth;
                    const width = duration * dayWidth;

                    if (left + width < 0 || left > totalWidth) return null;

                    return (
                        <div
                            key={`ab-${i}`}
                            className="absolute top-10 bottom-0 bg-red-100 border-l border-r border-red-200 opacity-30 z-0 pointer-events-none flex items-start justify-center pt-2"
                            style={{ left, width }}
                        >
                            <span className="text-xs text-red-600 font-bold -rotate-90 origin-center whitespace-nowrap mt-10">{ab.name}</span>
                        </div>
                    );
                })}

                {/* Tasks */}
                <div className="pt-2 space-y-2 z-10 relative">
                    {project.tasks.map(t => {
                        if (!t.computedStart || !t.computedEnd) return null;

                        const startOffset = differenceInDays(t.computedStart, startDate);
                        const duration = differenceInDays(t.computedEnd, t.computedStart);

                        const left = startOffset * dayWidth;
                        const width = Math.max(dayWidth, duration * dayWidth);

                        let colorClass = "bg-[#203764]"; // Dark Blue
                        let marker = null;
                        if (t.type === "Milestone") { colorClass = "bg-transparent"; marker = "▲"; }
                        else if (t.type === "Key Decision") { colorClass = "bg-transparent"; marker = "★"; }
                        else if (t.type === "Bottleneck") { colorClass = "bg-[#203764]"; marker = "⚠️"; } // Bar + Warning
                        else if (t.type === "External Dependency") { colorClass = "bg-transparent"; marker = "🔗"; }

                        return (
                            <div key={t.id} className="relative h-8 flex items-center group">
                                {/* Bar */}
                                <div
                                    className={`absolute rounded-sm h-6 text-xs flex items-center justify-center text-white ${colorClass} ${marker ? 'text-red-600 font-bold text-lg overflow-visible' : ''}`}
                                    style={{ left, width }}
                                    title={`${t.name} (${format(t.computedStart, 'd MMM')} - ${format(t.computedEnd, 'd MMM')})`}
                                >
                                    {marker ? marker : (width > 50 && <span className="truncate px-1">{t.name}</span>)}
                                </div>

                                {/* Label if not inside bar */}
                                {(marker || width <= 50) && (
                                    <div
                                        className="absolute text-xs text-gray-700 whitespace-nowrap ml-1"
                                        style={{ left: left + width }}
                                    >
                                        {t.name}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
