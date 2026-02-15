import { useState, useEffect, useRef } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import {
  Plus,
  Pencil,
  Trash2,
  Save,
  X,
  Loader2,
  MapPin,
  AlertCircle,
  CheckCircle,
  FileSpreadsheet,
  CheckCircle2,
} from "lucide-react";

interface Municipio {
  id: number;
  codDepartamento: number;
  nombreDepartamento: string;
  codMunicipio: number;
  nombreMunicipio: string;
  activo: boolean;
  columnasFacturacion: number;
  columnasRecaudos: number;
  encabezadosFacturacion: string[];
  encabezadosRecaudos: string[];
}

interface FormData {
  codDepartamento: string;
  nombreDepartamento: string;
  codMunicipio: string;
  nombreMunicipio: string;
}

const emptyForm: FormData = {
  codDepartamento: "",
  nombreDepartamento: "",
  codMunicipio: "",
  nombreMunicipio: "",
};

export function MunicipiosManager() {
  const [municipios, setMunicipios] = useState<Municipio[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [encabezadosFacturacion, setEncabezadosFacturacion] = useState<string[]>([]);
  const [encabezadosRecaudos, setEncabezadosRecaudos] = useState<string[]>([]);
  const [detectingFact, setDetectingFact] = useState(false);
  const [detectingRec, setDetectingRec] = useState(false);
  const fileFactRef = useRef<HTMLInputElement>(null);
  const fileRecRef = useRef<HTMLInputElement>(null);

  const fetchMunicipios = async () => {
    setLoading(true);
    try {
      const res = await axios.get<{ data: Municipio[] }>("/api/municipios");
      setMunicipios(res.data.data);
    } catch {
      setError("Error al cargar municipios. Verifica que el backend esté corriendo.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMunicipios();
  }, []);

  useEffect(() => {
    if (success || error) {
      const timer = setTimeout(() => {
        setSuccess(null);
        setError(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [success, error]);

  const handleChange = (field: keyof FormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const detectHeaders = (file: File, tipo: "facturacion" | "recaudos") => {
    const setDetecting = tipo === "facturacion" ? setDetectingFact : setDetectingRec;
    const setEncabezados = tipo === "facturacion" ? setEncabezadosFacturacion : setEncabezadosRecaudos;
    setDetecting(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json: string[][] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false });
        if (json.length > 0 && json[0].length > 0) {
          const headers = json[0].map(h => (h || "").trim());
          setEncabezados(headers);
          setSuccess(`Detectadas ${headers.length} columnas para ${tipo}`);
        } else {
          setError("El archivo no contiene datos");
        }
      } catch {
        setError("Error al leer el archivo");
      } finally {
        setDetecting(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleCreate = async () => {
    if (!form.codDepartamento || !form.nombreDepartamento || !form.codMunicipio || !form.nombreMunicipio) {
      setError("Todos los campos son requeridos");
      return;
    }
    if (encabezadosFacturacion.length === 0) {
      setError("Debes subir un archivo de facturación para detectar los encabezados");
      return;
    }
    if (encabezadosRecaudos.length === 0) {
      setError("Debes subir un archivo de recaudos para detectar los encabezados");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await axios.post("/api/municipios", {
        codDepartamento: Number(form.codDepartamento),
        nombreDepartamento: form.nombreDepartamento,
        codMunicipio: Number(form.codMunicipio),
        nombreMunicipio: form.nombreMunicipio,
        encabezadosFacturacion,
        encabezadosRecaudos,
      });
      setSuccess("Municipio creado exitosamente");
      setForm(emptyForm);
      setEncabezadosFacturacion([]);
      setEncabezadosRecaudos([]);
      setShowForm(false);
      fetchMunicipios();
    } catch (err: any) {
      setError(err.response?.data?.error || "Error al crear municipio");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (editingId === null) return;
    setSaving(true);
    setError(null);
    try {
      await axios.put(`/api/municipios/${editingId}`, {
        codDepartamento: Number(form.codDepartamento),
        nombreDepartamento: form.nombreDepartamento,
        codMunicipio: Number(form.codMunicipio),
        nombreMunicipio: form.nombreMunicipio,
      });
      setSuccess("Municipio actualizado exitosamente");
      setEditingId(null);
      setForm(emptyForm);
      fetchMunicipios();
    } catch (err: any) {
      setError(err.response?.data?.error || "Error al actualizar municipio");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (m: Municipio) => {
    setEditingId(m.id);
    setShowForm(false);
    setForm({
      codDepartamento: String(m.codDepartamento),
      nombreDepartamento: m.nombreDepartamento,
      codMunicipio: String(m.codMunicipio),
      nombreMunicipio: m.nombreMunicipio,
    });
  };

  const handleDelete = async (id: number) => {
    if (!confirm("¿Estás seguro de eliminar este municipio?")) return;
    try {
      await axios.delete(`/api/municipios/${id}`);
      setSuccess("Municipio eliminado");
      fetchMunicipios();
    } catch (err: any) {
      setError(err.response?.data?.error || "Error al eliminar municipio");
    }
  };

  const handleToggleActive = async (m: Municipio) => {
    try {
      await axios.put(`/api/municipios/${m.id}`, { activo: !m.activo });
      fetchMunicipios();
    } catch {
      setError("Error al cambiar estado");
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setShowForm(false);
    setForm(emptyForm);
    setEncabezadosFacturacion([]);
    setEncabezadosRecaudos([]);
    if (fileFactRef.current) fileFactRef.current.value = "";
    if (fileRecRef.current) fileRecRef.current.value = "";
  };

  const renderForm = (isEditing: boolean) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        {isEditing ? "Editar Municipio" : "Nuevo Municipio"}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Código Departamento
          </label>
          <input
            type="number"
            value={form.codDepartamento}
            onChange={(e) => handleChange("codDepartamento", e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Ej: 5"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nombre Departamento
          </label>
          <input
            type="text"
            value={form.nombreDepartamento}
            onChange={(e) => handleChange("nombreDepartamento", e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Ej: Antioquia"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Código Municipio
          </label>
          <input
            type="number"
            value={form.codMunicipio}
            onChange={(e) => handleChange("codMunicipio", e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Ej: 45"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nombre Municipio
          </label>
          <input
            type="text"
            value={form.nombreMunicipio}
            onChange={(e) => handleChange("nombreMunicipio", e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Ej: Apartadó"
          />
        </div>
      </div>

      {/* Encabezados section - solo en creación */}
      {!isEditing && (
        <div className="border-t border-gray-200 pt-4 mt-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Configuración de columnas (sube un archivo de ejemplo)</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Facturación */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Archivo Facturación
              </label>
              <div className="flex gap-2">
                <input
                  ref={fileFactRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) detectHeaders(file, "facturacion");
                  }}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileFactRef.current?.click()}
                  disabled={detectingFact}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors border-2 border-dashed ${
                    encabezadosFacturacion.length > 0
                      ? "border-green-300 bg-green-50 text-green-700"
                      : "border-gray-300 bg-gray-50 text-gray-600 hover:border-indigo-300 hover:bg-indigo-50"
                  } disabled:opacity-50`}
                >
                  {detectingFact ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Leyendo...</>
                  ) : encabezadosFacturacion.length > 0 ? (
                    <><CheckCircle2 className="w-4 h-4" /> {encabezadosFacturacion.length} columnas detectadas</>
                  ) : (
                    <><FileSpreadsheet className="w-4 h-4" /> Subir archivo de ejemplo</>
                  )}
                </button>
              </div>
              {encabezadosFacturacion.length > 0 && (
                <div className="mt-2 max-h-32 overflow-y-auto bg-gray-50 rounded-lg border border-gray-200 p-2">
                  <div className="flex flex-wrap gap-1">
                    {encabezadosFacturacion.map((h, i) => (
                      <span key={i} className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-xs font-mono">
                        {h}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {/* Recaudos */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Archivo Recaudos
              </label>
              <div className="flex gap-2">
                <input
                  ref={fileRecRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) detectHeaders(file, "recaudos");
                  }}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileRecRef.current?.click()}
                  disabled={detectingRec}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors border-2 border-dashed ${
                    encabezadosRecaudos.length > 0
                      ? "border-green-300 bg-green-50 text-green-700"
                      : "border-gray-300 bg-gray-50 text-gray-600 hover:border-indigo-300 hover:bg-indigo-50"
                  } disabled:opacity-50`}
                >
                  {detectingRec ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Leyendo...</>
                  ) : encabezadosRecaudos.length > 0 ? (
                    <><CheckCircle2 className="w-4 h-4" /> {encabezadosRecaudos.length} columnas detectadas</>
                  ) : (
                    <><FileSpreadsheet className="w-4 h-4" /> Subir archivo de ejemplo</>
                  )}
                </button>
              </div>
              {encabezadosRecaudos.length > 0 && (
                <div className="mt-2 max-h-32 overflow-y-auto bg-gray-50 rounded-lg border border-gray-200 p-2">
                  <div className="flex flex-wrap gap-1">
                    {encabezadosRecaudos.map((h, i) => (
                      <span key={i} className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-mono">
                        {h}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-2 mt-4">
        <button
          onClick={isEditing ? handleUpdate : handleCreate}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium text-sm transition-colors"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {saving ? "Guardando..." : isEditing ? "Actualizar" : "Crear"}
        </button>
        <button
          onClick={cancelEdit}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium text-sm transition-colors"
        >
          <X className="w-4 h-4" />
          Cancelar
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header + Add Button */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <MapPin className="w-5 h-5 text-indigo-600" />
          Gestión de Municipios
        </h2>
        {!showForm && editingId === null && (
          <button
            onClick={() => {
              setShowForm(true);
              setForm(emptyForm);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium text-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nuevo Municipio
          </button>
        )}
      </div>

      {/* Messages */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-green-600" />
          <span className="text-sm text-green-700">{success}</span>
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600" />
          <span className="text-sm text-red-700">{error}</span>
        </div>
      )}

      {/* Create Form */}
      {showForm && renderForm(false)}

      {/* Edit Form */}
      {editingId !== null && renderForm(true)}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center p-8 text-gray-500">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          Cargando municipios...
        </div>
      )}

      {/* Table */}
      {!loading && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {municipios.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No hay municipios registrados. Crea el primero con el botón "Nuevo Municipio".
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Cód. Depto.
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Departamento
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Cód. Mpio.
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Municipio
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Estado
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {municipios.map((m) => (
                    <tr
                      key={m.id}
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td className="px-4 py-3 font-mono text-gray-700">
                        {m.codDepartamento}
                      </td>
                      <td className="px-4 py-3 text-gray-900">
                        {m.nombreDepartamento}
                      </td>
                      <td className="px-4 py-3 font-mono text-gray-700">
                        {m.codMunicipio}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {m.nombreMunicipio}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleToggleActive(m)}
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            m.activo
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {m.activo ? "Activo" : "Inactivo"}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleEdit(m)}
                            className="p-1.5 rounded-lg text-gray-500 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                            title="Editar"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(m.id)}
                            className="p-1.5 rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
