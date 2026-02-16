# M&A Timeline Generator - Walkthrough (Enhanced)

This application generates professional, investment banking-grade M&A project timelines. It features a bilingual interface, pre-loaded templates, strict Excel export, and now **full customization capabilities**.

## 1. Installation

Ensure you have Python installed. Install the required dependencies:

```bash
pip install -r requirements.txt
```

*Note: This now includes the `holidays` library for automatic holiday integration.*

## 2. Running the Application

To launch the web interface:

```bash
streamlit run app.py
```

## 3. Enhanced Features

### Project Setup
- **Country (Holidays)**: Select the project jurisdiction (e.g., US, PT, UK). The engine automatically shifts task dates to skip public holidays.
- **VDD Toggle**: Check **"Include Vendor Due Diligence (VDD)?"**.
    - Automatically injects VDD tasks into Phase 1.
    - Reduces the duration of Phase 3 (Confirmatory DD) accordingly.

### Task Management (Full CRUD)
- **Data Editor**: The main task list is now a fully editable spreadsheet-like interface.
    - **Edit**: Change Name, Duration, Phase, or Predecessors directly in the cells.
    - **Add/Delete**: Use the UI to add new rows or delete existing ones.
    - **Reorder**: Change IDs or Phase names to logically reorder tasks.
    - **Types**: Select from expanded types: "Key Decision (★)", "Bottleneck (⚠️)", "External Dependency (🔗)", etc.

### Visualizations
- **Gantt Chart**:
    - Displays Holidays as vertical dashed lines.
    - Shows Absences as red overlays.
    - Displays new markers (★, ⚠️) on the bars.
    - **Bottleneck Warnings**: Real-time alerts if a critical task overlaps with key person absence.

### Excel Export (Board Ready)
- The export now includes:
    - **Holiday Awareness**: Headers reflect holiday weeks.
    - **Visual Markers**: "★", "⚠️", "🔗", "▲" are placed in the specific concluding week cell.
    - **Strict Formatting**: No gridlines, clean professional layout.

## 4. Verification

We have verified:
- **VDD Logic**: Toggling VDD correctly injects tasks and adjusts Phase 3.
- **Holiday Logic**: Tasks crossing holidays (e.g., July 4th in US) automatically extend their end date.
- **CRUD**: Edits in the UI correctly update the DAG schedule.
