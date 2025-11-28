import React, { useState, useEffect, useMemo } from "react";
import Swal from "sweetalert2";
import "../styles/NuevaObra.css";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const getToken = () => localStorage.getItem("authToken");
export default function NuevaObra({ obra, onClose, onSave }) {
  // ESTADOS
  const [zonas, setZonas] = useState([]);
  const [seccionalesMaestras, setSeccionalesMaestras] = useState([]);
  const [tiposObra, setTiposObra] = useState([]);
  const [departamentos, setDepartamentos] = useState([]);
  const [loadingCatalogos, setLoadingCatalogos] = useState(true);
  const [selectedDepartamentos, setSelectedDepartamentos] = useState([]);

  // --- Detección de Modo Edición ---
  const isEditing = obra?.idObraProyecto > 0;
  // ------------------------------------

  // --- ESTADO PRINCIPAL DEL FORMULARIO ---
  const [form, setForm] = useState({
    idObraProyecto: obra?.idObraProyecto ?? 0,
    idTipoObraProyecto: obra?.idTipoObraProyecto ?? 0,
    idSeccional: obra?.idSeccional ?? 0,
    zona: obra?.idZona ?? 0, // <-- idZona se usa como el valor del select de Zona

    // Campos de texto y número
    calleRuta: obra?.nombreObra ?? "",
    tramoObra: obra?.tramo ?? "",
    montoContrato: obra?.montoContratado?.toString() ?? "",
    observacion: obra?.observaciones ?? "",
    longitud: obra?.longitud?.toString() ?? "",

    // Fechas
    fechaInicioObraProyecto: obra?.fechaInicio?.split("T")[0] ?? "",
    fechaFinObraProyecto: obra?.fechaFin?.split("T")[0] ?? "",

    // Superficie
    tipoSuperficieObra: obra?.tipoSuperficie ?? "",
  });
  // ------------------------------------

  // Efecto para cargar deptos seleccionados al editar
  useEffect(() => {
    if (isEditing && obra.departamentos && obra.departamentos.length > 0) {
      const idsDepartamentosActuales = obra.departamentos.map(
        (d) => d.idDepartamento
      );
      setSelectedDepartamentos(idsDepartamentosActuales);
    } else if (!isEditing) {
      setSelectedDepartamentos([]);
    }
  }, [obra, isEditing]);

  // Carga de Datos Maestros
  useEffect(() => {
    const fetchCatalogos = async () => {
      setLoadingCatalogos(true);
      const token = getToken();
      const authHeaders = { 'Authorization': `Bearer ${token}` };
      try {
        const [zonasRes, seccionalesRes, tiposObraRes, departamentosRes] =
                    await Promise.all([
                        //Usamos el endpoint filtrado con AUTH
                        fetch(`${API_BASE_URL}/Zona/filtradas`, { headers: authHeaders }),
                        // AUTH en los demás catálogos si están protegidos
                        fetch(`${API_BASE_URL}/Seccional`, { headers: authHeaders }),
                        fetch(`${API_BASE_URL}/TipoObraProyecto`, { headers: authHeaders }),
                        fetch(`${API_BASE_URL}/Departamento`, { headers: authHeaders }),
                    ]);

        if (!zonasRes.ok) throw new Error("Fallo al cargar Zonas");
        if (!seccionalesRes.ok) throw new Error("Fallo al cargar Seccionales");
        if (!tiposObraRes.ok) throw new Error("Fallo al cargar Tipos de Obra");
        if (!departamentosRes.ok)
          throw new Error("Fallo al cargar Departamentos");

      const zonasData = await zonasRes.json();   
      setZonas(zonasData);
      setSeccionalesMaestras(await seccionalesRes.json());
      setTiposObra(await tiposObraRes.json());
      setDepartamentos(await departamentosRes.json());
      // ✅ CAMBIO 2: Si el usuario restringido solo ve una zona, forzar la selección.
      if (zonasData.length === 1 && form.zona === 0) {
          setForm(prev => ({ ...prev, zona: zonasData[0].idZona }));
      }
      } catch (err) {
          console.error("Error cargando catálogos:", err);
          Swal.fire("Error", `No se pudo cargar: ${err.message}. Asegúrese que el token JWT es válido.`, "error");
      } finally {
          setLoadingCatalogos(false);
      }
    };
    fetchCatalogos();
    }, [isEditing]);

  // LÓGICA DE CASCADA: Filtrar Seccionales
  const seccionalesFiltradas = useMemo(() => {
    if (!form.zona) {
      return [];
    }
    return seccionalesMaestras.filter(
      (seccional) => seccional.idZona === form.zona
    );
  }, [form.zona, seccionalesMaestras]);

  // Cierre con ESC
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  // HANDLERS
  const handleChange = (e) => {
    const { name, value, type } = e.target;

    // Bloquea cambios si está en edición y afecta a Zona/Seccional
    if (isEditing && (name === "zona" || name === "idSeccional")) {
      return; // Ignora la acción si está bloqueado
    }

    let finalValue = value;

    if (name.startsWith("id") || name === "zona") {
      finalValue = parseInt(value) || 0;
    } else if (type === "number") {
      finalValue = value;
    }

    if (name === "zona") {
      setForm((prevForm) => ({
        ...prevForm,
        zona: finalValue,
        idSeccional: 0, // Resetea la seccional
      }));
      return;
    }

    /*if (name === "superficie") {
      setForm((prevForm) => ({
        ...prevForm,
        tipoSuperficieObra: value,
        [name]: value,
      }));
      return;
    }*/

    setForm((prevForm) => ({ ...prevForm, [name]: finalValue }));
  };

  const handleToggleDepartamento = (deptoId) => {
    setSelectedDepartamentos((prev) =>
      prev.includes(deptoId)
        ? prev.filter((id) => id !== deptoId)
        : [...prev, deptoId]
    );
  };

  const mapFormToModel = () => {
    const parseNumber = (val) => {
      if (val === "" || val === null || val === undefined) return null;
      const numericValue = parseFloat(String(val).replace(",", "."));
      return isNaN(numericValue) ? null : numericValue;
    };
    const estadoObraId = obra?.idEstadoObraProyecto ?? 1;

    return {
      idObraProyecto: form.idObraProyecto,
      idTipoObraProyecto: form.idTipoObraProyecto,
      idSeccional: form.idSeccional,
      idEstadoObraProyecto: estadoObraId,
      calleRuta: form.calleRuta,
      tramoObra: form.tramoObra,
      tipoSuperficieObra: form.tipoSuperficieObra,
      observacion: form.observacion,
      fechaInicioObraProyecto: form.fechaInicioObraProyecto || null,
      fechaFinObraProyecto: form.fechaFinObraProyecto || null,
      montoContrato: parseNumber(form.montoContrato),
      longitud: parseNumber(form.longitud),
      idsDepartamentos: [],
      idsTareas: [],
    };
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const swalConfig = {
      target: "body",
      customClass: { container: "swal-high-zindex" },
    };

    if (
      !form.calleRuta ||
      form.idTipoObraProyecto === 0 ||
      form.idSeccional === 0 ||
      selectedDepartamentos.length === 0
    ) {
      Swal.fire({
        ...swalConfig,
        icon: "warning",
        title: "Atención",
        text: "Complete Nombre, Tipo, Zona, Seccional y al menos un Departamento.",
      });
      return;
    }
    const obraParaGuardar = mapFormToModel();
    onSave(obraParaGuardar, selectedDepartamentos);
  };

  // --- RENDER ---
  if (loadingCatalogos) {
    return (
      <div className="modal-content loading">
        <p>Cargando...</p>
      </div>
    );
  }
  const isZonaSelectDisabled = isEditing || zonas.length === 1; 
  return (
    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
      <div className="modal-header">
        <h3>{isEditing ? "Editar Obra" : "Nueva Obra"}</h3>
        <button className="close-button" onClick={onClose}>
          ✕
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Sección Detalles */}
        <h3>Detalles de Obra</h3>

        {/* Nombre/Calle Ruta */}
        <div>
          <label>Nombre de la obra / Calle Ruta</label>
          <input
            type="text"
            name="calleRuta"
            value={form.calleRuta}
            onChange={handleChange}
            required
          />
        </div>

        {/* Tipo Obra */}
        <div>
          <label>Tipo de Obra</label>
          <select
            name="idTipoObraProyecto"
            value={form.idTipoObraProyecto}
            onChange={handleChange}
            required
          >
            <option value={0}>Seleccione...</option>
            {tiposObra.map((tipo) => (
              <option
                key={tipo.idTipoObraProyecto}
                value={tipo.idTipoObraProyecto}
              >
                {tipo.nombreTipoObraProyecto}
              </option>
            ))}
          </select>
        </div>

        {/* Zona */}
        <div>
          <label>Zona</label>
          <select
            name="zona"
            value={form.zona}
            onChange={handleChange}
            required
            //Deshabilitado si es edición o si solo hay 1 zona
            disabled={isZonaSelectDisabled}
          >
            {zonas.length !== 1 && <option value={0}>Seleccione...</option>} 
            {zonas.map((zona) => (
              <option key={zona.idZona} value={zona.idZona}>
                  {zona.nombreZona}
              </option>
            ))}
            </select>
              {zonas.length === 1 && (
                <p style={{ color: 'gray', fontSize: '0.8rem', marginTop: '5px' }}>
                  Restringido a su zona de pertenencia.
                </p>
            )}
        </div>

        {/* Seccional (Filtrado) */}
        <div>
          <label>Seccional</label>
          <select
            name="idSeccional"
            value={form.idSeccional}
            onChange={handleChange}
            required
            // APLICACIÓN DEL BLOQUEO
            disabled={form.zona === 0 || isEditing}
          >
            <option value={0}>
              {form.zona === 0
                ? "Seleccione una Zona primero..."
                : "Seleccione..."}
            </option>
            {seccionalesFiltradas.map((s) => (
              <option key={s.idSeccional} value={s.idSeccional}>
                {s.nombreSeccional}
              </option>
            ))}
          </select>
          {form.zona !== 0 && seccionalesFiltradas.length === 0 && (
            <p style={{ color: "orange", fontSize: "0.8rem" }}>
              No hay seccionales para la zona seleccionada.
            </p>
          )}
        </div>

        {/* Tramo */}
        <div>
          <label>Tramo de Obra</label>
          <input
            type="text"
            name="tramoObra"
            value={form.tramoObra}
            onChange={handleChange}
          />
        </div>
        {/* Longitud */}
        <div>
          <label>Longitud (metros)</label>
          <input
            type="number"
            name="longitud"
            value={form.longitud}
            onChange={handleChange}
          />
        </div>
        {/* Superficie */}
        <div>
          <label>Tipo de superficie</label>
          <select
            name="tipoSuperficieObra"
            value={form.tipoSuperficieObra}
            onChange={handleChange}
          >
            <option value="">Seleccione...</option>
            <option value="Natural">Natural</option>
            <option value="Afirmado">Afirmado</option>
            <option value="Enripiado">Enripiado</option>
            <option value="Pavimentado">Pavimentado</option>
          </select>
        </div>

        {/* Sección Cronograma */}
        <h3>Cronograma</h3>
        <div>
          <label>Fecha de Inicio</label>
          <input
            type="date"
            name="fechaInicioObraProyecto"
            value={form.fechaInicioObraProyecto}
            onChange={handleChange}
          />
        </div>
        <div>
          <label>Fecha de Fin Prevista</label>
          <input
            type="date"
            name="fechaFinObraProyecto"
            value={form.fechaFinObraProyecto}
            onChange={handleChange}
          />
        </div>

        {/* Sección Financiera */}
        <h3>Información Financiera</h3>
        <div>
          <label>Monto</label>
          <input
            type="number"
            name="montoContrato"
            value={form.montoContrato}
            onChange={handleChange}
          />
        </div>

        {/* Sección Asignación */}
        <h3>Asignación</h3>
        {/* Departamentos */}
        <div className="select-multiple-container">
          <label>Departamento/s</label>
          <div
            className="equipment-list"
            style={{
              height: "150px",
              overflowY: "auto",
              border: "1px solid #ccc",
              borderRadius: "4px",
              padding: "8px",
            }}
          >
            {departamentos.map((depto) => {
              const isSelected = selectedDepartamentos.includes(
                depto.idDepartamento
              );
              return (
                <div
                  key={depto.idDepartamento}
                  style={{
                    padding: "4px",
                    cursor: "pointer",
                    backgroundColor: isSelected ? "#e0f7fa" : "white",
                    borderBottom: "1px dotted #eee",
                  }}
                  onClick={() => handleToggleDepartamento(depto.idDepartamento)}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    readOnly
                    style={{ marginRight: "8px" }}
                  />
                  <span>{depto.nombreDepartamento || "S/N"}</span>
                </div>
              );
            })}
          </div>
          {selectedDepartamentos.length > 0 && (
            <p className="selected-count">
              {selectedDepartamentos.length} seleccionados
            </p>
          )}
        </div>

        {/* Observaciones */}
        <div>
          <label>Observaciones</label>
          <textarea
            name="observacion"
            value={form.observacion}
            onChange={handleChange}
            rows="3"
          />
        </div>

        {/* Botones */}
        <div className="form-buttons">
          <button type="submit">Guardar</button>
        </div>
      </form>
    </div>
  );
}
