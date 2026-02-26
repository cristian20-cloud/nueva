// models/detalleCompras.model.js
import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

const DetalleCompra = sequelize.define('DetalleCompra', {
    IdDetalleCompra: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
        field: 'IdDetalleCompra'
    },
    IdCompra: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'IdCompra',
        references: {
            model: 'Compras',
            key: 'IdCompra'
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
            min: { args: [1], msg: 'La cantidad debe ser al menos 1' }
        },
        field: 'Cantidad'
    },
    Precio: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: {
            min: { args: [0], msg: 'El precio no puede ser negativo' }
        },
        field: 'Precio'
    },
    Subtotal: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        field: 'Subtotal'
    }
}, {
    tableName: 'DetalleCompras',
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

export default DetalleCompra; 