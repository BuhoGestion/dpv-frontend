// COMPONENTE UserABM.jsx (FINAL - Alta con Campos Separados)

import React, { useState, useEffect } from "react";
import Swal from "sweetalert2";
import { Edit, Trash2, UserPlus, Shield } from "lucide-react";
import Header from "./Header";
import Footer from "./Footer";
import "../styles/UserABM.css";
import PermisosModal from "./PermisosModal";

const API_BASE_URL = "https://buhovialws.mendoza.gov.ar/api";

//MODAL DE USUARIO ADAPTADO PARA CAMPOS SEPARADOS Y CLAVE GENERADA
const UserModal = ({ userToEdit, onClose, onSave }) => {
  const isEditing = !!userToEdit;

  // Si estamos editando, dividimos el nombre completo (asumiendo que el primer espacio separa el nombre del apellido)
  const nombreParts = userToEdit?.nombre?.split(" ") || ["", ""];
  const primerNombre = nombreParts[0];
  const apellidoResto = nombreParts.slice(1).join(" ");

  const [form, setForm] = useState({
    idUsuario: userToEdit?.idUsuario || 0,

    //ESTADOS SEPARADOS
    nombre: isEditing ? primerNombre : "",
    apellido: isEditing ? apellidoResto : "",

    email: userToEdit?.email || "",
    idZona: userToEdit?.idZona || 0,
    // Campos de clave solo para edición
    password: "",
    confirmPassword: "",
  });

  const [zonas, setZonas] = useState([]);
  const [loadingZonas, setLoadingZonas] = useState(true);

  // PARA CARGAR ZONAS
  useEffect(() => {
    const fetchZonas = async () => {
      try {
        // Asumo que tienes un endpoint GET /api/Zona que devuelve todas las zonas.
        const response = await fetch(`${API_BASE_URL}/Zona`);
        if (!response.ok) throw new Error("Error al cargar zonas.");
        const data = await response.json();
        setZonas(data);
      } catch (error) {
        Swal.fire(
          "Error",
          "No se pudieron cargar las Zonas para el formulario.",
          "error"
        );
      } finally {
        setLoadingZonas(false);
      }
    };
    fetchZonas();
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    //VALIDACIÓN: Nombre, Apellido y Email son obligatorios
    if (!form.nombre || !form.apellido || !form.email) {
      //Ahora valida Nombre y Apellido
      Swal.fire("Error", "Nombre, Apellido y Email son obligatorios.", "error");
      return;
    }

    //CONCATENAR: Enviamos el nombre completo al Back-End en el campo 'nombre'
    let dataToSave = {
      idUsuario: form.idUsuario,
      nombre: form.nombre.trim(),
      apellido: form.apellido.trim(),
      email: form.email,
      idZona: form.idZona > 0 ? form.idZona : null,
    };

    // --- Lógica Específica para Edición (Cambiando Contraseña) ---
    if (!isEditing) {
      if (!form.password || form.password.length < 4) {
        Swal.fire(
          "Error",
          "La contraseña es obligatoria y debe tener al menos 4 caracteres.",
          "error"
        );
        return;
      }
      if (form.password !== form.confirmPassword) {
        Swal.fire("Error", "Las contraseñas no coinciden.", "error");
        return;
      } // CAMBIO CRÍTICO: Usar 'password' en CamelCase
      dataToSave.password = form.password;
    } // Lógica de EDICIÓN: La contraseña es opcional, pero si se ingresa, se valida.
    else if (isEditing) {
      if (form.password) {
        if (form.password.length < 4) {
          Swal.fire(
            "Error",
            "La nueva contraseña debe tener al menos 4 caracteres.",
            "error"
          );
          return;
        }
        if (form.password !== form.confirmPassword) {
          Swal.fire("Error", "Las contraseñas no coinciden.", "error");
          return;
        } // CAMBIO CRÍTICO: Usar 'password' en CamelCase
        dataToSave.password = form.password; // Se envía la nueva clave
      } else {
        // CAMBIO CRÍTICO: Usar 'password' en CamelCase
        dataToSave.password = "";
      }
    }

    onSave(dataToSave);
  };

  return (
    <div className="user-modal-overlay">
      <div className="user-modal-content">
        <h3>
          {isEditing
            ? `Editar Usuario: ${form.nombre} ${form.apellido}`
            : "Nuevo Usuario"}
        </h3>
        <button className="close-button" onClick={onClose}>
          ✕
        </button>
        <form onSubmit={handleSubmit}>
          {/*CAMPO NOMBRE */}
          <label>Nombre:</label>
          <input
            type="text"
            name="nombre"
            value={form.nombre}
            onChange={handleChange}
            required
          />

          <label>Apellido:</label>
          <input
            type="text"
            name="apellido"
            value={form.apellido}
            onChange={handleChange}
            required
          />

          <label>Email (para envío de credenciales):</label>
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            required
          />

          {/*  NUEVO CAMPO: SELECCIÓN DE ZONA */}
          <label>Zona de Pertenencia:</label>
          <select
            name="idZona"
            value={form.idZona}
            onChange={(e) =>
              setForm({ ...form, idZona: parseInt(e.target.value) || 0 })
            }
            disabled={loadingZonas}
          >
            <option value={0}>Seleccionar Zona (Opcional)</option>
            {loadingZonas ? (
              <option disabled>Cargando zonas...</option>
            ) : (
              zonas.map((z) => (
                <option key={z.idZona} value={z.idZona}>
                  {z.nombreZona}
                </option>
              ))
            )}
          </select>
          {/*CAMPOS DE CONTRASEÑA SOLO PARA EDICIÓN */}
          <>
                                   {" "}
            <label>
              Contraseña {isEditing ? "(dejar vacío para no cambiar)" : "*"}:
            </label>
                                   {" "}
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              required={!isEditing}
            />
                                                           {" "}
            <label>
              Confirmar Contraseña {isEditing ? "(si se ingresó nueva)" : "*"}:
            </label>
                                   {" "}
            <input
              type="password"
              name="confirmPassword"
              value={form.confirmPassword}
              onChange={handleChange}
              required={!isEditing}
            />
                               {" "}
          </>
          <div className="form-buttons">
            <button type="submit" className="btn-primary">
              {isEditing ? "Guardar Cambios" : "Crear Usuario y Enviar Email"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Componente principal de gestión
function UserABM({ userName, onLogout }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalUserOpen, setModalUserOpen] = useState(false); // Modal de Alta/Edición
  const [modalPermisosOpen, setModalPermisosOpen] = useState(false); // **NUEVO:** Modal de Permisos
  const [userSelected, setUserSelected] = useState(null);

  // --- Cargar Usuarios ---
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/Usuario`);
      if (!response.ok) {
        throw new Error(
          "Error al cargar la lista de usuarios. ¿Autorización fallida?"
        );
      }
      setUsers(await response.json());
      console.log("✅ Lista de usuarios actualizada en el estado."); // <-- Añadir esto
      setError(null);
    } catch (err) {
      console.error(err);
      setError(err.message || "Error al conectar con el servicio de usuarios.");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // --- Funciones para Abrir/Cerrar Modales ---
  const handleOpenUserModal = (user = null) => {
    setUserSelected(user);
    setModalUserOpen(true);
  };

  const handleOpenPermisosModal = (user) => {
    setUserSelected(user);
    setModalPermisosOpen(true);
  };

  const handleCloseModals = () => {
    setModalUserOpen(false);
    setModalPermisosOpen(false);
    setUserSelected(null);
  };

  // --- Alta y Edición (Lógica de comunicación con el Back-End) ---
  const handleSaveUser = async (formData) => {
    const isEdit = formData.idUsuario > 0;
    const method = isEdit ? "PUT" : "POST";
    const url = isEdit
      ? `${API_BASE_URL}/Usuario/${formData.idUsuario}`
      : `${API_BASE_URL}/Usuario/create`;

    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        // Enviamos el formData (que tiene Nombre, Email, y opcionalmente Password)
        body: JSON.stringify(formData),
      });
      let data = {};
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") !== -1) {
        data = await response.json();
      }

      if (!response.ok) {
        // Se usa 'data' solo si se pudo parsear el JSON
        const errorMsg =
          data.message || `Error ${response.status}: Fallo al guardar.`;
        Swal.fire("Error", errorMsg, "error");
        return;
      }

      //MENSAJE DE ÉXITO AJUSTADO PARA EL ALTA
      const successMsg = isEdit
        ? `Usuario ${formData.nombre} actualizado correctamente.`
        : `Usuario ${formData.nombre} creado. Las credenciales han sido enviadas a ${formData.email}.`;

      Swal.fire("Éxito", successMsg, "success"); // <-- ESTE ES EL SWEET ALERT
      handleCloseModals();
      fetchUsers();
    } catch (err) {
      // Esto captura fallos de conexión O fallos al parsear JSON si no se hizo la verificación anterior.
      Swal.fire(
        "Error",
        "Fallo de conexión o error de formato de respuesta al intentar guardar.",
        "error"
      );
    }
  };

  // --- Baja ---
  const handleDelete = (user) => {
    Swal.fire({
      title: `¿Eliminar a ${user.nombre}?`,
      text: "Esta acción es irreversible.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const userIdToDelete = user.idUsuario || user.IdUsuario;

          const response = await fetch(
            `${API_BASE_URL}/Usuario/${userIdToDelete}`,
            {
              method: "DELETE",
            }
          );

          if (!response.ok) {
            const errorData = await response
              .json()
              .catch(() => ({ message: "Error desconocido." }));
            throw new Error(
              errorData.message || "Error al eliminar en el servidor."
            );
          }

          Swal.fire("Eliminado", "Usuario eliminado exitosamente.", "success");
          fetchUsers();
        } catch (error) {
          Swal.fire(
            "Error",
            error.message || "No se pudo completar la eliminación.",
            "error"
          );
        }
      }
    });
  };

  // --- Renderizado ---
  if (loading)
    return <div className="loading-message">Cargando usuarios... 🔄</div>;
  if (error) return <div className="error-message">Error: {error}</div>;

  return (
    <>
      <Header nombreUsuario={userName} onLogout={onLogout} />
      <div className="user-management-container">
        <h2>Gestión de Usuarios (ABM)</h2>

        <button
          className="btn-nueva-obra"
          onClick={() => handleOpenUserModal(null)}
        >
          <UserPlus size={18} style={{ marginRight: "8px" }} /> NUEVO USUARIO
        </button>

        <div className="table-wrapper">
          <table className="user-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Nombre</th>
                <th>Email</th>
                <th>Fecha Alta</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.idUsuario}>
                  <td>{user.idUsuario}</td>
                  <td>{user.nombre}</td>
                  <td>{user.email}</td>
                  <td>
                    {user.fechaAlta
                      ? new Date(user.fechaAlta).toLocaleDateString()
                      : "N/A"}
                  </td>
                  <td className="actions-cell">
                    {/* Icono de Permisos */}
                    <Shield
                      className="icon permissions"
                      onClick={() => handleOpenPermisosModal(user)}
                      title="Asignar Permisos"
                    />

                    {/* Icono de Editar */}
                    <Edit
                      className="icon edit"
                      onClick={() => handleOpenUserModal(user)}
                      title="Editar"
                    />

                    {/* Icono de Eliminar */}
                    <Trash2
                      className="icon delete"
                      onClick={() => handleDelete(user)}
                      title="Eliminar"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <Footer />

      {/* Modal de Alta/Edición de Usuario */}
      {modalUserOpen && (
        <UserModal
          userToEdit={userSelected}
          onClose={handleCloseModals}
          onSave={handleSaveUser}
        />
      )}

      {/* Modal de Gestión de Permisos */}
      {modalPermisosOpen && userSelected && (
        <PermisosModal
          user={userSelected}
          onClose={handleCloseModals}
          onPermissionsUpdated={fetchUsers}
        />
      )}
    </>
  );
}

export default UserABM;
