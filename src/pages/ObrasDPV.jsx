import React, { useState, useEffect, useCallback } from "react";
import {
  BarChart2,
  Pencil,
  Trash2,
  ArrowRightCircle,
  AlertOctagon,
} from "lucide-react";
import Swal from "sweetalert2";
import "../styles/Obras.css";
import Header from "./Header";
import Footer from "./Footer";
import NuevaObra from "./NuevaObra";
import ModalAvances from "./ModalAvances";
import { usePermissions } from "../utils/authUtils";
// URL base de tu API (usando variables de entorno, buena práctica)
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const ESTADOS_OBRA = {
  Ejecución: 1,
  Finalizada: 2,
};

//FUNCIÓN AUXILIAR PARA OBTENER TOKEN
const getToken = () => localStorage.getItem("authToken");
export default function Obras({ userName, onLogout }) {
  const { hasPermission, isFullAdmin } = usePermissions();
  const canEdit = isFullAdmin || hasPermission("OBRAS_EDITAR"); // Permite Crear, Editar, Eliminar, Cambiar Estado
  const canView = canEdit || hasPermission("OBRAS_VER"); // Permite ver la grilla
  const [obras, setObras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // ESTADOS PARA DATOS MAESTROS DE FILTROS
  const [zonasMaestras, setZonasMaestras] = useState([]);
  const [tiposObraMaestros, setTiposObraMaestros] = useState([]);
  const [seccionalesMaestras, setSeccionalesMaestras] = useState([]);
  const [departamentosMaestros, setDepartamentosMaestros] = useState([]);
  const [estadoFiltro, setEstadoFiltro] = useState(null);
  const [filtros, setFiltros] = useState({
    nombre: "",
    tipo: 0,
    zona: 0,
    seccional: 0,
  });
  const [mostrarNuevaObra, setMostrarNuevaObra] = useState(false);
  const [mostrarAvances, setMostrarAvances] = useState(false);
  const [obraSeleccionada, setObraSeleccionada] = useState(null);
  // --- FUNCIONES DE AYUDA (Mantenidas) ---
  const getNombre = (id, lista, idKey, nombreKey) => {
    const item = lista.find((item) => item[idKey] === id);
    return item ? item[nombreKey] : "N/D";
  };
  const getDepartamentoNombre = (obra) => {
    return "N/D (Multiselección)";
  };
  const getEstadoLegible = (estado) => {
    if (typeof estado === "number") {
      return estado === ESTADOS_OBRA["Finalizada"] ? "Finalizada" : "Ejecución";
    }
    return estado || "N/A";
  };
  const getAvancePromedio = (tareas) => {
    if (!tareas || tareas.length === 0) {
      return 0;
    }
    const sumaAvances = tareas.reduce(
      (acc, tarea) => acc + tarea.avanceTotal,
      0
    );
    const promedio = sumaAvances / tareas.length;
    return Math.round(promedio);
  };

  // FUNCIÓN AUXILIAR PARA OBTENER TODOS LOS EQUIPOS ÚNICOS DE UNA OBRA
  const getEquiposUnicos = (tareas) => {
    if (!tareas || tareas.length === 0) {
      return [];
    }

    // 1. Obtener todos los equipos de todas las tareas (aplanar)
    const todosLosEquipos = tareas.flatMap((tarea) => tarea.equipos || []);

    // 2. Crear un Map para almacenar equipos únicos por su ID
    const equiposUnicosMap = new Map();

    todosLosEquipos.forEach((equipo) => {
      // Asumiendo que el DTO de Equipo tiene idEquipo y nombre (o codigo)
      if (equipo && equipo.idEquipo) {
        equiposUnicosMap.set(equipo.idEquipo, equipo);
      }
    });

    // 3. Devolver la lista de valores únicos
    return Array.from(equiposUnicosMap.values());
  };

  //FUNCIÓN PRINCIPAL DE CARGA (CORREGIDA)
  const fetchObras = async () => {
    setLoading(true);
    const token = getToken();

    // 1. CHEQUEO DE AUTENTICACIÓN
    if (!token) {
      setError("Error de autenticación. Por favor, inicie sesión nuevamente.");
      setLoading(false);
      return;
    }
    const authHeader = { Authorization: `Bearer ${token}` };
    try {
      const [obrasRes, zonasRes, tiposRes, seccionalesRes, deptoRes] =
        await Promise.all([
          //CORRECCIÓN 1: Única llamada a ObraProyecto con AUTH
          fetch(`${API_BASE_URL}/obras`, { headers: authHeader }),
          fetch(`${API_BASE_URL}/Zona`, { headers: authHeader }),
          fetch(`${API_BASE_URL}/TipoObraProyecto`, { headers: authHeader }),
          fetch(`${API_BASE_URL}/Seccional`, { headers: authHeader }),
          fetch(`${API_BASE_URL}/Departamento`, { headers: authHeader }),
        ]);

      if (obrasRes.ok) {
        setObras(await obrasRes.json());
      } else {
        // CORRECCIÓN 1: Manejo de errores 401/403
        if (obrasRes.status === 401 || obrasRes.status === 403) {
          const errorBody = await obrasRes
            .json()
            .catch(() => ({ message: "Acceso denegado o sesión expirada." }));
          throw new Error(
            errorBody.message || `Acceso denegado. Código: ${obrasRes.status}.`
          );
        }
        throw new Error("Fallo al obtener la lista de obras.");
      }

      // Cargar Catálogos para filtros y mapeo de grilla
      if (zonasRes.ok) setZonasMaestras(await zonasRes.json());
      if (tiposRes.ok) setTiposObraMaestros(await tiposRes.json());
      if (seccionalesRes.ok)
        setSeccionalesMaestras(await seccionalesRes.json());
      if (deptoRes.ok) setDepartamentosMaestros(await deptoRes.json());

      setError(null);
    } catch (err) {
      console.error("Fallo al obtener datos:", err);
      setError(
        err.message ||
          "No se pudieron cargar los datos principales. Asegúrate de que el backend esté corriendo."
      );
      setObras([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Solo carga si tiene permiso de vista.
    if (canView) {
      fetchObras();
    } else {
      setLoading(false);
    }
  }, [canView]);

  const handleGuardarObra = async (nuevaObraData, selectedDepartamentos) => {
    if (!canEdit) {
      Swal.fire(
        "Acceso Denegado",
        "No tienes permiso para crear o editar obras.",
        "error"
      );
      return;
    }
    const token = getToken(); // Obtener token aquí
    const authHeaders = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    }; // ✅ Headers con token

    const isEditing =
      nuevaObraData.idObraProyecto && nuevaObraData.idObraProyecto !== 0;
    const method = isEditing ? "PUT" : "POST";
    const urlObra = isEditing
      ? `${API_BASE_URL}/ObraProyecto/${nuevaObraData.idObraProyecto}`
      : `${API_BASE_URL}/ObraProyecto`;

    let obraGuardadaId = nuevaObraData.idObraProyecto;
    try {
      const obraResponse = await fetch(urlObra, {
        method: method,
        headers: authHeaders,
        body: JSON.stringify(nuevaObraData),
      });
      if (!obraResponse.ok) {
        const errorDetail = await obraResponse
          .json()
          .catch(() => ({ message: "Error al guardar la Obra principal." }));
        throw new Error(
          errorDetail.message ||
            `Error ${obraResponse.status}: Obra principal falló.`
        );
      }
      // Obtener ID si es POST
      if (method === "POST") {
        const newObraResponse = await obraResponse.json();
        if (!newObraResponse?.idObraProyecto) {
          throw new Error(
            "La respuesta del servidor al crear la obra no incluyó un ID válido."
          );
        }
        obraGuardadaId = newObraResponse.idObraProyecto;
      }
      // --- 2. ASIGNAR DEPARTAMENTOS ---
      if (selectedDepartamentos && obraGuardadaId) {
        const deptoData = {
          idObraProyecto: obraGuardadaId,
          departamentoIds: selectedDepartamentos,
        };
        const deptoResponse = await fetch(
          `${API_BASE_URL}/AsignacionDepartamentoObra/Asignar`,
          {
            method: "POST",
            headers: authHeaders,
            body: JSON.stringify(deptoData),
          }
        );
        if (!deptoResponse.ok) {
          const errorBody = await deptoResponse
            .json()
            .catch(() => ({ message: `Error ${deptoResponse.status}` }));
          throw new Error(
            `Error al asignar Departamentos: ${errorBody.message}`
          );
        }
      }
      // --- 3. PASO FINAL ---
      setMostrarNuevaObra(false);
      await Swal.fire(
        "¡Éxito!",
        `La obra fue ${isEditing ? "actualizada" : "creada"} correctamente.`,
        "success"
      );
      await fetchObras();
      if (!isEditing && obraGuardadaId) {
        setObraSeleccionada({ idObraProyecto: obraGuardadaId });
        setMostrarAvances(true);
      }
    } catch (error) {
      console.error("Error crítico al guardar/asignar:", error);
      Swal.fire("Error", `No se pudo guardar: ${error.message}`, "error");
    }
  };
  // --- MANEJADORES DE ACCIONES (DELETE y PUT para Estado) ---
  const handleEliminar = (id) => {
    //PRE-VERIFICACIÓN DE PERMISOS
    if (!canEdit) {
      Swal.fire(
        "Acceso Denegado",
        "No tienes permiso para eliminar obras.",
        "error"
      );
      return;
    }
    Swal.fire({
      title: "¿Estás seguro?",
      text: "Esta acción eliminará la obra seleccionada.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
    }).then(async (result) => {
      const token = getToken();
      if (result.isConfirmed) {
        try {
          const response = await fetch(`${API_BASE_URL}/ObraProyecto/${id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!response.ok) {
            throw new Error(
              `Error ${response.status} al eliminar en el servidor.`
            );
          }
          fetchObras();
          Swal.fire("Eliminada", "La obra ha sido eliminada.", "success");
        } catch (error) {
          Swal.fire(
            "Error",
            `No se pudo eliminar la obra: ${error.message}`,
            "error"
          );
        }
      }
    });
  };
  const handleCambiarEstado = (obra) => {
    if (!canEdit) {
      Swal.fire(
        "Acceso Denegado",
        "No tienes permiso para cambiar el estado de las obras.",
        "error"
      );
      return;
    }
    // --- NUEVA VALIDACIÓN PREVENTIVA ---
    const monto = parseFloat(obra.montoContratado) || 0;
    const vaAFinalizar = obra.estadoObra !== "Finalizada";

    if (vaAFinalizar && monto <= 0) {
      Swal.fire(
        "Monto Requerido",
        "No se puede finalizar la obra. El Monto debe ser mayor a cero.",
        "warning"
      );
      return;
    }
    const token = getToken();
    const authHeaders = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
    const estadoActualEsActivo =
      obra.estadoObra &&
      (obra.estadoObra.includes("Ejecución") ||
        obra.estadoObra.includes("N/A") ||
        obra.estadoObra === "N/A");
    const nuevoEstadoNombre = estadoActualEsActivo ? "Finalizada" : "Ejecución";
    const nuevoEstadoId = estadoActualEsActivo
      ? ESTADOS_OBRA["Finalizada"]
      : ESTADOS_OBRA["Ejecución"];
    Swal.fire({
      title: "¿Cambiar estado?",
      text: `¿Deseás pasar esta obra a ${nuevoEstadoNombre}?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Sí, cambiar",
      cancelButtonText: "Cancelar",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const response = await fetch(
            `${API_BASE_URL}/ObraProyecto/${obra.idObraProyecto}/estado`,
            {
              method: "PUT",
              headers: authHeaders,
              body: JSON.stringify(nuevoEstadoId),
            }
          );
          if (!response.ok) {
            let errorMsg = `Error ${response.status} al actualizar el estado.`;
            try {
              const errorBody = await response.json();
              errorMsg = errorBody.message || errorMsg;
            } catch (e) {}
            throw new Error(errorMsg);
          }
          fetchObras();
          Swal.fire(
            "Actualizado",
            `El estado fue cambiado a ${nuevoEstadoNombre}.`,
            "success"
          );
        } catch (error) {
          Swal.fire(
            "Error",
            `No se pudo cambiar el estado: ${error.message}`,
            "error"
          );
        }
      }
    });
  };

  // --- LÓGICA DE FILTRADO DINÁMICO (Mantenida) ---
  const obrasFiltradas = obras.filter((obra) => {
    const filtroNombre = filtros.nombre.toLowerCase();
    const filtroTipo = parseInt(filtros.tipo);
    const filtroZona = parseInt(filtros.zona);
    const filtroSeccional = parseInt(filtros.seccional);
    const coincideNombre = obra.nombreObra.toLowerCase().includes(filtroNombre);
    const coincideTipo =
      filtroTipo === 0 || isNaN(filtroTipo)
        ? true
        : obra.idTipoObraProyecto === filtroTipo;
    const coincideZona =
      filtroZona === 0 || isNaN(filtroZona) ? true : obra.idZona === filtroZona;
    const coincideSeccional =
      filtroSeccional === 0 || isNaN(filtroSeccional)
        ? true
        : obra.idSeccional === filtroSeccional;
    const coincideEstado = estadoFiltro
      ? obra.estadoObra === estadoFiltro
      : true;
    return (
      coincideNombre &&
      coincideTipo &&
      coincideZona &&
      coincideSeccional &&
      coincideEstado
    );
  });

  // --- CÁLCULO DE CONTADORES ---
  const obrasEnEjecucionCount = obras.filter(
    (obra) => obra.estadoObra !== "Finalizada"
  ).length;
  const obrasFinalizadasCount = obras.filter(
    (obra) => obra.estadoObra === "Finalizada"
  ).length;
  // --- LIMPIAR FILTROS (Mantenida) ---
  const limpiarFiltros = () => {
    setFiltros({ nombre: "", tipo: 0, zona: 0, seccional: 0 });
    setEstadoFiltro(null);
  };
  // --- ABRIR MODALES (Mantenida) ---
  const handleEditar = (obra) => {
    setObraSeleccionada(obra);
    setMostrarNuevaObra(true);
  };
  const handleAvances = (obra) => {
    setObraSeleccionada(obra);
    setMostrarAvances(true);
  };
  // --- RENDERING PRINCIPAL ---
  // Acceso Denegado (si no tiene ningún permiso de vista)
  if (!canView) {
    return (
      <div className="obras-container">
        <Header nombreUsuario={userName} onLogout={onLogout} />
        <div className="error-message">
          <AlertOctagon
            style={{ marginBottom: "10px" }}
            size={32}
            color="#dc3545"
          />
          **Acceso Denegado:** Tu usuario no tiene permisos para acceder a esta
          sección.
        </div>
        <Footer />
      </div>
    );
  }
  if (loading)
    return <div className="loading-message">Cargando obras... 🔄</div>;
  if (error) return <div className="error-message">Error: {error}</div>;

  return (
    <>
      <Header nombreUsuario={userName} onLogout={onLogout} />
      <div className="obras-container">
        {/* CARDS DE ESTADO QUE FUNCIONAN COMO FILTRO */}
        <div className="estado-cards">
                   {" "}
          <div
            className={`card ejecucion ${
              estadoFiltro === "Ejecución" ? "seleccionada" : ""
            }`}
            onClick={() =>
              setEstadoFiltro(estadoFiltro === "Ejecución" ? null : "Ejecución")
            }
          >
                       {" "}
            <h3>
                            Obras Ejecución              {" "}
              <span className="card-contador">{obrasEnEjecucionCount}</span>   
                     {" "}
            </h3>
                        <p>Ver en curso</p>         {" "}
          </div>{" "}
                   {" "}
          <div
            className={`card finalizadas ${
              estadoFiltro === "Finalizada" ? "seleccionada" : ""
            }`}
            onClick={() =>
              setEstadoFiltro(
                estadoFiltro === "Finalizada" ? null : "Finalizada"
              )
            }
          >
                       {" "}
            <h3>
                            Obras finalizadas              {" "}
              <span className="card-contador">{obrasFinalizadasCount}</span>   
                     {" "}
            </h3>{" "}
                        <p>Ver completadas</p>         {" "}
          </div>
                 {" "}
        </div>
        {/* BOTÓN NUEVA OBRA (Solo si puede editar) */}
        {canEdit && (
          <button
            className="btn-nueva-obra"
            onClick={() => {
              setObraSeleccionada(null);

              setMostrarNuevaObra(true);
            }}
          >
            NUEVA OBRA
          </button>
        )}
        {/* ==== FILTROS DINÁMICOS ==== */}
        <div className="filtros">
          {" "}
          <input
            type="text"
            placeholder="Buscar por nombre..."
            value={filtros.nombre}
            onChange={(e) => setFiltros({ ...filtros, nombre: e.target.value })}
          />{" "}
          <select
            value={filtros.tipo}
            onChange={(e) => setFiltros({ ...filtros, tipo: e.target.value })}
          >
            <option value={0}>-- Filtrar por tipo --</option>
            {tiposObraMaestros.map((tipo) => (
              <option
                key={tipo.idTipoObraProyecto}
                value={tipo.idTipoObraProyecto}
              >
                {tipo.nombreTipoObraProyecto}
              </option>
            ))}{" "}
          </select>
          {/* FILTRO ZONA */}
          <select
            value={filtros.zona}
            onChange={(e) => setFiltros({ ...filtros, zona: e.target.value })}
          >
            <option value={0}>-- Filtrar por zona --</option>
            {zonasMaestras.map((zona) => (
              <option key={zona.idZona} value={zona.idZona}>
                {zona.nombreZona}
              </option>
            ))}{" "}
          </select>
          {/* FILTRO SECCIONAL */}
          <select
            value={filtros.seccional}
            onChange={(e) =>
              setFiltros({ ...filtros, seccional: e.target.value })
            }
          >
            <option value={0}>-- Filtrar por seccional --</option>

            {seccionalesMaestras.map((seccional) => (
              <option key={seccional.idSeccional} value={seccional.idSeccional}>
                {seccional.nombreSeccional}
              </option>
            ))}
          </select>
          <button className="btn-limpiar" onClick={limpiarFiltros}>
            Limpiar
          </button>
        </div>

        {/* ==== TABLA CON SCROLL ==== */}

        <div className="tabla-container">
          <table className="obras-table">
            <thead>
              <tr>
                <th>N°</th>
                <th>Acciones</th>
                <th>Nombre de la Obra</th>
                <th>Tramo</th>
                <th>Zona</th>
                <th>Seccional</th>
                <th>Departamento/s</th>
                <th>Fecha Inicio</th>
                <th>Fecha Fin</th>
                <th>Avance por Tarea</th>
                <th>Equipo/s</th>
                <th>Tareas</th>
                <th>Longitud (km)</th>
                <th>Tipo de Superficie</th>
                <th>Tipo de Obra</th>
                <th>Estado</th>
                <th>Monto</th>
                <th>Observaciones</th>
              </tr>
            </thead>
            <tbody>
              {obrasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan="18" className="no-data-cell">
                    No hay obras que coincidan con los filtros.
                  </td>
                </tr>
              ) : (
                obrasFiltradas.map((obra, index) => (
                  <tr key={obra.idObraProyecto}>
                    <td>{index + 1}</td>
                    {/* COLUMNA DE ACCIONES CON PERMISOS */}
                    <td className="acciones">
                      {/* Avances: Visible si canView es true y no está finalizada */}
                      {canView && obra.estadoObra !== "Finalizada" && (
                        <BarChart2
                          className="icon avance"
                          title="Avances"
                          onClick={() => handleAvances(obra)}
                        />
                      )}
                      {/* Editar (Pencil) - Solo si puede editar (canEdit) */}
                      {canEdit && obra.estadoObra !== "Finalizada" && (
                        <Pencil
                          className="icon editar"
                          title="Editar"
                          onClick={() => handleEditar(obra)}
                        />
                      )}
                      {/* Eliminar (Trash2) - Solo si puede editar (canEdit) */}
                      {canEdit && (
                        <Trash2
                          className="icon eliminar"
                          title="Eliminar"
                          onClick={() => handleEliminar(obra.idObraProyecto)}
                        />
                      )}
                      {/* Cambiar Estado (ArrowRightCircle) - Solo si puede editar (canEdit) */}
                      {canEdit && obra.estadoObra !== "Finalizada" && (
                        <ArrowRightCircle
                          className="icon estado"
                          title="Cambiar Estado"
                          onClick={() => handleCambiarEstado(obra)}
                        />
                      )}
                    </td>
                    {/* Nombre de la Obra (Centrado) */}
                    <td style={{ textAlign: "center", fontWeight: "bold" }}>
                      {obra.nombreObra}
                    </td>
                    {/* Tramo, Zona, Seccional (Centrado) */}
                    <td style={{ textAlign: "center" }}>{obra.tramo}</td>
                    <td style={{ textAlign: "center" }}>{obra.zona}</td>
                    <td style={{ textAlign: "center" }}>{obra.seccional}</td>
                    {/* Departamento/s (Centrado, UNIDO con guion) */}
                    <td style={{ textAlign: "center" }}>
                      {obra.departamentos.length > 0
                        ? obra.departamentos
                            .map((depto) => depto.nombre)
                            .join(" - ")
                        : "N/A"}
                    </td>
                    {/* Fecha Inicio / Fecha Fin (Centrado) */}
                    <td style={{ textAlign: "center" }}>
                      {new Date(obra.fechaInicio).toLocaleDateString()}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      {new Date(obra.fechaFin).toLocaleDateString()}
                    </td>
                    {/* 1. Avance por Tarea  */}
                    <td>
                      {obra.tareas.length > 0
                        ? obra.tareas.map((tarea) => (
                            <span
                              key={tarea.idTarea}
                              className="tag tag-avance"
                            >
                              {tarea.codigo}: {tarea.avanceTotal}%
                            </span>
                          ))
                        : "N/A"}
                    </td>
                    {/* 2. Equipo/s (CORREGIDO: Solo Equipos, Vertical) */}
                    <td>
                      {getEquiposUnicos(obra.tareas).length > 0
                        ? getEquiposUnicos(obra.tareas).map((equipo) => (
                            <span
                              key={equipo.idEquipo}
                              className="tag tag-equipo"
                            >
                              {equipo.codigo}
                            </span>
                          ))
                        : "N/A"}
                    </td>
                    {/* 3. Tareas (CORREGIDO: Código y Nombre de la Tarea, Vertical) */}
                    <td>
                      {obra.tareas.length > 0
                        ? obra.tareas.map((tarea) => (
                            <span
                              key={tarea.idTarea}
                              className="tag tag-tarea"
                              title={tarea.nombre} // Muestra el nombre completo al pasar el mouse
                            >
                              {tarea.nombre}
                            </span>
                          ))
                        : "N/A"}
                    </td>
                    {/* Longitud (km) */}
                    <td style={{ textAlign: "center" }}>{obra.longitud}</td>
                    {/* Tipo de Superficie */}
                    <td style={{ textAlign: "center" }}>
                      {obra.tipoSuperficie}
                    </td>
                    {/* Tipo de Obra */}
                    <td style={{ textAlign: "center" }}>{obra.tipoObra}</td>
                    {/* Estado */}
                    <td style={{ textAlign: "center" }}>
                      <span
                        className={
                          obra.estadoObra === "Finalizada"
                            ? "estado-finalizada"
                            : "estado-ejecucion"
                        }
                      >
                        {obra.estadoObra}
                      </span>
                    </td>
                    {/* Monto */}
                    <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                      {`$ ${parseFloat(
                        obra.montoContratado || 0
                      ).toLocaleString("es-AR")}`}
                    </td>
                    {/* Observaciones */}
                    <td>{obra.observaciones}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      <Footer />
      {/* MODALES */}
      {mostrarNuevaObra && (
        <div className="modal-overlay">
          <NuevaObra
            obra={obraSeleccionada}
            onClose={() => setMostrarNuevaObra(false)}
            onSave={handleGuardarObra}
          />
        </div>
      )}
      {mostrarAvances && (
        <div className="modal-overlay">
          <div className="modal-nueva-obra">
            <ModalAvances
              obra={obraSeleccionada}
              onClose={(didSave) => {
                setMostrarAvances(false);
                if (didSave) {
                  fetchObras();
                  Swal.fire(
                    "Éxito",
                    "Avance registrado correctamente.",
                    "success"
                  );
                }
              }}
            />
          </div>
        </div>
      )}
    </>
  );
}
