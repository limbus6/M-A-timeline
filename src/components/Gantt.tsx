import React, { useMemo, useState, useRef, useCallback } from 'react';
import type { Project, Task } from '../lib/logic';
import { addDays, format, differenceInDays, isWeekend } from 'date-fns';
import Holidays from 'date-holidays';
import { Eye, EyeOff } from 'lucide-react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface GanttProps {
    project: Project;
    absences: { name: string; start: Date; end: Date }[];
    onUpdate: (tasks: Task[]) => void;
    onDurationChange?: (taskId: string, newDurationWeeks: number) => void;
    onManualOffsetChange?: (taskId: string, newOffsetDays: number) => void;
}

// Colors for Phases
const PHASE_COLORS: Record<string, string> = {
    "Phase 1: Preparation": "#3b82f6",
    "Phase 2: Marketing & Round 1": "#10b981",
    "Phase 2: Deep Dive & Closing": "#059669",
    "Phase 3: Confirmatory Due Diligence": "#f59e0b",
    "Phase 4: Closing & Signing": "#8b5cf6",
};

// Darken a hex color for phase summary bars
function darkenColor(hex: string, amount = 40): string {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.max(0, (num >> 16) - amount);
    const g = Math.max(0, ((num >> 8) & 0xff) - amount);
    const b = Math.max(0, (num & 0xff) - amount);
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

const getColor = (phase: string) => {
    if (PHASE_COLORS[phase]) return PHASE_COLORS[phase];
    let hash = 0;
    for (let i = 0; i < phase.length; i++) {
        hash = phase.charCodeAt(i) + ((hash << 5) - hash);
    }
    const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
    return '#' + "00000".substring(0, 6 - c.length) + c;
};

// ─── SortableTaskBar ──────────────────────────────────────────────────────────

interface SortableTaskBarProps {
    task: Task;
    left: number;
    width: number;
    bgColor: string;
    isMarker: boolean;
    startDate: Date;
    endDate: Date;
    dayWidth: number;
    onDurationChange?: (taskId: string, newDurationWeeks: number) => void;
    onManualOffsetChange?: (taskId: string, newOffsetDays: number) => void;
}

const SortableTaskBar: React.FC<SortableTaskBarProps> = ({
    task,
    left,
    width,
    bgColor,
    isMarker,
    startDate,
    endDate,
    dayWidth,
    onDurationChange,
    onManualOffsetChange,
}) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: task.id });

    // ── Resize state ──────────────────────────────────────────────────────────
    const isResizing = useRef(false);
    const resizeDirection = useRef<'left' | 'right' | null>(null);
    const accumulatedDeltaPx = useRef(0);

    const handleResizeMouseDown = useCallback((e: React.MouseEvent, direction: 'left' | 'right') => {
        e.stopPropagation();
        e.preventDefault();
        isResizing.current = true;
        resizeDirection.current = direction;
        accumulatedDeltaPx.current = 0;

        const onMouseMove = (ev: MouseEvent) => {
            if (!isResizing.current || !onDurationChange) return;
            const delta = resizeDirection.current === 'right' ? ev.movementX : -ev.movementX;
            accumulatedDeltaPx.current += delta;

            const pxPerWeek = dayWidth * 7;
            const deltaWeeks = Math.round(accumulatedDeltaPx.current / pxPerWeek);

            if (deltaWeeks !== 0) {
                accumulatedDeltaPx.current -= deltaWeeks * pxPerWeek;
                const MIN_WEEKS = task.type === 'Standard' ? 1 : 0.2;
                const MAX_WEEKS = task.type === 'Standard' ? 50 : 999;
                const newDuration = Math.min(MAX_WEEKS, Math.max(MIN_WEEKS, task.durationWeeks + deltaWeeks));
                onDurationChange(task.id, newDuration);
            }
        };

        const onMouseUp = () => {
            isResizing.current = false;
            resizeDirection.current = null;
            accumulatedDeltaPx.current = 0;
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    }, [dayWidth, task.id, task.durationWeeks, task.type, onDurationChange]);

    // ── Horizontal drag (date shift) ──────────────────────────────────────────
    const isHorizDragging = useRef(false);
    const horizAccumPx = useRef(0);

    const handleBarMouseDown = useCallback((e: React.MouseEvent) => {
        if (!onManualOffsetChange) return;
        e.stopPropagation();
        e.preventDefault();
        isHorizDragging.current = true;
        horizAccumPx.current = 0;

        const onMouseMove = (ev: MouseEvent) => {
            if (!isHorizDragging.current) return;
            horizAccumPx.current += ev.movementX;

            const pxPerDay = dayWidth;
            const deltaDays = Math.round(horizAccumPx.current / pxPerDay);

            if (deltaDays !== 0) {
                horizAccumPx.current -= deltaDays * pxPerDay;
                const currentOffset = task.manualStartOffset ?? 0;
                onManualOffsetChange(task.id, currentOffset + deltaDays);
            }
        };

        const onMouseUp = () => {
            isHorizDragging.current = false;
            horizAccumPx.current = 0;
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    }, [dayWidth, task.id, task.manualStartOffset, onManualOffsetChange]);

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            className="relative h-8 flex items-center group"
        >
            {/* Vertical-sort drag handle (left label column area) */}
            <div
                {...listeners}
                className="absolute -left-4 top-0 bottom-0 w-4 cursor-grab active:cursor-grabbing flex items-center justify-center opacity-0 group-hover:opacity-50 z-20"
                title="Drag to reorder"
            >
                <span className="text-gray-400 text-[10px]">⠿</span>
            </div>

            {!isMarker && (
                <div
                    className="absolute rounded h-5 shadow-sm flex items-center overflow-hidden select-none"
                    style={{ left, width, backgroundColor: bgColor }}
                    title={`${task.name}: ${format(startDate, 'd MMM')} – ${format(endDate, 'd MMM')}`}
                >
                    {/* Left Resize Handle */}
                    {onDurationChange && (
                        <div
                            className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize z-10 opacity-0 group-hover:opacity-100 bg-black/20 hover:bg-black/40 transition-opacity"
                            onMouseDown={(e) => handleResizeMouseDown(e, 'left')}
                        />
                    )}

                    {/* Horizontal drag zone (middle of bar) */}
                    {onManualOffsetChange && (
                        <div
                            className="absolute inset-0 cursor-move z-0"
                            onMouseDown={handleBarMouseDown}
                        />
                    )}

                    {/* Task Name Label */}
                    <span
                        className="relative z-10 truncate px-2 text-white text-[9px] font-semibold pointer-events-none"
                        style={{ maxWidth: width - 8 }}
                    >
                        {width > 20 ? task.name : ''}
                    </span>

                    {/* Right Resize Handle */}
                    {onDurationChange && (
                        <div
                            className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize z-10 opacity-0 group-hover:opacity-100 bg-black/20 hover:bg-black/40 transition-opacity"
                            onMouseDown={(e) => handleResizeMouseDown(e, 'right')}
                        />
                    )}
                </div>
            )}

            {isMarker && (
                <div
                    className="absolute w-3 h-3 rotate-45 border border-white dark:border-gray-800 shadow-sm"
                    style={{ left: left + (width / 2) - 6, backgroundColor: bgColor }}
                    title={`${task.type}: ${task.name} (${format(startDate, 'd MMM')})`}
                />
            )}
        </div>
    );
};

