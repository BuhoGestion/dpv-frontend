// NavBar.jsx (CÓDIGO ACTUALIZADO)
import { Link } from "react-router-dom";
import "../styles/NavBar.css";
import { usePermissions } from "../utils/authUtils";
import { FileText } from "lucide-react";
// 💡 RECIBE la prop estaLogueado
export default function NavBar({ estaLogueado }) {
  const { isFullAdmin } = usePermissions();

  const handleOpenPDF = () => {
    window.open("/instructivo.pdf", "_blank", "noopener,noreferrer");
  };

  return (
    <nav className="menu">
      {/* 📄 Botón con icono de archivo y texto */}
      {estaLogueado && (
        <a 
          className="menu-btn btn-instructivo-nav" 
          onClick={handleOpenPDF}
          title="Ver Instructivo"
          style={{ cursor: 'pointer' }}
        >
          <FileText size={18} className="icon-file" /> 
        </a>
      )}
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
