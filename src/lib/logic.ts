import Holidays from 'date-holidays';
import { addDays, isWeekend } from 'date-fns';

export type TaskType = "Standard" | "Milestone" | "Bottleneck" | "Key Decision" | "External Dependency";

export interface Task {
    id: string;
    name: string;
    phase: string;
    durationWeeks: number;
    originalDurationWeeks: number; // Baseline for compression
    compressionRatio: number;      // 1.0 = normal, < 1.0 = compressed
    predecessors: string[]; // IDs
    type: TaskType;
    manualStartOffset?: number;    // Manual lag in calendar days (from horizontal drag)

    // Computed
    serialNumber?: number; // Dynamic 1..N
    computedStart?: Date;
    computedEnd?: Date;
}

export interface Project {
    name: string;
    startDate: Date;
    country: string[]; // changed to array
    tasks: Task[];
    vddEnabled: boolean;
}

export function createProject(name: string, startDate: Date, country: string[] = ["US"]): Project {
    return {
        name,
        startDate,
        country,
        tasks: [],
        vddEnabled: false
    };
}

// Helper to check if a date is a holiday in ANY of the selected countries
function isHoliday(date: Date, countries: string[]): boolean {
    if (!countries || countries.length === 0) return false;

    for (const code of countries) {
        try {
            const hd = new Holidays(code);
            // date-holidays might throw or return false
            const h = hd.isHoliday(date);
            if (h) return true;
        } catch (e) {
            // ignore invalid codes
        }
    }
    return false;
}

// Helper: Calculate business days between two dates
function getBusinessDays(start: Date, end: Date, countries: string[]): number {
    let count = 0;
    let curr = new Date(start);
    while (curr < end) {
        if (!isWeekend(curr) && !isHoliday(curr, countries)) {
            count++;
        }
        curr = addDays(curr, 1);
    }
    return count;
}


export function calculateSchedule(project: Project): Project {
    // Reset computed dates and assign serial numbers
    project.tasks.forEach((t, index) => {
        t.serialNumber = index + 1;
        t.computedStart = undefined;
        t.computedEnd = undefined;
    });

    const tasksById = new Map<string, Task>();
    project.tasks.forEach(t => tasksById.set(t.id, t));

    const processed = new Set<string>();
    let iterations = 0;
    const maxIterations = project.tasks.length * 3;

    while (processed.size < project.tasks.length) {
        let progressMade = false;
        iterations++;
        if (iterations > maxIterations) {
            console.warn("Cycle detected or stuck");
            break;
        }

        for (const task of project.tasks) {
            if (processed.has(task.id)) continue;

            let predsReady = true;
            let maxPredEnd = new Date(project.startDate);

            for (const predId of task.predecessors) {
                if (!tasksById.has(predId)) continue;
                const pred = tasksById.get(predId)!;

                if (!processed.has(pred.id) || !pred.computedEnd) {
                    predsReady = false;
                    break;
                }

                if (pred.computedEnd > maxPredEnd) {
                    maxPredEnd = new Date(pred.computedEnd);
                }
            }

            if (predsReady) {
                // Start date candidate
                let startCandidate = new Date(maxPredEnd);

                // Apply manual offset (horizontal drag lag)
                if (task.manualStartOffset && task.manualStartOffset !== 0) {
                    startCandidate = addDays(startCandidate, task.manualStartOffset);
                }

                // Ensure start date is a business day
                while (isWeekend(startCandidate) || isHoliday(startCandidate, project.country)) {
                    startCandidate = addDays(startCandidate, 1);
                }

                task.computedStart = startCandidate;

                if (task.durationWeeks === 0) {
                    task.computedEnd = new Date(task.computedStart);
                } else {
                    // Add Duration: 1 week = 5 business days
                    let daysToAdd = Math.floor(task.durationWeeks * 5);
                    let current = new Date(task.computedStart);

                    while (daysToAdd > 0) {
                        current = addDays(current, 1);
                        if (isWeekend(current) || isHoliday(current, project.country)) continue;
                        daysToAdd--;
                    }
                    task.computedEnd = current;
                }

                processed.add(task.id);
                progressMade = true;
            }
        }

        if (!progressMade) break;
    }

    return project;
}

export function injectVddTasks(project: Project): Project {
    if (!project.vddEnabled) return project;

    // Check existence
    if (project.tasks.some(t => t.id === "VDD.1")) return project;

    const vddTasks: Task[] = [
        { id: "VDD.1", name: "Selection of VDD Advisors (Financial, Legal, Tax)", phase: "Phase 1: Preparation", durationWeeks: 2, originalDurationWeeks: 2, compressionRatio: 1.0, predecessors: ["T1.1"], type: "Key Decision" },
        { id: "VDD.2", name: "Financial VDD Execution", phase: "Phase 1: Preparation", durationWeeks: 4, originalDurationWeeks: 4, compressionRatio: 1.0, predecessors: ["VDD.1"], type: "Standard" },
        { id: "VDD.3", name: "Tax & Legal VDD Execution", phase: "Phase 1: Preparation", durationWeeks: 4, originalDurationWeeks: 4, compressionRatio: 1.0, predecessors: ["VDD.1"], type: "Standard" },
        { id: "VDD.4", name: "VDD Reports Draft Review", phase: "Phase 1: Preparation", durationWeeks: 2, originalDurationWeeks: 2, compressionRatio: 1.0, predecessors: ["VDD.2", "VDD.3"], type: "Bottleneck" }
    ];

    // Insert after T1.1 or F1.1 or at start
    const newTasks = [...project.tasks];
    let insertIdx = newTasks.findIndex(t => t.id === "T1.1" || t.id === "F1.1" || t.id === "D1.1");
    if (insertIdx === -1) insertIdx = 0;
    else insertIdx += 1;

    newTasks.splice(insertIdx, 0, ...vddTasks);
    project.tasks = newTasks;

    // Shorten Phase 3
    const p3Task = project.tasks.find(t => t.name.includes("Confirmatory Due Diligence"));
    if (p3Task && p3Task.durationWeeks > 3) {
        p3Task.durationWeeks -= 2;
        p3Task.originalDurationWeeks = p3Task.durationWeeks; // Update baseline too
        p3Task.name += " (Shortened due to VDD)";
    }

    return project;
}


