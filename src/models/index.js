// src/models/index.js
import { sequelize } from '../config/db.js';

// 🔹 Importar modelos
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
// ✅ ASOCIACIONES (CORREGIDAS - ALIAS COINCIDEN CON CONTROLLER)
// ============================================

// Producto ↔ Categoría
Producto.belongsTo(Categoria, { foreignKey: 'IdCategoria', as: 'Categoria' });
Categoria.hasMany(Producto, { foreignKey: 'IdCategoria', as: 'Productos' });

// Producto ↔ Talla / Imagen
Producto.hasMany(Talla, { foreignKey: 'IdProducto', as: 'Tallas', onDelete: 'CASCADE' });
Talla.belongsTo(Producto, { foreignKey: 'IdProducto', as: 'Producto' });

Producto.hasMany(Imagen, { foreignKey: 'IdProducto', as: 'Imagenes', onDelete: 'CASCADE' });
Imagen.belongsTo(Producto, { foreignKey: 'IdProducto', as: 'Producto' });

// ──────────────────────────────────────────────────────────
// ✅ Usuario ↔ Rol / Cliente (ALIAS CORREGIDOS)
// ──────────────────────────────────────────────────────────
Usuario.belongsTo(Rol, { 
  foreignKey: 'IdRol', 
  as: 'rolData'  // ← ✅ CAMBIADO: De 'Rol' a 'rolData' para coincidir con auth.controller.js
});
Rol.hasMany(Usuario, { 
  foreignKey: 'IdRol', 
  as: 'usuarios' 
});
Usuario.hasOne(Cliente, { foreignKey: 'IdUsuario', as: 'Cliente' });
Cliente.belongsTo(Usuario, { foreignKey: 'IdUsuario', as: 'Usuario' });

// ──────────────────────────────────────────────────────────
// ✅ Rol ↔ Permiso (Many-to-Many) - ALIAS CORREGIDOS
// ──────────────────────────────────────────────────────────
Rol.belongsToMany(Permiso, { 
    through: DetallePermiso, 
    foreignKey: 'IdRol', 
    otherKey: 'IdPermiso', 
    as: 'ListaPermisos' 
});
Permiso.belongsToMany(Rol, { 
    through: DetallePermiso, 
    foreignKey: 'IdPermiso', 
    otherKey: 'IdRol', 
    as: 'Roles' 
});
DetallePermiso.belongsTo(Rol, { foreignKey: 'IdRol', as: 'Rol' });
DetallePermiso.belongsTo(Permiso, { 
  foreignKey: 'IdPermiso', 
  as: 'permisoData'  // ← ✅ CAMBIADO: De 'Permiso' a 'permisoData' para coincidir con controller
});

// Compra ↔ Proveedor / DetalleCompra
Compra.belongsTo(Proveedor, { foreignKey: 'IdProveedor', as: 'Proveedor' });
Proveedor.hasMany(Compra, { foreignKey: 'IdProveedor', as: 'Compras' });

Compra.hasMany(DetalleCompra, { foreignKey: 'IdCompra', as: 'Detalles', onDelete: 'CASCADE' });
DetalleCompra.belongsTo(Compra, { foreignKey: 'IdCompra', as: 'Compra' });

// DetalleCompra ↔ Producto / Talla
DetalleCompra.belongsTo(Producto, { foreignKey: 'IdProducto', as: 'Producto' });
DetalleCompra.belongsTo(Talla, { foreignKey: 'IdTalla', as: 'Talla' });

// Venta ↔ Cliente / Estado / DetalleVenta
Venta.belongsTo(Cliente, { foreignKey: 'IdCliente', as: 'Cliente' });
Cliente.hasMany(Venta, { foreignKey: 'IdCliente', as: 'Ventas' });

Venta.belongsTo(Estado, { foreignKey: 'IdEstado', as: 'EstadoVenta' });
Estado.hasMany(Venta, { foreignKey: 'IdEstado', as: 'Ventas' });

Venta.hasMany(DetalleVenta, { foreignKey: 'IdVenta', as: 'Detalles', onDelete: 'CASCADE' });
DetalleVenta.belongsTo(Venta, { foreignKey: 'IdVenta', as: 'Venta' });

// DetalleVenta ↔ Producto / Talla
DetalleVenta.belongsTo(Producto, { foreignKey: 'IdProducto', as: 'Producto' });
DetalleVenta.belongsTo(Talla, { foreignKey: 'IdTalla', as: 'Talla' });

// 🔁 Devoluciones ↔ Productos (2 relaciones)
Devolucion.belongsTo(Producto, { 
    foreignKey: 'IdProductoOriginal', 
    as: 'ProductoOriginal',
    onDelete: 'RESTRICT'
});
Devolucion.belongsTo(Producto, { 
    foreignKey: 'IdProductoCambio', 
    as: 'ProductoCambio',
    onDelete: 'SET NULL'
});

// Devoluciones ↔ Venta (opcional)
Devolucion.belongsTo(Venta, { 
    foreignKey: 'IdVenta', 
    as: 'VentaOriginal',
    onDelete: 'CASCADE'
});

// ============================================
// ✅ EXPORTAR
// ============================================
export {
    sequelize,
    Usuario, Rol, Categoria, Producto, Talla, Proveedor, Cliente,
    Compra, DetalleCompra, Venta, DetalleVenta, Devolucion,
    Permiso, DetallePermiso, Estado, Imagen
};

export default {
    sequelize,
    Usuario, Rol, Categoria, Producto, Talla, Proveedor, Cliente,
    Compra, DetalleCompra, Venta, DetalleVenta, Devolucion,
    Permiso, DetallePermiso, Estado, Imagen
};