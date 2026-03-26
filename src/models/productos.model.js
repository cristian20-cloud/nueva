import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

/**
 * Modelo de Productos
 * Gestiona el catálogo de productos con precios, stock, variantes y multimedia
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

    // 📝 INFORMACIÓN BÁSICA
    Nombre: {
        type: DataTypes.STRING(200),
        allowNull: false,
        field: 'Nombre',
        validate: {
            notEmpty: { msg: 'El nombre del producto es obligatorio' },
            len: { args: [3, 200], msg: 'El nombre debe tener entre 3 y 200 caracteres' }
        },
        comment: 'Nombre descriptivo del producto'
    },
    Categoria: {
        type: DataTypes.STRING(100),
        allowNull: false,
        field: 'Categoria',
        defaultValue: 'BEISBOLERA PREMIUM',
        comment: 'Categoría del producto (ej: BEISBOLERA PREMIUM, GORRA CLÁSICA)'
    },
    IdCategoria: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'IdCategoria',
        references: {
            model: 'Categorias',
            key: 'IdCategoria'
        }
    },
    Descripcion: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'Descripcion',
        comment: 'Descripción detallada del producto'
    },

    // 💰 PRECIOS
    PrecioCompra: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        field: 'PrecioCompra',
        validate: { min: { args: [0], msg: 'El precio de compra no puede ser negativo' } },
        comment: 'Precio de costo del producto'
    },
    PrecioVenta: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
        field: 'PrecioVenta',
        validate: { min: { args: [0], msg: 'El precio de venta no puede ser negativo' } },
        comment: 'Precio regular de venta al público'
    },
    PrecioOferta: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0,
        field: 'PrecioOferta',
        validate: { min: { args: [0], msg: 'El precio de oferta no puede ser negativo' } },
        comment: 'Precio con descuento aplicado'
    },
    PrecioMayorista6: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0,
        field: 'PrecioMayorista6',
        validate: { min: { args: [0], msg: 'El precio no puede ser negativo' } },
        comment: 'Precio mayorista para compras de 6+ unidades'
    },
    PrecioMayorista80: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0,
        field: 'PrecioMayorista80',
        validate: { min: { args: [0], msg: 'El precio no puede ser negativo' } },
        comment: 'Precio mayorista para compras de 80+ unidades'
    },
    EnOfertaVenta: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: 'EnOfertaVenta',
        comment: 'Indica si el producto tiene oferta activa'
    },
    PorcentajeDescuento: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'PorcentajeDescuento',
        validate: { min: 0, max: 100 },
        comment: 'Porcentaje de descuento aplicado (0-100)'
    },

    // 📦 STOCK E INVENTARIO
    EnInventario: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        field: 'EnInventario',
        comment: 'Indica si el producto se gestiona con inventario'
    },
    Stock: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: 'Stock',
        validate: { min: { args: [0], msg: 'El stock no puede ser negativo' } },
        comment: 'Cantidad total disponible en inventario'
    },
    TallasStock: {
        type: DataTypes.JSON,
        allowNull: true,
        field: 'TallasStock',
        comment: 'Array de objetos: [{ talla: "M", cantidad: 10 }, ...]',
        defaultValue: []
    },

    // 🎨 VARIANTES
    Colores: {
        type: DataTypes.JSON,
        allowNull: true,
        field: 'Colores',
        comment: 'Array de nombres de colores disponibles: ["Negro", "Blanco"]',
        defaultValue: ['Negro']
    },

    // 🖼️ MULTIMEDIA
    Imagenes: {
        type: DataTypes.JSON,
        allowNull: true,
        field: 'Imagenes',
        comment: 'Array de URLs de imágenes del producto',
        defaultValue: [],
        validate: {
            isArrayUrl: (urls) => {
                if (Array.isArray(urls)) {
                    urls.forEach(url => {
                        if (url && !url.startsWith('http')) {
                            throw new Error('Cada imagen debe ser una URL válida');
                        }
                    });
                }
            }
        }
    },

    // 📊 MÉTRICAS Y ESTADO
    Destacado: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: 'Destacado',
        comment: 'Indica si el producto aparece como destacado'
    },
    Sales: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: 'Sales',
        comment: 'Número total de ventas registradas'
    },
    IsActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        field: 'IsActive',
        comment: 'Estado lógico: true=activo, false=inactivo'
    }
}, {
    tableName: 'Productos',
    timestamps: false,
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
    hooks: {
        beforeCreate: (producto) => {
            // Calcular porcentaje de descuento si no se proporciona
            if (producto.EnOfertaVenta && producto.PrecioVenta && producto.PrecioOferta) {
                if (!producto.PorcentajeDescuento) {
                    const descuento = ((producto.PrecioVenta - producto.PrecioOferta) / producto.PrecioVenta) * 100;
                    producto.PorcentajeDescuento = Math.round(descuento);
                }
            }
            // Calcular precio de oferta si solo se da el porcentaje
            if (producto.EnOfertaVenta && producto.PrecioVenta && producto.PorcentajeDescuento && !producto.PrecioOferta) {
                const descuento = producto.PrecioVenta * (producto.PorcentajeDescuento / 100);
                producto.PrecioOferta = producto.PrecioVenta - descuento;
            }
            // Calcular stock total desde tallas si no se proporciona
            if (producto.TallasStock && Array.isArray(producto.TallasStock) && !producto.Stock) {
                producto.Stock = producto.TallasStock.reduce((sum, t) => sum + (t.cantidad || 0), 0);
            }
            console.log(`📦 Creando producto: ${producto.Nombre}`);
        },
        beforeUpdate: (producto) => {
            // Recalcular descuento si cambian precios de oferta
            if (producto.changed('EnOfertaVenta') || producto.changed('PrecioVenta') || producto.changed('PrecioOferta')) {
                if (producto.EnOfertaVenta && producto.PrecioVenta && producto.PrecioOferta) {
                    const descuento = ((producto.PrecioVenta - producto.PrecioOferta) / producto.PrecioVenta) * 100;
                    producto.PorcentajeDescuento = Math.round(descuento);
                } else if (!producto.EnOfertaVenta) {
                    producto.PrecioOferta = 0;
                    producto.PorcentajeDescuento = null;
                }
            }
            // Recalcular stock total desde tallas
            if (producto.changed('TallasStock') && Array.isArray(producto.TallasStock)) {
                producto.Stock = producto.TallasStock.reduce((sum, t) => sum + (t.cantidad || 0), 0);
            }
            console.log(`📦 Actualizando producto ID: ${producto.IdProducto}`);
        }
    }
});

// ═══════════════════════════════════════════════════════
// MÉTODOS DE INSTANCIA (Helpers para frontend)
// ═══════════════════════════════════════════════════════

/**
 * Formatea el precio de venta en COP
 * @returns {string} Precio formateado
 */
