// models/proveedores.model.js
import { DataTypes, Op } from 'sequelize';
import { sequelize } from '../config/db.js';
import Compra from './compras.model.js';

/**
 * Modelo de Proveedores
 * Representa los proveedores que suministran productos al negocio
 * @table Proveedores
 */
const Proveedor = sequelize.define('Proveedor', {
    IdProveedor: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
        field: 'IdProveedor',
        comment: 'Identificador único del proveedor'
    },
    Nombre: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            notEmpty: {
                msg: 'El nombre de la empresa es requerido'
            },
            len: {
                args: [3, 200],
                msg: 'El nombre debe tener entre 3 y 200 caracteres'
            }
        },
        field: 'Nombre',
        comment: 'Nombre de la empresa o proveedor'
    },
    TipoDocumento: {
        type: DataTypes.STRING(20),
        allowNull: false,
        validate: {
            isIn: {
                args: [['NIT', 'CC', 'CE', 'RUT']],
                msg: 'Tipo de documento no válido'
            }
        },
        field: 'TipoDocumento',
        comment: 'Tipo de documento (NIT, CC, CE, RUT)'
    },
    NumeroDocumento: {
        type: DataTypes.STRING(20),
        allowNull: false,
        unique: true,
        validate: {
            notEmpty: {
                msg: 'El número de documento es requerido'
            },
            len: {
                args: [5, 20],
                msg: 'El número de documento debe tener entre 5 y 20 caracteres'
            }
        },
        field: 'NumeroDocumento',
        comment: 'Número de identificación del proveedor'
    },
    Telefono: {
        type: DataTypes.STRING(20),
        allowNull: true,
        validate: {
            len: {
                args: [7, 20],
                msg: 'El teléfono debe tener entre 7 y 20 caracteres'
            }
        },
        field: 'Telefono',
        comment: 'Teléfono de contacto'
    },
    Direccion: {
        type: DataTypes.STRING(200),
        allowNull: true,
        field: 'Direccion',
        comment: 'Dirección física del proveedor'
    },
    Correo: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
        validate: {
            isEmail: {
                msg: 'Debe proporcionar un correo electrónico válido'
            },
            len: {
                args: [5, 100],
                msg: 'El correo debe tener entre 5 y 100 caracteres'
            }
        },
        field: 'Correo',
        comment: 'Correo electrónico de contacto'
    },
    Estado: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        field: 'Estado',
        comment: 'Estado del proveedor (true=activo, false=inactivo)'
    }
}, {
    tableName: 'Proveedores',
    timestamps: false,
    hooks: {
        beforeCreate: (proveedor) => {
            console.log(`📦 Creando nuevo proveedor: ${proveedor.Nombre}`);
            if (proveedor.TipoDocumento === 'NIT' && proveedor.NumeroDocumento) {
                proveedor.NumeroDocumento = proveedor.NumeroDocumento.replace(/\s/g, '');
            }
        },
        beforeUpdate: (proveedor) => {
            console.log(`📦 Actualizando proveedor ID: ${proveedor.IdProveedor}`);
        }
    }
});

// Métodos personalizados
Proveedor.prototype.getTipoProveedor = function() {
    return this.TipoDocumento === 'NIT' ? 'Jurídica' : 'Natural';
};

// Método para buscar proveedores con filtros avanzados
Proveedor.buscarConFiltros = async function(filtros) {
    const { search, tipoDocumento, estado, page, limit } = filtros;
    const whereClause = {};
    
    if (search) {
        whereClause[Op.or] = [
            { Nombre: { [Op.like]: `%${search}%` } },
            { NumeroDocumento: { [Op.like]: `%${search}%` } },
            { Correo: { [Op.like]: `%${search}%` } },
            { Telefono: { [Op.like]: `%${search}%` } }
        ];
    }
    
    if (tipoDocumento) {
        whereClause.TipoDocumento = tipoDocumento;
    }
    
    if (estado !== undefined) {
        whereClause.Estado = estado;
    }
    
    return this.findAndCountAll({
        where: whereClause,
        limit: parseInt(limit),
        offset: (page - 1) * limit,
        order: [['Nombre', 'ASC']]
    });
};

// Método para verificar si el proveedor tiene compras
Proveedor.prototype.tieneCompras = async function() {
    const count = await Compra.count({
        where: { IdProveedor: this.IdProveedor }
    });
    return count > 0;
};

export default Proveedor; 