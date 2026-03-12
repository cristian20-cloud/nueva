// server.js
import express from 'express';
import cors from 'cors';
import { connectDB } from './config/db.js';

// Importar rutas
import authRoutes from './routes/auth.routes.js';
import usuarioRoutes from './routes/usuarios.routes.js';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/usuarios', usuarioRoutes);

// 🟢 Conectar BD y cargar modelos ANTES de escuchar
const PORT = process.env.PORT || 3000;

const startServer = async () => {
    try {
        await connectDB();  // ✅ Esto ahora carga modelos + asociaciones
        
        app.listen(PORT, () => {
            console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
        });
    } catch (error) {
        console.error('❌ No se pudo iniciar el servidor:', error);
        process.exit(1);
    }
};

startServer();