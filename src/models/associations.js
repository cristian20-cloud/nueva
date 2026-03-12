// models/associations.js
import Usuario from './usuarios.model.js';
import Rol from './roles.model.js';
import Cliente from './clientes.model.js';
import DetallePermiso from './detallePermisos.model.js';
import Permiso from './permisos.model.js';

/**
 * Definir todas las asociaciones entre modelos
 */
export const defineAssociations = () => {
    
    // 🟢 Usuario ↔ Rol (Muchos a Uno)
    Usuario.belongsTo(Rol, {
        foreignKey: 'IdRol',
        as: 'Rol',  // ⭐ Este alias debe coincidir con el usado en include
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
    });
    
    Rol.hasMany(Usuario, {
        foreignKey: 'IdRol',
        as: 'Usuarios'
    });

    // 🟢 Usuario ↔ Cliente (Uno a Uno)
    Usuario.hasOne(Cliente, {
        foreignKey: 'IdUsuario',
        as: 'Cliente',
        onDelete: 'CASCADE'
    });
    
    Cliente.belongsTo(Usuario, {
        foreignKey: 'IdUsuario',
        as: 'Usuario'
    });

    // 🟢 Rol ↔ DetallePermiso (Uno a Muchos)
    Rol.hasMany(DetallePermiso, {
        foreignKey: 'IdRol',
        as: 'DetallePermisos'
    });
    
    DetallePermiso.belongsTo(Rol, {
        foreignKey: 'IdRol',
        as: 'Rol'
    });

    // 🟢 DetallePermiso ↔ Permiso (Muchos a Uno)
    DetallePermiso.belongsTo(Permiso, {
        foreignKey: 'IdPermiso',
        as: 'Permiso',
        onDelete: 'CASCADE'
    });
    
    Permiso.hasMany(DetallePermiso, {
        foreignKey: 'IdPermiso',
        as: 'DetallePermisos'
    });
};