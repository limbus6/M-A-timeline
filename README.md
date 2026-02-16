# M&A Timeline Generator 📊

An advanced, highly customizable, and static client-side web application for generating professional Investment Banking Mergers & Acquisitions (M&A) project timelines. Built with React and designed to be hosted directly on GitHub Pages.

## Features
* **Interactive DAG Engine:** Directed Acyclic Graph underlying logic calculates start and end dates dynamically.
* **Proportional Timeline Compression:** Set a target "Marketing Date" or "Signing Date" to elastically scale task durations.
* **Holiday Integration:** Select from curated jurisdictions (EU 27, US, BR, JP).
* **Vendor Due Diligence (VDD) Module:** Dynamically inject or remove specific VDD workflows.
* **Investment Banking Excel Export:** Generates strictly formatted `.xlsx` matrix files.
* **Full CRUD & Drag-and-Drop:** Intuitive interface to reorder tasks and edit durations on the fly.
* **Responsive Gantt Chart:** Mobile-friendly timeline with toggles to hide text labels and compress week columns.

## Installation
```bash
git clone https://github.com/limbus6/M-A-timeline.git
cd M-A-timeline
npm install
```

### Quick Start
```bash
npm run dev
```

To deploy to GitHub Pages:
```bash
npm run deploy
```

## Roadmap
**Phase 1:** Core calculation engine and IB Excel export (Completed).

**Phase 2:** Proportional time compression and UI scaling (Completed).

**Phase 3:** Integration of .ics generation for syncing critical milestones.

**Phase 4:** Reverse-import capability.

**Phase 5:** Multi-scenario analysis (Base, Best, Worst case timelines).

**Phase 6:** Resource & Budget Tracking (Estimating advisor fees in EUR).

**Phase 7:** Real-time collaboration.

## License
MIT License
