// src/scripts/createRolAdmin.js
import { sequelize } from '../config/db.js';

const crearRolAdmin = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Conectado a la base de datos');

    // Verificar si ya existe el rol 'Administrador'
    const [existingRol] = await sequelize.query(`
      SELECT "IdRol" FROM "Roles" WHERE "Nombre" = 'Administrador' LIMIT 1;
    `);

    if (existingRol.length > 0) {
      console.log('✅ El rol "Administrador" ya existe con IdRol =', existingRol[0].IdRol);
      return existingRol[0].IdRol;
    }

    // Crear el rol con los campos EXACTOS de tu modelo
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
    console.log('\n💡 Tu modelo Roles tiene estos campos:');
    console.log('   - "IdRol" (INTEGER, PK, autoIncrement)');
    console.log('   - "Nombre" (STRING, unique, con valores permitidos)');
    console.log('   - "Estado" (BOOLEAN, default: true)');
    return null;
  }
};

crearRolAdmin();