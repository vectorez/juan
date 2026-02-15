import { useState } from "react";
import { TableStats } from "./components/TableStats";
import { MunicipiosManager } from "./components/MunicipiosManager";
import { FlowBuilder } from "./components/FlowBuilder/FlowBuilder";
import { Database, MapPin, Workflow } from "lucide-react";

type Tab = "municipios" | "pipeline";

function App() {
  const [activeTab, setActiveTab] = useState<Tab>("municipios");

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "municipios", label: "Municipios", icon: <MapPin className="w-4 h-4" /> },
    { key: "pipeline", label: "Pipeline", icon: <Workflow className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Database className="w-8 h-8 text-indigo-600" />
            <h1 className="text-2xl font-bold text-gray-900">
              Gestor CSV → PostgreSQL
            </h1>
          </div>
          <nav className="flex gap-2">
            {tabs.map((tab) => (
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

      <main className={`mx-auto px-4 py-8 ${activeTab === "pipeline" ? "max-w-full" : "max-w-7xl"}`}>
        {activeTab === "municipios" && (
          <>
            <TableStats />
            <MunicipiosManager />
          </>
        )}
        {activeTab === "pipeline" && <FlowBuilder />}
      </main>
    </div>
  );
}

export default App;
