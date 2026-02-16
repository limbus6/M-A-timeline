import io
import datetime
import xlsxwriter
import holidays
from logic import Project, Task

def generate_excel(project: Project, language: str = "EN") -> io.BytesIO:
    output = io.BytesIO()
    workbook = xlsxwriter.Workbook(output, {'in_memory': True})
    
    sheet_name = "Timeline" if language == "EN" else "Cronograma"
    sheet = workbook.add_worksheet(sheet_name)
    sheet.hide_gridlines(2) 

    # --- FORMATS ---
    fmt_header_base = {
        'bold': True,
        'font_color': 'white',
        'bg_color': '#203764',
        'border': 1,
        'align': 'center',
        'valign': 'vcenter',
        'font_name': 'Arial',
        'font_size': 10,
        'text_wrap': True
    }
    fmt_header = workbook.add_format(fmt_header_base)
    
    # Header for Holiday Weeks
    fmt_header_holiday = workbook.add_format(dict(fmt_header_base, bg_color='#5B9BD5')) # Lighter blue to indicate something special

    fmt_phase = workbook.add_format({
        'bold': True,
        'font_color': '#203764',
        'bg_color': '#E7E6E6',
        'border': 1,
        'align': 'left',
        'valign': 'vcenter',
        'font_name': 'Arial',
        'font_size': 10
    })

    fmt_cell = workbook.add_format({
        'border': 1,
        'align': 'center',
        'valign': 'vcenter',
        'font_name': 'Arial',
        'font_size': 10
    })

    fmt_date = workbook.add_format({
        'num_format': 'dd-mmm-yy',
        'border': 1,
        'align': 'center',
        'valign': 'vcenter',
        'font_name': 'Arial',
        'font_size': 10
    })

    fmt_bar = workbook.add_format({
        'bg_color': '#203764', 
        'border': 1,
        'align': 'center',
        'valign': 'vcenter'
    })
    
    # Milestone / Markers
    # Font size larger for symbols
    fmt_marker = workbook.add_format({
        'align': 'center',
        'valign': 'vcenter',
        'font_color': '#C00000', # Red
        'bold': True,
        'border': 1,
        'font_name': 'Segoe UI Symbol', # Good for unicode
        'font_size': 12
    })
    
    # Holiday Cell logic? Maybe shade vertical column?
    # We can't shade the whole column easily without defining a format for EVERY cell type relative to holidays.
    # Instead, we will mark the header and maybe put a small marker in empty cells? 
    # Or define a separate background for holiday weeks?
    # Let's use a light pattern for holiday weeks if empty?
    # For now, just Header distinction is safest to not break bar colors.

    # --- TRANSLATIONS ---
    headers = {
        "EN": ["ID", "Phase", "Task", "Duration (Wks)", "Start", "End"],
        "PT": ["ID", "Fase", "Tarefa", "Duração (Sem)", "Início", "Fim"]
    }
    week_prefix = "w/c" if language == "EN" else "Sem de"

    # --- DATE RANGE ---
    if not project.tasks:
        start_date = project.start_date
        end_date = project.start_date + datetime.timedelta(weeks=4)
        week_start_list = []
        current = start_date - datetime.timedelta(days=start_date.weekday())
        while current < end_date:
            week_start_list.append(current)
            current += datetime.timedelta(weeks=1)
    else:
        p_start = project.start_date
        ends = [t.computed_end for t in project.tasks if t.computed_end]
        if ends:
            p_end = max(ends)
        else:
            p_end = p_start + datetime.timedelta(weeks=4)
            
        current = p_start - datetime.timedelta(days=p_start.weekday())
        week_start_list = []
        # Add buffer
        while current < p_end + datetime.timedelta(weeks=1):
            week_start_list.append(current)
            current += datetime.timedelta(weeks=1)

    if not week_start_list:
        week_start_list = [project.start_date - datetime.timedelta(days=project.start_date.weekday())]

    # --- HOLIDAY DETECTION ---
    country_holidays = holidays.country_holidays(project.country)
    
    # Check each week for holidays
    week_has_holiday = []
    for ws in week_start_list:
        # Check Mon-Fri
        found = False
        for d in range(5):
            day = ws + datetime.timedelta(days=d)
            if day in country_holidays:
                found = True
                break
        week_has_holiday.append(found)

    # --- WRITE HEADER ---
    col_static = headers[language]
    for i, h in enumerate(col_static):
        sheet.write(0, i, h, fmt_header)
    
    for i, ws in enumerate(week_start_list):
        col_idx = len(col_static) + i
        label = f"{week_prefix}\n{ws.strftime('%d-%b')}"
        
        # Use holiday header if holiday in week
        fmt = fmt_header_holiday if week_has_holiday[i] else fmt_header
        
        sheet.write(0, col_idx, label, fmt)
        sheet.set_column(col_idx, col_idx, 5)

    sheet.set_column(0, 0, 8)  
    sheet.set_column(1, 1, 25) 
    sheet.set_column(2, 2, 50) 
    sheet.set_column(3, 3, 12) 
    sheet.set_column(4, 5, 12) 
    sheet.freeze_panes(1, 6) # Freeze header and static cols

    # --- WRITE TASKS ---
    row = 1
    
    for task in project.tasks:
        if not task.computed_start or not task.computed_end:
            continue
            
        sheet.write(row, 0, task.id, fmt_cell)
        sheet.write(row, 1, task.phase, fmt_phase) 
        sheet.write(row, 2, task.name, fmt_cell)
        sheet.write(row, 3, task.duration_weeks, fmt_cell)
        sheet.write(row, 4, task.computed_start, fmt_date)
        sheet.write(row, 5, task.computed_end, fmt_date)
        
        for i, ws in enumerate(week_start_list):
            col_idx = len(col_static) + i
            
            # Simple overlap logic for weekly view
            # If task spans this week's start
            
            start_active = task.computed_start <= ws
            # Strict strictly less than end date?
            # If end date is Monday, it doesn't span that week.
            end_active = ws < task.computed_end
            
            is_active = start_active and end_active
            
            cell_val = ""
            cell_fmt = fmt_cell # Default blank
            
            if is_active:
                # MARKER LOGIC
                # Only show marker in the LAST week of the task
                # Last week starts at (task.computed_end - 7 days)? No.
                # Task end date logic:
                # If Task ends Oct 25 (Friday). Week starts Oct 21. 
                # ws = Oct 21. computed_end = Oct 25 (or Oct 28 Monday).
                # If we assume computed_end is the start of the NEXT block (exclusive),
                # Then the week containing the task end is the one starting before it.
                
                # Check if this is the "concluding week"
                # The week that contains (computed_end - 1 day)
                end_minus_one = task.computed_end - datetime.timedelta(days=1)
                is_concluding_week = (ws <= end_minus_one < ws + datetime.timedelta(days=7))
                
                if is_concluding_week:
                     if task.task_type == "Milestone":
                         cell_val = "▲"
                         cell_fmt = fmt_marker
                     elif task.task_type == "Key Decision":
                         cell_val = "★"
                         cell_fmt = fmt_marker
                     elif task.task_type == "Bottleneck":
                         cell_val = "⚠️"
                         cell_fmt = fmt_marker
                     elif task.task_type == "External Dependency":
                         cell_val = "🔗"
                         cell_fmt = fmt_marker
                     else:
                         cell_fmt = fmt_bar
                else:
                     # Active but not concluding -> Fill for Standard/Bottleneck
                     # Milestones usually don't have duration bars unless specified.
                     if task.task_type not in ["Milestone", "Key Decision", "External Dependency"]:
                         cell_fmt = fmt_bar
            
            sheet.write(row, col_idx, cell_val, cell_fmt)
            
        row += 1

    workbook.close()
    output.seek(0)
    return output
