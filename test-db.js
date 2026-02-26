// test-db.js
import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';
import fs from 'fs';

// Cargar variables de entorno
dotenv.config();

// Mostrar todas las variables cargadas
console.log('\n📋 Variables de entorno cargadas:');
console.log(`DB_HOST: ${process.env.DB_HOST}`);
console.log(`DB_PORT: ${process.env.DB_PORT}`);
console.log(`DB_NAME: ${process.env.DB_NAME}`);
console.log(`DB_USER: '${process.env.DB_USER}'`); // Las comillas muestran si hay espacios
console.log(`DB_PASSWORD: ${process.env.DB_PASSWORD ? '****' : 'No definida'}`);

// Verificar que el archivo .env existe
if (fs.existsSync('.env')) {
    console.log('\n✅ Archivo .env encontrado');
    const content = fs.readFileSync('.env', 'utf8');
    console.log('Primeras líneas:', content.split('\n').slice(0, 3));
} else {
    console.log('\n❌ Archivo .env NO encontrado');
}

async function testConnection() {
    console.log('\n🔍 Probando conexión con estos datos:');
    
    const client = new Client({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        ssl: false
    });

    try {
        await client.connect();
        console.log('✅ Conexión exitosa!');
        
        const res = await client.query('SELECT NOW()');
        console.log('📅 Hora del servidor:', res.rows[0].now);
        
        await client.end();
    } catch (error) {
        console.log('❌ Error de conexión:', error.message);
    }
}

testConnection();