// models/permisos.model.js
import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

/**
 * Modelo de Permisos
 * Representa los permisos disponibles en el sistema
 * @table Permisos
 */
const Permiso = sequelize.define('Permiso', {
    IdPermiso: {
        type: DataTypes.STRING(50),
        primaryKey: true,
        allowNull: false,
        field: 'IdPermiso',
        comment: 'Identificador único del permiso (ej: ver_usuarios, crear_productos)'
    },
    Nombre: {
        type: DataTypes.TEXT,
        allowNull: false,
        field: 'Nombre',
        comment: 'Nombre descriptivo del permiso',
        validate: {
            notEmpty: {
                msg: 'El nombre del permiso es requerido'
            }
        }
    },
    Modulo: {
        type: DataTypes.STRING(50),
        allowNull: false,
        field: 'Modulo',
        comment: 'Módulo al que pertenece el permiso',
        validate: {
            isIn: {
                args: [[
                    'Dashboard',
                    'Categorías',
                    'Productos',
                    'Proveedores',
                    'Compras',
                    'Clientes',
                    'Ventas',
                    'Devoluciones',
                    'Usuarios',
                    'Roles',
                    'Permisos'
                ]],
                msg: 'Módulo no válido'
            }
        }
    },
    Accion: {
        type: DataTypes.STRING(20),
        allowNull: false,
        field: 'Accion',
        comment: 'Acción permitida (ver, crear, editar, eliminar, anular, activar)',
        validate: {
            isIn: {
                args: [['ver', 'crear', 'editar', 'eliminar', 'anular', 'activar', 'todos']],
                msg: 'Acción no válida'
            }
        }
    }
}, {
    tableName: 'Permisos',
    timestamps: false
});

export default Permiso;