// src/scripts/seed.js
import { sequelize } from '../config/db.js';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
dotenv.config();

const seedDatabase = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Conectado a la base de datos');

    // 🔹 1. Crear rol "Administrador" si no existe
    const [rolResult] = await sequelize.query(`
      INSERT INTO "Roles" ("Nombre", "Estado", "createdAt", "updatedAt")
      VALUES ('Administrador', true, NOW(), NOW())
      ON CONFLICT ("Nombre") DO UPDATE SET "updatedAt" = NOW()
      RETURNING "IdRol";
    `);
    const idRolAdmin = rolResult[0]?.IdRol;
    console.log(`✅ Rol "Administrador" listo con IdRol = ${idRolAdmin}`);

    // 🔹 2. Crear usuario admin si no existe
    const email = process.env.SEED_ADMIN_EMAIL;
    const password = process.env.SEED_ADMIN_PASSWORD;
    const name = process.env.SEED_ADMIN_NAME;

    if (!email || !password) {
      throw new Error('⚠️ Faltan variables SEED_ADMIN_EMAIL o SEED_ADMIN_PASSWORD en .env');
    }

    const [existing] = await sequelize.query(
      `SELECT "IdUsuario" FROM "Usuarios" WHERE "Correo" = :email`,
      { replacements: { email: email.toLowerCase() } }
    );

    if (existing.length > 0) {
      console.log('⚠️ El usuario admin ya existe');
    } else {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      await sequelize.query(`
        INSERT INTO "Usuarios" (
          "Nombre", "Correo", "Clave", "Estado", "IdRol", "createdAt", "updatedAt"
        ) VALUES (
          :name, :email, :clave, 'activo', :idRol, NOW(), NOW()
        )
      `, {
        replacements: {
          name,
          email: email.toLowerCase(),
          clave: hashedPassword,
          idRol: idRolAdmin
        }
      });
      console.log('✅ Usuario admin creado exitosamente');
    }

    // 🔹 3. (Opcional) Crear permisos básicos para el rol admin
    // ... aquí puedes agregar lógica para asignar permisos

    console.log('\n🎉 Seed completado exitosamente');
    console.log(`📧 Login: ${email}`);
    console.log(`🔑 Password: ${password}`);
    console.log('💡 Cambia la contraseña después del primer login');

  } catch (error) {
    console.error('❌ Error en seed:', error.message);
    throw error;
  } finally {
    await sequelize.close();
    process.exit(0);
  }
};

seedDatabase();