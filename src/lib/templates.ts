import { createProject, calculateSchedule } from './logic';
import type { Project } from './logic';

export function getTemplate1(startDate: Date): Project {
    const p = createProject("Standard Sell-Side M&A", startDate);

    // Phase 1: Preparation
    p.tasks.push({ id: "T1.1", name: "Kick-off & Information Gathering", phase: "Phase 1: Preparation", durationWeeks: 2.0, originalDurationWeeks: 2.0, compressionRatio: 1.0, predecessors: [], type: "Standard" });
    p.tasks.push({ id: "T1.2", name: "Preparation of Teaser & Information Memorandum (IM)", phase: "Phase 1: Preparation", durationWeeks: 4.0, originalDurationWeeks: 4.0, compressionRatio: 1.0, predecessors: ["T1.1"], type: "Standard" });
    p.tasks.push({ id: "T1.3", name: "Structuring of Virtual Data Room (VDR)", phase: "Phase 1: Preparation", durationWeeks: 3.0, originalDurationWeeks: 3.0, compressionRatio: 1.0, predecessors: ["T1.1"], type: "Standard" });

    // Phase 2: Marketing
    p.tasks.push({ id: "T2.1", name: "Contact with Potential Investors & NDAs", phase: "Phase 2: Marketing", durationWeeks: 3.0, originalDurationWeeks: 3.0, compressionRatio: 1.0, predecessors: ["T1.2"], type: "Standard" });
    p.tasks.push({ id: "T2.2", name: "Distribution of IM & Process Letter I", phase: "Phase 2: Marketing", durationWeeks: 1.0, originalDurationWeeks: 1.0, compressionRatio: 1.0, predecessors: ["T2.1"], type: "Milestone" });
    p.tasks.push({ id: "T2.3", name: "Reception & Evaluation of Non-Binding Offers (NBOs)", phase: "Phase 2: Marketing", durationWeeks: 2.0, originalDurationWeeks: 2.0, compressionRatio: 1.0, predecessors: ["T2.2"], type: "Key Decision" });

    // Phase 3: Due Diligence & Exclusivity
    p.tasks.push({ id: "T3.1", name: "VDR Access & Confirmatory Due Diligence", phase: "Phase 3: Due Diligence & Exclusivity", durationWeeks: 6.0, originalDurationWeeks: 6.0, compressionRatio: 1.0, predecessors: ["T2.3"], type: "Standard" });
    p.tasks.push({ id: "T3.2", name: "Management Presentations & Site Visits", phase: "Phase 3: Due Diligence & Exclusivity", durationWeeks: 2.0, originalDurationWeeks: 2.0, compressionRatio: 1.0, predecessors: ["T2.3"], type: "Bottleneck" });
    p.tasks.push({ id: "T3.3", name: "Sharing of SPA Drafts & Legal Terms", phase: "Phase 3: Due Diligence & Exclusivity", durationWeeks: 1.0, originalDurationWeeks: 1.0, compressionRatio: 1.0, predecessors: ["T3.1"], type: "Standard" });
    p.tasks.push({ id: "T3.4", name: "Reception of Binding Offers (BOs) & SPA Mark-up", phase: "Phase 3: Due Diligence & Exclusivity", durationWeeks: 2.0, originalDurationWeeks: 2.0, compressionRatio: 1.0, predecessors: ["T3.1"], type: "Key Decision" });

    // Phase 4: Conclusion
    p.tasks.push({ id: "T4.1", name: "Final Negotiation with Selected Investor", phase: "Phase 4: Conclusion", durationWeeks: 3.0, originalDurationWeeks: 3.0, compressionRatio: 1.0, predecessors: ["T3.4"], type: "Standard" });
    p.tasks.push({ id: "T4.2", name: "Finalization of Legal Docs & SPA Signature / Closing", phase: "Phase 4: Conclusion", durationWeeks: 1.0, originalDurationWeeks: 1.0, compressionRatio: 1.0, predecessors: ["T4.1"], type: "Milestone" });

    calculateSchedule(p);
    return p;
}

