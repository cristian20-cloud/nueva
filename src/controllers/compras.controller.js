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
     * Obtener todas las compras
     * @route GET /api/compras
     */
    getAllCompras: async (req, res) => {
        try {
            const { page = 1, limit = 10, search = '', estado, fechaInicio, fechaFin } = req.query;
            const offset = (page - 1) * limit;

            const whereClause = {};
            
            if (search) {
                whereClause[Op.or] = [
                    { '$Proveedor.Nombre$': { [Op.iLike]: `%${search}%` } },
                    { '$Proveedor.NumeroDocumento$': { [Op.iLike]: `%${search}%` } }
                ];
            }

            if (estado !== undefined) {
                whereClause.Estado = estado === 'true';
            }

            if (fechaInicio && fechaFin) {
                whereClause.Fecha = {
                    [Op.between]: [new Date(fechaInicio), new Date(fechaFin)]
                };
            }

            const { count, rows } = await Compra.findAndCountAll({
                where: whereClause,
                include: [
                    { model: Proveedor, as: 'Proveedor', attributes: ['IdProveedor', 'Nombre', 'NumeroDocumento'] },
                    { model: DetalleCompra, as: 'Detalles', attributes: ['IdDetalle', 'Cantidad', 'PrecioCompra'] }
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
                    totalPages: Math.ceil(count / limit),
                    limit: parseInt(limit)
                }
            });
        } catch (error) {
            console.error('❌ Error en getAllCompras:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * Obtener compra por ID
     * @route GET /api/compras/:id
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
                        include: [
                            { model: Producto, as: 'Producto', attributes: ['IdProducto', 'Nombre'] },
                            { model: Talla, as: 'Talla', attributes: ['IdTalla', 'Nombre'] }
                        ]
                    }
                ]
            });

            if (!compra) {
                return res.status(404).json({ success: false, message: 'Compra no encontrada' });
            }

            res.json({ success: true, data: compra });
        } catch (error) {
            console.error('❌ Error en getCompraById:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * Crear nueva compra (AUMENTA stock)
     * @route POST /api/compras
     */
    createCompra: async (req, res) => {
        const transaction = await sequelize.transaction();
        
        try {
            const { IdProveedor, MetodoPago, productos, Observaciones } = req.body;

            if (!IdProveedor) {
                await transaction.rollback();
                return res.status(400).json({ success: false, message: 'Debe seleccionar un proveedor' });
            }

            if (!productos || productos.length === 0) {
                await transaction.rollback();
                return res.status(400).json({ success: false, message: 'Debe incluir al menos un producto' });
            }

            const proveedor = await Proveedor.findByPk(IdProveedor);
            if (!proveedor || !proveedor.Estado) {
                await transaction.rollback();
                return res.status(400).json({ success: false, message: 'Proveedor no válido' });
            }

            let total = 0;
            const detalles = [];

            for (const item of productos) {
                const producto = await Producto.findByPk(item.IdProducto);
                if (!producto) {
                    await transaction.rollback();
                    return res.status(400).json({ success: false, message: `Producto ${item.IdProducto} no existe` });
                }

                const talla = await Talla.findOne({
                    where: { IdTalla: item.IdTalla, IdProducto: item.IdProducto }
                });
                if (!talla) {
                    await transaction.rollback();
                    return res.status(400).json({ success: false, message: 'Talla no válida' });
                }

                if (!item.Cantidad || item.Cantidad <= 0) {
                    await transaction.rollback();
                    return res.status(400).json({ success: false, message: 'Cantidad inválida' });
                }

                if (!item.PrecioCompra || item.PrecioCompra <= 0) {
                    await transaction.rollback();
                    return res.status(400).json({ success: false, message: 'Precio de compra inválido' });
                }

                const subtotal = item.Cantidad * item.PrecioCompra;
                total += subtotal;

                detalles.push({
                    IdProducto: item.IdProducto,
                    IdTalla: item.IdTalla,
                    Cantidad: item.Cantidad,
                    PrecioCompra: item.PrecioCompra,
                    PrecioVenta: item.PrecioVenta || producto.PrecioVenta,
                    Subtotal: subtotal
                });

                await Talla.increment('Cantidad', {
                    by: item.Cantidad,
                    where: { IdTalla: item.IdTalla },
                    transaction
                });
            }

            const nuevaCompra = await Compra.create({
                IdProveedor,
                Fecha: new Date(),
                Total: total,
                Estado: true,
                MetodoPago: MetodoPago || 'Crédito',
                Observaciones
            }, { transaction });

            for (const detalle of detalles) {
                await DetalleCompra.create({
                    IdCompra: nuevaCompra.IdCompra,
                    ...detalle
                }, { transaction });
            }

            await transaction.commit();

            res.status(201).json({
                success: true,
                data: { IdCompra: nuevaCompra.IdCompra, Total: nuevaCompra.Total },
                message: 'Compra registrada exitosamente'
            });

        } catch (error) {
            await transaction.rollback();
            console.error('❌ Error en createCompra:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * Anular compra (REVIERTE stock)
     * @route POST /api/compras/:id/anular
     */
    anularCompra: async (req, res) => {
        const transaction = await sequelize.transaction();
        
        try {
            const { id } = req.params;
            const { motivo } = req.body;

            const compra = await Compra.findByPk(id, {
                include: [{ model: DetalleCompra, as: 'Detalles' }]
            });

            if (!compra) {
                await transaction.rollback();
                return res.status(404).json({ success: false, message: 'Compra no encontrada' });
            }

            if (!compra.Estado) {
                await transaction.rollback();
                return res.status(400).json({ success: false, message: 'La compra ya está anulada' });
            }

            // Revertir stock
            for (const detalle of compra.Detalles) {
                await Talla.decrement('Cantidad', {
                    by: detalle.Cantidad,
                    where: { IdTalla: detalle.IdTalla },
                    transaction
                });
            }

            await compra.update({
                Estado: false,
                MotivoAnulacion: motivo || 'Sin motivo especificado',
                FechaAnulacion: new Date()
            }, { transaction });

            await transaction.commit();

            res.json({ success: true, message: 'Compra anulada exitosamente' });
        } catch (error) {
            await transaction.rollback();
            console.error('❌ Error en anularCompra:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * Obtener compras por proveedor
     * @route GET /api/compras/proveedor/:proveedorId
     */
    getComprasByProveedor: async (req, res) => {
        try {
            const { proveedorId } = req.params;
            const { limit = 5, page = 1 } = req.query;
            const offset = (page - 1) * limit;

            const { count, rows } = await Compra.findAndCountAll({
                where: { IdProveedor: proveedorId },
                include: [{ model: DetalleCompra, as: 'Detalles', limit: 3 }],
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
            console.error('❌ Error en getComprasByProveedor:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * Obtener compras por fecha
     * @route GET /api/compras/fecha
     */
    getComprasByFecha: async (req, res) => {
        try {
            const { fecha } = req.query;
            
            if (!fecha) {
                return res.status(400).json({ success: false, message: 'Debe proporcionar una fecha' });
            }

            const fechaInicio = new Date(fecha);
            fechaInicio.setHours(0, 0, 0, 0);
            
            const fechaFin = new Date(fecha);
            fechaFin.setHours(23, 59, 59, 999);

            const compras = await Compra.findAll({
                where: {
                    Fecha: {
                        [Op.between]: [fechaInicio, fechaFin]
                    }
                },
                include: [{ model: Proveedor, as: 'Proveedor', attributes: ['Nombre'] }],
                order: [['Fecha', 'ASC']]
            });

            res.json({ success: true, data: compras });
        } catch (error) {
            console.error('❌ Error en getComprasByFecha:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * Obtener compras por rango de fechas
     * @route GET /api/compras/rango-fechas
     */
    getComprasByRangoFechas: async (req, res) => {
        try {
            const { fechaInicio, fechaFin } = req.query;

            if (!fechaInicio || !fechaFin) {
                return res.status(400).json({ success: false, message: 'Debe proporcionar fecha inicio y fecha fin' });
            }

            const inicio = new Date(fechaInicio);
            inicio.setHours(0, 0, 0, 0);
            
            const fin = new Date(fechaFin);
            fin.setHours(23, 59, 59, 999);

            const compras = await Compra.findAll({
                where: {
                    Fecha: {
                        [Op.between]: [inicio, fin]
                    }
                },
                include: [{ model: Proveedor, as: 'Proveedor', attributes: ['Nombre'] }],
                order: [['Fecha', 'ASC']]
            });

            res.json({ success: true, data: compras });
        } catch (error) {
            console.error('❌ Error en getComprasByRangoFechas:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * Generar reporte de compra individual
     * @route GET /api/compras/:id/reporte
     */
    generarReporteIndividual: async (req, res) => {
        try {
            const { id } = req.params;

            const compra = await Compra.findByPk(id, {
                include: [
                    { model: Proveedor, as: 'Proveedor' },
                    { 
                        model: DetalleCompra, 
                        as: 'Detalles',
                        include: [
                            { model: Producto, as: 'Producto', attributes: ['Nombre'] },
                            { model: Talla, as: 'Talla', attributes: ['Nombre'] }
                        ]
                    }
                ]
            });

            if (!compra) {
                return res.status(404).json({ success: false, message: 'Compra no encontrada' });
            }

            res.json({
                success: true,
                data: compra,
                message: 'Reporte generado exitosamente'
            });
        } catch (error) {
            console.error('❌ Error en generarReporteIndividual:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * Generar reporte general de compras
     * @route GET /api/compras/reportes/general
     */
    generarReporteGeneral: async (req, res) => {
        try {
            const { fechaInicio, fechaFin } = req.query;

            const whereClause = { Estado: true };
            
            if (fechaInicio && fechaFin) {
                whereClause.Fecha = {
                    [Op.between]: [new Date(fechaInicio), new Date(fechaFin)]
                };
            }

            const compras = await Compra.findAll({
                where: whereClause,
                include: [
                    { model: Proveedor, as: 'Proveedor', attributes: ['Nombre'] },
                    { model: DetalleCompra, as: 'Detalles' }
                ],
                order: [['Fecha', 'DESC']]
            });

            const totalInvertido = compras.reduce((sum, c) => sum + c.Total, 0);
            const totalProductos = compras.reduce((sum, c) => 
                sum + c.Detalles.reduce((s, d) => s + d.Cantidad, 0), 0
            );

            res.json({
                success: true,
                data: {
                    compras,
                    resumen: {
                        totalCompras: compras.length,
                        totalInvertido,
                        totalProductos,
                        promedioPorCompra: compras.length > 0 ? totalInvertido / compras.length : 0
                    }
                }
            });
        } catch (error) {
            console.error('❌ Error en generarReporteGeneral:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * Obtener estadísticas de compras
     * @route GET /api/compras/estadisticas
     */
    getEstadisticas: async (req, res) => {
        try {
            const totalCompras = await Compra.count();
            const comprasActivas = await Compra.count({ where: { Estado: true } });
            const comprasAnuladas = await Compra.count({ where: { Estado: false } });
            
            const totalInvertido = await Compra.sum('Total', { where: { Estado: true } }) || 0;
            
            // Compras por mes (últimos 6 meses)
            const seisMesesAtras = new Date();
            seisMesesAtras.setMonth(seisMesesAtras.getMonth() - 6);

            const comprasPorMes = await Compra.findAll({
                where: {
                    Fecha: { [Op.gte]: seisMesesAtras },
                    Estado: true
                },
                attributes: [
                    [sequelize.fn('DATE_TRUNC', 'month', sequelize.col('Fecha')), 'mes'],
                    [sequelize.fn('COUNT', sequelize.col('IdCompra')), 'cantidad'],
                    [sequelize.fn('SUM', sequelize.col('Total')), 'total']
                ],
                group: [sequelize.fn('DATE_TRUNC', 'month', sequelize.col('Fecha'))],
                order: [[sequelize.fn('DATE_TRUNC', 'month', sequelize.col('Fecha')), 'ASC']]
            });

            res.json({
                success: true,
                data: {
                    totalCompras,
                    comprasActivas,
                    comprasAnuladas,
                    totalInvertido,
                    comprasPorMes
                }
            });
        } catch (error) {
            console.error('❌ Error en getEstadisticas:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    }
};

export default compraController;