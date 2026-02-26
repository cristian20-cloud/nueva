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
     * Crear nueva compra (AUMENTA stock)
     */
    createCompra: async (req, res) => {
        const transaction = await sequelize.transaction();
        
        try {
            const { IdProveedor, MetodoPago, productos } = req.body;

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
                MetodoPago: MetodoPago || 'Completada'
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
            res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * Anular compra (REVIERTE stock)
     */
    anularCompra: async (req, res) => {
        const transaction = await sequelize.transaction();
        
        try {
            const { id } = req.params;
            const { motivo } = req.body;

            const compra = await Compra.findByPk(id, {
                include: [{ model: DetalleCompra, as: 'Detalles' }]
            });

            if (!compra || !compra.Estado) {
                await transaction.rollback();
                return res.status(400).json({ success: false, message: 'Compra no válida para anular' });
            }

            for (const detalle of compra.Detalles) {
                await Talla.decrement('Cantidad', {
                    by: detalle.Cantidad,
                    where: { IdTalla: detalle.IdTalla },
                    transaction
                });
            }

            await compra.update({
                Estado: false,
                MotivoAnulacion: motivo,
                FechaAnulacion: new Date()
            }, { transaction });

            await transaction.commit();

            res.json({ success: true, message: 'Compra anulada exitosamente' });

        } catch (error) {
            await transaction.rollback();
            res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * Obtener compras por proveedor
     */
    getComprasByProveedor: async (req, res) => {
        try {
            const { proveedorId } = req.params;
            const { limit = 5 } = req.query;

            const compras = await Compra.findAll({
                where: { IdProveedor: proveedorId, Estado: true },
                include: [{ model: DetalleCompra, as: 'Detalles', limit: 3 }],
                limit: parseInt(limit),
                order: [['Fecha', 'DESC']]
            });

            res.json({ success: true, data: compras });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * Generar reporte de compra
     */
    generarReporte: async (req, res) => {
        try {
            const { id } = req.params;
            const { formato = 'pdf' } = req.query;

            const compra = await Compra.findByPk(id, {
                include: [
                    { model: Proveedor, as: 'Proveedor' },
                    { 
                        model: DetalleCompra, 
                        as: 'Detalles',
                        include: [{ model: Producto, as: 'Producto' }]
                    }
                ]
            });

            if (!compra) {
                return res.status(404).json({ success: false, message: 'Compra no encontrada' });
            }

            res.json({
                success: true,
                data: compra,
                message: `Reporte en formato ${formato} generado exitosamente`
            });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * Obtener estadísticas de compras
     */
    getEstadisticas: async (req, res) => {
        try {
            const totalCompras = await Compra.count();
            const comprasActivas = await Compra.count({ where: { Estado: true } });
            const comprasAnuladas = await Compra.count({ where: { Estado: false } });
            
            const totalInvertido = await Compra.sum('Total', { where: { Estado: true } }) || 0;

            res.json({
                success: true,
                data: {
                    totalCompras,
                    comprasActivas,
                    comprasAnuladas,
                    totalInvertido
                }
            });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
};

export default compraController;