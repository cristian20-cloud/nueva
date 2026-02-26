// models/detalleVentas.model.js
import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

/**
 * Modelo de Detalle de Ventas
 * Representa los productos incluidos en cada venta
 * @table DetalleVentas
 */
const DetalleVenta = sequelize.define('DetalleVenta', {
    IdDetalleVenta: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
        field: 'IdDetalleVenta',
        comment: 'Identificador único del detalle'
    },
    IdVenta: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'IdVenta',
        references: {
            model: 'Ventas',
            key: 'IdVenta'
        }
    },
    IdProducto: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'IdProducto',
        references: {
            model: 'Productos',
            key: 'IdProducto'
        }
    },
    Cantidad: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
            min: {
                args: [1],
                msg: 'La cantidad debe ser al menos 1'
            }
        },
        field: 'Cantidad',
        comment: 'Cantidad vendida'
    },
    Precio: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: {
            min: {
                args: [0],
                msg: 'El precio no puede ser negativo'
            }
        },
        field: 'Precio',
        comment: 'Precio unitario de venta'
    },
    Subtotal: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        field: 'Subtotal',
        comment: 'Subtotal (Cantidad * Precio)'
    }
}, {
    tableName: 'DetalleVentas',
    timestamps: false,
    hooks: {
        beforeCreate: (detalle) => {
            detalle.Subtotal = detalle.Cantidad * detalle.Precio;
        },
        beforeUpdate: (detalle) => {
            detalle.Subtotal = detalle.Cantidad * detalle.Precio;
        }
    }
});

export default DetalleVenta; 