// src/app.js
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
// PÁGINA PRINCIPAL (VERSIÓN SIMPLE)
// ============================================
app.get('/', (req, res) => {
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  
  const modulos = [
    { nombre: 'Dashboard', ruta: 'dashboard', metodo: 'GET' },
    { nombre: 'Auth - Login', ruta: 'auth/login', metodo: 'POST' },
    { nombre: 'Auth - Registro', ruta: 'auth/registro', metodo: 'POST' },
    { nombre: 'Productos', ruta: 'productos', metodo: 'GET, POST' },
    { nombre: 'Categorías', ruta: 'categorias', metodo: 'GET, POST' },
    { nombre: 'Proveedores', ruta: 'proveedores', metodo: 'GET, POST' },
    { nombre: 'Compras', ruta: 'compras', metodo: 'GET, POST' },
    { nombre: 'Detalle Compras', ruta: 'detallecompras', metodo: 'GET' },
    { nombre: 'Devoluciones', ruta: 'devoluciones', metodo: 'GET, POST' },
    { nombre: 'Clientes', ruta: 'clientes', metodo: 'GET, POST' },
    { nombre: 'Ventas', ruta: 'ventas', metodo: 'GET, POST' },
    { nombre: 'Detalle Ventas', ruta: 'detalleventas', metodo: 'GET' },
    { nombre: 'Usuarios', ruta: 'usuarios', metodo: 'GET, POST' },
    { nombre: 'Roles', ruta: 'roles', metodo: 'GET, POST' },
    { nombre: 'Permisos', ruta: 'permisos', metodo: 'GET, POST' },
    { nombre: 'Detalle Permisos', ruta: 'detallepermisos', metodo: 'GET' },
    { nombre: 'Estados', ruta: 'estados', metodo: 'GET, POST' },
    { nombre: 'Tallas', ruta: 'tallas', metodo: 'GET, POST' },
    { nombre: 'Imágenes', ruta: 'imagenes', metodo: 'GET, POST' }
  ];

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>API</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 30px;
          line-height: 1.6;
        }
        h1 {
          font-size: 24px;
          margin-bottom: 5px;
        }
        h2 {
          font-size: 20px;
          margin-top: 25px;
          margin-bottom: 15px;
          border-bottom: 1px solid #ccc;
          padding-bottom: 5px;
        }
        ul {
          list-style: none;
          padding: 0;
        }
        li {
          margin-bottom: 8px;
        }
        a {
          color: #0066cc;
          text-decoration: none;
        }
        a:hover {
          text-decoration: underline;
        }
        .metodo {
          color: #666;
          font-size: 12px;
          margin-left: 10px;
        }
        .info {
          color: #666;
          font-size: 14px;
        }
      </style>
    </head>
    <body>
      <h1>API</h1>
      <p class="info">Servidor funcionando</p>

      <h2>Módulos</h2>
      <ul>
        ${modulos.map(m => `
          <li>
            <a href="${baseUrl}/api/${m.ruta}" target="_blank">/api/${m.ruta}</a>
            <span class="metodo">[${m.metodo}]</span> - ${m.nombre}
          </li>
        `).join('')}
      </ul>

      <h2>Utilidades</h2>
      <ul>
        <li><a href="${baseUrl}/health" target="_blank">/health</a> - Estado</li>
      </ul>
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