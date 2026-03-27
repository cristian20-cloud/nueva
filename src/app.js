import './models/index.js';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';

// Importar rutas
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
// PÁGINA PRINCIPAL - EN COLUMNA SIN SLASH
// ============================================
app.get('/', (req, res) => {
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  
  const modulos = [
    'dashboard',
    'auth',
    'productos',
    'categorias',
    'proveedores',
    'compras',
    'detallecompras',
    'devoluciones',
    'clientes',
    'ventas',
    'detalleventas',
    'usuarios',
    'roles',
    'permisos',
    'detallepermisos',
    'estados',
    'tallas',
    'imagenes',
    'health'
  ];

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { 
          margin: 20px; 
          font-family: Arial;
        }
        a { 
          color: blue; 
          text-decoration: underline;
          display: block;
          margin-bottom: 8px;
        }
      </style>
    </head>
    <body>
      ${modulos.map(m => `<a href="${baseUrl}/api/${m}" target="_blank">${m}</a>`).join('')}
    </body>
    </html>
  `;

  res.send(html);
});

// Ruta de salud
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