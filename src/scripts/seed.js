// src/scripts/seed.js
import { sequelize } from '../config/db.js';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
dotenv.config();

const seedDatabase = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Conectado a la base de datos');

    // ============================================
    // 🔹 1. CREAR ROL "Administrador"
    // ============================================
    const [rolResult] = await sequelize.query(`
      INSERT INTO "Roles" ("Nombre", "Estado", "createdAt", "updatedAt")
      VALUES ('Administrador', true, NOW(), NOW())
      ON CONFLICT ("Nombre") DO UPDATE SET "updatedAt" = NOW()
      RETURNING "IdRol";
    `);
    const idRolAdmin = rolResult[0]?.IdRol;
    console.log(`✅ Rol "Administrador" listo con IdRol = ${idRolAdmin}`);

    // ============================================
    // 🔹 2. CREAR TODOS LOS PERMISOS DEL SISTEMA
    // ============================================
    const permisosSistema = [
      'dashboard',
      'categorias',
      'productos',
      'proveedores',
      'compras',
      'detalleCompras',
      'clientes',
      'ventas',
      'detalleVentas',
      'devoluciones',
      'usuarios',
      'roles',
      'permisos',
      'detallePermisos',
      'estados',
      'tallas',
      'imagenes',
      'auth'
    ];

    const permisosIds = [];

    for (const nombrePermiso of permisosSistema) {
      const [permisoResult] = await sequelize.query(`
        INSERT INTO "Permisos" ("Nombre", "Descripcion", "createdAt", "updatedAt")
        VALUES (:nombre, :descripcion, NOW(), NOW())
        ON CONFLICT ("Nombre") DO UPDATE SET "updatedAt" = NOW()
        RETURNING "IdPermiso";
      `, {
        replacements: {
          nombre: nombrePermiso,
          descripcion: `Permiso para gestionar ${nombrePermiso}`
        }
      });
      permisosIds.push(permisoResult[0]?.IdPermiso);
    }

    console.log(`✅ ${permisosSistema.length} permisos creados/verificados`);

    // ============================================
    // 🔹 3. ASIGNAR TODOS LOS PERMISOS AL ROL ADMIN
    // ============================================
    for (const idPermiso of permisosIds) {
      await sequelize.query(`
        INSERT INTO "DetallePermisos" ("IdRol", "IdPermiso", "createdAt", "updatedAt")
        VALUES (:idRol, :idPermiso, NOW(), NOW())
        ON CONFLICT ("IdRol", "IdPermiso") DO NOTHING;
      `, {
        replacements: {
          idRol: idRolAdmin,
          idPermiso: idPermiso
        }
      });
    }

    console.log(`✅ ${permisosIds.length} permisos asignados al rol Administrador`);

    // ============================================
    // 🔹 4. CREAR USUARIO ADMIN (con variables de entorno)
    // ============================================
    const email = process.env.SEED_ADMIN_EMAIL;
    const password = process.env.SEED_ADMIN_PASSWORD;
    const name = process.env.SEED_ADMIN_NAME || 'Administrador Principal';

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

    // ============================================
    // 🔹 5. RESUMEN FINAL
    // ============================================
    console.log('\n🎉 SEED COMPLETADO EXITOSAMENTE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(` Login: ${email}`);
    console.log(`🔑 Password: ${password}`);
    console.log(`👤 Rol: Administrador`);
    console.log(`🔐 Permisos: ${permisosSistema.length} (TODOS)`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('💡 Cambia la contraseña después del primer login');
    console.log('🌐 Prueba login en: /api/auth/login');

  } catch (error) {
    console.error('❌ Error en seed:', error.message);
    console.error(error.stack);
    throw error;
  } finally {
    await sequelize.close();
    process.exit(0);
  }
};

seedDatabase();