// ─── Phase Summary Bar ────────────────────────────────────────────────────────

interface PhaseSummaryBarProps {
    phaseName: string;
    phaseStart: Date;
    phaseEnd: Date;
    ganttStart: Date;
    dayWidth: number;
    color: string;
}

const PhaseSummaryBar: React.FC<PhaseSummaryBarProps> = ({
    phaseName, phaseStart, phaseEnd, ganttStart, dayWidth, color
}) => {
    const left = differenceInDays(phaseStart, ganttStart) * dayWidth;
    const width = Math.max(dayWidth * 2, differenceInDays(phaseEnd, phaseStart) * dayWidth);
    const dark = darkenColor(color, 50);

    return (
        <div className="relative h-7 flex items-center group mb-0.5">
            <div
                className="absolute rounded h-6 flex items-center overflow-hidden border-2 shadow"
                style={{ left, width, backgroundColor: dark, borderColor: color }}
                title={`${phaseName}: ${format(phaseStart, 'd MMM')} – ${format(phaseEnd, 'd MMM')}`}
            >
                <span className="truncate px-2 text-white text-[9px] font-bold pointer-events-none">
                    {width > 30 ? phaseName : ''}
                </span>
            </div>
        </div>
    );
};

// ─── Gantt ────────────────────────────────────────────────────────────────────

