import streamlit as st
import datetime
import pandas as pd
import plotly.express as px
import plotly.figure_factory as ff
import plotly.graph_objects as go
import holidays
from logic import Project, Task
from templates import get_project_by_template_name
from exporter import generate_excel

# Page config
st.set_page_config(page_title="M&A Timeline Generator", layout="wide")

# --- TRANSLATIONS ---
translations = {
    "EN": {
        "title": "M&A Transaction Timeline Generator",
        "settings": "Project Settings",
        "name": "Project Name",
        "start_date": "Start Date",
        "country": "Project Country (Holidays)",
        "vdd_toggle": "Include Vendor Due Diligence (VDD)?",
        "template": "Select Template",
        "load_template": "Load Template",
        "tasks": "Task Management (Full CRUD)",
        "gantt": "Timeline Visualization",
        "absences": "Key People - Absences/Vacations",
        "export": "Export to Excel",
        "phase": "Phase",
        "task": "Task",
        "duration": "Duration (Weeks)",
        "predecessors": "Predecessors (IDs)",
        "type": "Type",
        "bottleneck_warning": "⚠️ CRITICAL WARNING: Bottleneck Task '{task}' overlaps with Absence of '{person}' ({start} to {end})!",
        "download": "Download Excel Timeline",
        "refresh": "Refresh Schedule & Calculate Dates",
        "msg_loaded": "Template Loaded Successfully!",
        "vdd_msg": "VDD Tasks Injected & Phase 3 Adjusted!",
    },
    "PT": {
        "title": "Gerador de Cronograma de Transação M&A",
        "settings": "Configurações do Projeto",
        "name": "Nome do Projeto",
        "start_date": "Data de Início",
        "country": "País do Projeto (Feriados)",
        "vdd_toggle": "Incluir Vendor Due Diligence (VDD)?",
        "template": "Selecionar Modelo",
        "load_template": "Carregar Modelo",
        "tasks": "Gerenciamento de Tarefas (Edição Total)",
        "gantt": "Visualização do Cronograma",
        "absences": "Pessoas Chave - Ausências/Férias",
        "export": "Exportar para Excel",
        "phase": "Fase",
        "task": "Tarefa",
        "duration": "Duração (Semanas)",
        "predecessors": "Predecessores (IDs)",
        "type": "Tipo",
        "bottleneck_warning": "⚠️ AVISO CRÍTICO: Tarefa Gargalo '{task}' coincide com Ausência de '{person}' ({start} até {end})!",
        "download": "Baixar Cronograma Excel",
        "refresh": "Atualizar Cronograma & Calcular Datas",
        "msg_loaded": "Modelo Carregado com Sucesso!",
        "vdd_msg": "Tarefas de VDD Inseridas & Fase 3 Ajustada!",
    }
}

# --- SESSION STATE ---
if "language" not in st.session_state:
    st.session_state.language = "EN"
if "project" not in st.session_state:
    st.session_state.project = None
if "absences" not in st.session_state:
    st.session_state.absences = [] 

def txt(key):
    return translations[st.session_state.language].get(key, key)

# --- SIDEBAR ---
with st.sidebar:
    st.title("Settings")
    
    col1, col2 = st.columns(2)
    with col1:
        lang = st.radio("Language", ["EN", "PT"], label_visibility="collapsed")
    
    if lang != st.session_state.language:
        st.session_state.language = lang
        st.rerun()

    st.divider()
    
    # Project Settings
    st.header(txt("settings"))
    project_name = st.text_input(txt("name"), value="Project Alpha")
    start_date = st.date_input(txt("start_date"), value=datetime.date.today())
    
    # Country Selection for Holidays
    # Using common codes supported by 'holidays' library
    country_options = sorted(list(holidays.list_supported_countries().keys()))
    # Default to US or PT if available
    default_idx = 0
    if "US" in country_options:
        default_idx = country_options.index("US")
    
    country_code = st.selectbox(txt("country"), country_options, index=default_idx)
    
    # VDD Toggle
    vdd_enabled = st.checkbox(txt("vdd_toggle"), value=False)
    
    template_options = [
        "Standard Sell-Side M&A",
        "Fast-Track / Sprint M&A",
        "Due Diligence Heavy / Buy-Side"
    ]
    template_choice = st.selectbox(txt("template"), template_options)
    
    if st.button(txt("load_template")):
        proj = get_project_by_template_name(template_choice, start_date)
        proj.name = project_name
        proj.country = country_code
        proj.vdd_enabled = vdd_enabled
        if vdd_enabled:
            proj.inject_vdd_tasks()
        
        st.session_state.project = proj
        st.success(txt("msg_loaded"))
        st.rerun()

    st.divider()
    st.markdown("### Absences")
    with st.expander(txt("absences"), expanded=False):
        abs_name = st.text_input("Name", key="abs_name")
        abs_start = st.date_input("Start", key="abs_start")
        abs_end = st.date_input("End", key="abs_end")
        
        if st.button("Add Absence"):
            if abs_name and abs_start <= abs_end:
                 st.session_state.absences.append({
                     "name": abs_name,
                     "start": abs_start,
                     "end": abs_end
                 })
                 st.success("Added")
            else:
                 st.error("Invalid Input")
        
        if st.session_state.absences:
            st.markdown("---")
            for i, ab in enumerate(st.session_state.absences):
                st.write(f"**{ab['name']}**: {ab['start']} -> {ab['end']}")
                if st.button("X", key=f"del_abs_{i}"):
                    st.session_state.absences.pop(i)
                    st.rerun()

# --- MAIN PAGE ---
st.title(txt("title"))

if st.session_state.project is None:
    st.info("Please load a template from the sidebar to start.")
    st.stop()

project = st.session_state.project

