// models/devoluciones.model.js
import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

/**
 * Modelo de Devoluciones
 * Representa las devoluciones de productos realizadas por clientes
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
    IdProducto: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'IdProducto',
        comment: 'ID del producto devuelto',
        references: {
            model: 'Productos',
            key: 'IdProducto'
        }
    },
    IdVenta: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'IdVenta',
        comment: 'ID de la venta original',
        references: {
            model: 'Ventas',
            key: 'IdVenta'
        }
    },
    IdEstado: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1, // 1 = Pendiente
        field: 'IdEstado',
        comment: 'ID del estado de la devolución',
        references: {
            model: 'Estado',
            key: 'IdEstado'
        }
    },
    TipoDocumento: {
        type: DataTypes.STRING(50),
        allowNull: true,
        field: 'TipoDocumento',
        comment: 'Tipo de documento del cliente (CC, CE, etc)',
        defaultValue: 'CC'
    },
    NumeroDocumento: {
        type: DataTypes.STRING(20),
        allowNull: true,
        field: 'NumeroDocumento',
        comment: 'Número de documento del cliente'
    },
    ProductoOriginal: {
        type: DataTypes.STRING(200),
        allowNull: true,
        field: 'ProductoOriginal',
        comment: 'Nombre del producto original'
    },
    ProductoCambio: {
        type: DataTypes.STRING(200),
        allowNull: true,
        field: 'ProductoCambio',
        comment: 'Nombre del producto de cambio (si aplica)'
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
        comment: 'Cantidad devuelta'
    },
    Valor: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
        validate: {
            min: {
                args: [0],
                msg: 'El valor no puede ser negativo'
            }
        },
        field: 'Valor',
        comment: 'Valor total de la devolución'
    },
    Motivo: {
        type: DataTypes.TEXT,
        allowNull: false,
        field: 'Motivo',
        comment: 'Motivo de la devolución',
        validate: {
            notEmpty: {
                msg: 'El motivo de devolución es requerido'
            },
            len: {
                args: [5, 500],
                msg: 'El motivo debe tener entre 5 y 500 caracteres'
            }
        }
    },
    Observacion: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'Observacion',
        comment: 'Observaciones adicionales',
        defaultValue: 'Sin observaciones'
    },
    Fecha: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: 'Fecha',
        comment: 'Fecha y hora de la devolución'
    },
    Estado: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        field: 'Estado',
        comment: 'Estado del registro (true=activo, false=inactivo)'
    }
}, {
    tableName: 'Devoluciones',
    timestamps: false,
    hooks: {
        beforeCreate: (devolucion) => {
            console.log(`🔄 Creando nueva devolución para producto ID: ${devolucion.IdProducto}`);
        },
        beforeUpdate: (devolucion) => {
            console.log(`🔄 Actualizando devolución ID: ${devolucion.IdDevolucion}`);
        }
    }
});

// Métodos personalizados
Devolucion.prototype.formatearFecha = function() {
    const fecha = new Date(this.Fecha);
    const año = fecha.getFullYear();
    const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
    const dia = fecha.getDate().toString().padStart(2, '0');
    return `${año}-${mes}-${dia}`;
};

Devolucion.prototype.formatearValor = function() {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0
    }).format(this.Valor);
};

Devolucion.prototype.estaActiva = function() {
    return this.Estado;
};

export default Devolucion;