import React from "react";
import { Navigate } from "react-router-dom";
import { usePermissions } from "../utils/authUtils";
import Swal from "sweetalert2";

const PermissionRoute = ({ children, requiredPermissions = [] }) => {
  const isAuthenticated = localStorage.getItem("authToken");

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const { permissions, isFullAdmin } = usePermissions();

  // Si es admin o no se requieren permisos específicos, pasa.
  if (requiredPermissions.length === 0 || isFullAdmin) {
    return children;
  }

  // Verificar si tiene alguno de los permisos requeridos
  const hasRequiredPermission = requiredPermissions.some((requiredPerm) =>
    permissions.includes(requiredPerm)
  );

  if (hasRequiredPermission) {
    return children;
  } else {
    // Bloqueo de acceso
    setTimeout(() => {
      Swal.fire({
        icon: "error",
        title: "Acceso Denegado",
        text: "No tienes los permisos necesarios para acceder a esta sección.",
      });
    }, 100);
    return <Navigate to="/dashboard" replace />;
  }
};

export default PermissionRoute;
