import { useState } from "react";
import { TableStats } from "./components/TableStats";
import { MunicipiosManager } from "./components/MunicipiosManager";
import { FlowBuilder } from "./components/FlowBuilder/FlowBuilder";
import { ReportsPage } from "./components/Reports/ReportsPage";
import { Database, MapPin, Workflow, FileBarChart2 } from "lucide-react";

type Tab = "municipios" | "pipeline" | "reportes";

function App() {
  const [activeTab, setActiveTab] = useState<Tab>("municipios");

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "municipios", label: "Municipios", icon: <MapPin className="w-4 h-4" /> },
    { key: "pipeline",   label: "Pipeline",   icon: <Workflow className="w-4 h-4" /> },
    { key: "reportes",   label: "Reportes",   icon: <FileBarChart2 className="w-4 h-4" /> },
  ];

  const isFullScreen = activeTab === "pipeline" || activeTab === "reportes";

  return (
    <div className="min-h-screen bg-gray-50">
      {!isFullScreen && (
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Database className="w-8 h-8 text-indigo-600" />
              <h1 className="text-2xl font-bold text-gray-900">Gestor CSV → PostgreSQL</h1>
            </div>
            <nav className="flex gap-2">
              {tabs.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                    activeTab === tab.key
                      ? "bg-indigo-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </header>
      )}

      {activeTab === "pipeline" && (
        <div className="h-screen flex flex-col">
          <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-indigo-600" />
              <span className="font-semibold text-gray-800">Gestor CSV → PostgreSQL</span>
            </div>
            <nav className="flex gap-1">
              {tabs.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === tab.key
                      ? "bg-indigo-600 text-white"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
          <div className="flex-1 overflow-hidden">
            <FlowBuilder />
          </div>
        </div>
      )}

      {activeTab === "reportes" && (
        <div className="h-screen flex flex-col">
          <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-indigo-600" />
              <span className="font-semibold text-gray-800">Gestor CSV → PostgreSQL</span>
            </div>
            <nav className="flex gap-1">
              {tabs.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === tab.key
                      ? "bg-indigo-600 text-white"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
          <div className="flex-1 overflow-auto p-6">
            <ReportsPage />
          </div>
        </div>
      )}

      {activeTab === "municipios" && (
        <main className="max-w-7xl mx-auto px-4 py-8">
          <TableStats />
          <MunicipiosManager />
        </main>
      )}
    </div>
  );
}

export default App;
