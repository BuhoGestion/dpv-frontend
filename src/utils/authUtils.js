// utils/authUtils.js (CORRECCIÓN FINAL)

const CLAIM_ROLE_SHORT = 'role';
const CLAIM_ROLE_LONG = 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role';

const parseJwt = (token) => {
    if (!token) return {};
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));

    return JSON.parse(jsonPayload);
};

export const getUserPermissions = () => {
    const token = localStorage.getItem("authToken");
    if (!token) return [];

    const payload = parseJwt(token);
    
    //Búsqueda de la propiedad de rol en dos nombres posibles
    const rolesShort = payload[CLAIM_ROLE_SHORT];
    const rolesLong = payload[CLAIM_ROLE_LONG];
    
    // Si la versión corta es un array/string o si la versión larga existe, la usamos
    const roles = rolesShort || rolesLong;

    if (!roles) return [];
    
    // Asegura que siempre sea un array
    let permissionsArray = Array.isArray(roles) ? roles : [roles];
    
    // Normalizar a MAYÚSCULAS para coincidir con la BD ('FULL_ADMIN', 'OBRAS_EDITAR', etc.)
    return permissionsArray.map(perm => perm.toUpperCase()); 
};

export const usePermissions = () => {
    const permissions = getUserPermissions();
    
    return {
        permissions,
        // Normaliza el permiso buscado antes de comparar
        hasPermission: (permiso) => permissions.includes(permiso.toUpperCase()),
        isFullAdmin: permissions.includes('FULL_ADMIN')
    };
};