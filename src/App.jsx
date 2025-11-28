import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Obras from "./pages/ObrasDPV";
import Dashboard from "./pages/Dashboard";
import User from "./pages/UserABM"; 
import Login from "./pages/Login";
import Perfil from "./pages/Perfil";
import Swal from "sweetalert2";
import PermissionRoute from "./pages/PermissionRoute"; 

function App() {
  const [userName, setUserName] = useState("");
  const [authKey, setAuthKey] = useState(0);
  const isAuthenticated = !!localStorage.getItem("authToken");
// FUNCIÓN CLAVE: Para actualizar el nombre de usuario (Header/localStorage)
    const handleUserNameUpdate = (newUserName) => {
        // 1. Actualiza localStorage
        localStorage.setItem("userName", newUserName);
        // 2. Actualiza el estado de React que alimenta el Header
        setUserName(newUserName);
    };
  //Función para manejar el logout (Mantenida)
  const handleLogout = () => {
    Swal.fire({
        title: "¿Cerrar sesión?",
        text: "¡Hasta Pronto!",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#d33",
        cancelButtonColor: "#3085d6",
        confirmButtonText: "Sí, cerrar sesión",
        cancelButtonText: "Cancelar",
        customClass: {
             container: 'my-swal-zindex-fix'
        },    }).then((result) => {
      if (result.isConfirmed) {
        localStorage.removeItem("authToken");
        localStorage.removeItem("userName");
        setUserName("");
        setAuthKey(prev => prev + 1); 
        window.location.href = "/login";
      }
    });
  };
  useEffect(() => {
    const currentUserName = localStorage.getItem("userName");
    setUserName(currentUserName || "");
    if (currentUserName && !isAuthenticated) {
        setAuthKey(prev => prev + 1);
    }
  }, [isAuthenticated]);

  // Componente central que pasa el nombre de usuario y el logout (Mantenido)
  const Layout = ({ children }) => {
        // 💡 CAMBIO: Usamos React.Children.map para inyectar todas las props
        return React.Children.map(children, child => {
            if (React.isValidElement(child)) {
                return React.cloneElement(child, {
                    userName,
                    onLogout: handleLogout,
                    // 💡 PASAMOS la nueva función de actualización de perfil SÓLO al componente Perfil
                    onProfileUpdate: handleUserNameUpdate,
                });
            }
            return child;
        });
    };

  return (
        <BrowserRouter key={authKey}>
            <Routes>
                {/* 1. Ruta de Login */}
                <Route
                    path="/login"
                    element={isAuthenticated ? <Navigate to="/dashboard" /> : <Login setAuthKey={setAuthKey} />}
                />
                {/* 2. Rutas Protegidas CON PERMISOS */}
                <Route
                    path="/dashboard"
                    element={<PermissionRoute><Layout><Dashboard /></Layout></PermissionRoute>}
                />
                <Route
                    path="/obras"
                    element={<PermissionRoute requiredPermissions={['OBRAS_VER', 'OBRAS_EDITAR']}>
                        <Layout><Obras /></Layout>
                    </PermissionRoute>}
                />
                <Route
                    path="/usuarios" 
                    element={<PermissionRoute requiredPermissions={['FULL_ADMIN']}>
                        <Layout><User /></Layout>
                    </PermissionRoute>}
                />
                {/* 💡 RUTA DE PERFIL: Ahora recibe las props de Layout, incluyendo onProfileUpdate */}
                <Route
                    path="/perfil" 
                    element={
                        <PermissionRoute> 
                            <Layout><Perfil /></Layout>
                        </PermissionRoute>
                    }
                />
                {/* 3. Rutas por defecto ("/") y 404 (Mantenidas) */}
                <Route
                    path="/"
                    element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />}
                />
                <Route path="*" element={<Navigate to="/dashboard" />} />
            </Routes>
        </BrowserRouter>
    );
}
export default App;