import ExcelJS from 'exceljs';
import type { Project } from './logic';
import { addDays } from 'date-fns';
import Holidays from 'date-holidays';
import { saveAs } from 'file-saver';

export async function exportToExcel(project: Project, language: "EN" | "PT" = "EN") {
    try {
        const workbook = new ExcelJS.Workbook();
        const sheetName = language === "EN" ? "Timeline" : "Cronograma";
        const worksheet = workbook.addWorksheet(sheetName);

        // Styles
        const headerStyle: Partial<ExcelJS.Style> = {
            font: { bold: true, color: { argb: 'FFFFFFFF' }, name: 'Arial', size: 10 },
            fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF203764' } }, // Dark Blue
            alignment: { vertical: 'middle', horizontal: 'center', wrapText: true },
            border: { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }
        };

        const holidayHeaderStyle: Partial<ExcelJS.Style> = {
            ...headerStyle,
            fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF5B9BD5' } } // Light Blue
        };

        const phaseStyle: Partial<ExcelJS.Style> = {
            font: { bold: true, color: { argb: 'FF203764' }, name: 'Arial', size: 10 },
            fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE7E6E6' } }, // Light Grey
            alignment: { vertical: 'middle', horizontal: 'left' },
            border: { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }
        };

        const cellStyle: Partial<ExcelJS.Style> = {
            font: { name: 'Arial', size: 10 },
            alignment: { vertical: 'middle', horizontal: 'center' },
            border: { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }
        };

        const dateStyle: Partial<ExcelJS.Style> = {
            ...cellStyle,
            numFmt: 'dd-mmm-yy'
        };

        const barStyle: Partial<ExcelJS.Style> = {
            fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF203764' } },
            border: { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }
        };

        const compressedBarStyle: Partial<ExcelJS.Style> = {
            fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEF4444' } }, // Red
            border: { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }
        };

        const markerStyle: Partial<ExcelJS.Style> = {
            font: { bold: true, color: { argb: 'FFC00000' }, name: 'Segoe UI Symbol', size: 12 },
            alignment: { vertical: 'middle', horizontal: 'center' },
            border: { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }
        };

        // Translations
        const headers = language === "EN"
            ? ["ID", "Phase", "Task", "Duration (Wks)", "Start", "End"]
            : ["ID", "Fase", "Tarefa", "Duração (Sem)", "Início", "Fim"];
        const weekPrefix = language === "EN" ? "w/c" : "Sem de";

        // Date Range
        let startDate = new Date(project.startDate);
        const day = startDate.getDay();
        const diff = startDate.getDate() - day + (day === 0 ? -6 : 1);
        let currentMonday = new Date(startDate.setDate(diff));
        currentMonday = new Date(project.startDate);
        const d = currentMonday.getDay();
        const diff2 = currentMonday.getDate() - d + (d === 0 ? -6 : 1);
        currentMonday = new Date(currentMonday.setDate(diff2));

        let maxEnd = new Date(currentMonday);
        maxEnd = addDays(maxEnd, 28);

        project.tasks.forEach(t => {
            if (t.computedEnd && new Date(t.computedEnd) > maxEnd) {
                maxEnd = new Date(t.computedEnd);
            }
        });

        const weeks: Date[] = [];
        let w = new Date(currentMonday);
        while (w < addDays(maxEnd, 7)) {
            weeks.push(new Date(w));
            w = addDays(w, 7);
        }

        // Holiday Detection (Multi-Calendar)
        const hds = project.country.map(c => {
            try { return new Holidays(c); } catch { return null; }
        }).filter(Boolean);

        const weekHasHoliday = weeks.map(ws => {
            for (let i = 0; i < 5; i++) {
                const d = addDays(ws, i);
                for (const hd of hds) {
                    if (hd && hd.isHoliday(d)) return true;
                }
            }
            return false;
        });

        // Write Headers
        headers.forEach((h, i) => {
            const cell = worksheet.getCell(1, i + 1);
            cell.value = h;
            cell.style = headerStyle;
        });

        weeks.forEach((ws, i) => {
            const colIdx = headers.length + i + 1;
            const cell = worksheet.getCell(1, colIdx);
            const dayStr = ws.getDate().toString().padStart(2, '0');
            const monthStr = ws.toLocaleString(language === "EN" ? 'en-US' : 'pt-PT', { month: 'short' });
            cell.value = `${weekPrefix}\n${dayStr}-${monthStr}`;
            cell.style = weekHasHoliday[i] ? holidayHeaderStyle : headerStyle;
            worksheet.getColumn(colIdx).width = 6;
        });

        // Column Widths
        worksheet.getColumn(1).width = 10;
        worksheet.getColumn(2).width = 25;
        worksheet.getColumn(3).width = 50;
        worksheet.getColumn(4).width = 12;
        worksheet.getColumn(5).width = 12;
        worksheet.getColumn(6).width = 12;

        // Write Tasks
        let rowIdx = 2;
        project.tasks.forEach(task => {
            const row = worksheet.getRow(rowIdx);

            // Static Data
            row.getCell(1).value = task.id; row.getCell(1).style = cellStyle;
            row.getCell(2).value = task.phase; row.getCell(2).style = phaseStyle;
            row.getCell(3).value = task.name; row.getCell(3).style = cellStyle;
            row.getCell(4).value = task.durationWeeks; row.getCell(4).style = cellStyle;
            row.getCell(5).value = task.computedStart; row.getCell(5).style = dateStyle;
            row.getCell(6).value = task.computedEnd; row.getCell(6).style = dateStyle;

            // Timeline
            if (task.computedStart && task.computedEnd) {
                const start = new Date(task.computedStart);
                const end = new Date(task.computedEnd);

                weeks.forEach((ws, i) => {
                    const colIdx = headers.length + i + 1;
                    const cell = row.getCell(colIdx);

                    const isStart = start <= ws;
                    const isEnd = end > ws;

                    if (isStart && isEnd) {
                        const endMinusOne = addDays(end, -1);
                        const nextWs = addDays(ws, 7);
                        const isConcluding = (endMinusOne >= ws && endMinusOne < nextWs);

                        if (isConcluding) {
                            if (task.type === "Milestone") { cell.value = "▲"; cell.style = markerStyle; }
                            else if (task.type === "Key Decision") { cell.value = "★"; cell.style = markerStyle; }
                            else if (task.type === "Bottleneck") { cell.value = "⚠️"; cell.style = markerStyle; }
                            else if (task.type === "External Dependency") { cell.value = "🔗"; cell.style = markerStyle; }
                            else {
                                cell.style = (task.compressionRatio <= 0.5) ? compressedBarStyle : barStyle;
                            }
                        } else {
                            if (!["Milestone", "Key Decision", "External Dependency"].includes(task.type)) {
                                cell.style = (task.compressionRatio <= 0.5) ? compressedBarStyle : barStyle;
                            } else {
                                cell.style = cellStyle;
                            }
                        }
                    } else {
                        cell.style = cellStyle;
                    }
                });
            }

            rowIdx++;
        });

        worksheet.views = [{ state: 'frozen', xSplit: 6, ySplit: 1, showGridLines: false }];

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        saveAs(blob, `${project.name.replace(/\s+/g, '_')}_Timeline.xlsx`);

    } catch (error) {
        console.error("Error generating Excel file:", error);
    }
}
