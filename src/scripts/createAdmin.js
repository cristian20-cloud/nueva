// src/scripts/createAdmin.js
import { sequelize } from '../config/db.js';
import bcrypt from 'bcryptjs';

// 🔧 CONFIGURA TUS CREDENCIALES AQUÍ
const adminData = {
    Nombre: 'Administrador Principal',
    Correo: 'streetcaps511@gmail.com',        // ← Tu email
    Clave: 'Admin#GM2024!Secure',              // ← Tu contraseña (se encriptará)
    Estado: 'activo',
    IdRol: 1                                    // ← Asegúrate que el rol 1 existe
};

const crearAdminDirecto = async () => {
    try {
        // 1. Conectar a la BD
        await sequelize.authenticate();
        console.log('✅ Conectado a la base de datos');

        // 2. Verificar si ya existe
        const [existing] = await sequelize.query(
            `SELECT "IdUsuario" FROM "Usuarios" WHERE "Correo" = :Correo`,
            { replacements: { Correo: adminData.Correo.toLowerCase() } }
        );

        if (existing.length > 0) {
            console.log('⚠️ El usuario admin ya existe');
            return;
        }

        // 3. Hashear contraseña con bcrypt (igual que tu modelo)
        const salt = await bcrypt.genSalt(10);
        const ClaveHash = await bcrypt.hash(adminData.Clave, salt);

        // 4. Insertar con SQL directo
        await sequelize.query(`
            INSERT INTO "Usuarios" (
                "Nombre", 
                "Correo", 
                "Clave", 
                "Tipo", 
                "Estado", 
                "IdRol"
            ) 
            VALUES (
                :Nombre, 
                :Correo, 
                :Clave, 
                :Tipo, 
                :Estado, 
                :IdRol
            )
            ON CONFLICT ("Correo") DO NOTHING;
        `, {
            replacements: {
                Nombre: adminData.Nombre,
                Correo: adminData.Correo.toLowerCase(),
                Clave: ClaveHash,
                Tipo: 'admin',              // ← Importante: tipo admin
                Estado: adminData.Estado,
                IdRol: adminData.IdRol
            }
        });

        // 5. Confirmación
        console.log('\n🎉 ADMIN CREADO EXITOSAMENTE');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`📧 Correo: ${adminData.Correo}`);
        console.log(`🔑 Clave: ${adminData.Clave}`);
        console.log(`👤 Tipo: admin`);
        console.log(`📊 Estado: ${adminData.Estado}`);
        console.log(`🎭 IdRol: ${adminData.IdRol}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('💡 Guarda estas credenciales en un lugar seguro');
        console.log('🌐 Prueba login en: https://nueva-qgpm.onrender.com/api/auth/login');

    } catch (error) {
        console.error('❌ Error creando admin:', error.message);
        console.error(error.stack);
    } finally {
        // 6. Cerrar conexión
        await sequelize.close();
        process.exit(0);
    }
};

crearAdminDirecto();