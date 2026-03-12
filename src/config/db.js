// src/config/db.js
import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

export const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT || 5432,
        dialect: 'postgres',
        logging: process.env.NODE_ENV === 'development' ? console.log : false,
        dialectOptions: {
            ssl: {
                require: true,
                rejectUnauthorized: false
            }
        },
        pool: {
            max: 5,
            min: 0,
            acquire: 30000,
            idle: 10000
        }
    }
);

// 🟢 FUNCIÓN PARA CARGAR MODELOS Y ASOCIACIONES
export const initModels = async () => {
    try {
        // 1. Importar modelos (esto los registra en Sequelize)
        await import('../models/usuarios.model.js');
        await import('../models/roles.model.js');
        await import('../models/clientes.model.js');
        await import('../models/permisos.model.js');
        await import('../models/detallePermisos.model.js');
        
        // 2. Definir asociaciones
        await defineAssociations();
        
        // 3. Sincronizar con BD (solo en desarrollo)
        if (process.env.NODE_ENV === 'development') {
            await sequelize.sync({ alter: true });
            console.log('🔄 Base de datos sincronizada');
        }
        
        console.log('✅ Modelos y asociaciones cargados');
    } catch (error) {
        console.error('❌ Error inicializando modelos:', error);
        throw error;
    }
};

// 🟢 DEFINIR ASOCIACIONES ENTRE MODELOS
const defineAssociations = () => {
    // Importar modelos ya registrados
    const Usuario = sequelize.models.Usuario;
    const Rol = sequelize.models.Rol;
    const Cliente = sequelize.models.Cliente;
    const Permiso = sequelize.models.Permiso;
    const DetallePermiso = sequelize.models.DetallePermiso;
    
    if (!Usuario || !Rol) {
        console.warn('⚠️ Modelos no registrados aún');
        return;
    }
    
    // 🟢 Usuario ↔ Rol (Muchos a Uno)
    Usuario.belongsTo(Rol, {
        foreignKey: 'IdRol',
        as: 'Rol',  // ⭐ Este alias debe coincidir con include: [{ as: 'Rol' }]
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
    });
    
    Rol.hasMany(Usuario, {
        foreignKey: 'IdRol',
        as: 'Usuarios'
    });

    // 🟢 Usuario ↔ Cliente (Uno a Uno)
    Usuario.hasOne(Cliente, {
        foreignKey: 'IdUsuario',
        as: 'Cliente',
        onDelete: 'CASCADE'
    });
    
    Cliente.belongsTo(Usuario, {
        foreignKey: 'IdUsuario',
        as: 'Usuario'
    });

    // 🟢 Rol ↔ DetallePermiso (Uno a Muchos)
    Rol.hasMany(DetallePermiso, {
        foreignKey: 'IdRol',
        as: 'DetallePermisos'
    });
    
    DetallePermiso.belongsTo(Rol, {
        foreignKey: 'IdRol',
        as: 'Rol'
    });

    // 🟢 DetallePermiso ↔ Permiso (Muchos a Uno)
    DetallePermiso.belongsTo(Permiso, {
        foreignKey: 'IdPermiso',
        as: 'Permiso',
        onDelete: 'CASCADE'
    });
    
    Permiso.hasMany(DetallePermiso, {
        foreignKey: 'IdPermiso',
        as: 'DetallePermisos'
    });
};

// 🟢 FUNCIÓN DE CONEXIÓN (para usar en server.js)
export const connectDB = async () => {
    try {
        await sequelize.authenticate();
        console.log('✅ PostgreSQL conectado');
        
        // 🟢 Inicializar modelos después de conectar
        await initModels();
        
        return true;
    } catch (error) {
        console.error('❌ Error de conexión:', error);
        throw error;
    }
};