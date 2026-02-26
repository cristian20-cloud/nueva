// models/categorias.model.js
import { DataTypes, Op } from 'sequelize';
import { sequelize } from '../config/db.js';

/**
 * Modelo de Categorías
 * Representa las categorías de productos en el sistema
 * @table Categorias
 */
const Categoria = sequelize.define('Categoria', {
    IdCategoria: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
        field: 'IdCategoria',
        comment: 'Identificador único de la categoría'
    },
    Nombre: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            notEmpty: { msg: 'El nombre de la categoría es requerido' },
            len: { args: [2, 100], msg: 'El nombre debe tener entre 2 y 100 caracteres' }
        },
        field: 'Nombre',
        comment: 'Nombre descriptivo de la categoría'
    },
    Estado: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        field: 'Estado',
        comment: 'Estado de la categoría (true=activo, false=inactivo)'
    }
}, {
    tableName: 'Categorias',
    timestamps: false
});

// Métodos personalizados del modelo
Categoria.findActive = function() {
    return this.findAll({
        where: { Estado: true },
        order: [['Nombre', 'ASC']]
    });
};

Categoria.findByName = function(searchTerm) {
    return this.findAll({
        where: {
            Nombre: {
                [Op.like]: `%${searchTerm}%`
            }
        }
    });
};

export default Categoria; 