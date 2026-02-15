import { useState } from "react";
import { FileUploader } from "./components/FileUploader";
import { DataViewer } from "./components/DataViewer";
import { TableStats } from "./components/TableStats";
import { Database, Upload, Table } from "lucide-react";

type Tab = "upload" | "data";

function App() {
  const [activeTab, setActiveTab] = useState<Tab>("upload");
  const [refreshKey, setRefreshKey] = useState(0);

  const handleUploadSuccess = () => {
    setRefreshKey((k) => k + 1);
  };

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
            <button
              onClick={() => setActiveTab("upload")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === "upload"
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <Upload className="w-4 h-4" />
              Subir CSV
            </button>
            <button
              onClick={() => setActiveTab("data")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === "data"
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <Table className="w-4 h-4" />
              Ver Datos
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <TableStats key={`stats-${refreshKey}`} />

        {activeTab === "upload" && (
          <FileUploader onSuccess={handleUploadSuccess} />
        )}
        {activeTab === "data" && <DataViewer />}
      </main>
    </div>
  );
}

export default App;
