// controllers/compras.controller.js
import { Op } from 'sequelize';
import Compra from '../models/compras.model.js';
import DetalleCompra from '../models/detalleCompras.model.js';
import Proveedor from '../models/proveedores.model.js';
import Producto from '../models/productos.model.js';
import Talla from '../models/tallas.model.js';
import { sequelize } from '../config/db.js';

const compraController = {
    /**
     * Obtener estadísticas de compras
     * Resuelve la ruta: router.get('/estadisticas', ...)
     */
    getEstadisticas: async (req, res) => {
        try {
            const totalCompras = await Compra.count();
            const comprasActivas = await Compra.count({ where: { Estado: true } });
            const comprasAnuladas = await Compra.count({ where: { Estado: false } });
            
            const totalInvertido = await Compra.sum('Total', { where: { Estado: true } }) || 0;

            res.json({
                success: true,
                data: { totalCompras, comprasActivas, comprasAnuladas, totalInvertido }
            });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * Obtener todas las compras
     * Resuelve la ruta en LÍNEA 20 de compras.routes.js: router.get('/', ...)
     */
    getAllCompras: async (req, res) => {
        try {
            const { page = 1, limit = 10, search = '' } = req.query;
            const offset = (page - 1) * limit;

            const whereClause = {};
            if (search) {
                whereClause[Op.or] = [
                    { '$Proveedor.Nombre$': { [Op.iLike]: `%${search}%` } }
                ];
            }

            const { count, rows } = await Compra.findAndCountAll({
                where: whereClause,
                include: [
                    { model: Proveedor, as: 'Proveedor', attributes: ['Nombre', 'NumeroDocumento'] },
                    { model: DetalleCompra, as: 'Detalles' }
                ],
                limit: parseInt(limit),
                offset: parseInt(offset),
                order: [['Fecha', 'DESC']]
            });

            res.json({
                success: true,
                data: rows,
                pagination: {
                    total: count,
                    page: parseInt(page),
                    totalPages: Math.ceil(count / limit)
                }
            });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * Obtener compra por ID
     * Resuelve la ruta: router.get('/:id', ...)
     */
    getCompraById: async (req, res) => {
        try {
            const { id } = req.params;
            const compra = await Compra.findByPk(id, {
                include: [
                    { model: Proveedor, as: 'Proveedor' },
                    { 
                        model: DetalleCompra, 
                        as: 'Detalles',
                        include: [{ model: Producto, as: 'Producto', attributes: ['Nombre'] }]
                    }
                ]
            });

            if (!compra) {
                return res.status(404).json({ success: false, message: 'Compra no encontrada' });
            }

            res.json({ success: true, data: compra });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * Crear nueva compra (Aumenta stock)
     * Resuelve la ruta: router.post('/', ...)
     */
    createCompra: async (req, res) => {
        const transaction = await sequelize.transaction();
        try {
            const { IdProveedor, MetodoPago, productos } = req.body;

            if (!IdProveedor || !productos || productos.length === 0) {
                await transaction.rollback();
                return res.status(400).json({ success: false, message: 'Datos incompletos' });
            }

            let total = 0;
            const detalles = [];

            for (const item of productos) {
                // Aumentar stock en Talla
                await Talla.increment('Cantidad', {
                    by: item.Cantidad,
                    where: { IdTalla: item.IdTalla },
                    transaction
                });

                const subtotal = item.Cantidad * item.PrecioCompra;
                total += subtotal;

                detalles.push({
                    IdProducto: item.IdProducto,
                    IdTalla: item.IdTalla,
                    Cantidad: item.Cantidad,
                    PrecioCompra: item.PrecioCompra,
                    Subtotal: subtotal
                });
            }

            const nuevaCompra = await Compra.create({
                IdProveedor,
                Fecha: new Date(),
                Total: total,
                Estado: true,
                MetodoPago: MetodoPago || 'Efectivo'
            }, { transaction });

            const detallesFinales = detalles.map(d => ({ ...d, IdCompra: nuevaCompra.IdCompra }));
            await DetalleCompra.bulkCreate(detallesFinales, { transaction });

            await transaction.commit();
            res.status(201).json({ success: true, message: 'Compra registrada' });
        } catch (error) {
            await transaction.rollback();
            res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * Anular compra (Revierte stock)
     * Resuelve la ruta: router.post('/:id/anular', ...)
     */
    anularCompra: async (req, res) => {
        const transaction = await sequelize.transaction();
        try {
            const { id } = req.params;
            const compra = await Compra.findByPk(id, {
                include: [{ model: DetalleCompra, as: 'Detalles' }]
            });

            if (!compra || !compra.Estado) {
                await transaction.rollback();
                return res.status(400).json({ success: false, message: 'No se puede anular' });
            }

            for (const detalle of compra.Detalles) {
                await Talla.decrement('Cantidad', {
                    by: detalle.Cantidad,
                    where: { IdTalla: detalle.IdTalla },
                    transaction
                });
            }

            await compra.update({ Estado: false }, { transaction });
            await transaction.commit();
            res.json({ success: true, message: 'Compra anulada' });
        } catch (error) {
            await transaction.rollback();
            res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * Obtener compras por proveedor
     * Resuelve la ruta: router.get('/proveedor/:proveedorId', ...)
     */
    getComprasByProveedor: async (req, res) => {
        try {
            const { proveedorId } = req.params;
            const compras = await Compra.findAll({ where: { IdProveedor: proveedorId } });
            res.json({ success: true, data: compras });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * Generar reporte
     * Resuelve la ruta: router.get('/:id/reporte', ...)
     */
    generarReporte: async (req, res) => {
        try {
            const { id } = req.params;
            res.json({ success: true, message: `Reporte de compra ${id} listo` });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
};

export default compraController;