import { useState, useEffect } from 'react';
import { calculateSchedule, injectVddTasks, compressSchedule } from './lib/logic';
import type { Project, Task } from './lib/logic';
import { getProjectByTemplateName } from './lib/templates';
import { exportToExcel } from './lib/exporter';
import { Gantt } from './components/Gantt';
import { TaskTable } from './components/TaskTable';
import { Download, Calendar, Settings, List, BarChart3, Globe, ShieldAlert, Menu, X, ChevronDown, Check } from 'lucide-react';
import Holidays from 'date-holidays';
import { Toaster, toast } from 'sonner';

// Valid Countries
const EU27 = ["AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE"];
const OTHERS = ["US", "BR", "JP"];
const VALID_COUNTRIES = [...EU27, ...OTHERS].sort();

function App() {
  const [language, setLanguage] = useState<"EN" | "PT">("EN");
  const [project, setProject] = useState<Project | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 768);

  // Settings State
  const [projectName, setProjectName] = useState("Project Alpha");
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);

  // V2: Multi-Country
  const [selectedCountries, setSelectedCountries] = useState<string[]>(["US"]);
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);

  // V2: Milestones
  const [marketingDate, setMarketingDate] = useState("");
  const [signingDate, setSigningDate] = useState("");

  const [vddEnabled, setVddEnabled] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState("Standard Sell-Side M&A");

  // Absences State
  const [absences, setAbsences] = useState<{ name: string, start: Date, end: Date }[]>([]);
  const [newAbsence, setNewAbsence] = useState({ name: "", start: "", end: "" });

  // Country Toggle Logic
  const toggleCountry = (code: string) => {
    if (selectedCountries.includes(code)) {
      setSelectedCountries(selectedCountries.filter(c => c !== code));
    } else {
      setSelectedCountries([...selectedCountries, code]);
    }
  };

  const selectAllCountries = () => setSelectedCountries(VALID_COUNTRIES);
  const deselectAllCountries = () => setSelectedCountries([]);

  // Load Template Handler
  const loadTemplate = () => {
    const start = new Date(startDate);
    let p = getProjectByTemplateName(selectedTemplate, start);
    p.name = projectName;
    p.country = selectedCountries;
    p.vddEnabled = vddEnabled;

    if (vddEnabled) {
      p = injectVddTasks(p);
    }

    // Initial Calc
    p = calculateSchedule(p);
    setProject({ ...p });

    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }

    toast.success("Template Loaded");
  };

  // Effect: Recalculate / Compress
  useEffect(() => {
    if (project) {
      let updated = { ...project };
      updated.startDate = new Date(startDate);
      updated.country = selectedCountries;
      updated.name = projectName;

      if (vddEnabled && !updated.vddEnabled) {
        updated.vddEnabled = true;
        updated = injectVddTasks(updated);
      }

      // V2: Compression Logic
      const mDate = marketingDate ? new Date(marketingDate) : undefined;
      const sDate = signingDate ? new Date(signingDate) : undefined;

      updated = compressSchedule(updated, mDate, sDate);
      setProject(updated);

      // Alerts check
      const criticalTasks = updated.tasks.filter(t => t.compressionRatio <= 0.5);
      if (criticalTasks.length > 0) {
        // Debounce or just show one warning
        const prepIssue = criticalTasks.some(t => t.phase.includes("Phase 1"));
        if (prepIssue) toast.error("Warning: Preparation phase compression critical!", { duration: 5000 });
        else toast.warning("Warning: Some phases are critically compressed.", { duration: 5000 });
      }
    }
  }, [startDate, selectedCountries, projectName, vddEnabled, marketingDate, signingDate]);

  const handleTaskUpdate = (tasks: Task[]) => {
    if (!project) return;
    let updated = { ...project, tasks };
    // Also re-run compression if tasks change
    const mDate = marketingDate ? new Date(marketingDate) : undefined;
    const sDate = signingDate ? new Date(signingDate) : undefined;
    updated = compressSchedule(updated, mDate, sDate);
    setProject(updated);
  };

  const handleExport = async () => {
    if (!project) return;
    // Excel exporter expects single string for country? We might need to adjust exporter or join them
    // Actually the new exporter.ts takes Project which has string[] for country.
    // But wait, the previous code had a cast: { ...project, country: project.country.join(", ") } as any;
    // Let's check logic.ts. Project interface has `country: string[]`.
    // Exporter.ts expects `Project`. 
    // So we can just pass `project`. 
    // But verify if Exporter handles array. Yes, "const hds = project.country.map..."

    await exportToExcel(project, language);
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

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900 font-sans overflow-hidden relative">
      <Toaster position="top-right" richColors />

      {/* Mobile Sidebar Backdrop */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar - FIXED & Mobile Optimized */}
      <aside
        className={`
            fixed md:relative top-0 bottom-0 left-0 bg-white border-r border-gray-200 flex flex-col z-40
            transform transition-transform duration-300 ease-in-out w-[85vw] md:w-80
            ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0 md:w-0 md:border-r-0 md:overflow-hidden'}
        `}
      >
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-white shrink-0">
          <div className="flex items-center gap-2 font-bold text-xl text-blue-900 truncate">
            <BarChart3 className="shrink-0" /> {txt.title}
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-gray-500 hover:text-red-500">
            <X size={24} />
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

            {/* Multi-Select Country */}
            <div className="relative">
              <div className="flex justify-between items-end mb-1">
                <label className="text-xs font-medium text-gray-700">Holidays ({selectedCountries.length})</label>
                <div className="flex gap-1">
                  <button onClick={selectAllCountries} className="text-[10px] text-blue-600 hover:underline">All</button>
                  <span className="text-gray-300">|</span>
                  <button onClick={deselectAllCountries} className="text-[10px] text-blue-600 hover:underline">None</button>
                </div>
              </div>
              <button
                onClick={() => setIsCountryDropdownOpen(!isCountryDropdownOpen)}
                className="w-full border rounded p-2 text-sm flex justify-between items-center bg-white"
              >
                <span className="truncate">{selectedCountries.join(", ") || "None"}</span>
                <ChevronDown size={14} />
              </button>

              {isCountryDropdownOpen && (
                <div className="absolute top-full left-0 w-full bg-white border shadow-lg rounded mt-1 z-50 max-h-60 overflow-y-auto">
                  {VALID_COUNTRIES.map(c => (
                    <div
                      key={c}
                      onClick={() => toggleCountry(c)}
                      className="flex items-center px-3 py-2 text-xs hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-0"
                    >
                      <div className={`w-4 h-4 border rounded mr-2 flex items-center justify-center shrink-0 ${selectedCountries.includes(c) ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                        {selectedCountries.includes(c) && <Check size={10} className="text-white" />}
                      </div>
                      <span>{c} {new Holidays().getCountries()[c]}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Optional Milestones */}
            <div className="pt-2 border-t border-dashed border-gray-200">
              <span className="text-xs font-bold text-gray-500 mb-2 block">Target Milestones (Optional)</span>
              <div className="mb-2">
                <label className="text-xs font-medium text-gray-700">Marketing Launch</label>
                <input type="date" className="w-full mt-1 border rounded p-2 text-sm" value={marketingDate} onChange={e => setMarketingDate(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700">Signing Date</label>
                <input type="date" className="w-full mt-1 border rounded p-2 text-sm" value={signingDate} onChange={e => setSigningDate(e.target.value)} />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
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
              className="w-full bg-blue-900 text-white py-2 rounded text-sm font-semibold hover:bg-blue-800 transition-colors shadow-sm"
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
      <main className="flex-1 flex flex-col h-full overflow-hidden w-full relative">
        {project ? (
          <>
            <header className="bg-white border-b border-gray-200 p-4 flex justify-between items-center shadow-sm z-20 shrink-0">
              <div className="flex items-center gap-3 overflow-hidden">
                <button
                  onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                  className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors"
                >
                  <Menu size={20} />
                </button>

                <div className="overflow-hidden">
                  <h1 className="text-lg md:text-2xl font-bold text-gray-800 truncate">{project.name}</h1>
                  <p className="text-xs text-gray-500 hidden md:block">{project.tasks.length} tasks • {project.country.join(", ")} Holidays</p>
                </div>
              </div>

              <button
                onClick={handleExport}
                className="flex items-center gap-2 bg-green-600 text-white px-3 py-2 rounded shadow hover:bg-green-700 font-semibold text-xs md:text-sm whitespace-nowrap"
              >
                <Download size={16} /> <span className="hidden md:inline">{txt.export}</span> <span className="md:hidden">Export</span>
              </button>
            </header>

            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-8 bg-gray-50">
              <section>
                <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <Calendar className="text-blue-600" /> {txt.gantt}
                </h2>
                <Gantt project={project} absences={absences} />
              </section>

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
            <div className="absolute top-4 left-4 z-50">
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 bg-white shadow-sm border"
                aria-label="Toggle Sidebar"
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
