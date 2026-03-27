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
      len: { args: [3, 50], msg: 'El nombre debe tener entre 3 y 50 caracteres' }
    }
  },
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

// ──────────────────────────────────────────────────────────
// ✅ MÉTODOS PERSONALIZADOS
// ──────────────────────────────────────────────────────────
Rol.prototype.estaActivo = function() {
  return this.Estado;
};

Rol.prototype.tienePermiso = function(idPermiso) {
  return this.Permisos && this.Permisos.includes(idPermiso);
};

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

// ──────────────────────────────────────────────────────────
// ✅ ASOCIACIONES (ESTO ES LO QUE FALTABA)
// ──────────────────────────────────────────────────────────
Rol.associate = (models) => {
  // Relación inversa: un Rol tiene muchos Usuarios
  Rol.hasMany(models.Usuario, {
    foreignKey: 'IdRol',
    as: 'usuarios'
  });
  
  // Relación con DetallePermiso (si existe el modelo)
  if (models.DetallePermiso) {
    Rol.hasMany(models.DetallePermiso, {
      foreignKey: 'IdRol',
      as: 'detallesPermisos'
    });
  }
};

// ──────────────────────────────────────────────────────────
// ✅ ASOCIACIONES (AGREGAR ESTO)
// ──────────────────────────────────────────────────────────
Rol.associate = (models) => {
  Rol.hasMany(models.Usuario, {
    foreignKey: 'IdRol',
    as: 'usuarios'
  });
  
  if (models.DetallePermiso) {
    Rol.hasMany(models.DetallePermiso, {
      foreignKey: 'IdRol',
      as: 'detallesPermisos'
    });
  }
};


export default Rol;