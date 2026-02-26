// models/compras.model.js
import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

const Compra = sequelize.define('Compra', {
    IdCompra: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    IdProveedor: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    Fecha: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    Total: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0
    },
    Estado: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    }
}, {
    tableName: 'Compras',
    timestamps: false
});

export default Compra;