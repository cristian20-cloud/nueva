// models/tallas.model.js
import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

/**
 * Modelo de Tallas
 * @table Tallas
 */
const Talla = sequelize.define(
  'Talla',
  {
    IdTalla: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
      field: 'IdTalla'
    },

    Nombre: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: 'Nombre',
      validate: {
        notEmpty: {
          msg: 'El nombre es requerido'
        },
        len: {
          args: [1, 50],
          msg: 'El nombre debe tener entre 1 y 50 caracteres'
        }
      }
    },

    Cantidad: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'Cantidad',
      validate: {
        min: {
          args: [0],
          msg: 'La cantidad no puede ser negativa'
        }
      }
    },


    IdProducto: {
      type: DataTypes.INTEGER,
      allowNull: true,  
      field: 'IdProducto',
      comment: 'ID del producto al que pertenece esta talla (puede ser NULL para tallas maestras)',
      references: {
        model: 'Productos',
        key: 'IdProducto'
      }
    },

    // ✅ Estado de la talla
    Estado: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'Estado',
      comment: 'Estado de la talla (true=activo, false=inactivo)'
    }
  },
  {
    tableName: 'Tallas',
    timestamps: false,
    freezeTableName: true,
    hooks: {
      beforeCreate: (talla) => {
        console.log(`📏 Creando nueva talla: ${talla.Nombre} ${talla.IdProducto ? `para producto ID: ${talla.IdProducto}` : '(talla maestra)'}`);
      },
      beforeUpdate: (talla) => {
        console.log(`📏 Actualizando talla ID: ${talla.IdTalla}`);
      }
    }
  }
);

// ✅ MÉTODOS PERSONALIZADOS
Talla.prototype.tieneStock = function() {
  return this.Cantidad > 0;
};

Talla.prototype.stockBajo = function(limite = 5) {
  return this.Cantidad <= limite;
};

Talla.prototype.estaActiva = function() {
  return this.Estado;
};

Talla.prototype.esTallaMaestra = function() {
  return this.IdProducto === null;
};

// ✅ ASOCIACIONES
Talla.associate = (models) => {
  // Una talla pertenece a un producto (puede ser null)
  Talla.belongsTo(models.Producto, {
    foreignKey: 'IdProducto',
    as: 'Producto'
  });

  // Una talla aparece en muchos detalles de compra
  Talla.hasMany(models.DetalleCompra, {
    foreignKey: 'IdTalla',
    as: 'DetallesCompra'
  });

  // Una talla aparece en muchos detalles de venta
  Talla.hasMany(models.DetalleVenta, {
    foreignKey: 'IdTalla',
    as: 'DetallesVenta'
  });
};

export default Talla;