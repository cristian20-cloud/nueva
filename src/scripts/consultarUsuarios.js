// src/scripts/consultarUsuarios.js
import { sequelize } from '../config/db.js';
import Usuario from '../models/usuarios.model.js';
import Rol from '../models/roles.model.js';

async function consultarUsuarios() {
    try {
        // Opción 1: Usando Sequelize (recomendado)
        const usuarios = await Usuario.findAll({
            include: [{
                model: Rol,
                as: 'Rol',
                attributes: ['IdRol', 'Nombre']
            }],
            attributes: ['IdUsuario', 'Nombre', 'Correo', 'Tipo', 'Estado']
        });

        console.log('📋 Usuarios encontrados:', usuarios.length);
        console.table(usuarios.map(u => ({
            ID: u.IdUsuario,
            Nombre: u.Nombre,
            Correo: u.Correo,
            Tipo: u.Tipo,
            Estado: u.Estado,
            Rol: u.Rol?.Nombre
        })));

        // Opción 2: SQL directo
        const [results] = await sequelize.query(`
            SELECT u."IdUsuario", u."Nombre", u."Correo", r."Nombre" as "Rol"
            FROM "Usuarios" u
            LEFT JOIN "Roles" r ON u."IdRol" = r."IdRol"
        `);
        
        console.log('\n📊 Resultado SQL directo:', results.length);

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await sequelize.close();
        process.exit(0);
    }
}

consultarUsuarios();