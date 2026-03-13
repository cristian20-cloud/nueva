// src/app.js
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';

// Importar rutas (TODAS corregidas - SIN ESPACIOS)
import productosRoutes from './routes/productos.routes.js';
import proveedoresRoutes from './routes/proveedores.routes.js';
import categoriasRoutes from './routes/categorias.routes.js';
import comprasRoutes from './routes/compras.routes.js';
import detalleComprasRoutes from './routes/detalleCompras.routes.js';
import devolucionesRoutes from './routes/devoluciones.routes.js';
import clientesRoutes from './routes/clientes.routes.js';
import ventasRoutes from './routes/ventas.routes.js';
import detalleVentasRoutes from './routes/detalleVentas.routes.js';
import usuariosRoutes from './routes/usuarios.routes.js';
import rolesRoutes from './routes/roles.routes.js';
import permisosRoutes from './routes/permisos.routes.js';
import detallePermisosRoutes from './routes/detallePermisos.routes.js';
import estadoRoutes from './routes/estado.routes.js';
import tallasRoutes from './routes/tallas.routes.js';
import imagenesRoutes from './routes/imagenes.routes.js';
import authRoutes from './routes/auth.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';

// Middlewares
import { errorHandler } from './middlewares/error.middleware.js';

const app = express();

// Middlewares globales
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// ============================================
// RUTAS DE LA API
// ============================================
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/productos', productosRoutes);
app.use('/api/proveedores', proveedoresRoutes);
app.use('/api/categorias', categoriasRoutes);
app.use('/api/compras', comprasRoutes);
app.use('/api/detallecompras', detalleComprasRoutes);
app.use('/api/devoluciones', devolucionesRoutes);
app.use('/api/clientes', clientesRoutes);
app.use('/api/ventas', ventasRoutes);
app.use('/api/detalleventas', detalleVentasRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/roles', rolesRoutes);
app.use('/api/permisos', permisosRoutes);
app.use('/api/detallepermisos', detallePermisosRoutes);
app.use('/api/estados', estadoRoutes);
app.use('/api/tallas', tallasRoutes);
app.use('/api/imagenes', imagenesRoutes);

// ============================================
// PÁGINA PRINCIPAL
// ============================================
app.get('/', (req, res) => {
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  
  const modulos = [
    'productos', 'categorias', 'proveedores', 'compras',
    'detalleCompras', 'ventas', 'detalleVentas', 'clientes',
    'usuarios', 'roles', 'permisos', 'estados', 'tallas', 'devoluciones'
  ];

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>API Gestión - Stree Caps</title>
      <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
        h1 { color: #333; }
        ul { list-style: none; padding: 0; }
        li { margin: 10px 0; }
        a { color: #007bff; text-decoration: none; }
        a:hover { text-decoration: underline; }
      </style>
    </head>
    <body>
      <h1>🧢 Stree Caps API</h1>
      <p>API funcionando correctamente ✅</p>
      <h2>Módulos disponibles:</h2>
      <ul>
        ${modulos.map(m => `<li><a href="${baseUrl}/api/${m}" target="_blank">/api/${m}</a></li>`).join('')}
      </ul>
      <h2>Utilidades:</h2>
      <ul>
        <li><a href="${baseUrl}/health">/health</a> - Estado del servidor</li>
        <li><a href="${baseUrl}/api/auth/login">/api/auth/login</a> - Login</li>
      </ul>
    </body>
    </html>
  `;

  res.send(html);
});

// Ruta de salud para Render
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Middleware de errores
app.use(errorHandler);

export default app;