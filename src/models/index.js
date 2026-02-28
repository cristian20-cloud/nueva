// src/models/index.js
import { sequelize } from '../config/db.js';
import Usuario from './usuarios.model.js';
import Rol from './roles.model.js';
import Categoria from './categorias.model.js';
import Producto from './productos.model.js';
import Talla from './tallas.model.js';
import Proveedor from './proveedores.model.js';
import Cliente from './clientes.model.js';
import Compra from './compras.model.js';
import DetalleCompra from './detalleCompras.model.js';
import Venta from './ventas.model.js';
import DetalleVenta from './detalleVentas.model.js';
import Devolucion from './devoluciones.model.js';
import Permiso from './permisos.model.js';
import DetallePermiso from './detallePermisos.model.js';
import Estado from './estado.model.js';
import Imagen from './imagenes.model.js';

// ============================================
// ✅ DEFINIR TODAS LAS ASOCIACIONES
// ============================================

// Producto - Categoria
Producto.belongsTo(Categoria, { foreignKey: 'IdCategoria', as: 'Categoria' });
Categoria.hasMany(Producto, { foreignKey: 'IdCategoria', as: 'Productos' });

// Producto - Talla
Producto.hasMany(Talla, { foreignKey: 'IdProducto', as: 'Tallas' });
Talla.belongsTo(Producto, { foreignKey: 'IdProducto', as: 'Producto' });

// Producto - Imagen
Producto.hasMany(Imagen, { foreignKey: 'IdProducto', as: 'Imagenes' });
Imagen.belongsTo(Producto, { foreignKey: 'IdProducto', as: 'Producto' });

// Usuario - Rol
Usuario.belongsTo(Rol, { foreignKey: 'IdRol', as: 'Rol' });
Rol.hasMany(Usuario, { foreignKey: 'IdRol', as: 'Usuarios' });

// Usuario - Cliente
Usuario.hasOne(Cliente, { foreignKey: 'IdUsuario', as: 'Cliente' });
Cliente.belongsTo(Usuario, { foreignKey: 'IdUsuario', as: 'Usuario' });

// ⚠️ CORREGIDO: Cambiar 'Permisos' por 'ListaPermisos' para evitar colisión
Rol.belongsToMany(Permiso, { 
    through: DetallePermiso, 
    foreignKey: 'IdRol', 
    otherKey: 'IdPermiso', 
    as: 'ListaPermisos'  // ✅ Cambiado de 'Permisos' a 'ListaPermisos'
});

Permiso.belongsToMany(Rol, { 
    through: DetallePermiso, 
    foreignKey: 'IdPermiso', 
    otherKey: 'IdRol', 
    as: 'Roles' 
});

// DetallePermiso - Rol - Permiso
DetallePermiso.belongsTo(Rol, { foreignKey: 'IdRol', as: 'Rol' });
DetallePermiso.belongsTo(Permiso, { foreignKey: 'IdPermiso', as: 'Permiso' });

// Compra - Proveedor
Compra.belongsTo(Proveedor, { foreignKey: 'IdProveedor', as: 'Proveedor' });
Proveedor.hasMany(Compra, { foreignKey: 'IdProveedor', as: 'Compras' });

// Compra - DetalleCompra
Compra.hasMany(DetalleCompra, { foreignKey: 'IdCompra', as: 'Detalles' });
DetalleCompra.belongsTo(Compra, { foreignKey: 'IdCompra', as: 'Compra' });

// DetalleCompra - Producto - Talla
DetalleCompra.belongsTo(Producto, { foreignKey: 'IdProducto', as: 'Producto' });
DetalleCompra.belongsTo(Talla, { foreignKey: 'IdTalla', as: 'Talla' });

// Venta - Cliente
Venta.belongsTo(Cliente, { foreignKey: 'IdCliente', as: 'Cliente' });
Cliente.hasMany(Venta, { foreignKey: 'IdCliente', as: 'Ventas' });

// Venta - Estado
Venta.belongsTo(Estado, { foreignKey: 'IdEstado', as: 'Estado' });
Estado.hasMany(Venta, { foreignKey: 'IdEstado', as: 'Ventas' });

// Venta - DetalleVenta
Venta.hasMany(DetalleVenta, { foreignKey: 'IdVenta', as: 'Detalles' });
DetalleVenta.belongsTo(Venta, { foreignKey: 'IdVenta', as: 'Venta' });

// DetalleVenta - Producto - Talla
DetalleVenta.belongsTo(Producto, { foreignKey: 'IdProducto', as: 'Producto' });
DetalleVenta.belongsTo(Talla, { foreignKey: 'IdTalla', as: 'Talla' });

// Devolucion - Venta - Producto
Devolucion.belongsTo(Venta, { foreignKey: 'IdVenta', as: 'Venta' });
Devolucion.belongsTo(Producto, { foreignKey: 'IdProducto', as: 'Producto' });

// ============================================
// ✅ EXPORTAR TODO
// ============================================
export {
    sequelize,
    Usuario,
    Rol,
    Categoria,
    Producto,
    Talla,
    Proveedor,
    Cliente,
    Compra,
    DetalleCompra,
    Venta,
    DetalleVenta,
    Devolucion,
    Permiso,
    DetallePermiso,
    Estado,
    Imagen
};