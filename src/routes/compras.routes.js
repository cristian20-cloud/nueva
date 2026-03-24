// routes/compras.routes.js
import express from 'express';
const router = express.Router();
import compraController from '../controllers/compras.controller.js';
import { verifyToken, checkRole } from '../middlewares/auth.middleware.js';

/**
 * Rutas para el módulo de Compras
 * Base URL: /api/compras
 */

// 1. Middleware Global: Todas las rutas requieren autenticación
router.use(verifyToken);

// 2. Rutas Específicas (Deben ir primero para no ser capturadas por rutas con parámetros como :id)
// Ruta de estadísticas
router.get('/estadisticas', compraController.getEstadisticas);

// Ruta de compras por proveedor
router.get('/proveedor/:proveedorId', compraController.getComprasByProveedor);

// 3. CRUD y Operaciones por ID
// Obtener todas las compras (Esta es la línea 20 original)
router.get('/', compraController.getAllCompras);

// Obtener una compra específica
router.get('/:id', compraController.getCompraById);

// Generar reporte de una compra
router.get('/:id/reporte', compraController.generarReporte);

// 4. Rutas de Acción (POST) con validación de Roles
// Crear una nueva compra
router.post('/', 
    checkRole(['ADMIN', 'SUPERVISOR', 'COMPRAS']), 
    compraController.createCompra
);

// Anular una compra existente
router.post('/:id/anular', 
    checkRole(['ADMIN', 'SUPERVISOR']), 
    compraController.anularCompra
);

// NOTA: No se definen rutas PUT ni DELETE por integridad de datos contables.
export default router;