export const Gantt: React.FC<GanttProps> = ({ project, absences, onUpdate, onDurationChange, onManualOffsetChange }) => {
    const [hideNames, setHideNames] = useState(false);

    // DnD Sensors (vertical reorder only)
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const oldIndex = project.tasks.findIndex(t => t.id === active.id);
            const newIndex = project.tasks.findIndex(t => t.id === over.id);
            onUpdate(arrayMove(project.tasks, oldIndex, newIndex));
        }
    };

    // 1. Date Range
    const { startDate, endDate, weeks } = useMemo(() => {
        let start = new Date(project.startDate);
        const day = start.getDay();
        const diff = start.getDate() - day + (day === 0 ? -6 : 1);
        start = new Date(start.setDate(diff));

        let end = addDays(start, 28);
        project.tasks.forEach(t => {
            if (t.computedEnd && t.computedEnd > end) end = t.computedEnd;
        });
        end = addDays(end, 14);

        const weeks: Date[] = [];
        let curr = new Date(start);
        while (curr < end) {
            weeks.push(new Date(curr));
            curr = addDays(curr, 7);
        }
        return { startDate: start, endDate: end, weeks };
    }, [project]);

    // 2. Holidays
    const holidayDates = useMemo(() => {
        const res: Date[] = [];
        const countries = project.country;
        if (!countries || countries.length === 0) return [];
        const hds = countries.map(c => { try { return new Holidays(c); } catch { return null; } }).filter(Boolean);
        let curr = new Date(startDate);
        while (curr <= endDate) {
            let isHol = false;
            for (const hd of hds) {
                if (hd && hd.isHoliday(curr)) { isHol = true; break; }
            }
            if (isHol && !isWeekend(curr)) res.push(new Date(curr));
            curr = addDays(curr, 1);
        }
        return res;
    }, [startDate, endDate, project.country]);

    // 3. Grid sizing
    const dayWidth = 10;
    const totalDays = differenceInDays(endDate, startDate);
    const totalWidth = totalDays * dayWidth;

    // 4. Phase Summary computation
    const phaseSummaries = useMemo(() => {
        const map = new Map<string, { start: Date; end: Date; color: string }>();
        for (const t of project.tasks) {
            if (!t.computedStart || !t.computedEnd) continue;
            const existing = map.get(t.phase);
            if (!existing) {
                map.set(t.phase, { start: new Date(t.computedStart), end: new Date(t.computedEnd), color: getColor(t.phase) });
            } else {
                if (t.computedStart < existing.start) existing.start = new Date(t.computedStart);
                if (t.computedEnd > existing.end) existing.end = new Date(t.computedEnd);
            }
        }
        // Preserve insertion order (phases appear in task order)
        const seen = new Set<string>();
        const ordered: { phase: string; start: Date; end: Date; color: string }[] = [];
        for (const t of project.tasks) {
            if (!seen.has(t.phase) && map.has(t.phase)) {
                seen.add(t.phase);
                const d = map.get(t.phase)!;
                ordered.push({ phase: t.phase, ...d });
            }
        }
        return ordered;
    }, [project.tasks]);

    return (
        <div className="flex flex-col space-y-2">
            {/* Toolbar – left aligned (Fix #4) */}
            <div className="flex justify-start">
                <button
                    onClick={() => setHideNames(!hideNames)}
                    className="flex items-center gap-2 text-xs font-semibold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                    {hideNames ? <Eye size={14} /> : <EyeOff size={14} />}
                    {hideNames ? "Show Task Names" : "Hide Task Names"}
                </button>
            </div>

            <div className="border rounded-lg bg-white dark:bg-gray-800 shadow-sm overflow-hidden flex flex-col dark:border-gray-700">
                <div className="flex flex-1 overflow-hidden">

                    {/* LEFT COLUMN */}
                    <div className={`flex-none border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 z-20 flex flex-col transition-all duration-300 ${hideNames ? 'w-12' : 'w-64'}`}>
                        <div className="h-10 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex items-center px-4 font-bold text-xs text-gray-500 dark:text-gray-400 truncate">
                            {hideNames ? "#" : "TASK NAME"}
                        </div>

                        <div className="flex-1 overflow-hidden pt-2">
                            {/* Phase summary labels */}
                            {phaseSummaries.map(ps => (
                                <div
                                    key={`lbl-${ps.phase}`}
                                    className="h-7 flex items-center px-3 mb-0.5"
                                    style={{ borderLeft: `3px solid ${ps.color}` }}
                                >
                                    {!hideNames && (
                                        <span
                                            className="text-[10px] font-bold truncate"
                                            style={{ color: darkenColor(ps.color, 20) }}
                                        >
                                            {ps.phase}
                                        </span>
                                    )}
                                </div>
                            ))}

                            {/* Task labels */}
                            {project.tasks.map(t => {
                                if (!t.computedStart || !t.computedEnd) return null;
                                let marker = "";
                                if (t.type === "Milestone") marker = "▲";
                                else if (t.type === "Key Decision") marker = "★";
                                else if (t.type === "Bottleneck") marker = "⚠️";
                                else if (t.type === "External Dependency") marker = "🔗";

                                return (
                                    <div key={t.id} className="h-8 flex items-center px-4 text-xs text-gray-700 dark:text-gray-300 whitespace-nowrap overflow-hidden text-ellipsis border-b border-transparent hover:bg-gray-50 dark:hover:bg-gray-700" title={t.name}>
                                        <span className="font-mono font-bold text-gray-400 dark:text-gray-500 mr-2 min-w-[1.5rem]">{t.serialNumber}.</span>
                                        {!hideNames && (
                                            <>
                                                <span className="w-5 inline-block text-center font-bold text-gray-500 dark:text-gray-400 flex-shrink-0">{marker}</span>
                                                <span className="truncate">{t.name}</span>
                                            </>
                                        )}
                                        {hideNames && marker && <span className="ml-1 text-gray-500 dark:text-gray-400">{marker}</span>}
                                        {t.compressionRatio <= 0.5 && <span className="ml-2 text-red-500 font-bold flex-shrink-0" title="Compressed Phase!">⚠️</span>}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* RIGHT COLUMN: Timeline */}
                    <div className="flex-1 overflow-x-auto relative bg-gray-50 dark:bg-gray-900">
                        <div style={{ width: totalWidth, minWidth: '100%' }} className="relative bg-white dark:bg-gray-800 pb-4">

                            {/* Header (Weeks) */}
                            <div className="flex border-b border-gray-200 dark:border-gray-700 h-10 sticky top-0 bg-white dark:bg-gray-800 z-10">
                                {weeks.map((w, i) => (
                                    <div
                                        key={i}
                                        className="border-r border-gray-100 dark:border-gray-700 text-[10px] font-semibold text-gray-400 dark:text-gray-500 flex items-center justify-center overflow-hidden"
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
                                            className="absolute top-0 bottom-0 bg-gray-100 dark:bg-gray-700 border-l border-r border-gray-200 dark:border-gray-600 opacity-50 dark:opacity-30"
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
                                            className="absolute top-0 bottom-0 bg-red-100 dark:bg-red-900/30 border-l border-r border-red-200 dark:border-red-800 opacity-30 flex items-start justify-center pt-2"
                                            style={{ left, width }}
                                        >
                                            <span className="text-[10px] text-red-600 dark:text-red-400 font-bold -rotate-90 origin-center whitespace-nowrap mt-10">{ab.name}</span>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Phase Summary Bars (Fix #6) */}
                            <div className="pt-2 z-10 relative">
                                {phaseSummaries.map(ps => (
                                    <PhaseSummaryBar
                                        key={`ps-${ps.phase}`}
                                        phaseName={ps.phase}
                                        phaseStart={ps.start}
                                        phaseEnd={ps.end}
                                        ganttStart={startDate}
                                        dayWidth={dayWidth}
                                        color={ps.color}
                                    />
                                ))}
                            </div>

                            {/* Task Bars */}
                            <DndContext
                                sensors={sensors}
                                collisionDetection={closestCenter}
                                onDragEnd={handleDragEnd}
                            >
                                <SortableContext
                                    items={project.tasks.map(t => t.id)}
                                    strategy={verticalListSortingStrategy}
                                >
                                    <div className="z-10 relative">
                                        {project.tasks.map(t => {
                                            if (!t.computedStart || !t.computedEnd) return null;

                                            const startOffset = differenceInDays(t.computedStart, startDate);
                                            const duration = differenceInDays(t.computedEnd, t.computedStart);
                                            const left = startOffset * dayWidth;
                                            const width = Math.max(dayWidth, duration * dayWidth);

                                            let bgColor = getColor(t.phase);
                                            if (t.compressionRatio <= 0.5) bgColor = "#EF4444";

                                            const isMarker = ["Milestone", "Key Decision", "Bottleneck", "External Dependency"].includes(t.type);

                                            return (
                                                <SortableTaskBar
                                                    key={t.id}
                                                    task={t}
                                                    left={left}
                                                    width={width}
                                                    bgColor={bgColor}
                                                    isMarker={isMarker}
                                                    startDate={t.computedStart}
                                                    endDate={t.computedEnd}
                                                    dayWidth={dayWidth}
                                                    onDurationChange={onDurationChange}
                                                    onManualOffsetChange={onManualOffsetChange}
                                                />
                                            );
                                        })}
                                    </div>
                                </SortableContext>
                            </DndContext>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
