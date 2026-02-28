// models/roles.model.js
import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

/**
 * Modelo de Roles
 * Representa los roles de usuario en el sistema
 */
const Rol = sequelize.define('Rol', {
    IdRol: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
        field: 'IdRol'
    },
    Nombre: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
        field: 'Nombre',
        validate: {
            notEmpty: { msg: 'El nombre del rol es requerido' },
            // 🟢 MODIFICADO: Eliminamos validación fija para poder crear roles dinámicos
            len: { args: [3, 50], msg: 'El nombre debe tener entre 3 y 50 caracteres' }
        }
    },
    // 🟢 NUEVO: Descripción del rol
    Descripcion: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'Descripcion',
        comment: 'Descripción del rol y sus funciones'
    },
    Estado: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        field: 'Estado'
    },
    // 🟢 NUEVO: Permisos como JSON (cache para evitar joins)
    Permisos: {
        type: DataTypes.JSON,
        allowNull: true,
        field: 'Permisos',
        defaultValue: [],
        comment: 'Array de IDs de permisos para acceso rápido'
    }
}, {
    tableName: 'Roles',
    timestamps: false
});

// 🟢 NUEVO: Métodos personalizados
Rol.prototype.estaActivo = function() {
    return this.Estado;
};

// 🟢 NUEVO: Verificar si tiene un permiso específico
Rol.prototype.tienePermiso = function(idPermiso) {
    return this.Permisos && this.Permisos.includes(idPermiso);
};

// 🟢 NUEVO: Agregar permiso al rol
Rol.prototype.agregarPermiso = async function(idPermiso, DetallePermisoModel) {
    if (!this.Permisos) this.Permisos = [];
    
    if (!this.Permisos.includes(idPermiso)) {
        this.Permisos.push(idPermiso);
        
        // También guardar en DetallePermisos si existe el modelo
        if (DetallePermisoModel) {
            await DetallePermisoModel.create({
                IdRol: this.IdRol,
                IdPermiso: idPermiso
            });
        }
        
        await this.save();
    }
    return this;
};

export default Rol;