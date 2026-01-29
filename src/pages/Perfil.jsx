import React, { useState, useEffect } from "react";
import "../styles/Perfil.css";
import { User, Mail, Shield, Save, Loader, AlertCircle } from "lucide-react";
import Header from "./Header";
import Footer from "./Footer";
// 💡 Importar SweetAlert2
import Swal from "sweetalert2";

// URL base de la API (obtenida del entorno)
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// Función auxiliar para obtener el token de autenticación
const getToken = () => sessionStorage.getItem("authToken");

// 1. OBTENER DATOS DEL PERFIL (GET /api/Usuario/Perfil)
const fetchUserData = async () => {
  const token = getToken();
  if (!token) {
    throw new Error("No autenticado. Por favor, inicie sesión.");
  }

  const response = await fetch(`${API_BASE_URL}/Usuario/Perfil`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (response.ok) {
    return response.json();
  } else if (response.status === 401) {
    throw new Error("Sesión expirada o no autorizado.");
  } else {
    const errorBody = await response.text();
    throw new Error(
      `Error ${response.status} al cargar los datos: ${errorBody}`
    );
  }
};

// 2. ACTUALIZAR DATOS DEL PERFIL (PUT /api/Usuario/Perfil)
const updateUserData = async (data) => {
  const token = getToken();
  if (!token) {
    throw new Error("No autenticado.");
  }

  const response = await fetch(`${API_BASE_URL}/Usuario/Perfil`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      nombre: data.nombre,
      apellido: data.apellido,
      email: data.email,
    }),
  });

  if (response.ok) {
    return { success: true, message: "Perfil actualizado con éxito." };
  } else if (response.status === 401) {
    throw new Error("No autorizado. Sesión expirada.");
  } else if (response.status === 400) {
    const errorData = await response.json();
    throw new Error(
      errorData.message || "Datos inválidos. Verifique los campos."
    );
  } else {
    throw new Error(`Error ${response.status} al guardar los datos.`);
  }
};

// 3. CAMBIAR CONTRASEÑA (POST /api/Usuario/CambiarClave)
const changePassword = async (passwords) => {
  const token = getToken();
  if (!token) {
    throw new Error("No autenticado.");
  }
  if (passwords.nueva !== passwords.confirmar) {
    throw new Error("La nueva contraseña y su confirmación no coinciden.");
  }

  const response = await fetch(`${API_BASE_URL}/Usuario/CambiarClave`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      passwordActual: passwords.actual,
      passwordNueva: passwords.nueva, // Nota: El backend no necesita "confirmar", pero lo enviaremos por claridad del DTO
      confirmarPasswordNueva: passwords.confirmar,
    }),
  });

  if (response.ok) {
    return { success: true, message: "Contraseña actualizada correctamente." };
  } else if (response.status === 401) {
    throw new Error("No autorizado. Sesión expirada.");
  } else if (response.status === 400) {
    const errorData = await response.json(); // Aseguramos que el mensaje de error de la API sea visible
    throw new Error(
      errorData.message || "Error de validación al cambiar la contraseña."
    );
  } else {
    throw new Error(`Error ${response.status} al cambiar la contraseña.`);
  }
};

// Función genérica para mostrar el SweetAlert
const showSweetAlert = (icon, title, text) => {
  Swal.fire({
    icon,
    title,
    text,
    customClass: {
      confirmButton: "btn-primary", // O la clase de botón que uses
    },
  });
};

