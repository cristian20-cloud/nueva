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
// PÁGINA PRINCIPAL (VERSIÓN SIMPLE)
// ============================================
app.get('/', (req, res) => {
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  
  const modulos = [
    { nombre: 'Dashboard', ruta: 'dashboard' },
    { nombre: 'Auth', ruta: 'auth/login' },
    { nombre: 'Productos', ruta: 'productos' },
    { nombre: 'Categorías', ruta: 'categorias' },
    { nombre: 'Proveedores', ruta: 'proveedores' },
    { nombre: 'Compras', ruta: 'compras' },
    { nombre: 'Detalle Compras', ruta: 'detallecompras' },
    { nombre: 'Devoluciones', ruta: 'devoluciones' },
    { nombre: 'Clientes', ruta: 'clientes' },
    { nombre: 'Ventas', ruta: 'ventas' },
    { nombre: 'Detalle Ventas', ruta: 'detalleventas' },
    { nombre: 'Usuarios', ruta: 'usuarios' },
    { nombre: 'Roles', ruta: 'roles' },
    { nombre: 'Permisos', ruta: 'permisos' },
    { nombre: 'Detalle Permisos', ruta: 'detallepermisos' },
    { nombre: 'Estados', ruta: 'estados' },
    { nombre: 'Tallas', ruta: 'tallas' },
    { nombre: 'Imágenes', ruta: 'imagenes' }
  ];

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>API Gestión</title>
      <style>
        body { 
          font-family: monospace; 
          max-width: 900px; 
          margin: 20px auto; 
          padding: 20px; 
          line-height: 1.5;
        }
        h1, h2, h3 { 
          margin-top: 20px;
          margin-bottom: 10px;
        }
        ul { 
          list-style: square;
          padding-left: 20px;
        }
        li { 
          margin: 5px 0;
        }
        a { 
          color: #000;
          text-decoration: underline;
        }
        a:hover {
          background: #f0f0f0;
        }
        hr {
          border: none;
          border-top: 1px solid #ccc;
          margin: 20px 0;
        }
      </style>
    </head>
    <body>
      <h1>API Gestión</h1>
      <p>API funcionando correctamente</p>
      <hr>

      <h2>Módulos Disponibles:</h2>
      <ul>
        ${modulos.map(m => `<li><a href="${baseUrl}/api/${m.ruta}" target="_blank">/api/${m.ruta}</a> - ${m.nombre}</li>`).join('')}
      </ul>
      <hr>

      <h2>Utilidades:</h2>
      <ul>
        <li><a href="${baseUrl}/health" target="_blank">/health</a> - Estado del servidor</li>
      </ul>
      <hr>

      <p>Uptime: ${Math.floor(process.uptime())} segundos</p>
      <p>Timestamp: ${new Date().toLocaleString()}</p>
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