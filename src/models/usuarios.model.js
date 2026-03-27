// models/usuarios.model.js
import { DataTypes, Op } from 'sequelize';
import { sequelize } from '../config/db.js';
import bcrypt from 'bcryptjs';

const Usuario = sequelize.define('Usuario', {
  IdUsuario: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false,
    field: 'IdUsuario'
  },
  Nombre: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'Nombre',
    validate: {
      notEmpty: { msg: 'El nombre es requerido' },
      len: { args: [3, 100], msg: 'El nombre debe tener entre 3 y 100 caracteres' }
    }
  },
  Correo: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    field: 'Correo',
    validate: {
      isEmail: { msg: 'Debe proporcionar un correo electrónico válido' }
    }
  },
  Clave: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'Clave',
    validate: {
      notEmpty: { msg: 'La contraseña es requerida' },
      len: { args: [6, 100], msg: 'La contraseña debe tener al menos 6 caracteres' }
    }
  },
  Estado: {
    type: DataTypes.STRING(20),
    allowNull: true,
    defaultValue: 'pendiente',
    field: 'Estado',
    comment: 'Estado del usuario: pendiente (requiere aprobación), activo, inactivo',
    validate: {
      isIn: {
        args: [['pendiente', 'activo', 'inactivo']],
        msg: 'Estado no válido. Valores permitidos: pendiente, activo, inactivo'
      }
    }
  },
  IdRol: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'IdRol',
    references: { model: 'Roles', key: 'IdRol' }
  }
}, {
  tableName: 'Usuarios',
  timestamps: false,
  hooks: {
    beforeCreate: async (usuario) => {
      if (usuario.Clave) {
        const salt = await bcrypt.genSalt(10);
        usuario.Clave = await bcrypt.hash(usuario.Clave, salt);
      }
      if (usuario.Correo) {
        usuario.Correo = usuario.Correo.toLowerCase();
      }
    },
    beforeUpdate: async (usuario) => {
      if (usuario.changed('Clave') && usuario.Clave) {
        const salt = await bcrypt.genSalt(10);
        usuario.Clave = await bcrypt.hash(usuario.Clave, salt);
      }
      if (usuario.changed('Correo') && usuario.Correo) {
        usuario.Correo = usuario.Correo.toLowerCase();
      }
    }
  }
});

// ──────────────────────────────────────────────────────────
// ✅ MÉTODOS PERSONALIZADOS
// ──────────────────────────────────────────────────────────
Usuario.prototype.validarClave = async function(clave) {
  return await bcrypt.compare(clave, this.Clave);
};

Usuario.prototype.toJSON = function() {
  const values = { ...this.get() };
  delete values.Clave;
  return values;
};

Usuario.prototype.estaActivo = function() {
  return this.Estado === 'activo';
};

Usuario.prototype.estaPendiente = function() {
  return this.Estado === 'pendiente';
};

// ──────────────────────────────────────────────────────────
// ✅ MÉTODOS ESTÁTICOS
// ──────────────────────────────────────────────────────────
Usuario.buscarConFiltros = async function(filtros) {
  const { search, rol, estado, page = 1, limit = 10 } = filtros;
  const whereClause = {};
  
  if (search) {
    whereClause[Op.or] = [
      { Nombre: { [Op.like]: `%${search}%` } },
      { Correo: { [Op.like]: `%${search}%` } }
    ];
  }
  if (rol) whereClause.IdRol = rol;
  if (estado) whereClause.Estado = estado;
  
  return await this.findAndCountAll({
    where: whereClause,
    include: [{ association: 'rolData' }],  // ← Usar el alias definido en associate
    limit: parseInt(limit),
    offset: (page - 1) * limit,
    order: [['Nombre', 'ASC']]
  });
};

Usuario.buscarPendientes = async function() {
  return await this.findAll({
    where: { Estado: 'pendiente' },
    include: [{ association: 'rolData' }]  // ← Usar el alias definido en associate
  });
};

// ──────────────────────────────────────────────────────────
// ✅ ASOCIACIONES (ESTO ES LO QUE FALTABA)
// ──────────────────────────────────────────────────────────
Usuario.associate = (models) => {
  // Relación con Rol (Usuario pertenece a un Rol)
  Usuario.belongsTo(models.Rol, {
    foreignKey: 'IdRol',
    as: 'rolData',        // ← Alias que usas en auth.controller.js
    targetKey: 'IdRol'
  });
  
  // Relación con Cliente (si existe el modelo)
  if (models.Cliente) {
    Usuario.hasOne(models.Cliente, {
      foreignKey: 'IdUsuario',
      as: 'clienteData'
    });
  }
};

// ──────────────────────────────────────────────────────────
// ✅ ASOCIACIONES (AGREGAR ESTO)
// ──────────────────────────────────────────────────────────
Usuario.associate = (models) => {
  Usuario.belongsTo(models.Rol, {
    foreignKey: 'IdRol',
    as: 'rolData',
    targetKey: 'IdRol'
  });
  
  if (models.Cliente) {
    Usuario.hasOne(models.Cliente, {
      foreignKey: 'IdUsuario',
      as: 'clienteData'
    });
  }
};



export default Usuario;