export function getTemplate2(startDate: Date): Project {
    const p = createProject("Fast-Track / Sprint M&A", startDate);

    // Phase 1: Accelerated Prep & Marketing
    p.tasks.push({ id: "F1.1", name: "Teaser, VDR Setup & Initial Contacts", phase: "Phase 1: Accelerated Prep & Marketing", durationWeeks: 3.0, originalDurationWeeks: 3.0, compressionRatio: 1.0, predecessors: [], type: "Standard" });
    p.tasks.push({ id: "F1.2", name: "IM Distribution & Fast-track NDAs", phase: "Phase 1: Accelerated Prep & Marketing", durationWeeks: 2.0, originalDurationWeeks: 2.0, compressionRatio: 1.0, predecessors: ["F1.1"], type: "Standard" });
    p.tasks.push({ id: "F1.3", name: "Reception of NBOs", phase: "Phase 1: Accelerated Prep & Marketing", durationWeeks: 1.0, originalDurationWeeks: 1.0, compressionRatio: 1.0, predecessors: ["F1.2"], type: "Key Decision" });

    // Phase 2: Deep Dive & Closing
    p.tasks.push({ id: "F2.1", name: "Intensive DD & Q&A", phase: "Phase 2: Deep Dive & Closing", durationWeeks: 4.0, originalDurationWeeks: 4.0, compressionRatio: 1.0, predecessors: ["F1.3"], type: "Standard" });
    p.tasks.push({ id: "F2.2", name: "Management Presentations", phase: "Phase 2: Deep Dive & Closing", durationWeeks: 1.0, originalDurationWeeks: 1.0, compressionRatio: 1.0, predecessors: ["F1.3"], type: "Bottleneck" });
    p.tasks.push({ id: "F2.3", name: "Binding Offers & SPA Negotiation", phase: "Phase 2: Deep Dive & Closing", durationWeeks: 2.0, originalDurationWeeks: 2.0, compressionRatio: 1.0, predecessors: ["F2.1"], type: "Key Decision" });
    p.tasks.push({ id: "F2.4", name: "Closing", phase: "Phase 2: Deep Dive & Closing", durationWeeks: 1.0, originalDurationWeeks: 1.0, compressionRatio: 1.0, predecessors: ["F2.3"], type: "Milestone" });

    calculateSchedule(p);
    return p;
}

export function getTemplate3(startDate: Date): Project {
    const p = createProject("Due Diligence Heavy / Buy-Side", startDate);

    // Phase 1: DD Kick-off
    p.tasks.push({ id: "D1.1", name: "Kick-off Meetings for DDs (Financial, Tax, Legal)", phase: "Phase 1: DD Kick-off", durationWeeks: 1.0, originalDurationWeeks: 1.0, compressionRatio: 1.0, predecessors: [], type: "Standard" });
    p.tasks.push({ id: "D1.2", name: "Data Room Opening & Info Processing", phase: "Phase 1: DD Kick-off", durationWeeks: 2.0, originalDurationWeeks: 2.0, compressionRatio: 1.0, predecessors: ["D1.1"], type: "Standard" });

    // Phase 2: Execution & Q&A
    p.tasks.push({ id: "D2.1", name: "Expert Sessions & Q&A with Key People", phase: "Phase 2: Execution & Q&A", durationWeeks: 3.0, originalDurationWeeks: 3.0, compressionRatio: 1.0, predecessors: ["D1.2"], type: "Standard" });
    p.tasks.push({ id: "D2.2", name: "Confirmatory DD Execution", phase: "Phase 2: Execution & Q&A", durationWeeks: 5.0, originalDurationWeeks: 5.0, compressionRatio: 1.0, predecessors: ["D1.2"], type: "Standard" });

    // Phase 3: Legal & Conclusion
    p.tasks.push({ id: "D3.1", name: "SPA Draft Sharing", phase: "Phase 3: Legal & Conclusion", durationWeeks: 1.0, originalDurationWeeks: 1.0, compressionRatio: 1.0, predecessors: ["D2.2"], type: "Standard" });
    p.tasks.push({ id: "D3.2", name: "Evaluation of BOs & SPA Mark-up", phase: "Phase 3: Legal & Conclusion", durationWeeks: 2.0, originalDurationWeeks: 2.0, compressionRatio: 1.0, predecessors: ["D3.1"], type: "Key Decision" });
    p.tasks.push({ id: "D3.3", name: "Final Negotiation & Closing", phase: "Phase 3: Legal & Conclusion", durationWeeks: 2.0, originalDurationWeeks: 2.0, compressionRatio: 1.0, predecessors: ["D3.2"], type: "Milestone" });

    calculateSchedule(p);
    return p;
}

export function getProjectByTemplateName(name: string, startDate: Date): Project {
    if (name.includes("Standard")) return getTemplate1(startDate);
    if (name.includes("Fast-Track")) return getTemplate2(startDate);
    if (name.includes("Buy-Side")) return getTemplate3(startDate);
    return getTemplate1(startDate);
}
