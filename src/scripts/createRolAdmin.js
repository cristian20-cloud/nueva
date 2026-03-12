// src/scripts/createRolAdmin.js
import { sequelize } from '../config/db.js';

const crearRolAdmin = async () => {
    try {
        // 1. Conectar a la BD
        await sequelize.authenticate();
        console.log('✅ Conectado a la base de datos');

        // 2. Verificar si ya existe el rol 'Administrador'
        const [existingRol] = await sequelize.query(`
            SELECT "IdRol" FROM "Roles" WHERE "Nombre" = 'Administrador' LIMIT 1;
        `);

        if (existingRol.length > 0) {
            console.log('✅ El rol "Administrador" ya existe con IdRol =', existingRol[0].IdRol);
            return existingRol[0].IdRol;
        }

        // 3. Crear el rol (ajusta "Estado" según tu modelo)
        // Opción A: Si Estado es BOOLEAN
        const [newRol] = await sequelize.query(`
            INSERT INTO "Roles" ("Nombre", "Estado") 
            VALUES ('Administrador', true)
            RETURNING "IdRol";
        `);

  

        const idRol = newRol[0].IdRol;
        console.log(`✅ Rol "Administrador" creado exitosamente con IdRol = ${idRol}`);
        
     

        return idRol;
        
    } catch (error) {
        console.error('❌ Error al crear rol:', error.message);
        console.log('\n💡 Verifica:');
        console.log('   - La tabla "Roles" existe');
        console.log('   - Los campos coinciden con tu modelo');
        console.log('   - Tienes permisos de escritura en la BD');
        return null;
    } finally {
        // 5. Cerrar conexión para evitar que el script se quede colgado
        await sequelize.close();
        process.exit(0);
    }
};

crearRolAdmin();