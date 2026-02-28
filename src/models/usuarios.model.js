// models/usuarios.model.js
import { DataTypes, Op } from 'sequelize';
import { sequelize } from '../config/db.js';
import bcrypt from 'bcryptjs';

/**
 * Modelo de Usuarios
 * Representa los usuarios del sistema
 */
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
    // 🟢 NUEVO: Tipo de usuario (admin, cliente, empleado)
    Tipo: {
        type: DataTypes.ENUM('admin', 'cliente', 'empleado'),
        allowNull: false,
        defaultValue: 'cliente',
        field: 'Tipo',
        comment: 'Tipo de usuario: admin, cliente o empleado'
    },
    // 🟢 MODIFICADO: Estado ahora es ENUM con pendiente/activo/inactivo
    Estado: {
        type: DataTypes.ENUM('pendiente', 'activo', 'inactivo'),
        allowNull: false,
        defaultValue: 'pendiente',
        field: 'Estado',
        comment: 'Estado del usuario: pendiente (requiere aprobación), activo, inactivo'
    },
    IdRol: {
        type: DataTypes.INTEGER,
        allowNull: true, // 🟢 MODIFICADO: Ahora puede ser null hasta que el admin asigne rol
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
            // Si es cliente y no tiene rol, se le asigna rol por defecto después (en controlador)
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

// Métodos personalizados
Usuario.prototype.validarClave = async function(clave) {
    return await bcrypt.compare(clave, this.Clave);
};

Usuario.prototype.toJSON = function() {
    const values = { ...this.get() };
    delete values.Clave;
    return values;
};

// 🟢 MODIFICADO: Verificar si está activo (ahora es ENUM)
Usuario.prototype.estaActivo = function() {
    return this.Estado === 'activo';
};

// 🟢 NUEVO: Verificar si está pendiente
Usuario.prototype.estaPendiente = function() {
    return this.Estado === 'pendiente';
};

// 🟢 NUEVO: Obtener tipo de usuario
Usuario.prototype.esAdmin = function() {
    return this.Tipo === 'admin';
};

Usuario.prototype.esCliente = function() {
    return this.Tipo === 'cliente';
};

// 🟢 MODIFICADO: Buscar con filtros adaptado a nuevos estados
Usuario.buscarConFiltros = async function(filtros) {
    const { search, rol, estado, tipo, page = 1, limit = 10 } = filtros;
    const whereClause = {};

    if (search) {
        whereClause[Op.or] = [
            { Nombre: { [Op.like]: `%${search}%` } },
            { Correo: { [Op.like]: `%${search}%` } }
        ];
    }

    if (rol) whereClause.IdRol = rol;
    if (tipo) whereClause.Tipo = tipo;
    if (estado) whereClause.Estado = estado;

    return await this.findAndCountAll({
        where: whereClause,
        include: ['Rol'],
        limit: parseInt(limit),
        offset: (page - 1) * limit,
        order: [['Nombre', 'ASC']]
    });
};

// 🟢 NUEVO: Buscar usuarios pendientes
Usuario.buscarPendientes = async function() {
    return await this.findAll({
        where: { Estado: 'pendiente' },
        include: ['Rol']
    });
};

export default Usuario;