// config/db.js
import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

console.log('\n🔍 Intentando conectar a PostgreSQL:');
console.log(`   Host: ${process.env.DB_HOST}`);
console.log(`   Puerto: ${process.env.DB_PORT}`);
console.log(`   Base de datos: ${process.env.DB_NAME}`);
console.log(`   Usuario: ${process.env.DB_USER}`);

const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT || 5432,
        dialect: 'postgres',
        logging: false, // puedes poner console.log si quieres ver queries
        dialectOptions: {
            ssl: {
                require: true,
                rejectUnauthorized: false
            }
        }
    }
);

export const connectDB = async () => {
    try {
        await sequelize.authenticate();
        console.log('   ✅ Base de datos conectada exitosamente');
    } catch (error) {
        console.log('   ❌ Error de conexión:', error.message);
        throw error;
    }
};

export { sequelize };