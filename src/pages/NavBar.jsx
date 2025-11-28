// NavBar.jsx (CÓDIGO ACTUALIZADO)
import { Link } from "react-router-dom";
import "../styles/NavBar.css";
import { usePermissions } from "../utils/authUtils";

// 💡 RECIBE la prop estaLogueado
export default function NavBar({ estaLogueado }) {
  const { isFullAdmin } = usePermissions();

  return (
    <nav className="menu">
      <Link to="/dashboard" className="menu-btn">
        Escritorio
      </Link>
      <Link to="/obras" className="menu-btn">
        Obra
      </Link>

      {/* Solo visible para FULL_ADMIN */}
      {isFullAdmin && (
        <Link to="/usuarios" className="menu-btn">
          Gestor de Usuarios
        </Link>
      )}

      {/* 💡 NUEVO: Solo visible si el usuario está logueado */}
      {estaLogueado && (
        <Link to="/perfil" className="menu-btn">
          Perfil
        </Link>
      )}
    </nav>
  );
}
