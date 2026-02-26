// controllers/ventas.controller.js
import { Op } from 'sequelize';
import Venta from '../models/ventas.model.js';
import DetalleVenta from '../models/detalleVentas.model.js';
import Cliente from '../models/clientes.model.js';
import Producto from '../models/productos.model.js';
import Talla from '../models/tallas.model.js';
import Estado from '../models/estado.model.js';
import { sequelize } from '../config/db.js';

const ventaController = {
    /**
     * Obtener todas las ventas
     * @route GET /api/ventas
     */
    getAllVentas: async (req, res) => {
        try {
            const { page = 1, limit = 10, search = '' } = req.query;
            const offset = (page - 1) * limit;

            const whereClause = {};
            if (search) {
                whereClause[Op.or] = [
                    { '$Cliente.Nombre$': { [Op.iLike]: `%${search}%` } }
                ];
            }

            const { count, rows } = await Venta.findAndCountAll({
                where: whereClause,
                include: [
                    { model: Cliente, as: 'Cliente', attributes: ['Nombre'] },
                    { model: DetalleVenta, as: 'Detalles' }
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
     * Obtener venta por ID
     * @route GET /api/ventas/:id
     */
    getVentaById: async (req, res) => {
        try {
            const { id } = req.params;

            const venta = await Venta.findByPk(id, {
                include: [
                    { model: Cliente, as: 'Cliente' },
                    { 
                        model: DetalleVenta, 
                        as: 'Detalles',
                        include: [{ model: Producto, as: 'Producto', attributes: ['Nombre'] }]
                    }
                ]
            });

            if (!venta) {
                return res.status(404).json({ success: false, message: 'Venta no encontrada' });
            }

            res.json({ success: true, data: venta });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * Crear nueva venta (DISMINUYE stock)
     * @route POST /api/ventas
     */
    createVenta: async (req, res) => {
        const transaction = await sequelize.transaction();
        
        try {
            const { IdCliente, MetodoPago, productos } = req.body;

            if (!IdCliente) {
                await transaction.rollback();
                return res.status(400).json({ success: false, message: 'Debe seleccionar un cliente' });
            }

            if (!productos || productos.length === 0) {
                await transaction.rollback();
                return res.status(400).json({ success: false, message: 'Debe incluir al menos un producto' });
            }

            const cliente = await Cliente.findByPk(IdCliente);
            if (!cliente || !cliente.Estado) {
                await transaction.rollback();
                return res.status(400).json({ success: false, message: 'Cliente no válido' });
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

                if (talla.Cantidad < item.Cantidad) {
                    await transaction.rollback();
                    return res.status(400).json({ 
                        success: false, 
                        message: `Stock insuficiente para ${producto.Nombre}. Disponible: ${talla.Cantidad}` 
                    });
                }

                let precioUnitario = producto.PrecioVenta;
                if (producto.EnOferta && producto.PrecioOferta) {
                    precioUnitario = producto.PrecioOferta;
                }

                if (!item.Cantidad || item.Cantidad <= 0) {
                    await transaction.rollback();
                    return res.status(400).json({ success: false, message: 'Cantidad inválida' });
                }

                const subtotal = item.Cantidad * precioUnitario;
                total += subtotal;

                detalles.push({
                    IdProducto: item.IdProducto,
                    IdTalla: item.IdTalla,
                    Cantidad: item.Cantidad,
                    Precio: precioUnitario,
                    Subtotal: subtotal
                });

                await Talla.decrement('Cantidad', {
                    by: item.Cantidad,
                    where: { IdTalla: item.IdTalla },
                    transaction
                });
            }

            const nuevaVenta = await Venta.create({
                IdCliente,
                Fecha: new Date(),
                Total: total,
                IdEstado: 1,
                MetodoPago
            }, { transaction });

            for (const detalle of detalles) {
                await DetalleVenta.create({
                    IdVenta: nuevaVenta.IdVenta,
                    ...detalle
                }, { transaction });
            }

            await transaction.commit();

            res.status(201).json({
                success: true,
                data: { IdVenta: nuevaVenta.IdVenta, Total: nuevaVenta.Total },
                message: 'Venta registrada exitosamente'
            });

        } catch (error) {
            await transaction.rollback();
            res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * Anular venta (REVIERTE stock)
     * @route POST /api/ventas/:id/anular
     */
    anularVenta: async (req, res) => {
        const transaction = await sequelize.transaction();
        
        try {
            const { id } = req.params;

            const venta = await Venta.findByPk(id, {
                include: [{ model: DetalleVenta, as: 'Detalles' }]
            });

            if (!venta || venta.IdEstado === 3) {
                await transaction.rollback();
                return res.status(400).json({ success: false, message: 'Venta no válida para anular' });
            }

            for (const detalle of venta.Detalles) {
                await Talla.increment('Cantidad', {
                    by: detalle.Cantidad,
                    where: { IdTalla: detalle.IdTalla },
                    transaction
                });
            }

            await venta.update({ IdEstado: 3 }, { transaction });

            await transaction.commit();

            res.json({ success: true, message: 'Venta anulada exitosamente' });

        } catch (error) {
            await transaction.rollback();
            res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * Obtener estados de venta
     * @route GET /api/ventas/estados
     */
    getEstadosVenta: async (req, res) => {
        try {
            const estados = await Estado.findAll({
                where: { Estado: true },
                attributes: ['IdEstado', 'Nombre'],
                order: [['IdEstado', 'ASC']]
            });

            res.json({ success: true, data: estados });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * Obtener estadísticas de ventas
     * @route GET /api/ventas/estadisticas
     */
    getEstadisticas: async (req, res) => {
        try {
            const totalVentas = await Venta.count();
            const ventasCompletadas = await Venta.count({ where: { IdEstado: 1 } });
            const ventasAnuladas = await Venta.count({ where: { IdEstado: 3 } });
            
            const totalIngresos = await Venta.sum('Total', { where: { IdEstado: 1 } }) || 0;

            res.json({
                success: true,
                data: {
                    totalVentas,
                    ventasCompletadas,
                    ventasAnuladas,
                    totalIngresos
                }
            });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * Obtener ventas por cliente
     * @route GET /api/ventas/cliente/:clienteId
     */
    getVentasByCliente: async (req, res) => {
        try {
            const { clienteId } = req.params;
            const { limit = 5 } = req.query;

            const ventas = await Venta.findAll({
                where: { IdCliente: clienteId },
                include: [
                    { model: Estado, as: 'Estado', attributes: ['Nombre'] },
                    { model: DetalleVenta, as: 'Detalles', limit: 3 }
                ],
                limit: parseInt(limit),
                order: [['Fecha', 'DESC']]
            });

            res.json({ success: true, data: ventas });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
};

export default ventaController;