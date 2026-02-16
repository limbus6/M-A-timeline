import { useState, useEffect } from 'react';
import { calculateSchedule, injectVddTasks } from './lib/logic';
import type { Project, Task } from './lib/logic';
import { getProjectByTemplateName } from './lib/templates';
import { generateExcel } from './lib/exporter';
import { Gantt } from './components/Gantt';
import { TaskTable } from './components/TaskTable';
import { Download, Calendar, Settings, List, BarChart3, Globe, ShieldAlert, Menu, X } from 'lucide-react';
import Holidays from 'date-holidays';

function App() {
  const [language, setLanguage] = useState<"EN" | "PT">("EN");
  const [project, setProject] = useState<Project | null>(null);

  // UI State
  // Default to open on desktop, closed on mobile
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 768);

  // Settings State
  const [projectName, setProjectName] = useState("Project Alpha");
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [country, setCountry] = useState("US");
  const [vddEnabled, setVddEnabled] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState("Standard Sell-Side M&A");

  // Absences State
  const [absences, setAbsences] = useState<{ name: string, start: Date, end: Date }[]>([]);
  const [newAbsence, setNewAbsence] = useState({ name: "", start: "", end: "" });

  // Handle Resize to auto-open/close logic if needed, 
  // but usually simple toggle is enough. We'll stick to manual toggle persistence in session if needed, 
  // but for now simple state is fine.

  // Load Template Handler
  const loadTemplate = () => {
    const start = new Date(startDate);
    let p = getProjectByTemplateName(selectedTemplate, start);
    p.name = projectName;
    p.country = country;
    p.vddEnabled = vddEnabled;

    if (vddEnabled) {
      p = injectVddTasks(p);
    }

    // Recalculate
    p = calculateSchedule(p);
    setProject({ ...p }); // Spread to force refresh

    // On mobile, auto-close sidebar after loading
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  };

  // Effect to recalculate when settings change affecting logic (if project loaded)
  useEffect(() => {
    if (project) {
      let updated = { ...project };
      updated.startDate = new Date(startDate);
      updated.country = country;
      updated.name = projectName;

      // VDD Logic: If toggled ON and not present
      if (vddEnabled && !updated.vddEnabled) {
        updated.vddEnabled = true;
        updated = injectVddTasks(updated);
      }

      updated = calculateSchedule(updated); // Assign back result
      setProject(updated);
    }
  }, [startDate, country, projectName, vddEnabled]); // added dependencies

  const handleTaskUpdate = (tasks: Task[]) => {
    if (!project) return;
    let updated = { ...project, tasks };
    updated = calculateSchedule(updated);
    setProject(updated);
  };

  const handleExport = async () => {
    if (!project) return;
    const buffer = await generateExcel(project, language);
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${project.name.replace(/\s+/g, '_')}_${project.country}_Timeline.xlsx`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Dictionary
  const txt = {
    EN: {
      title: "M&A Timeline",
      settings: "Settings",
      load: "Load Template",
      export: "Export Excel",
      tasks: "Task Management",
      gantt: "Timeline",
      absences: "Key People Absences",
      addAbsence: "Add"
    },
    PT: {
      title: "Cronograma M&A",
      settings: "Configurações",
      load: "Carregar Modelo",
      export: "Exportar Excel",
      tasks: "Gerenciamento de Tarefas",
      gantt: "Cronograma",
      absences: "Ausências de Pessoas Chave",
      addAbsence: "Adicionar"
    }
  }[language];

  // Country Options
  const countries = Object.keys(new Holidays().getCountries()).sort();

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900 font-sans overflow-hidden relative">

      {/* Mobile Backdrop */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
            fixed md:relative z-40 h-full bg-white border-r border-gray-200 flex flex-col
            transition-all duration-300 ease-in-out
            ${isSidebarOpen ? 'translate-x-0 w-80' : '-translate-x-full w-0 md:translate-x-0 md:w-0 md:overflow-hidden'}
        `}
      >
        <div className="p-4 border-b border-gray-100 flex justify-between items-center">
          <div className="flex items-center gap-2 font-bold text-xl text-blue-900 truncate">
            <BarChart3 className="shrink-0" /> {txt.title}
          </div>
          {/* Mobile Close Button */}
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-gray-500">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 space-y-6 flex-1 overflow-y-auto">
          {/* Language */}
          <div className="flex gap-2">
            <button onClick={() => setLanguage("EN")} className={`px-3 py-1 text-xs rounded-full border ${language === "EN" ? "bg-blue-50 border-blue-200 text-blue-700" : "bg-white text-gray-600"}`}>EN</button>
            <button onClick={() => setLanguage("PT")} className={`px-3 py-1 text-xs rounded-full border ${language === "PT" ? "bg-blue-50 border-blue-200 text-blue-700" : "bg-white text-gray-600"}`}>PT</button>
          </div>

          {/* Project Settings */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-gray-500 uppercase flex items-center gap-2"><Settings size={14} /> {txt.settings}</h3>

            <div>
              <label className="text-xs font-medium text-gray-700">Project Name</label>
              <input className="w-full mt-1 border rounded p-2 text-sm" value={projectName} onChange={e => setProjectName(e.target.value)} />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-700">Start Date</label>
              <input type="date" className="w-full mt-1 border rounded p-2 text-sm" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-700">Country (Holidays)</label>
              <select className="w-full mt-1 border rounded p-2 text-sm" value={country} onChange={e => setCountry(e.target.value)}>
                {countries.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <input type="checkbox" id="vdd" checked={vddEnabled} onChange={e => setVddEnabled(e.target.checked)} />
              <label htmlFor="vdd" className="text-sm cursor-pointer select-none">Include VDD?</label>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-700">Template</label>
              <select className="w-full mt-1 border rounded p-2 text-sm" value={selectedTemplate} onChange={e => setSelectedTemplate(e.target.value)}>
                <option>Standard Sell-Side M&A</option>
                <option>Fast-Track / Sprint M&A</option>
                <option>Due Diligence Heavy / Buy-Side</option>
              </select>
            </div>

            <button
              onClick={loadTemplate}
              className="w-full bg-blue-900 text-white py-2 rounded text-sm font-semibold hover:bg-blue-800 transition-colors"
            >
              {txt.load}
            </button>
          </div>

          {/* Absences */}
          <div className="space-y-3 pt-4 border-t border-gray-100">
            <h3 className="font-semibold text-sm text-gray-500 uppercase flex items-center gap-2"><ShieldAlert size={14} /> {txt.absences}</h3>
            <div className="grid grid-cols-1 gap-2">
              <input placeholder="Name" className="border rounded p-1 text-xs" value={newAbsence.name} onChange={e => setNewAbsence({ ...newAbsence, name: e.target.value })} />
              <div className="flex gap-1">
                <input type="date" className="border rounded p-1 text-xs w-1/2" value={newAbsence.start} onChange={e => setNewAbsence({ ...newAbsence, start: e.target.value })} />
                <input type="date" className="border rounded p-1 text-xs w-1/2" value={newAbsence.end} onChange={e => setNewAbsence({ ...newAbsence, end: e.target.value })} />
              </div>
              <button
                onClick={() => {
                  if (newAbsence.name && newAbsence.start && newAbsence.end) {
                    setAbsences([...absences, { name: newAbsence.name, start: new Date(newAbsence.start), end: new Date(newAbsence.end) }]);
                    setNewAbsence({ name: "", start: "", end: "" });
                  }
                }}
                className="bg-gray-100 text-gray-700 text-xs py-1 rounded hover:bg-gray-200"
              >
                {txt.addAbsence}
              </button>
            </div>

            <div className="space-y-1">
              {absences.map((ab, i) => (
                <div key={i} className="flex justify-between items-center bg-red-50 p-1 rounded text-xs">
                  <span>{ab.name} ({ab.start.toLocaleDateString()})</span>
                  <button onClick={() => setAbsences(absences.filter((_, idx) => idx !== i))} className="text-red-500">×</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden w-full">
        {project ? (
          <>
            <header className="bg-white border-b border-gray-200 p-4 flex justify-between items-center shadow-sm z-20 shrink-0">
              <div className="flex items-center gap-3 overflow-hidden">
                {/* Toggle Button */}
                <button
                  onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                  className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors"
                  aria-label="Toggle Sidebar"
                >
                  <Menu size={20} />
                </button>

                <div className="overflow-hidden">
                  <h1 className="text-lg md:text-2xl font-bold text-gray-800 truncate">{project.name}</h1>
                  <p className="text-xs text-gray-500 hidden md:block">{project.tasks.length} tasks • {project.country} Holidays</p>
                </div>
              </div>

              <button
                onClick={handleExport}
                className="flex items-center gap-2 bg-green-600 text-white px-3 py-2 rounded shadow hover:bg-green-700 font-semibold text-xs md:text-sm whitespace-nowrap"
              >
                <Download size={16} /> <span className="hidden md:inline">{txt.export}</span> <span className="md:hidden">Export</span>
              </button>
            </header>

            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-8">

              {/* Gantt Section */}
              <section>
                <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <Calendar className="text-blue-600" /> {txt.gantt}
                </h2>
                <Gantt project={project} absences={absences} />
              </section>

              {/* Tasks Section */}
              <section>
                <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <List className="text-blue-600" /> {txt.tasks}
                </h2>
                <TaskTable project={project} onUpdate={handleTaskUpdate} />
              </section>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-4">
            {/* Empty State Header with Toggle */}
            <div className="absolute top-4 left-4">
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"
              >
                <Menu size={20} />
              </button>
            </div>

            <div className="flex flex-col items-center text-gray-400 gap-4 text-center">
              <Globe size={64} className="text-gray-200" />
              <p>Open the sidebar <Menu className="inline w-4 h-4" /> and load a template to begin.</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
