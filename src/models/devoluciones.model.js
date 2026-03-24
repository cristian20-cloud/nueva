import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

/**
 * Modelo de Devoluciones
 * Gestiona garantías, cambios y devoluciones de productos
 * @table Devoluciones
 */
const Devolucion = sequelize.define('Devolucion', {
    IdDevolucion: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
        field: 'IdDevolucion',
        comment: 'Identificador único de la devolución'
    },

    // 👤 Cliente (puede ser FK o dato directo según tu flujo)
    IdCliente: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'IdCliente',
        comment: 'ID del cliente (nullable si es venta sin registro)',
        references: {
            model: 'Clientes',
            key: 'IdCliente'
        }
    },
    NombreCliente: {
        type: DataTypes.STRING(150),
        allowNull: false,
        field: 'NombreCliente',
        comment: 'Nombre completo del cliente (snapshot para historial)'
    },
    TipoDocumento: {
        type: DataTypes.ENUM('CC', 'CE', 'TI', 'NIT', 'PASAPORTE'),
        allowNull: true,
        field: 'TipoDocumento',
        defaultValue: 'CC',
        comment: 'Tipo de documento del cliente'
    },
    NumeroDocumento: {
        type: DataTypes.STRING(20),
        allowNull: true,
        field: 'NumeroDocumento',
        comment: 'Número de documento del cliente'
    },

    // 📦 Producto Original (devuelto)
    IdProductoOriginal: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'IdProductoOriginal',
        comment: 'ID del producto original en catálogo',
        references: {
            model: 'Productos',
            key: 'IdProducto'
        }
    },
    NombreProductoOriginal: {
        type: DataTypes.STRING(200),
        allowNull: false,
        field: 'NombreProductoOriginal',
        comment: 'Nombre del producto original (snapshot)'
    },

    // 🔄 Producto de Cambio (si aplica)
    IdProductoCambio: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'IdProductoCambio',
        comment: 'ID del producto de reemplazo (nullable si es reembolso)',
        references: {
            model: 'Productos',
            key: 'IdProducto'
        }
    },
    NombreProductoCambio: {
        type: DataTypes.STRING(200),
        allowNull: true,
        field: 'NombreProductoCambio',
        comment: 'Nombre del producto de cambio (snapshot)'
    },
    MismoModelo: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: 'MismoModelo',
        comment: 'Indica si el cambio es por el mismo modelo'
    },

    // 💰 Valores
    Cantidad: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
        field: 'Cantidad',
        validate: {
            min: { args: [1], msg: 'La cantidad debe ser al menos 1' }
        },
        comment: 'Cantidad de productos devueltos'
    },
    PrecioUnitario: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
        field: 'PrecioUnitario',
        validate: {
            min: { args: [0], msg: 'El precio no puede ser negativo' }
        },
        comment: 'Precio unitario del producto (snapshot)'
    },
    ValorTotal: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
        field: 'ValorTotal',
        comment: 'Cantidad * PrecioUnitario (calculado en backend)'
    },

    // 📝 Motivos y Evidencia
    Motivo: {
        type: DataTypes.TEXT,
        allowNull: false,
        field: 'Motivo',
        validate: {
            notEmpty: { msg: 'El motivo es obligatorio' },
            len: { args: [10, 500], msg: 'El motivo debe tener entre 10 y 500 caracteres' }
        },
        comment: 'Descripción detallada del motivo de devolución'
    },
    EvidenciaUrl: {
        type: DataTypes.STRING(500),
        allowNull: false,
        field: 'EvidenciaUrl',
        comment: 'URL o base64 de la imagen de evidencia'
    },

    // 📊 Estado y Resolución
    Estado: {
        type: DataTypes.ENUM('Pendiente', 'Aprobada', 'Rechazada'),
        allowNull: false,
        defaultValue: 'Pendiente',
        field: 'Estado',
        comment: 'Estado actual de la devolución'
    },
    MotivoRechazo: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'MotivoRechazo',
        comment: 'Motivo especificado si la devolución fue rechazada'
    },
    FechaResolucion: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'FechaResolucion',
        comment: 'Fecha cuando se aprobó o rechazó la devolución'
    },

    // 📅 Fechas y Auditoría
    Fecha: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: 'Fecha',
        comment: 'Fecha de registro de la devolución'
    },
    IsActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        field: 'IsActive',
        comment: 'Registro lógico: true=activo, false=eliminado'
    }
}, {
    tableName: 'Devoluciones',
    timestamps: false,
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
    hooks: {
        beforeCreate: (devolucion) => {
            // Calcular ValorTotal automáticamente
            if (devolucion.Cantidad && devolucion.PrecioUnitario) {
                devolucion.ValorTotal = devolucion.Cantidad * devolucion.PrecioUnitario;
            }
            console.log(`🔄 Creando devolución #${devolucion.IdDevolucion || 'nueva'} para ${devolucion.NombreCliente}`);
        },
        beforeUpdate: (devolucion) => {
            // Recalcular ValorTotal si cambian cantidad o precio
            if (devolucion.changed('Cantidad') || devolucion.changed('PrecioUnitario')) {
                devolucion.ValorTotal = devolucion.Cantidad * devolucion.PrecioUnitario;
            }
            console.log(`🔄 Actualizando devolución ID: ${devolucion.IdDevolucion}`);
        }
    }
});

// ═══════════════════════════════════════════════════════
// MÉTODOS DE INSTANCIA (Helpers para frontend)
// ═══════════════════════════════════════════════════════

/**
 * Formatea la fecha para mostrar en frontend (DD/MM/YYYY)
 * @returns {string} Fecha formateada
 */
Devolucion.prototype.formatearFecha = function() {
    if (!this.Fecha) return 'N/A';
    const fecha = new Date(this.Fecha);
    return fecha.toLocaleDateString('es-CO', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
};

/**
 * Formatea el valor total en pesos colombianos
 * @returns {string} Valor formateado como moneda COP
 */
Devolucion.prototype.formatearValor = function() {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(this.ValorTotal || 0);
};

/**
 * Verifica si la devolución está pendiente de resolución
 * @returns {boolean}
 */
Devolucion.prototype.esPendiente = function() {
    return this.Estado === 'Pendiente' && this.IsActive;
};

/**
 * Verifica si la devolución fue aprobada
 * @returns {boolean}
 */
Devolucion.prototype.esAprobada = function() {
    return this.Estado === 'Aprobada' && this.IsActive;
};

/**
 * Verifica si la devolución fue rechazada
 * @returns {boolean}
 */
Devolucion.prototype.esRechazada = function() {
    return this.Estado === 'Rechazada' && this.IsActive;
};

export default Devolucion;