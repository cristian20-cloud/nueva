// models/ventas.model.js
import { DataTypes, Op } from 'sequelize';
import { sequelize } from '../config/db.js';

/**
 * Modelo de Ventas
 * Representa las ventas realizadas a clientes
 * @table Ventas
 */
const Venta = sequelize.define('Venta', {
    IdVenta: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
        field: 'IdVenta',
        comment: 'Identificador único de la venta'
    },
    IdCliente: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'IdCliente',
        comment: 'ID del cliente',
        references: {
            model: 'Clientes',
            key: 'IdCliente'
        }
    },
    IdEstado: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
        field: 'IdEstado',
        comment: 'ID del estado de la venta',
        references: {
            model: 'Estado',
            key: 'IdEstado'
        }
    },
    Fecha: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: 'Fecha',
        comment: 'Fecha y hora de la venta'
    },
    Total: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
        validate: {
            min: {
                args: [0],
                msg: 'El total no puede ser negativo'
            }
        },
        field: 'Total',
        comment: 'Total de la venta'
    },
    MetodoPago: {
        type: DataTypes.STRING(50),
        allowNull: true,
        field: 'MetodoPago',
        comment: 'Método de pago utilizado',
        validate: {
            isIn: {
                args: [['Efectivo', 'Tarjeta', 'Transferencia', 'Crédito', 'Débito']],
                msg: 'Método de pago no válido'
            }
        }
    }
}, {
    tableName: 'Ventas',
    timestamps: false,
    hooks: {
        beforeCreate: (venta) => {
            console.log(`💰 Creando nueva venta para cliente ID: ${venta.IdCliente}`);
        },
        beforeUpdate: (venta) => {
            console.log(`💰 Actualizando venta ID: ${venta.IdVenta}`);
        }
    }
});

// Métodos personalizados
Venta.prototype.formatearFecha = function() {
    const fecha = new Date(this.Fecha);
    const dia = fecha.getDate().toString().padStart(2, '0');
    const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
    const año = fecha.getFullYear();
    return `${dia}/${mes}/${año}`;
};

Venta.prototype.formatearTotal = function() {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0
    }).format(this.Total);
};

Venta.prototype.estaCompletada = function() {
    return this.IdEstado === 1;
};

Venta.prototype.estaPendiente = function() {
    return this.IdEstado === 2;
};

Venta.prototype.estaAnulada = function() {
    return this.IdEstado === 3;
};

// Método para buscar ventas con filtros
Venta.buscarConFiltros = async function(filtros) {
    const { search, fechaInicio, fechaFin, cliente, estado, metodo, page, limit } = filtros;
    const whereClause = {};
    
    if (search) {
        whereClause[Op.or] = [
            { '$Cliente.Nombre$': { [Op.like]: `%${search}%` } },
            { '$Cliente.Documento$': { [Op.like]: `%${search}%` } },
            { IdVenta: isNaN(search) ? null : search }
        ];
    }
    
    if (fechaInicio || fechaFin) {
        whereClause.Fecha = {};
        if (fechaInicio) whereClause.Fecha[Op.gte] = new Date(fechaInicio);
        if (fechaFin) whereClause.Fecha[Op.lte] = new Date(fechaFin);
    }
    
    if (cliente) {
        whereClause.IdCliente = cliente;
    }
    
    if (estado) {
        whereClause.IdEstado = estado;
    }
    
    if (metodo) {
        whereClause.MetodoPago = metodo;
    }
    
    return this.findAndCountAll({
        where: whereClause,
        include: ['Cliente', 'Estado', 'Detalles'],
        limit: parseInt(limit),
        offset: (page - 1) * limit,
        order: [['Fecha', 'DESC']]
    });
};

export default Venta; 