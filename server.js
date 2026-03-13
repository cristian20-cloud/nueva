// server.js
import { connectDB } from './src/config/db.js';
import app from './src/app.js';  // ⭐ Importar app configurado

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    // 1. Conectar BD y cargar modelos
    await connectDB();
    console.log('✅ Base de datos conectada');
    
    // 2. Escuchar en el puerto (app ya tiene todas las rutas)
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
      console.log(`🌐 URL: http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('❌ No se pudo iniciar el servidor:', error);
    process.exit(1);
  }
};

startServer();