// src/scripts/createAdmin.js
import { sequelize } from '../config/db.js';
import bcrypt from 'bcryptjs';

const crearAdminDirecto = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Conectado a la base de datos');

    const adminData = {
      Nombre: 'Administrador',
      Correo: 'streetcaps511@gmail.com',
      Clave: 'Admin#GM2024!Secure',
      Estado: true,
      IdRol: 1
    };

    const salt = await bcrypt.genSalt(10);
    const ClaveHash = await bcrypt.hash(adminData.Clave, salt);

    await sequelize.query(`
      INSERT INTO "Usuarios" ("Nombre", "Correo", "Clave", "Estado", "IdRol") 
      VALUES (:Nombre, :Correo, :Clave, :Estado, :IdRol)
      ON CONFLICT ("Correo") DO NOTHING;
    `, {
      replacements: {
        Nombre: adminData.Nombre,
        Correo: adminData.Correo.toLowerCase(),
        Clave: ClaveHash,
        Estado: adminData.Estado,
        IdRol: adminData.IdRol
      }
    });

    console.log('\n🎉 Admin creado:');
    console.log('   Correo: streetcaps511@gmail.com');
    console.log('   Clave: Admin#GM2024!Secure');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
};

crearAdminDirecto();