// models/clientes.model.js
import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

/**
 * Modelo de Clientes
 * Representa los clientes que realizan compras
 * @table Clientes
 */
const Cliente = sequelize.define('Cliente', {
    IdCliente: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
        field: 'IdCliente',
        comment: 'Identificador único del cliente'
    },
    TipoDocumento: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'TipoDocumento',
        comment: 'Tipo de documento (1=CC, 2=CE, 3=NIT, 4=Pasaporte)',
        validate: {
            isIn: {
                args: [[1, 2, 3, 4]],
                msg: 'Tipo de documento no válido'
            }
        }
    },
    Documento: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true,
        field: 'Documento',
        comment: 'Número de documento',
        validate: {
            isInt: {
                msg: 'El documento debe ser un número entero'
            },
            len: {
                args: [5, 15],
                msg: 'El documento debe tener entre 5 y 15 dígitos'
            }
        }
    },
    Nombre: {
        type: DataTypes.STRING,
        allowNull: false,
        field: 'Nombre',
        comment: 'Nombre completo del cliente',
        validate: {
            notEmpty: {
                msg: 'El nombre es requerido'
            },
            len: {
                args: [3, 100],
                msg: 'El nombre debe tener entre 3 y 100 caracteres'
            }
        }
    },
    Telefono: {
        type: DataTypes.STRING(20),
        allowNull: true,
        field: 'Telefono',
        comment: 'Teléfono de contacto',
        validate: {
            len: {
                args: [7, 20],
                msg: 'El teléfono debe tener entre 7 y 20 caracteres'
            }
        }
    },
    Correo: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
        field: 'Correo',
        comment: 'Correo electrónico',
        validate: {
            isEmail: {
                msg: 'Debe proporcionar un correo electrónico válido'
            }
        }
    },
    Estado: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        field: 'Estado',
        comment: 'Estado del cliente (true=activo, false=inactivo)'
    },
    Departamento: {
        type: DataTypes.STRING(50),
        allowNull: true,
        field: 'Departamento',
        comment: 'Departamento de residencia'
    },
    Ciudad: {
        type: DataTypes.STRING(50),
        allowNull: true,
        field: 'Ciudad',
        comment: 'Ciudad de residencia'
    },
    Direccion: {
        type: DataTypes.STRING(200),
        allowNull: true,
        field: 'Direccion',
        comment: 'Dirección de residencia'
    }
}, {
    tableName: 'Clientes',
    timestamps: false,
    hooks: {
        beforeCreate: (cliente) => {
            if (cliente.Correo) {
                cliente.Correo = cliente.Correo.toLowerCase();
            }
        },
        beforeUpdate: (cliente) => {
            if (cliente.Correo) {
                cliente.Correo = cliente.Correo.toLowerCase();
            }
        }
    }
});

// Métodos personalizados
Cliente.prototype.getTipoDocumentoTexto = function() {
    const tipos = {
        1: 'CC',
        2: 'CE', 
        3: 'NIT',
        4: 'Pasaporte'
    };
    return tipos[this.TipoDocumento] || 'Desconocido';
};

Cliente.prototype.estaActivo = function() {
    return this.Estado;
};

Cliente.prototype.formatearDocumento = function() {
    return `${this.getTipoDocumentoTexto()} ${this.Documento}`;
};

export default Cliente;