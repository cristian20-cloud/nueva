// models/productos.model.js
import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

/**
 * Modelo de Productos
 * Representa los productos del inventario con sus características
 * @table Productos
 */
const Producto = sequelize.define('Producto', {
    IdProducto: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
        field: 'IdProducto',
        comment: 'Identificador único del producto'
    },
    Nombre: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            notEmpty: { msg: 'El nombre del producto es requerido' },
            len: { args: [3, 200], msg: 'El nombre debe tener entre 3 y 200 caracteres' }
        },
        field: 'Nombre',
        comment: 'Nombre descriptivo del producto'
    },
    Descripcion: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'Descripcion',
        comment: 'Descripción detallada del producto'
    },
    // PRECIOS
    PrecioCompra: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
        validate: { min: { args: [0], msg: 'El precio de compra no puede ser negativo' } },
        field: 'PrecioCompra',
        comment: 'Precio de compra del producto'
    },
    PrecioVenta: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: { min: { args: [0], msg: 'El precio de venta no puede ser negativo' } },
        field: 'PrecioVenta',
        comment: 'Precio regular de venta al público'
    },
    PrecioMayorista6: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        field: 'PrecioMayorista6',
        comment: 'Precio mayorista para 6+ unidades',
        validate: { min: { args: [0], msg: 'El precio no puede ser negativo' } }
    },
    PrecioMayorista80: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        field: 'PrecioMayorista80',
        comment: 'Precio mayorista para 80+ unidades',
        validate: { min: { args: [0], msg: 'El precio no puede ser negativo' } }
    },
    // STOCK
    Stock: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: { min: { args: [0], msg: 'El stock no puede ser negativo' } },
        field: 'Stock',
        comment: 'Cantidad disponible en inventario (total)'
    },
    // OFERTA
    EnOferta: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'EnOferta',
        comment: 'Indica si el producto está en oferta'
    },
    PrecioOferta: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        field: 'PrecioOferta',
        comment: 'Precio con descuento aplicado',
        validate: { min: { args: [0], msg: 'El precio de oferta no puede ser negativo' } }
    },
    PorcentajeDescuento: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'PorcentajeDescuento',
        comment: 'Porcentaje de descuento aplicado',
        validate: { min: 0, max: 100 }
    },
    // ESTADO
    Estado: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        field: 'Estado',
        comment: 'Estado del producto (true=activo, false=inactivo)'
    },
    url: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'url',
        comment: 'URL de la imagen principal del producto',
        validate: { isUrl: { msg: 'Debe ser una URL válida' } }
    },
    IdCategoria: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'IdCategoria',
        comment: 'ID de la categoría',
        references: { model: 'Categorias', key: 'IdCategoria' }
    }
}, {
    tableName: 'Productos',
    timestamps: false,
    hooks: {
        beforeCreate: (producto) => {
            console.log(`📦 Creando nuevo producto: ${producto.Nombre}`);
            if (producto.EnOferta && producto.PrecioOferta && !producto.PorcentajeDescuento) {
                const descuento = ((producto.PrecioVenta - producto.PrecioOferta) / producto.PrecioVenta) * 100;
                producto.PorcentajeDescuento = Math.round(descuento);
            }
            if (producto.EnOferta && producto.PorcentajeDescuento && !producto.PrecioOferta) {
                const descuento = producto.PrecioVenta * (producto.PorcentajeDescuento / 100);
                producto.PrecioOferta = producto.PrecioVenta - descuento;
            }
        },
        beforeUpdate: (producto) => {
            console.log(`📦 Actualizando producto ID: ${producto.IdProducto}`);
            if (producto.changed('EnOferta') || producto.changed('PrecioOferta') || producto.changed('PorcentajeDescuento')) {
                if (producto.EnOferta) {
                    if (producto.PrecioOferta && !producto.PorcentajeDescuento) {
                        const descuento = ((producto.PrecioVenta - producto.PrecioOferta) / producto.PrecioVenta) * 100;
                        producto.PorcentajeDescuento = Math.round(descuento);
                    }
                    if (producto.PorcentajeDescuento && !producto.PrecioOferta) {
                        const descuento = producto.PrecioVenta * (producto.PorcentajeDescuento / 100);
                        producto.PrecioOferta = producto.PrecioVenta - descuento;
                    }
                } else {
                    producto.PrecioOferta = null;
                    producto.PorcentajeDescuento = null;
                }
            }
        }
    }
});

// Métodos personalizados
Producto.prototype.formatearPrecio = function() {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(this.PrecioVenta);
};

Producto.prototype.formatearPrecioOferta = function() {
    if (!this.EnOferta || !this.PrecioOferta) return null;
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(this.PrecioOferta);
};

Producto.prototype.precioEfectivo = function() {
    return this.EnOferta && this.PrecioOferta ? this.PrecioOferta : this.PrecioVenta;
};

Producto.prototype.stockBajo = function(limite = 10) {
    return this.Stock <= limite;
};

export default Producto;