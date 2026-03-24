import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

const CompraDetalle = sequelize.define('CompraDetalle', {
    IdDetalle: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    IdCompra: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'Compras',
            key: 'IdCompra'
        }
    },
    IdProducto: {
        type: DataTypes.INTEGER,
        allowNull: true, // NULL si es producto nuevo no registrado en catálogo
        comment: 'ID del producto en tabla Productos (opcional)'
    },
    NombreProducto: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    Talla: {
        type: DataTypes.STRING(20),
        allowNull: false
    },
    Cantidad: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
        validate: { min: 1 }
    },
    PrecioCompra: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
    },
    PrecioVenta: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0
    },
    PrecioMayorista6: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0
    },
    PrecioMayorista80: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0
    },
    Subtotal: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0,
        comment: 'Cantidad * PrecioCompra (calculado en backend)'
    }
}, {
    tableName: 'CompraDetalles',
    timestamps: false,
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci'
});

export default CompraDetalle;