// --- COMPRESSION ENGINE ---

/**
 * Top-down elastic compression.
 * IF marketingDate is set: Scale Phase 1 tasks to fit between Start -> Marketing.
 * IF signingDate is set: Scale subsequent tasks to fit between Previous Milestone -> Signing.
 */
export function compressSchedule(project: Project, marketingDate?: Date, signingDate?: Date): Project {
    // 1. Reset to Original Durations first (to avoid compounding compression)
    project.tasks.forEach(t => {
        if (t.originalDurationWeeks > 0) {
            t.durationWeeks = t.originalDurationWeeks;
            t.compressionRatio = 1.0;
        }
    });

    // If no bounding dates, just return updated calculation
    if (!marketingDate && !signingDate) {
        return calculateSchedule(project);
    }

    // Helper: Identify Task Groups
    // Heuristic: Phase 1 usually ends at "Marketing" launch.
    // Tasks before Marketing: "Phase 1" or "Kick-off"

    // We need to define which tasks belong to which "Block".
    // Block 1: Start -> Marketing
    // Block 2: Marketing -> Signing

    // Simple heuristic based on Phase names for standard templates.
    // Standard: Phase 1 -> Marketing. Phase 2,3,4 -> Signing.
    // Fast-Track: Phase 1 -> Marketing. Phase 2 -> Signing.

    // Let's filter by Phase string content as a robust fallback
    const block1Tasks = project.tasks.filter(t =>
        t.phase.includes("Phase 1") || t.phase.includes("Preparation") || t.phase.includes("Kick-off")
    );

    const block2Tasks = project.tasks.filter(t => !block1Tasks.includes(t));

    // --- BLOCK 1 COMPRESSION (Start -> Marketing) ---
    if (marketingDate) {
        const availableDays = getBusinessDays(project.startDate, marketingDate, project.country);

        // Calculate "Standard" total duration (in business days approx)
        // This is tricky for a DAG. We need the Critical Path length.
        // Simplification: Calculate schedule with standard durations first.
        let tempProj = calculateSchedule({ ...project });

        // Find the END of Block 1 in the standard schedule
        let maxEndBlock1 = new Date(project.startDate);
        block1Tasks.forEach(t => {
            const tempT = tempProj.tasks.find(x => x.id === t.id);
            if (tempT && tempT.computedEnd && tempT.computedEnd > maxEndBlock1) {
                maxEndBlock1 = tempT.computedEnd;
            }
        });

        const standardDays = getBusinessDays(project.startDate, maxEndBlock1, project.country);

        if (standardDays > 0 && availableDays > 0) {
            const ratio = availableDays / standardDays;

            // Apply to Block 1 Tasks
            block1Tasks.forEach(t => {
                if (t.durationWeeks > 0) {
                    t.durationWeeks = t.originalDurationWeeks * ratio;
                    t.compressionRatio = ratio;
                }
            });
        }
    }

    // --- BLOCK 2 COMPRESSION (Marketing -> Signing) ---
    if (signingDate) {
        // Start point for Block 2 is either Marketing Date (if set) OR the end of Block 1
        // If Marketing Date is set, we assume Block 2 starts nicely after it.
        // If not, we calculate logic flow.

        // Let's calculate schedule so far (with Block 1 compressed)
        let tempProj = calculateSchedule({ ...project });

        // Find Start of Block 2 (min start date of block 2 tasks)
        let minStartBlock2 = signingDate; // sentinel
        let maxEndBlock2 = new Date(0);   // Standard end

        block2Tasks.forEach(t => {
            const tempT = tempProj.tasks.find(x => x.id === t.id);
            if (tempT && tempT.computedStart) {
                if (minStartBlock2 === signingDate || tempT.computedStart < minStartBlock2) {
                    minStartBlock2 = tempT.computedStart;
                }
            }
            if (tempT && tempT.computedEnd && tempT.computedEnd > maxEndBlock2) {
                maxEndBlock2 = tempT.computedEnd;
            }
        });

        if (minStartBlock2 < signingDate) {
            const availableDays = getBusinessDays(minStartBlock2, signingDate, project.country);
            const standardDays = getBusinessDays(minStartBlock2, maxEndBlock2, project.country);

            if (standardDays > 0 && availableDays > 0) {
                const ratio = availableDays / standardDays;

                // Apply to Block 2 Tasks
                block2Tasks.forEach(t => {
                    if (t.durationWeeks > 0) {
                        t.durationWeeks = t.originalDurationWeeks * ratio;
                        t.compressionRatio = ratio;
                    }
                });
            }
        }
    }

    return calculateSchedule(project);
}
