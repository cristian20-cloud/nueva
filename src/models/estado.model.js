// models/estado.model.js
import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

/**
 * Modelo de Estados
 * Representa los posibles estados de ventas
 * @table Estado
 */
const Estado = sequelize.define('Estado', {
    IdEstado: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
        field: 'IdEstado'
    },
    Nombre: {
        type: DataTypes.STRING(50),
        allowNull: false,
        field: 'Nombre',
        comment: 'Nombre del estado (Completada, Pendiente, Anulada)'
    },
    Estado: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        field: 'Estado'
    }
}, {
    tableName: 'Estado',
    timestamps: false
});

export default Estado; 