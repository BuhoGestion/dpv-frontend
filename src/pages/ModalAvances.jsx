import React, { useState, useEffect } from "react";
import Swal from "sweetalert2";
import "../styles/ModalAvances.css"; // Asegúrate de que los estilos existan

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const getToken = () => localStorage.getItem("authToken");

// Formatea una fecha en formato AAAA-MM-DD a DD/MM/AAAA (o lo que se prefiera)
// Esta es una función auxiliar que te ayudará a mostrar la fecha correctamente
const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        // Ajuste para evitar problemas de zona horaria si solo se pasa la fecha (YYYY-MM-DD)
        const day = date.getUTCDate().toString().padStart(2, '0');
        const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
        const year = date.getUTCFullYear();
        return `${day}/${month}/${year}`;
    } catch (e) {
        return dateString; // Devuelve el string original si falla el parseo
    }
};


export default function ModalAvances({ obra: obraInicial, onClose }) {
    // Estado para la obra completa
    const [obraCompleta, setObraCompleta] = useState(null);
    const [loadingObra, setLoadingObra] = useState(true);

    // Estados para catálogos y formulario
    const [tareasMaestras, setTareasMaestras] = useState([]);
    // 'todosLosEquipos' ahora solo contendrá los equipos FILTRADOS por zona.
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
    
    // --- EFECTO 1: Cargar Obra Completa por ID (SIN CAMBIOS) ---
    useEffect(() => {
        const fetchObraCompleta = async () => {
            if (!obraInicial?.idObraProyecto) {
                Swal.fire("Error", "No se recibió ID de obra para cargar detalles.", "error");
                setLoadingObra(false);
                return;
            }
            const token = getToken(); //Obtener el token
            if (!token) {
                 Swal.fire("Error", "Sesión expirada. Por favor, inicie sesión.", "error");
                 setLoadingObra(false);
                 return;
            }
            const authHeader = { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` 
            };
            setLoadingObra(true);
            try {
                //USAR HEADERS CON TOKEN
                const response = await fetch(`${API_BASE_URL}/ObraProyecto/${obraInicial.idObraProyecto}`, {
                     headers: authHeader 
                });
                if (!response.ok) {
                    const errorBody = await response.json().catch(() => ({ message: "No se pudo cargar la obra." }));
                    throw new Error(errorBody.message || `Error ${response.status} al cargar obra.`);
                }
                const data = await response.json();
                setObraCompleta(data);
            } catch (err) {
                console.error("Error al cargar obra completa:", err);
                Swal.fire("Error", `No se pudo cargar la obra: ${err.message}`, "error");
            } finally {
                setLoadingObra(false);
            }
        };
        fetchObraCompleta();
    }, [obraInicial?.idObraProyecto]);

    // --- EFECTO 2: Cargar Catálogos (Tareas y Equipos) (SIN CAMBIOS) ---
    useEffect(() => {
    const fetchCatalogos = async () => {
        setLoadingCatalogos(true);
        const token = getToken(); // Obtener el token
        const authHeader = { 'Authorization': `Bearer ${token}` };
        try {
            // 1. CARGAR TAREAS (Sin cambios)
            const tareasRes = await fetch(`${API_BASE_URL}/Tarea`, { headers: authHeader });
            if (!tareasRes.ok) throw new Error("No se pudo cargar Tareas.");
            const tareasData = await tareasRes.json();
            setTareasMaestras(tareasData);

            // 2. CARGAR EQUIPOS: 
            const equiposRes = await fetch(`${API_BASE_URL}/Equipo`, { headers: authHeader });
                            
            if (!equiposRes.ok) {
                 if (equiposRes.status === 404) {
                     setTodosLosEquipos([]);
                     console.warn(`No se encontraron equipos en el sistema (HTTP 404).`);
                 } else {
                     throw new Error(`Error ${equiposRes.status} al cargar todos los Equipos.`);
                 }
            } else {
                const equiposData = await equiposRes.json();
                setTodosLosEquipos(equiposData); 
            }

        } catch (err) {
            console.error("Error al cargar catálogos:", err);
            Swal.fire("Error", `Fallo al cargar catálogos: ${err.message}`, "error");
        } finally {
            setLoadingCatalogos(false);
        }
    };
    
    // Ejecutar solo si la obra ya está cargada para tener su info de contexto
    if (obraCompleta && !loadingObra) {
        fetchCatalogos();
    }
}, [obraCompleta, loadingObra]);

    // --- EFECTO 3: Cerrar con ESC (SIN CAMBIOS) ---
    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === "Escape") {
                onClose(false);
            }
        };
        window.addEventListener("keydown", handleEsc);
        return () => window.removeEventListener("keydown", handleEsc);
    }, [onClose]);

    // --- HANDLERS (SIN CAMBIOS) ---

    const handleChange = (e) => {
        const { name, value } = e.target;
        const finalValue =
            name === "idTarea" || name === "porcentaje" ? parseInt(value) || 0 : value;
        setNuevoAvance((prev) => ({ ...prev, [name]: finalValue }));
    };

    const handleToggleEquipo = (equipoId) => {
    setSelectedEquipos((prev) =>
        prev.includes(equipoId)
            ? prev.filter((id) => id !== equipoId)
            : [...prev, equipoId]
    );
};

    const handleAgregarAvance = async (e) => {
        e.preventDefault();

        // Validaciones
        if (!nuevoAvance.idTarea || nuevoAvance.porcentaje === "" || nuevoAvance.porcentaje < 0 || nuevoAvance.porcentaje > 100) {
            Swal.fire("Atención", "Seleccione una tarea y un porcentaje válido (0-100).", "warning");
            return;
        }
        if (!obraCompleta) {
            Swal.fire("Error", "La información de la obra aún no está cargada.", "error");
            return;
        }
        const esTareaNueva = !obraCompleta?.tareas?.some(t => t.idTarea === nuevoAvance.idTarea);
        if (esTareaNueva && selectedEquipos.length === 0) {
            Swal.fire("Atención", "Debe seleccionar al menos un equipo al asignar una nueva tarea.", "warning");
            return;
        }

        const token = getToken(); //Obtener el token
        const authHeader = { 
            "Content-Type": "application/json", 
            'Authorization': `Bearer ${token}` 
        };
        // Objeto a enviar
        const avanceParaGuardar = {
            porcentajeAvance: nuevoAvance.porcentaje,
            fecha: nuevoAvance.fecha, 
            observacion: nuevoAvance.observacion,
            idObraProyecto: obraCompleta.idObraProyecto,
            idTarea: nuevoAvance.idTarea,
            equipoIds: selectedEquipos,
        };

        // Llamada API (SIN CAMBIOS)
        try {
            const response = await fetch(`${API_BASE_URL}/AvanceTareaObraProyecto`, {
                method: "POST",
                headers: authHeader,
                body: JSON.stringify(avanceParaGuardar),
            });

            if (!response.ok) {
                const errorBody = await response.json().catch(() => ({ message: `Error ${response.status}` }));
                throw new Error(errorBody.message || `Error ${response.status} al guardar.`);
            }

            onClose(true); // Avisa al padre que se guardó

        } catch (error) {
            Swal.fire("Error", `Fallo al registrar: ${error.message}`, "error");
        }
    };

    const handleCerrar = () => {
        onClose(false);
    };

    // LÓGICA DE FILTRADO (DEL CAMBIO ANTERIOR)
    const equiposFiltrados = todosLosEquipos.filter(equipo => {
        const codigo = equipo.codigoEquipo?.toLowerCase() || '';
        const nombre = equipo.nombreEquipo?.toLowerCase() || '';
        const filtro = filtroEquipo.toLowerCase().trim();
        
        return codigo.includes(filtro) || nombre.includes(filtro);
    });

    // --- RENDER ---
    if (loadingObra || loadingCatalogos) {
        return (
            <div className="modal-content-avances">
                <div className="modal-header">
                    <h2>Asignación de Tareas y Avances</h2>
                    <button onClick={handleCerrar}>✕</button>
                </div>
                <div className="modal-body-avances loading-message">
                    {loadingObra ? "Cargando datos de la obra..." : "Cargando catálogos..."} 🔄
                </div>
            </div>
        );
    }

    if (!obraCompleta) {
        return (
            <div className="modal-content-avances">
                <div className="modal-header">
                    <h2>Asignación de Tareas y Avances</h2>
                    <button onClick={handleCerrar}>✕</button>
                </div>
                <div className="modal-body-avances error-message">
                    No se pudo cargar la información de la obra. Cierre e intente de nuevo.
                </div>
                <div className="botones-avance">
                    <button type="button" onClick={handleCerrar} className="btn-guardar">
                        Cerrar
                    </button>
                </div>
            </div>
        );
    }

    const tareasAsignadas = obraCompleta.tareas || [];

    return (
        <div className="modal-content-avances">
            <div className="modal-body-avances">
                <h3>Obra: {obraCompleta.nombreObra || "Desconocida"}</h3>
                <h4>Zona: {obraCompleta.zona || "N/A"}</h4>

                <table className="tabla-avances">
                    <thead>
                        <tr>
                            <th>Tarea (Código)</th>
                            <th>Nombre</th>
                            <th>Equipos Asignados</th>
                            <th>Último Avance</th>
                            <th>Avance Total (%)</th>
                        </tr>
                    </thead>
                    {/* Cuerpo de la Tabla: MODIFICADO PARA BUSCAR EL ÚLTIMO AVANCE */}
                    <tbody>
                        {tareasAsignadas.length > 0 ? (
                            tareasAsignadas.map((tarea) => {
                               
                                const ultimoAvance = tarea.historialAvances?.[0] || {}; 

                                // 2. Extraer equipos del último avance
                                let equiposCodigos = 'Sin Equipos';
                                if (ultimoAvance.equipos && ultimoAvance.equipos.length > 0) {
                                    // Mapea los equipos asociados al AVANCE (no a la TAREA global)
                                    equiposCodigos = ultimoAvance.equipos
                                        .map(e => e.codigoEquipo || 'S/C') 
                                        .join(', ');
                                } else {
                                    // Si el avance no tiene equipos, intenta usar los equipos asignados a la Tarea (por si la API los maneja diferente)
                                    // Esta es la lógica que tenías antes:
                                     const equiposTarea = (tarea.equipos || [])
                                         .map(e => e.codigoEquipo || 'S/C')
                                         .join(', ');
                                     if (equiposTarea) {
                                         equiposCodigos = equiposTarea;
                                     }
                                }

                                // 3. Extraer la fecha del último avance
                                // Asumimos que el campo se llama 'fechaAvance' o 'fecha'
                                const fechaAvance = ultimoAvance.fechaAvance || ultimoAvance.fecha;

                                return (
                                    <tr key={tarea.idTarea}>
                                        <td>{tarea.codigo || 'N/A'}</td>
                                        <td>{tarea.nombre || 'N/A'}</td>
                                        {/* Columna Equipos Asignados */}
                                        <td style={{fontSize: '0.85em', maxWidth: '200px', wordBreak: 'break-all'}}>
                                            {equiposCodigos}
                                        </td>
                                        {/* Columna Fecha de Avance */}
                                        <td>
                                            {formatDate(fechaAvance) || 'N/A'} 
                                        </td>
                                        <td>{tarea.avanceTotal || 0}%</td>
                                    </tr>
                                );
                            })
                        ) : (
                            <tr>
                                <td colSpan="5" style={{ textAlign: "center", color: "#777" }}>
                                    No hay tareas asignadas a esta obra
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>

                <h4>Registrar Nuevo Avance / Asignar Tarea y Equipos</h4>

                {/* Formulario (SIN CAMBIOS RELEVANTES) */}
                <form onSubmit={handleAgregarAvance} className="form-avance">
                    {/* Select Tarea */}
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
                                    ({t.codigoTarea || 'S/C'}) {t.nombreTarea || 'Tarea sin nombre'}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Sección Equipos con Buscador (DEL CAMBIO ANTERIOR) */}
                    <div className="select-multiple-container">
                        <label>Equipos a asignar a esta Tarea (Selección Global)</label>
                        
                        <input
                            type="text"
                            placeholder="Buscar por código o nombre..."
                            value={filtroEquipo}
                            onChange={(e) => setFiltroEquipo(e.target.value)}
                            style={{ marginBottom: '8px', padding: '8px', width: '100%', boxSizing: 'border-box' }}
                        />

                        <div className="equipment-list" style={{ border: '1px solid #ccc', borderRadius: '4px', padding: '8px' }}>                              {equiposFiltrados.length === 0 ? (
                                <p className="placeholder-text" style={{ color: '#aaa' }}> 
                                    {loadingCatalogos 
                                        ? 'Cargando equipos...' 
                                        : filtroEquipo 
                                            ? 'No se encontraron equipos con ese código/nombre.'
                                            : 'No se encontraron equipos disponibles en el sistema.'
                                    }
                                </p>
                            ) : (
                            equiposFiltrados.map(equipo => {
                                const isSelected = selectedEquipos.includes(equipo.idEquipo);
                                
                                return (
                                    <div
                                        key={equipo.idEquipo}
                                        className={`equipment-item ${isSelected ? 'selected' : ''}`} 
                                        onClick={() => handleToggleEquipo(equipo.idEquipo)}
                                    >
                                        <input
                                            type="checkbox" checked={isSelected} readOnly
                                            style={{ marginRight: '8px' }}
                                        />
                                        <span>{equipo.codigoEquipo || 'S/C'} - {equipo.nombreEquipo || 'Equipo sin nombre'}</span>
                                        
                                        <span style={{ marginLeft: 'auto', fontWeight: 'bold', color: 'blue', fontSize: '12px' }}>
                                            (Disponible para Asignación) 
                                        </span>
                                        
                                    </div>
                                );
                            })
                            )}
                        </div>
                        {selectedEquipos.length > 0 && (
                            <p className="selected-count">{selectedEquipos.length} equipos seleccionados</p>
                        )}
                    </div>

                    {/* Input Porcentaje */}
                    <div>
                        <label>Porcentaje de Avance</label>
                        <input
                            type="number" name="porcentaje" value={nuevoAvance.porcentaje} onChange={handleChange}
                            min="0" max="100" placeholder="Ej: 35" required
                        />
                    </div>

                    {/* Input Fecha */}
                    <div>
                        <label>Fecha del Avance</label>
                        <input
                            type="date" name="fecha" value={nuevoAvance.fecha} onChange={handleChange}
                            required
                        />
                    </div>

                    {/* Input Observación */}
                    <div>
                        <label>Observación (Opcional)</label>
                        <textarea
                            name="observacion" value={nuevoAvance.observacion} onChange={handleChange}
                            rows="3" placeholder="Detalles del avance o asignación."
                        />
                    </div>

                    {/* Botones */}
                    <div className="botones-avance">
                        <button type="submit" className="btn-agregar">
                            Registrar Avance y Equipos
                        </button>
                        <button type="button" onClick={handleCerrar} className="btn-guardar">
                            Cerrar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}