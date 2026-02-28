// routes/compras.routes.js
import express from 'express';
const router = express.Router();
import compraController from '../controllers/compras.controller.js';
import { verifyToken, checkPermission } from '../middlewares/auth.middleware.js';

// Todas las rutas requieren autenticación
router.use(verifyToken);

// Estadísticas y reportes
router.get('/estadisticas', checkPermission('ver_compras'), compraController.getEstadisticas);
router.get('/reportes/general', checkPermission('ver_compras'), compraController.generarReporteGeneral);
router.get('/:id/reporte', checkPermission('ver_compras'), compraController.generarReporteIndividual);

// Rutas de consulta por filtros
router.get('/proveedor/:proveedorId', checkPermission('ver_compras'), compraController.getComprasByProveedor);
router.get('/fecha', checkPermission('ver_compras'), compraController.getComprasByFecha);
router.get('/rango-fechas', checkPermission('ver_compras'), compraController.getComprasByRangoFechas);

// CRUD Principal
router.get('/', checkPermission('ver_compras'), compraController.getAllCompras);
router.get('/:id', checkPermission('ver_compras'), compraController.getCompraById);
router.post('/', checkPermission('crear_compras'), compraController.createCompra);
router.post('/:id/anular', checkPermission('anular_compras'), compraController.anularCompra);

// NOTA: No hay PUT ni DELETE por integridad contable

export default router;