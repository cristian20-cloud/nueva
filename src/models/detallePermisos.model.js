// models/detallePermisos.model.js
import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

/**
 * Modelo de Detalle de Permisos
 * Relaciona roles con permisos
 */
const DetallePermiso = sequelize.define('DetallePermiso', {
    IdDetalle: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
        field: 'IdDetalle',
        comment: 'Identificador único del detalle'
    },
    IdRol: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'IdRol',
        references: {
            model: 'Roles',
            key: 'IdRol'
        }
    },
    IdPermiso: {
        type: DataTypes.STRING(50),
        allowNull: false,
        field: 'IdPermiso',
        references: {
            model: 'Permisos',
            key: 'IdPermiso'
        }
    }
}, {
    tableName: 'DetallePermisos',
    timestamps: false,
    indexes: [
        {
            unique: true,
            fields: ['IdRol', 'IdPermiso']
        }
    ]
});

export default DetallePermiso; // 👈 ESTO ES CRUCIAL