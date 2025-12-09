import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaEnvelope, FaLock } from "react-icons/fa";
import "../styles/Login.css";
import Swal from "sweetalert2";

// Asumiendo la URL base de tu API
const API_URL = "https://buhovialws.mendoza.gov.ar/api/Auth/login";

export default function Login({ setAuthKey }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({ nombreUsuario: "", password: "" });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.nombreUsuario || !form.password) {
      Swal.fire({
        icon: "warning",
        title: "Campos Incompletos",
        text: "Por favor, complete su nombre de usuario y contraseña.",
      });
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          NombreUsuario: form.nombreUsuario,
          Password: form.password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Login Exitoso: Guardar datos y navegar
        localStorage.setItem("authToken", data.token);
        localStorage.setItem("userName", data.userName);

        // Forzar la actualización del contexto/router
        if (setAuthKey) {
          setAuthKey((prev) => prev + 1);
        }

        navigate("/dashboard", { replace: true });
      } else {
        // Error de API (401, 400, etc.)
        const errorMessage =
          data.message || "Usuario o contraseña incorrectos.";
        Swal.fire({
          icon: "error",
          title: "Error de Acceso",
          text: errorMessage,
        });
      }
    } catch (err) {
      // Comprobar si es un error de Parseo (SyntaxError) o de Red (TypeError)
      const isJsonError = err instanceof SyntaxError;
      console.error("Error de conexión:", err);
      Swal.fire({
        icon: "error",
        title: "Fallo de Conexión",
        text: isJsonError
          ? "El backend devolvió un formato de error no válido. Revise los logs del servidor (Error 500)."
          : "No se pudo establecer conexión con el servidor.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-panel">
        <div className="login-header">
          <h1>
            BUHO <span>Gestión</span>
          </h1>
          <p className="subtitle">Dirección Provincial de Vialidad</p>
          <p className="small-text">Complete sus datos para iniciar sesión</p>
        </div>
        <div className="login-body">
          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <FaEnvelope className="icon" />
              <input
                // 🚨 CORRECCIÓN: Cambiado type="nombreUsuario" a type="text"
                type="text"
                name="nombreUsuario"
                placeholder="Nombre de usuario"
                value={form.nombreUsuario}
                onChange={handleChange}
              />
            </div>
            <div className="input-group">
              <FaLock className="icon" />
              <input
                type="password"
                name="password"
                placeholder="Contraseña"
                value={form.password}
                onChange={handleChange}
              />
            </div>
            <button type="submit" className="btn-login" disabled={loading}>
              {loading ? "Ingresando..." : "Ingresar"}
            </button>
          </form>
          {/*<div className="forgot">
            <a href="#">Olvidé mi clave</a>
          </div>*/}
        </div>
      </div>
      {/* Footer fijo */}
      <footer className="login-footer">
        <div className="barra-multicolor">
          <div className="franja azul-oscuro"></div>
          <div className="franja celeste"></div>
          <div className="franja arena"></div>
        </div>
        <div className="footer-content">
          <div className="footer-left">
            <p>
              Ministerio de Gobierno, <br />
              Infraestructura y Desarrollo Territorial
            </p>
            <img src="/logoMza.png" alt="Mendoza" className="logo" />
          </div>
          <img src="/logoDPV.jpg" alt="Vialidad" className="logo" />
        </div>
      </footer>
    </div>
  );
}