# Sync sidebar changes to project object if it exists
if project.start_date != start_date:
    project.start_date = start_date
    project.calculate_schedule()

if project.country != country_code:
    project.country = country_code
    project.calculate_schedule()

# Handle VDD dynamic injection if toggled AFTER loading
if vdd_enabled and not project.vdd_enabled:
    project.vdd_enabled = True
    project.inject_vdd_tasks()
    project.calculate_schedule()
    st.success(txt("vdd_msg"))


# --- TASK MANAGEMENT (DATA EDITOR) ---
st.header(txt("tasks"))

# Convert Tasks to DataFrame
task_data = []
for t in project.tasks:
    task_data.append({
        "ID": t.id,
        "Phase": t.phase,
        "Task": t.name,
        "Duration": t.duration_weeks,
        "Predecessors": ", ".join(t.predecessors),
        "Type": t.task_type
    })

df_tasks = pd.DataFrame(task_data)

# Config for Editor
column_config = {
    "ID": st.column_config.TextColumn("ID", required=True),
    "Phase": st.column_config.TextColumn("Phase", required=True),
    "Task": st.column_config.TextColumn("Task Name", required=True, width="large"),
    "Duration": st.column_config.NumberColumn("Duration (Wks)", min_value=0.0, step=0.5, format="%.1f"),
    "Predecessors": st.column_config.TextColumn("Predecessors", help="Comma-separated IDs"),
    "Type": st.column_config.SelectboxColumn(
        "Type",
        options=["Standard", "Milestone", "Bottleneck", "Key Decision", "External Dependency"],
        required=True
    )
}

edited_df = st.data_editor(
    df_tasks,
    key="task_editor",
    num_rows="dynamic",
    use_container_width=True,
    column_config=column_config,
    hide_index=True 
)

# SYNC BACK LOGIC
# We detect if the dataframe changed. 
# Reconstruct tasks list from edited_df.
if st.button(txt("refresh")):
    new_tasks = []
    # Edited DF is the source of truth
    for index, row in edited_df.iterrows():
        # Handle predecessors string to list
        pred_str = str(row["Predecessors"]) if row["Predecessors"] else ""
        preds = [p.strip() for p in pred_str.split(",") if p.strip()]
        
        t = Task(
            id=str(row["ID"]), # Ensure string
            name=str(row["Task"]),
            phase=str(row["Phase"]),
            duration_weeks=float(row["Duration"]),
            predecessors=preds,
            task_type=str(row["Type"])
        )
        new_tasks.append(t)
    
    project.tasks = new_tasks
    project.calculate_schedule()
    st.success("Schedule Updated!")
    st.rerun()

# --- GANTT CHART ---
st.header(txt("gantt"))

data = []
for t in project.tasks:
    if t.computed_start and t.computed_end:
        # Markers for visualizing types
        marker = ""
        if t.task_type == "Milestone": marker = "▲"
        elif t.task_type == "Key Decision": marker = "★"
        elif t.task_type == "Bottleneck": marker = "⚠️"
        
        name_display = f"{marker} {t.name}" if marker else t.name
        
        data.append(dict(
            Task=name_display, 
            Start=t.computed_start, 
            Finish=t.computed_end, 
            Phase=t.phase,
            Type=t.task_type,
            Duration=t.duration_weeks
        ))

if data:
    df_gantt = pd.DataFrame(data)
    
    fig = px.timeline(
        df_gantt, 
        x_start="Start", 
        x_end="Finish", 
        y="Task", 
        color="Phase",
        hover_data=["Type", "Duration"],
        title=f"{project.name} Timeline ({project.country} Holidays)"
    )
    fig.update_yaxes(autorange="reversed") 
    
    # Overlay Absences
    for absence in st.session_state.absences:
        fig.add_vrect(
            x0=absence['start'], 
            x1=absence['end'], 
            fillcolor="red", 
            opacity=0.15, 
            line_width=0,
            annotation_text=absence['name'], 
            annotation_position="top left"
        )
        
        # Bottleneck Warnings
        for t in project.tasks:
            if (t.task_type in ["Bottleneck", "Key Decision"]) and t.computed_start and t.computed_end:
                latest_start = max(t.computed_start, absence['start'])
                earliest_end = min(t.computed_end, absence['end'])
                
                if latest_start < earliest_end:
                    st.error(txt("bottleneck_warning").format(
                        task=t.name, 
                        person=absence['name'], 
                        start=absence['start'], 
                        end=absence['end']
                    ))
    
    # Highlight Holidays? 
    # Usually easier to just calculate schedule correctly. 
    # Visualizing every holiday as a vertical line might clutter, but let's try for current view range.
    # Get holidays in range
    country_holidays = holidays.country_holidays(project.country)
    min_date = min(t.computed_start for t in project.tasks if t.computed_start)
    max_date = max(t.computed_end for t in project.tasks if t.computed_end)
    
    # Iterate through years in range
    years = range(min_date.year, max_date.year + 1)
    # This is efficient enough for M&A timelines (1-2 years)
    
    # Collect holiday dates
    holiday_dates = []
    current = min_date
    while current <= max_date:
        if current in country_holidays and current.weekday() < 5: # Only mark weekday holidays
            holiday_dates.append(current)
        current += datetime.timedelta(days=1)
            
    for h_date in holiday_dates:
        fig.add_vline(x=h_date, line_width=1, line_dash="dash", line_color="gray", opacity=0.5)

    st.plotly_chart(fig, use_container_width=True)
else:
    st.warning("No tasks to display.")

# --- EXPORT ---
st.divider()
st.header(txt("export"))

export_buf = generate_excel(project, st.session_state.language)

st.download_button(
    label=txt("download"),
    data=export_buf,
    file_name=f"{project.name.replace(' ', '_')}_{project.country}_Timeline.xlsx",
    mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
)
