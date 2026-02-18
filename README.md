# M&A Timeline Generator 📊

An advanced, highly customizable, and static client-side web application for generating professional Investment Banking Mergers & Acquisitions (M&A) project timelines. Built with React and designed to be hosted directly on GitHub Pages.

## Features
* **Interactive DAG Engine:** Directed Acyclic Graph logic dynamically calculates start/end dates.
* **Smart Data Persistence:** Automatically saves your project, settings, and absences to local storage securely.
* **Drag-and-Drop Reordering:** Effortlessly reorganize tasks with a modern drag-and-drop interface.
* **Dark Mode Support:** Built-in dark theme for comfortable viewing in low-light environments.
* **Proportional Timeline Compression:** Set a target "Marketing Date" or "Signing Date" to elastically scale task durations.
* **Holiday Integration:** Select from curated jurisdictions (EU 27, US, BR, JP).
* **Vendor Due Diligence (VDD) Module:** Dynamically inject or remove specific VDD workflows.
* **Investment Banking Excel Export:** Generates strictly formatted `.xlsx` matrix files.
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

## Tech Stack
* **Vite**
* **React**
* **TailwindCSS**
* **shadcn/ui**

## License
MIT License
