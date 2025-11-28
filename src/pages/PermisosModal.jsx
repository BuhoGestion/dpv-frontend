// COMPONENTE PermisosModal.jsx

import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { ArrowRight, ArrowLeft, Save, X } from 'lucide-react';

const API_BASE_URL = "https://localhost:44311/api";

const PermisosModal = ({ user, onClose, onPermissionsUpdated }) => {
    const [allPermissions, setAllPermissions] = useState([]);
    const [assignedPermissions, setAssignedPermissions] = useState([]);
    const [availablePermissions, setAvailablePermissions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAllAndAssignedPermissions();
    }, []);

    // --- Cargar Permisos ---
    const fetchAllAndAssignedPermissions = async () => {
        setLoading(true);
        try {
            // 1. Cargar TODOS los permisos
            const allResponse = await fetch(`${API_BASE_URL}/Permiso`);
            const allData = await allResponse.json();

            // 2. Cargar permisos ASIGNADOS al usuario
            // Asumiendo que existe un endpoint: /UsuarioPermiso/{idUsuario} que retorna List<Permiso>
            const assignedResponse = await fetch(`${API_BASE_URL}/UsuarioPermiso/${user.idUsuario}`);
            let assignedData = [];
            if (assignedResponse.ok) {
                assignedData = await assignedResponse.json();
            }
            
            // Convertir la lista de permisos asignados a un Set de IDs para búsqueda rápida
            const assignedIds = new Set(assignedData.map(p => p.idPermiso));
            
            // 3. Determinar los permisos disponibles (los que no están asignados)
            const available = allData.filter(p => !assignedIds.has(p.idPermiso));

            setAllPermissions(allData); // No se usa directamente, pero útil para depuración
            setAssignedPermissions(assignedData);
            setAvailablePermissions(available);

        } catch (error) {
            console.error('Error fetching permissions:', error);
            Swal.fire('Error', 'No se pudieron cargar los permisos.', 'error');
            onClose();
        } finally {
            setLoading(false);
        }
    };

    // --- Mover Permisos entre listas ---
    const movePermission = (permission, from, to) => {
        if (from === 'available' && to === 'assigned') {
            setAvailablePermissions(prev => prev.filter(p => p.idPermiso !== permission.idPermiso));
            setAssignedPermissions(prev => [...prev, permission].sort((a, b) => a.nombrePermiso.localeCompare(b.nombrePermiso)));
        } else if (from === 'assigned' && to === 'available') {
            setAssignedPermissions(prev => prev.filter(p => p.idPermiso !== permission.idPermiso));
            setAvailablePermissions(prev => [...prev, permission].sort((a, b) => a.nombrePermiso.localeCompare(b.nombrePermiso)));
        }
    };

    // --- Guardar Cambios ---
    const handleSavePermissions = async () => {
        setLoading(true);
        try {
            // Obtener solo los IDs de los permisos que quedaron asignados
            const assignedIds = assignedPermissions.map(p => p.idPermiso);
            
            // Asumiendo un endpoint de PUT para actualizar todos los permisos de un usuario
            // El backend deberá eliminar los anteriores y crear los nuevos basándose en la lista de IDs.
            const response = await fetch(`${API_BASE_URL}/UsuarioPermiso/update-for-user/${user.idUsuario}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(assignedIds) // Enviamos solo el array de IDs
            });

            if (!response.ok) {
                 const data = await response.json().catch(() => ({ message: 'Error desconocido.' }));
                 throw new Error(data.message || `Error ${response.status}: Fallo al actualizar permisos.`);
            }

            Swal.fire('Éxito', `Permisos actualizados para ${user.nombre}.`, 'success');
            onPermissionsUpdated(); // Llama a una función de UserABM si es necesario
            onClose();

        } catch (error) {
            Swal.fire('Error', error.message || 'Fallo de conexión al guardar permisos.', 'error');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="user-modal-overlay">
                <div className="user-modal-content permissions-modal-content">
                    <h3>Asignar Permisos a {user.nombre}</h3>
                    <div className="loading-message">Cargando permisos... 🔄</div>
                </div>
            </div>
        );
    }

    return (
        <div className="user-modal-overlay">
            <div className="user-modal-content permissions-modal-content">
                <h3>Asignar Permisos al usuario: **{user.nombre}**</h3>
                <button className="close-button" onClick={onClose} disabled={loading}><X size={20} /></button>

                <div className="permissions-transfer-box">
                    {/* Lista de Permisos Disponibles */}
                    <div className="permissions-list available">
                        <h4>Permisos Disponibles ({availablePermissions.length})</h4>
                        <div className="list-items">
                            {availablePermissions.map(perm => (
                                <div 
                                    key={perm.idPermiso} 
                                    className="list-item"
                                    onClick={() => movePermission(perm, 'available', 'assigned')}
                                    title={`Click para asignar: ${perm.descripcionPermiso}`}
                                >
                                    <ArrowRight size={14} style={{marginRight: '8px', color: '#007bff'}} />
                                    {perm.nombrePermiso}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Separador (Opcional si usas flexbox gap) */}
                    <div className="separator-column">
                        <ArrowRight className="separator-icon" />
                        <ArrowLeft className="separator-icon" />
                    </div>

                    {/* Lista de Permisos Asignados */}
                    <div className="permissions-list assigned">
                        <h4>Permisos Asignados ({assignedPermissions.length})</h4>
                        <div className="list-items">
                            {assignedPermissions.map(perm => (
                                <div 
                                    key={perm.idPermiso} 
                                    className="list-item assigned"
                                    onClick={() => movePermission(perm, 'assigned', 'available')}
                                    title={`Click para desasignar: ${perm.descripcionPermiso}`}
                                >
                                    {perm.nombrePermiso}
                                    <ArrowLeft size={14} style={{marginLeft: '8px', color: '#dc3545'}} />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="form-buttons save-button-container">
                    <button 
                        className="btn-primary" 
                        onClick={handleSavePermissions}
                        disabled={loading}
                    >
                        <Save size={18} style={{marginRight: '8px'}} /> Guardar Permisos
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PermisosModal;

