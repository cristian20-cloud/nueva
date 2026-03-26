import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

/**
 * 🗄️ Inicialización de Sequelize para PostgreSQL (Aiven)
 */
export const sequelize = new Sequelize({
    dialect: 'postgres',
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    dialectOptions: {
        ssl: {
            require: true,
            rejectUnauthorized: false // Requerido para conexiones seguras en Render/Aiven/Neon
        }
    },
    logging: false, // Cambiar a console.log para debugging SQL
    pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
    }
});

/**
 * 🔌 Función para conectar a la base de datos
 */
export const connectDB = async () => {
    try {
        await sequelize.authenticate();
        console.log('✅ PostgreSQL Connected to Aiven Cloud DB');
        
        // Opcional: sincronizar modelos (Cuidado en producción)
        // await sequelize.sync({ alter: true });
        
    } catch (error) {
        console.error('❌ Error connecting to database:', error.message);
        process.exit(1);
    }
};

/**
 * 🔗 Definición de asociaciones (opcional, si no se usa src/models/index.js)
 */
export const defineAssociations = () => {
    const {
        Usuario, Rol, Cliente, Permiso, DetallePermiso,
        Categoria, Producto, Talla, Proveedor, Compra,
        DetalleCompra, Venta, DetalleVenta, Devolucion,
        Estado, Imagen
    } = sequelize.models;

    if (!Usuario || !Rol || !Producto || !Categoria) {
        console.warn('⚠️ Modelos core no registrados aún');
        return;
    }

    // 1. Usuarios y Roles
    Usuario.belongsTo(Rol, { foreignKey: 'IdRol', as: 'rolData', onDelete: 'SET NULL' });
    Rol.hasMany(Usuario, { foreignKey: 'IdRol', as: 'Usuarios' });
    Usuario.hasOne(Cliente, { foreignKey: 'IdUsuario', as: 'clienteData', onDelete: 'CASCADE' });
    Cliente.belongsTo(Usuario, { foreignKey: 'IdUsuario', as: 'usuarioData' });

    // 2. Roles y Permisos
    Rol.hasMany(DetallePermiso, { foreignKey: 'IdRol', as: 'DetallePermisos' });
    DetallePermiso.belongsTo(Rol, { foreignKey: 'IdRol', as: 'rolData' });
    DetallePermiso.belongsTo(Permiso, { foreignKey: 'IdPermiso', as: 'permisoData', onDelete: 'CASCADE' });
    Permiso.hasMany(DetallePermiso, { foreignKey: 'IdPermiso', as: 'DetallePermisos' });

    // 3. Productos y Categorías
    Producto.belongsTo(Categoria, { foreignKey: 'IdCategoria', as: 'categoriaData' });
    Categoria.hasMany(Producto, { foreignKey: 'IdCategoria', as: 'Productos' });

    // 4. Producto Variantes
    Producto.hasMany(Talla, { foreignKey: 'IdProducto', as: 'Tallas', onDelete: 'CASCADE' });
    Talla.belongsTo(Producto, { foreignKey: 'IdProducto', as: 'productoData' });
    Producto.hasMany(Imagen, { foreignKey: 'IdProducto', as: 'Imagenes', onDelete: 'CASCADE' });
    Imagen.belongsTo(Producto, { foreignKey: 'IdProducto', as: 'productoData' });

    // 5. Compras y Proveedores
    Compra.belongsTo(Proveedor, { foreignKey: 'IdProveedor', as: 'proveedorData' });
    Proveedor.hasMany(Compra, { foreignKey: 'IdProveedor', as: 'Compras' });
    Compra.hasMany(DetalleCompra, { foreignKey: 'IdCompra', as: 'Detalles', onDelete: 'CASCADE' });
    DetalleCompra.belongsTo(Compra, { foreignKey: 'IdCompra', as: 'compraData' });
    DetalleCompra.belongsTo(Producto, { foreignKey: 'IdProducto', as: 'productoData' });
    DetalleCompra.belongsTo(Talla, { foreignKey: 'IdTalla', as: 'tallaData' });

    // 6. Ventas y Clientes
    Venta.belongsTo(Cliente, { foreignKey: 'IdCliente', as: 'clienteData' });
    Cliente.hasMany(Venta, { foreignKey: 'IdCliente', as: 'Ventas' });
    Venta.belongsTo(Estado, { foreignKey: 'IdEstado', as: 'estadoVenta' });
    Estado.hasMany(Venta, { foreignKey: 'IdEstado', as: 'VentasConEstado' });
    Venta.hasMany(DetalleVenta, { foreignKey: 'IdVenta', as: 'Detalles', onDelete: 'CASCADE' });
    DetalleVenta.belongsTo(Venta, { foreignKey: 'IdVenta', as: 'ventaData' });
    DetalleVenta.belongsTo(Producto, { foreignKey: 'IdProducto', as: 'productoData' });
    DetalleVenta.belongsTo(Talla, { foreignKey: 'IdTalla', as: 'tallaData' });

    // 7. Devoluciones
    Devolucion.belongsTo(Producto, { foreignKey: 'IdProductoOriginal', as: 'productoOriginal' });
    Devolucion.belongsTo(Producto, { foreignKey: 'IdProductoCambio', as: 'productoCambio' });
    Devolucion.belongsTo(Venta, { foreignKey: 'IdVenta', as: 'ventaOriginal' });
};