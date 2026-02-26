// routes/dashboard.routes.js
import express from 'express';
const router = express.Router();
import dashboardController from '../controllers/dashboard.controller.js';
import { verifyToken, checkRole } from '../middlewares/auth.middleware.js';

// Todas las rutas requieren autenticación
router.use(verifyToken);

// Rutas del dashboard
router.get('/', checkRole(['Administrador', 'Supervisor']), dashboardController.getDashboardStats);
router.get('/resumen', checkRole(['Administrador', 'Supervisor', 'Vendedor']), dashboardController.getResumen);
router.get('/graficos', checkRole(['Administrador', 'Supervisor']), dashboardController.getGraficos);

export default router;