// models/usuarios.model.js
import { DataTypes, Op } from 'sequelize';
import { sequelize } from '../config/db.js';  // ✅ CORREGIDO
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
    Estado: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        field: 'Estado'
    },
    IdRol: {
        type: DataTypes.INTEGER,
        allowNull: false,
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

// Métodos personalizados
Usuario.prototype.validarClave = async function(clave) {
    return await bcrypt.compare(clave, this.Clave);
};

Usuario.prototype.toJSON = function() {
    const values = { ...this.get() };
    delete values.Clave;
    return values;
};

Usuario.prototype.estaActivo = function() {
    return this.Estado;
};

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
    if (estado !== undefined) whereClause.Estado = estado === 'true' || estado === 'Activado';

    return await this.findAndCountAll({
        where: whereClause,
        include: ['Rol'],
        limit: parseInt(limit),
        offset: (page - 1) * limit,
        order: [['Nombre', 'ASC']]
    });
};

export default Usuario;