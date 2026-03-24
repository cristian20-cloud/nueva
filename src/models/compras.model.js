import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

const Compra = sequelize.define('Compra', {
    IdCompra: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    IdProveedor: {
        type: DataTypes.STRING, // Nombre del proveedor (puedes cambiar a INT si usas relación con tabla Proveedores)
        allowNull: false
    },
    Fecha: {
        type: DataTypes.DATEONLY, // Solo fecha sin hora, más limpio para tu formato 'es-CO'
        allowNull: false
    },
    Total: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
    },
    MetodoPago: {
        type: DataTypes.ENUM('Efectivo', 'Transferencia', 'Tarjeta'),
        allowNull: false,
        defaultValue: 'Efectivo'
    },
    Estado: {
        type: DataTypes.ENUM('Completada', 'Pendiente', 'Anulada'),
        allowNull: false,
        defaultValue: 'Completada'
    },
    IsActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    }
}, {
    tableName: 'Compras',
    timestamps: false,
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci'
});

export default Compra;