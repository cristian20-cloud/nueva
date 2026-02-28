// server.js
import app from './src/app.js';
import { connectDB } from './src/config/db.js';
import { sequelize } from './src/models/index.js'; // ✅ CORREGIDO: con src/
import dotenv from 'dotenv';

// ✅ IMPORTAR EL ARCHIVO INDEX (con la ruta correcta)
import './src/models/index.js';

dotenv.config();

const PORT = process.env.PORT || 3000;

const startServer = async () => {
    
    console.log('   🚀 STREETCAPS API');
    
    try {
        // 1. Conectar a la base de datos
        await connectDB();
        console.log(`   📡 Servidor: http://localhost:${PORT}`);
        
        // 2. ⚠️ Comentar sync por ahora
        // await sequelize.sync({ alter: true, force: false });
        
        console.log(`   🗄️  Base de datos: ✅ Conectada`);
        console.log(`   ⚡ Estado:    ✅ Corriendo`);
        console.log(`   📁 Entorno:   ${process.env.NODE_ENV || 'development'}`);
        
        // 3. Iniciar servidor
        app.listen(PORT, () => {
            console.log(`   🚀 Servidor escuchando en puerto ${PORT}`);
        });
        
    } catch (error) {
        console.log(`   ⚡ Estado:    ❌ Error: ${error.message}`);
        console.error('❌ Detalle del error:', error);
        process.exit(1);
    }
};

startServer();