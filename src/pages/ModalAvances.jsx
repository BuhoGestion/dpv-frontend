import React, { useState, useEffect } from "react";
import Swal from "sweetalert2";
import "../styles/ModalAvances.css";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const getToken = () => sessionStorage.getItem("authToken");

const formatDate = (dateString) => {
  if (!dateString || dateString === "0001-01-01T00:00:00") return "Sin fecha";
  try {
    const date = new Date(dateString);
    const day = date.getUTCDate().toString().padStart(2, "0");
    const month = (date.getUTCMonth() + 1).toString().padStart(2, "0");
    const year = date.getUTCFullYear();
    return `${day}/${month}/${year}`;
  } catch (e) {
    return dateString;
  }
};

export default function ModalAvances({ obra: obraInicial, onClose }) {
  const [obraCompleta, setObraCompleta] = useState(null);
  const [loadingObra, setLoadingObra] = useState(true);
  const [tareasMaestras, setTareasMaestras] = useState([]);
  const [todosLosEquipos, setTodosLosEquipos] = useState([]);
  const [loadingCatalogos, setLoadingCatalogos] = useState(true);

  const [nuevoAvance, setNuevoAvance] = useState({
    idTarea: 0,
    porcentaje: "",
    fecha: new Date().toISOString().split("T")[0],
    observacion: "",
  });
  const [selectedEquipos, setSelectedEquipos] = useState([]);
  const [filtroEquipo, setFiltroEquipo] = useState("");

  // --- EFECTO 1: Cargar Obra (Y TAREAS DETALLADAS) ---
  useEffect(() => {
    const fetchObraCompleta = async () => {
      if (!obraInicial?.idObraProyecto) {
        setLoadingObra(false);
        return;
      }
      const token = getToken();
      if (!token) {
        Swal.fire("Error", "Sesión expirada.", "error");
        setLoadingObra(false);
        return;
      }

      setLoadingObra(true);
      try {
        const authHeader = {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        };

        // 1. Cargar la Obra General
        const response = await fetch(
          `${API_BASE_URL}/ObraProyecto/${obraInicial.idObraProyecto}`,
          { headers: authHeader }
        );

        if (!response.ok) throw new Error("No se pudo cargar la obra.");
        const data = await response.json();

        // 2. (IMPORTANTE) Cargar Tareas usando el endpoint NUEVO que arreglamos
        // Esto trae los 'equipos' y 'ultimaFecha' limpios
        try {
          const resTareas = await fetch(
            `${API_BASE_URL}/AvanceTareaObraProyecto/Obra/${obraInicial.idObraProyecto}`,
            { headers: authHeader }
          );
          if (resTareas.ok) {
            const tareasData = await resTareas.json();
            // Sobrescribimos las tareas con la versión corregida
            data.tareas = tareasData;
          }
        } catch (e) {
          console.warn("Usando datos base de tareas (sin detalles extra)");
        }

        setObraCompleta(data);
      } catch (err) {
        console.error("Error al cargar obra:", err);
        Swal.fire(
          "Error",
          `No se pudo cargar la obra: ${err.message}`,
          "error"
        );
      } finally {
        setLoadingObra(false);
      }
    };
    fetchObraCompleta();
  }, [obraInicial?.idObraProyecto]);

  // --- EFECTO 2: Cargar Catálogos ---
  useEffect(() => {
    const fetchCatalogos = async () => {
      setLoadingCatalogos(true);
      const token = getToken();
      const authHeader = { Authorization: `Bearer ${token}` };
      try {
        const tareasRes = await fetch(`${API_BASE_URL}/Tarea`, {
          headers: authHeader,
        });
        if (tareasRes.ok) setTareasMaestras(await tareasRes.json());

        const equiposRes = await fetch(`${API_BASE_URL}/Equipo`, {
          headers: authHeader,
        });
        if (equiposRes.ok) setTodosLosEquipos(await equiposRes.json());
        else setTodosLosEquipos([]);
      } catch (err) {
        console.error("Error catálogos:", err);
      } finally {
        setLoadingCatalogos(false);
      }
    };

    if (obraCompleta && !loadingObra) fetchCatalogos();
  }, [obraCompleta, loadingObra]);

  // --- EFECTO 3: Cerrar con ESC ---
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") onClose(false);
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  // --- HANDLERS ---
  const handleChange = (e) => {
    const { name, value } = e.target;
    const finalValue =
      name === "idTarea" || name === "porcentaje"
        ? parseInt(value) || 0
        : value;
    setNuevoAvance((prev) => ({ ...prev, [name]: finalValue }));
  };

  const handleToggleEquipo = (equipoId) => {
    setSelectedEquipos((prev) =>
      prev.includes(equipoId)
        ? prev.filter((id) => id !== equipoId)
        : [...prev, equipoId]
    );
  };

  // --- (DESCOMENTADO Y CORREGIDO) Handler Eliminar ---
  const handleEliminarFilaCompleta = async (idTarea) => {
    const idObra = obraCompleta?.idObraProyecto;

    if (!idObra) return;

    const result = await Swal.fire({
      title: "¿Eliminar fila?",
      text: "Se borrará la tarea y sus avances de esta obra.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Eliminar",
      cancelButtonText: "Cancelar",
    });

    if (result.isConfirmed) {
      try {
        const token = getToken();
        // Llamada al endpoint DELETE
        const url = `${API_BASE_URL}/AvanceTareaObraProyecto/Eliminar/${idObra}/${idTarea}`;

        const response = await fetch(url, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) throw new Error("No se pudo eliminar.");

        await Swal.fire("Eliminado", "La tarea ha sido eliminada.", "success");
        // Cerrar modal retornando true para refrescar la lista principal
        onClose(true);
      } catch (error) {
        Swal.fire("Error", error.message, "error");
      }
    }
  };

  const handleAgregarAvance = async (e) => {
    e.preventDefault();
    if (
      !nuevoAvance.idTarea ||
      nuevoAvance.porcentaje === "" ||
      nuevoAvance.porcentaje < 0 ||
      nuevoAvance.porcentaje > 100
    ) {
      Swal.fire("Atención", "Datos inválidos.", "warning");
      return;
    }
    if (!obraCompleta) return;

    const token = getToken();
    const avanceParaGuardar = {
      porcentajeAvance: nuevoAvance.porcentaje,
      fecha: nuevoAvance.fecha,
      observacion: nuevoAvance.observacion,
      idObraProyecto: obraCompleta.idObraProyecto,
      idTarea: nuevoAvance.idTarea,
      equipoIds: selectedEquipos,
    };

    try {
      const response = await fetch(`${API_BASE_URL}/AvanceTareaObraProyecto`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(avanceParaGuardar),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody.message || "Error al guardar.");
      }
      onClose(true);
    } catch (error) {
      Swal.fire("Error", error.message, "error");
    }
  };

  const handleCerrar = () => onClose(false);

  const equiposFiltrados = todosLosEquipos.filter((equipo) => {
    const codigo = equipo.codigoEquipo?.toLowerCase() || "";
    const nombre = equipo.nombreEquipo?.toLowerCase() || "";
    const filtro = filtroEquipo.toLowerCase().trim();
    return codigo.includes(filtro) || nombre.includes(filtro);
  });

  // --- RENDER ---
  if (loadingObra || loadingCatalogos) {
    return (
      <div className="modal-content-avances">
        <div className="modal-header">
          <h2>Cargando...</h2>
        </div>
      </div>
    );
  }

  if (!obraCompleta) return null;

  const tareasAsignadas = obraCompleta.tareas || [];

  return (
    <div className="modal-content-avances">
      <div className="modal-body-avances">
        <h3>Obra: {obraCompleta.nombreObra}</h3>
        <h4>Zona: {obraCompleta.zona}</h4>

        <table className="tabla-avances">
          <thead>
            <tr>
              <th>Tarea (Código)</th>
              <th>Nombre</th>
              <th>Equipos Asignados</th>
              <th>Último Avance</th>
              <th>Avance Total (%)</th>
              <th style={{ textAlign: "center" }}>Acción</th>
            </tr>
          </thead>
          <tbody>
            {tareasAsignadas.length > 0 ? (
              tareasAsignadas.map((tarea) => {
                // --- VISUALIZACIÓN CORREGIDA ---
                // Leemos directamente del array 'equipos' que viene del Back nuevo
                let equiposTexto = "Sin Equipos";
                if (tarea.equipos && tarea.equipos.length > 0) {
                  equiposTexto = tarea.equipos
                    .map((e) => `${e.codigo || "S/C"} - ${e.nombre || ""}`)
                    .join(", ");
                }

                // Leemos 'ultimaFecha' que viene del back
                const fechaMostrar =
                  tarea.ultimaFecha || tarea.fechaAvance || tarea.fecha;

                return (
                  <tr key={tarea.idTarea}>
                    <td>{tarea.codigoTarea || tarea.codigo}</td>
                    <td>{tarea.nombreTarea || tarea.nombre}</td>
                    <td
                      style={{
                        fontSize: "0.85em",
                        maxWidth: "200px",
                        wordBreak: "break-all",
                      }}
                    >
                      {equiposTexto}
                    </td>
                    <td>{formatDate(fechaMostrar)}</td>
                    <td>
                      <strong>{tarea.avanceTotal || 0}%</strong>
                    </td>

                    {/* BOTÓN ELIMINAR (Descomentado) */}
                    <td style={{ textAlign: "center" }}>
                      <button
                        type="button"
                        onClick={() =>
                          handleEliminarFilaCompleta(tarea.idTarea)
                        }
                        style={{
                          backgroundColor: "#e74c3c",
                          color: "white",
                          border: "none",
                          borderRadius: "4px",
                          padding: "6px 12px",
                          cursor: "pointer",
                          fontWeight: "bold",
                        }}
                        title="Eliminar tarea y avances"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="6" style={{ textAlign: "center", color: "#777" }}>
                  No hay tareas asignadas
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <h4>Registrar Nuevo Avance / Asignar Tarea y Equipos</h4>

        <form onSubmit={handleAgregarAvance} className="form-avance">
          <div>
            <label>Tarea</label>
            <select
              name="idTarea"
              value={nuevoAvance.idTarea}
              onChange={handleChange}
              required
            >
              <option value={0}>Seleccione una Tarea...</option>
              {tareasMaestras.map((t) => (
                <option key={t.idTarea} value={t.idTarea}>
                  ({t.codigoTarea}) {t.nombreTarea}
                </option>
              ))}
            </select>
          </div>

          <div className="select-multiple-container">
            <label>Equipos a asignar a esta Tarea (Selección Global)</label>
            <input
              type="text"
              placeholder="Buscar por código o nombre..."
              value={filtroEquipo}
              onChange={(e) => setFiltroEquipo(e.target.value)}
              style={{
                marginBottom: "8px",
                padding: "8px",
                width: "100%",
                boxSizing: "border-box",
              }}
            />
            <div
              className="equipment-list"
              style={{
                border: "1px solid #ccc",
                borderRadius: "4px",
                padding: "8px",
              }}
            >
              {equiposFiltrados.length === 0 ? (
                <p style={{ color: "#aaa" }}>No se encontraron equipos.</p>
              ) : (
                equiposFiltrados.map((equipo) => {
                  const isSelected = selectedEquipos.includes(equipo.idEquipo);
                  return (
                    <div
                      key={equipo.idEquipo}
                      className={`equipment-item ${
                        isSelected ? "selected" : ""
                      }`}
                      onClick={() => handleToggleEquipo(equipo.idEquipo)}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        readOnly
                        style={{ marginRight: "8px" }}
                      />
                      <span>
                        {equipo.codigoEquipo} - {equipo.nombreEquipo}
                      </span>
                      <span
                        style={{
                          marginLeft: "auto",
                          fontWeight: "bold",
                          color: "blue",
                          fontSize: "12px",
                        }}
                      >
                        (Disponible)
                      </span>
                    </div>
                  );
                })
              )}
            </div>
            {selectedEquipos.length > 0 && (
              <p className="selected-count">{selectedEquipos.length} equipos</p>
            )}
          </div>

          <div>
            <label>Porcentaje de Avance</label>
            <input
              type="number"
              name="porcentaje"
              value={nuevoAvance.porcentaje}
              onChange={handleChange}
              min="0"
              max="100"
              placeholder="Ej: 35"
              required
            />
          </div>

          <div>
            <label>Fecha del Avance</label>
            <input
              type="date"
              name="fecha"
              value={nuevoAvance.fecha}
              onChange={handleChange}
              required
            />
          </div>

          <div>
            <label>Observación (Opcional)</label>
            <textarea
              name="observacion"
              value={nuevoAvance.observacion}
              onChange={handleChange}
              rows="3"
            />
          </div>

          <div className="botones-avance">
            <button type="submit" className="btn-agregar">
              Registrar Avance y Equipos
            </button>
            <button
              type="button"
              onClick={handleCerrar}
              className="btn-guardar"
            >
              Cerrar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