// El componente ahora acepta onProfileUpdate (la función que creamos en App.jsx)
function Perfil({ onProfileUpdate, userName, onLogout }) {
  const [userData, setUserData] = useState({
    nombre: "",
    apellido: "",
    nombreUsuario: "",
    email: "",
  });
  const [password, setPassword] = useState({
    actual: "",
    nueva: "",
    confirmar: "",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false); // Quitamos el estado 'message' local ya que usaremos SweetAlert2 // const [message, setMessage] = useState(null); // 1. Cargar Datos del Usuario al Montar

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await fetchUserData();
        setUserData({
          nombre: data.nombre,
          apellido: data.apellido,
          nombreUsuario: data.nombreUsuario,
          email: data.email,
        });
      } catch (error) {
        // 💡 Mostrar SweetAlert de error si falla la carga inicial
        showSweetAlert(
          "error",
          "Error de Carga",
          error.message || "Error al cargar los datos del perfil."
        );
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const handleUserChange = (e) => {
    const { name, value } = e.target;
    setUserData((prev) => ({ ...prev, [name]: value })); // setMessage(null); // Ya no es necesario
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPassword((prev) => ({ ...prev, [name]: value })); // setMessage(null); // Ya no es necesario
  }; // 2. Manejar Envío del Formulario de Perfil (Datos Personales)

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const result = await updateUserData(userData);
      if (result.success) {
        const updatedData = await fetchUserData();
        setUserData(updatedData);
        const newFullName = `${updatedData.nombre} ${updatedData.apellido}`;
        if (onProfileUpdate) {
          onProfileUpdate(newFullName);
        } // 💡 SweetAlert de éxito
        showSweetAlert("success", "¡Éxito!", result.message);
      } else {
        // 💡 SweetAlert de error genérico
        showSweetAlert(
          "error",
          "Error al Guardar",
          "Error al guardar. Intente de nuevo."
        );
      }
    } catch (error) {
      // 💡 SweetAlert de error de la API o de conexión
      showSweetAlert(
        "error",
        "Error de Conexión",
        error.message || "Error de conexión con el servidor."
      );
    } finally {
      setIsSaving(false);
    }
  }; // 3. Manejar Envío del Formulario de Contraseña

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setIsChangingPassword(true);

    try {
      const result = await changePassword(password);

      if (result.success) {
        // 💡 SweetAlert de éxito
        showSweetAlert("success", "¡Contraseña Actualizada!", result.message); // Limpiar campos al éxito
        setPassword({ actual: "", nueva: "", confirmar: "" });
      }
    } catch (error) {
      // 💡 SweetAlert de error de la API o de validación
      showSweetAlert(
        "error",
        "Error al Cambiar Contraseña",
        error.message || "Error al cambiar la contraseña."
      );
    } finally {
      setIsChangingPassword(false);
    }
  }; // Estado de carga inicial

  if (isLoading) {
    return (
      <div className="perfil-container loading">
                        <Loader className="spinner" size={40} />               {" "}
        <p>Cargando datos del perfil...</p>           {" "}
      </div>
    );
  } // Nota: Se eliminó el div de mensaje local, ya que SweetAlert2 lo reemplaza
  return (
    <>
                  <Header nombreUsuario={userName} onLogout={onLogout} />       
         {" "}
      <div className="perfil-container">
                       {" "}
        <h2 className="title-perfil">
                              <User size={28} style={{ marginRight: "10px" }} />
                              Gestión de Perfil                {" "}
        </h2>
                                       {" "}
        {/* ⚠️ ELIMINADO: Se reemplaza por SweetAlert2 */}               {" "}
        {/* {message && (...) } */}               {" "}
        {/* SECCIÓN 1: DATOS PERSONALES */}               {" "}
        <div className="card-perfil">
                              <h3>Información General</h3>                   {" "}
          <form onSubmit={handleSubmit} className="form-perfil">
                                                           {" "}
            <div className="form-group">
                                         {" "}
              <label htmlFor="nombre">
                <User size={16} /> Nombre(s)
              </label>
                                         {" "}
              <input
                type="text"
                id="nombre"
                name="nombre"
                value={userData.nombre}
                onChange={handleUserChange}
                required
                disabled={isSaving}
              />
                                     {" "}
            </div>
                                                           {" "}
            <div className="form-group">
                                         {" "}
              <label htmlFor="apellido">
                <User size={16} /> Apellido
              </label>
                                         {" "}
              <input
                type="text"
                id="apellido"
                name="apellido"
                value={userData.apellido}
                onChange={handleUserChange}
                required
                disabled={isSaving}
              />
                                     {" "}
            </div>
                                   {" "}
            <div className="form-group">
                                         {" "}
              <label htmlFor="nombreUsuario">Nombre de Usuario (Login)</label>
                                         {" "}
              <input
                type="text"
                id="nombreUsuario"
                name="nombreUsuario"
                value={userData.nombreUsuario} // El nombre de usuario no es editable.
                disabled
                title="El nombre de usuario no es editable."
              />
                                     {" "}
            </div>
                                                           {" "}
            <div className="form-group">
                                         {" "}
              <label htmlFor="email">
                <Mail size={16} /> Correo Electrónico
              </label>
                                         {" "}
              <input
                type="email"
                id="email"
                name="email"
                value={userData.email}
                onChange={handleUserChange}
                required
                disabled={isSaving}
              />
                                     {" "}
            </div>
                                   {" "}
            <button type="submit" disabled={isSaving} className="btn-primary">
                                         {" "}
              {isSaving ? (
                <Loader size={20} className="spinner" />
              ) : (
                <Save size={20} />
              )}
                                         {" "}
              {isSaving ? "Guardando..." : "Guardar Cambios"}                   
                 {" "}
            </button>
                               {" "}
          </form>
                         {" "}
        </div>
                        <hr className="divider" />               {" "}
        {/* SECCIÓN 2: CAMBIO DE CLAVE */}               {" "}
        <div className="card-perfil password-section">
                             {" "}
          <h3>
            <Shield size={20} /> Cambiar Contraseña
          </h3>
                             {" "}
          <form onSubmit={handlePasswordSubmit} className="form-perfil">
                                                           {" "}
            <div className="form-group">
                                         {" "}
              <label htmlFor="actual">Contraseña Actual</label>
                                         {" "}
              <input
                type="password"
                id="actual"
                name="actual"
                value={password.actual}
                onChange={handlePasswordChange}
                required
                disabled={isChangingPassword}
              />
                                     {" "}
            </div>
                                                           {" "}
            <div className="form-group">
                                         {" "}
              <label htmlFor="nueva">Nueva Contraseña</label>
                                         {" "}
              <input
                type="password"
                id="nueva"
                name="nueva"
                value={password.nueva}
                onChange={handlePasswordChange}
                required
                disabled={isChangingPassword}
              />
                                     {" "}
            </div>
                                                           {" "}
            <div className="form-group">
                                         {" "}
              <label htmlFor="confirmar">Confirmar Nueva Contraseña</label>
                                         {" "}
              <input
                type="password"
                id="confirmar"
                name="confirmar"
                value={password.confirmar}
                onChange={handlePasswordChange}
                required
                disabled={isChangingPassword}
              />
                                     {" "}
            </div>
                                   {" "}
            <button
              type="submit"
              disabled={isChangingPassword}
              className="btn-secondary"
            >
                                         {" "}
              {isChangingPassword ? (
                <Loader size={20} className="spinner" />
              ) : (
                <Shield size={20} />
              )}
                                         {" "}
              {isChangingPassword ? "Cambiando..." : "Actualizar Contraseña"}   
                                 {" "}
            </button>
                               {" "}
          </form>
                         {" "}
        </div>
                   {" "}
      </div>
                  <Footer />       {" "}
    </>
  );
}

export default Perfil;
