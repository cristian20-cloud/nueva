// server.js
import app from './src/app.js';
import { connectDB } from './src/config/db.js';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT || 3000;

const startServer = async () => {
    
    console.log('   🚀 STREETCAPS API');
    
    try {
        await connectDB();
        console.log(`   📡 Servidor: http://localhost:${PORT}`);
        console.log(`   ⚡ Estado:    ✅ Corriendo`);
        console.log(`   📁 Entorno:   ${process.env.NODE_ENV || 'development'}`);
        
        app.listen(PORT, () => {});
    } catch (error) {
        console.log(`   ⚡ Estado:    ❌ Error en DB`);

        process.exit(1);
    }
};

startServer();