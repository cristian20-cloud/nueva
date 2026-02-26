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
            isIn: {
                args: [['Administrador', 'Vendedor', 'Gestor de Inventario', 'Recursos Humanos', 'Gestor de Clientes', 'Usuario']],
                msg: 'Rol no válido'
            }
        }
    },
    Estado: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        field: 'Estado'
    }
}, {
    tableName: 'Roles',
    timestamps: false
});

export default Rol;  