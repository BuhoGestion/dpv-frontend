// Header.jsx (CÓDIGO ACTUALIZADO)
import React from "react";
import NavBar from "./NavBar"; 
import "../styles/Header.css";
import { User, LogOut } from 'lucide-react';
import { usePermissions } from '../utils/authUtils';

function Header({ nombreUsuario, onLogout }) { 
  
  // Determinamos si el usuario está logueado
  const estaLogueado = !!nombreUsuario; 

  // La prop isFullAdmin ya está disponible aquí, pero la pasaremos desde NavBar para mantener la lógica de permisos allí.
  // const { isFullAdmin } = usePermissions(); // No la necesitamos directamente en Header a menos que se use en otro lado

  return (
    <header className="header-content">
      <div className="header-left">
        <p>
          Ministerio de Gobierno, <br />
          Infraestructura y Desarrollo Territorial
        </p>
        <img src="/logoMza.png" alt="Mendoza" className="logo" />
      </div>

      {/*PASAMOS la prop estaLogueado a NavBar */}
      <NavBar estaLogueado={estaLogueado} /> 

      <div className="user-info header-right">
        {nombreUsuario ? (
          <div className="user-profile">
            <div className="user-details">
              <div className="user-name-row">
                <User size={20} className="user-icon" /> 
                <strong>{nombreUsuario}</strong>
              </div>
              <p className="subsecretaria-text">Subsecretaría de Infraestructura y Desarrollo Territorial</p>
            </div>
            <button className="btn-logout" onClick={onLogout} title="Cerrar Sesión">
              <LogOut size={20} />
            </button>
          </div>
        ) : (
          <p className="subsecretaria-text">Subsecretaría de Infraestructura y Desarrollo Territorial</p>
        )}
      </div>
    </header>
  );
}

export default Header;