Producto.prototype.formatearPrecio = function() {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(this.PrecioVenta || 0);
};

/**
 * Formatea el precio de oferta si está activo
 * @returns {string|null} Precio de oferta formateado o null
 */
Producto.prototype.formatearPrecioOferta = function() {
    if (!this.EnOfertaVenta || !this.PrecioOferta) return null;
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(this.PrecioOferta);
};

/**
 * Obtiene el precio efectivo (oferta si está activa, sino precio normal)
 * @returns {number} Precio a mostrar
 */
Producto.prototype.precioEfectivo = function() {
    return this.EnOfertaVenta && this.PrecioOferta > 0 ? this.PrecioOferta : this.PrecioVenta;
};

/**
 * Verifica si el stock está bajo el límite definido
 * @param {number} limite - Límite para considerar stock bajo (default: 10)
 * @returns {boolean}
 */
Producto.prototype.stockBajo = function(limite = 10) {
    return (this.Stock || 0) <= limite;
};

/**
 * Obtiene el total de stock calculado desde las tallas
 * @returns {number}
 */
Producto.prototype.calcularStockTotal = function() {
    if (!this.TallasStock || !Array.isArray(this.TallasStock)) return this.Stock || 0;
    return this.TallasStock.reduce((sum, t) => sum + (t.cantidad || 0), 0);
};

/**
 * Verifica si el producto tiene imágenes válidas
 * @returns {boolean}
 */
Producto.prototype.tieneImagenes = function() {
    return Array.isArray(this.Imagenes) && this.Imagenes.some(url => url?.trim());
};

/**
 * Obtiene la primera imagen válida o URL por defecto
 * @returns {string}
 */
Producto.prototype.getImagenPrincipal = function() {
    if (this.tieneImagenes()) {
        return this.Imagenes.find(url => url?.trim()) || '/images/placeholder-product.png';
    }
    return '/images/placeholder-product.png';
};

export default Producto;