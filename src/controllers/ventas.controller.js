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
            const { 
                page = 1, 
                limit = 10, 
                search = '',
                estado,
                fechaInicio,
                fechaFin
            } = req.query;
            
            const offset = (page - 1) * limit;

            const whereClause = {};
            
            if (search) {
                whereClause[Op.or] = [
                    { '$Cliente.Nombre$': { [Op.iLike]: `%${search}%` } },
                    { '$Cliente.Documento$': { [Op.iLike]: `%${search}%` } },
                    { IdVenta: isNaN(search) ? null : search }
                ];
            }

            if (estado) {
                whereClause.IdEstado = estado;
            }

            if (fechaInicio && fechaFin) {
                whereClause.Fecha = {
                    [Op.between]: [new Date(fechaInicio), new Date(fechaFin)]
                };
            }

            const { count, rows } = await Venta.findAndCountAll({
                where: whereClause,
                include: [
                    { 
                        model: Cliente, 
                        as: 'Cliente', 
                        attributes: ['IdCliente', 'Nombre', 'Documento', 'Telefono'] 
                    },
                    { 
                        model: Estado, 
                        as: 'Estado', 
                        attributes: ['IdEstado', 'Nombre', 'Color'] 
                    },
                    { 
                        model: DetalleVenta, 
                        as: 'Detalles',
                        attributes: ['IdDetalleVenta', 'Cantidad', 'Precio', 'Subtotal']
                    }
                ],
                limit: parseInt(limit),
                offset: parseInt(offset),
                order: [['Fecha', 'DESC']]
            });

            const ventasFormateadas = rows.map(venta => ({
                IdVenta: venta.IdVenta,
                Cliente: venta.Cliente?.Nombre || 'Cliente no registrado',
                DocumentoCliente: venta.Cliente?.Documento,
                Fecha: venta.Fecha,
                Total: venta.Total,
                TotalFormateado: new Intl.NumberFormat('es-CO', {
                    style: 'currency',
                    currency: 'COP',
                    minimumFractionDigits: 0
                }).format(venta.Total),
                Estado: venta.Estado?.Nombre || 'Desconocido',
                EstadoColor: venta.Estado?.Color,
                MetodoPago: venta.MetodoPago,
                CantidadProductos: venta.Detalles?.reduce((sum, d) => sum + d.Cantidad, 0) || 0
            }));

            res.json({
                success: true,
                data: ventasFormateadas,
                pagination: {
                    total: count,
                    page: parseInt(page),
                    totalPages: Math.ceil(count / limit),
                    limit: parseInt(limit)
                }
            });
        } catch (error) {
            console.error('❌ Error en getAllVentas:', error);
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
                    { 
                        model: Cliente, 
                        as: 'Cliente',
                        attributes: ['IdCliente', 'Nombre', 'Documento', 'Telefono', 'Correo', 'Direccion']
                    },
                    { 
                        model: Estado, 
                        as: 'Estado',
                        attributes: ['IdEstado', 'Nombre', 'Color']
                    },
                    { 
                        model: DetalleVenta, 
                        as: 'Detalles',
                        include: [
                            { 
                                model: Producto, 
                                as: 'Producto', 
                                attributes: ['IdProducto', 'Nombre', 'url'] 
                            },
                            { 
                                model: Talla, 
                                as: 'Talla', 
                                attributes: ['IdTalla', 'Nombre'] 
                            }
                        ]
                    }
                ]
            });

            if (!venta) {
                return res.status(404).json({ success: false, message: 'Venta no encontrada' });
            }

            res.json({ success: true, data: venta });
        } catch (error) {
            console.error('❌ Error en getVentaById:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * Obtener venta con detalle completo
     * @route GET /api/ventas/:id/detalle
     */
    getVentaConDetalle: async (req, res) => {
        try {
            const { id } = req.params;

            const venta = await Venta.findByPk(id, {
                include: [
                    { 
                        model: Cliente, 
                        as: 'Cliente' 
                    },
                    { 
                        model: Estado, 
                        as: 'Estado' 
                    },
                    { 
                        model: DetalleVenta, 
                        as: 'Detalles',
                        include: [
                            { model: Producto, as: 'Producto' },
                            { model: Talla, as: 'Talla' }
                        ]
                    }
                ]
            });

            if (!venta) {
                return res.status(404).json({ success: false, message: 'Venta no encontrada' });
            }

            const subtotal = venta.Detalles.reduce((sum, d) => sum + d.Subtotal, 0);
            const impuesto = subtotal * 0.19; // 19% IVA
            const total = subtotal + impuesto;

            res.json({
                success: true,
                data: {
                    ...venta.toJSON(),
                    subtotal,
                    impuesto,
                    total
                }
            });
        } catch (error) {
            console.error('❌ Error en getVentaConDetalle:', error);
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
            const { IdCliente, MetodoPago, productos, Observaciones } = req.body;

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

                if (!producto.Estado) {
                    await transaction.rollback();
                    return res.status(400).json({ success: false, message: `El producto ${producto.Nombre} está inactivo` });
                }

                const talla = await Talla.findOne({
                    where: { IdTalla: item.IdTalla, IdProducto: item.IdProducto }
                });
                
                if (!talla) {
                    await transaction.rollback();
                    return res.status(400).json({ success: false, message: 'Talla no válida' });
                }

                if (!talla.Estado) {
                    await transaction.rollback();
                    return res.status(400).json({ success: false, message: 'Talla no disponible' });
                }

                if (talla.Cantidad < item.Cantidad) {
                    await transaction.rollback();
                    return res.status(400).json({ 
                        success: false, 
                        message: `Stock insuficiente para ${producto.Nombre} - Talla ${talla.Nombre}. Disponible: ${talla.Cantidad}` 
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
                    Subtotal: subtotal,
                    Devuelto: false,
                    CantidadDevuelta: 0
                });

                await Talla.decrement('Cantidad', {
                    by: item.Cantidad,
                    where: { IdTalla: item.IdTalla },
                    transaction
                });
            }

            // Obtener estado por defecto (Completada)
            const estadoCompletada = await Estado.findOne({ 
                where: { Nombre: 'Completada' } 
            }) || { IdEstado: 1 };

            const nuevaVenta = await Venta.create({
                IdCliente,
                Fecha: new Date(),
                Total: total,
                IdEstado: estadoCompletada.IdEstado,
                MetodoPago: MetodoPago || 'Efectivo',
                Observaciones
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
                data: { 
                    IdVenta: nuevaVenta.IdVenta, 
                    Total: nuevaVenta.Total,
                    TotalFormateado: new Intl.NumberFormat('es-CO', {
                        style: 'currency',
                        currency: 'COP',
                        minimumFractionDigits: 0
                    }).format(nuevaVenta.Total)
                },
                message: 'Venta registrada exitosamente'
            });

        } catch (error) {
            await transaction.rollback();
            console.error('❌ Error en createVenta:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * Crear venta completa con múltiples productos
     * @route POST /api/ventas/completa
     */
    createVentaCompleta: async (req, res) => {
        const transaction = await sequelize.transaction();
        
        try {
            const { IdCliente, MetodoPago, productos, Observaciones, Descuento = 0 } = req.body;

            // Validaciones similares a createVenta
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

            let subtotal = 0;
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

                const itemSubtotal = item.Cantidad * precioUnitario;
                subtotal += itemSubtotal;

                detalles.push({
                    IdProducto: item.IdProducto,
                    IdTalla: item.IdTalla,
                    Cantidad: item.Cantidad,
                    Precio: precioUnitario,
                    Subtotal: itemSubtotal
                });

                await Talla.decrement('Cantidad', {
                    by: item.Cantidad,
                    where: { IdTalla: item.IdTalla },
                    transaction
                });
            }

            // Aplicar descuento
            const totalConDescuento = subtotal - Descuento;
            const estadoCompletada = await Estado.findOne({ 
                where: { Nombre: 'Completada' } 
            }) || { IdEstado: 1 };

            const nuevaVenta = await Venta.create({
                IdCliente,
                Fecha: new Date(),
                Total: totalConDescuento,
                Subtotal: subtotal,
                Descuento,
                IdEstado: estadoCompletada.IdEstado,
                MetodoPago: MetodoPago || 'Efectivo',
                Observaciones
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
                data: { 
                    IdVenta: nuevaVenta.IdVenta, 
                    Subtotal: subtotal,
                    Descuento,
                    Total: nuevaVenta.Total
                },
                message: 'Venta registrada exitosamente'
            });

        } catch (error) {
            await transaction.rollback();
            console.error('❌ Error en createVentaCompleta:', error);
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
            const { motivo } = req.body;

            const venta = await Venta.findByPk(id, {
                include: [{ model: DetalleVenta, as: 'Detalles' }]
            });

            if (!venta) {
                await transaction.rollback();
                return res.status(404).json({ success: false, message: 'Venta no encontrada' });
            }

            if (venta.IdEstado === 3) {
                await transaction.rollback();
                return res.status(400).json({ success: false, message: 'La venta ya está anulada' });
            }

            // Revertir stock
            for (const detalle of venta.Detalles) {
                await Talla.increment('Cantidad', {
                    by: detalle.Cantidad,
                    where: { IdTalla: detalle.IdTalla },
                    transaction
                });
            }

            // Obtener estado anulada
            const estadoAnulada = await Estado.findOne({ 
                where: { Nombre: 'Anulada' } 
            }) || { IdEstado: 3 };

            await venta.update({ 
                IdEstado: estadoAnulada.IdEstado,
                MotivoAnulacion: motivo || 'Sin motivo especificado',
                FechaAnulacion: new Date()
            }, { transaction });

            await transaction.commit();

            res.json({ 
                success: true, 
                message: 'Venta anulada exitosamente',
                data: { IdVenta: venta.IdVenta }
            });

        } catch (error) {
            await transaction.rollback();
            console.error('❌ Error en anularVenta:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * Procesar pago de venta
     * @route POST /api/ventas/:id/procesar-pago
     */
    procesarPago: async (req, res) => {
        const transaction = await sequelize.transaction();
        
        try {
            const { id } = req.params;
            const { montoPagado, metodoPago, referencia } = req.body;

            const venta = await Venta.findByPk(id);

            if (!venta) {
                await transaction.rollback();
                return res.status(404).json({ success: false, message: 'Venta no encontrada' });
            }

            if (venta.IdEstado !== 1) {
                await transaction.rollback();
                return res.status(400).json({ success: false, message: 'La venta no está pendiente de pago' });
            }

            if (montoPagado < venta.Total) {
                await transaction.rollback();
                return res.status(400).json({ 
                    success: false, 
                    message: `El monto pagado (${montoPagado}) es menor al total de la venta (${venta.Total})` 
                });
            }

            const vuelto = montoPagado - venta.Total;

            await venta.update({
                Pagado: true,
                MontoPagado: montoPagado,
                Vuelto: vuelto,
                MetodoPago: metodoPago || venta.MetodoPago,
                ReferenciaPago: referencia,
                FechaPago: new Date()
            }, { transaction });

            await transaction.commit();

            res.json({
                success: true,
                data: {
                    IdVenta: venta.IdVenta,
                    Total: venta.Total,
                    MontoPagado,
                    Vuelto
                },
                message: 'Pago procesado exitosamente'
            });

        } catch (error) {
            await transaction.rollback();
            console.error('❌ Error en procesarPago:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * Actualizar estado de venta
     * @route PATCH /api/ventas/:id/estado
     */
    actualizarEstado: async (req, res) => {
        const transaction = await sequelize.transaction();
        
        try {
            const { id } = req.params;
            const { idEstado } = req.body;

            const venta = await Venta.findByPk(id);

            if (!venta) {
                await transaction.rollback();
                return res.status(404).json({ success: false, message: 'Venta no encontrada' });
            }

            await venta.update({ IdEstado: idEstado }, { transaction });
            await transaction.commit();

            res.json({
                success: true,
                data: {
                    IdVenta: venta.IdVenta,
                    IdEstado: venta.IdEstado
                },
                message: 'Estado actualizado exitosamente'
            });

        } catch (error) {
            await transaction.rollback();
            console.error('❌ Error en actualizarEstado:', error);
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
                where: { Estado: true, Tipo: 'venta' },
                attributes: ['IdEstado', 'Nombre', 'Color', 'Descripcion'],
                order: [['Orden', 'ASC']]
            });

            res.json({ success: true, data: estados });
        } catch (error) {
            console.error('❌ Error en getEstadosVenta:', error);
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
            const ventasPendientes = await Venta.count({ where: { IdEstado: 2 } });
            const ventasAnuladas = await Venta.count({ where: { IdEstado: 3 } });
            
            const totalIngresos = await Venta.sum('Total', { where: { IdEstado: 1 } }) || 0;

            // Ventas por día (últimos 7 días)
            const fechaLimite = new Date();
            fechaLimite.setDate(fechaLimite.getDate() - 7);

            const ventasPorDia = await Venta.findAll({
                attributes: [
                    [sequelize.fn('DATE', sequelize.col('Fecha')), 'dia'],
                    [sequelize.fn('COUNT', sequelize.col('IdVenta')), 'cantidad'],
                    [sequelize.fn('SUM', sequelize.col('Total')), 'total']
                ],
                where: {
                    Fecha: { [Op.gte]: fechaLimite },
                    IdEstado: 1
                },
                group: [sequelize.fn('DATE', sequelize.col('Fecha'))],
                order: [[sequelize.literal('dia'), 'ASC']]
            });

            // Productos más vendidos
            const productosMasVendidos = await DetalleVenta.findAll({
                attributes: [
                    'IdProducto',
                    [sequelize.fn('SUM', sequelize.col('Cantidad')), 'totalVendido'],
                    [sequelize.fn('SUM', sequelize.col('Subtotal')), 'totalIngresos']
                ],
                include: [{
                    model: Producto,
                    as: 'Producto',
                    attributes: ['Nombre']
                }],
                group: ['IdProducto'],
                order: [[sequelize.literal('totalVendido'), 'DESC']],
                limit: 5
            });

            res.json({
                success: true,
                data: {
                    totalVentas,
                    ventasCompletadas,
                    ventasPendientes,
                    ventasAnuladas,
                    totalIngresos,
                    totalIngresosFormateado: new Intl.NumberFormat('es-CO', {
                        style: 'currency',
                        currency: 'COP',
                        minimumFractionDigits: 0
                    }).format(totalIngresos),
                    ventasPorDia,
                    productosMasVendidos
                }
            });
        } catch (error) {
            console.error('❌ Error en getEstadisticas:', error);
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
            const { limit = 5, page = 1 } = req.query;
            const offset = (page - 1) * limit;

            const { count, rows } = await Venta.findAndCountAll({
                where: { IdCliente: clienteId },
                include: [
                    { 
                        model: Estado, 
                        as: 'Estado', 
                        attributes: ['Nombre', 'Color'] 
                    },
                    { 
                        model: DetalleVenta, 
                        as: 'Detalles',
                        limit: 3,
                        include: [{ model: Producto, as: 'Producto', attributes: ['Nombre'] }]
                    }
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
            console.error('❌ Error en getVentasByCliente:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * Obtener ventas por fecha
     * @route GET /api/ventas/fecha
     */
    getVentasByFecha: async (req, res) => {
        try {
            const { fecha } = req.query;

            if (!fecha) {
                return res.status(400).json({ success: false, message: 'Debe proporcionar una fecha' });
            }

            const fechaInicio = new Date(fecha);
            fechaInicio.setHours(0, 0, 0, 0);
            
            const fechaFin = new Date(fecha);
            fechaFin.setHours(23, 59, 59, 999);

            const ventas = await Venta.findAll({
                where: {
                    Fecha: {
                        [Op.between]: [fechaInicio, fechaFin]
                    }
                },
                include: [
                    { model: Cliente, as: 'Cliente', attributes: ['Nombre'] },
                    { model: Estado, as: 'Estado', attributes: ['Nombre'] }
                ],
                order: [['Fecha', 'ASC']]
            });

            const total = ventas.reduce((sum, v) => sum + v.Total, 0);

            res.json({
                success: true,
                data: {
                    fecha,
                    total,
                    totalFormateado: new Intl.NumberFormat('es-CO', {
                        style: 'currency',
                        currency: 'COP',
                        minimumFractionDigits: 0
                    }).format(total),
                    cantidad: ventas.length,
                    ventas
                }
            });
        } catch (error) {
            console.error('❌ Error en getVentasByFecha:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * Obtener ventas por rango de fechas
     * @route GET /api/ventas/rango-fechas
     */
    getVentasByRangoFechas: async (req, res) => {
        try {
            const { fechaInicio, fechaFin } = req.query;

            if (!fechaInicio || !fechaFin) {
                return res.status(400).json({ success: false, message: 'Debe proporcionar fecha inicio y fecha fin' });
            }

            const inicio = new Date(fechaInicio);
            inicio.setHours(0, 0, 0, 0);
            
            const fin = new Date(fechaFin);
            fin.setHours(23, 59, 59, 999);

            const ventas = await Venta.findAll({
                where: {
                    Fecha: {
                        [Op.between]: [inicio, fin]
                    }
                },
                include: [
                    { model: Cliente, as: 'Cliente', attributes: ['Nombre'] },
                    { model: Estado, as: 'Estado', attributes: ['Nombre'] }
                ],
                order: [['Fecha', 'ASC']]
            });

            const total = ventas.reduce((sum, v) => sum + v.Total, 0);
            const promedio = ventas.length > 0 ? total / ventas.length : 0;

            res.json({
                success: true,
                data: {
                    fechaInicio,
                    fechaFin,
                    resumen: {
                        cantidad: ventas.length,
                        total,
                        totalFormateado: new Intl.NumberFormat('es-CO', {
                            style: 'currency',
                            currency: 'COP',
                            minimumFractionDigits: 0
                        }).format(total),
                        promedio,
                        promedioFormateado: new Intl.NumberFormat('es-CO', {
                            style: 'currency',
                            currency: 'COP',
                            minimumFractionDigits: 0
                        }).format(promedio)
                    },
                    ventas
                }
            });
        } catch (error) {
            console.error('❌ Error en getVentasByRangoFechas:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * Obtener ventas por producto
     * @route GET /api/ventas/producto/:productoId
     */
    getVentasByProducto: async (req, res) => {
        try {
            const { productoId } = req.params;
            const { limit = 10 } = req.query;

            const ventas = await DetalleVenta.findAll({
                where: { IdProducto: productoId },
                include: [
                    { 
                        model: Venta, 
                        as: 'Venta',
                        include: [
                            { model: Cliente, as: 'Cliente', attributes: ['Nombre'] },
                            { model: Estado, as: 'Estado', attributes: ['Nombre'] }
                        ]
                    },
                    { model: Talla, as: 'Talla', attributes: ['Nombre'] }
                ],
                limit: parseInt(limit),
                order: [[{ model: Venta, as: 'Venta' }, 'Fecha', 'DESC']]
            });

            res.json({
                success: true,
                data: ventas
            });
        } catch (error) {
            console.error('❌ Error en getVentasByProducto:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * Obtener ventas por vendedor
     * @route GET /api/ventas/vendedor/:vendedorId
     */
    getVentasByVendedor: async (req, res) => {
        try {
            const { vendedorId } = req.params;
            const { limit = 10 } = req.query;

            const ventas = await Venta.findAll({
                where: { IdVendedor: vendedorId },
                include: [
                    { model: Cliente, as: 'Cliente', attributes: ['Nombre'] },
                    { model: Estado, as: 'Estado', attributes: ['Nombre'] }
                ],
                limit: parseInt(limit),
                order: [['Fecha', 'DESC']]
            });

            const total = ventas.reduce((sum, v) => sum + v.Total, 0);

            res.json({
                success: true,
                data: {
                    vendedorId,
                    total,
                    cantidad: ventas.length,
                    ventas
                }
            });
        } catch (error) {
            console.error('❌ Error en getVentasByVendedor:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * Generar reporte individual de venta
     * @route GET /api/ventas/:id/reporte
     */
    generarReporteIndividual: async (req, res) => {
        try {
            const { id } = req.params;

            const venta = await Venta.findByPk(id, {
                include: [
                    { 
                        model: Cliente, 
                        as: 'Cliente',
                        attributes: ['IdCliente', 'Nombre', 'Documento', 'Telefono', 'Correo', 'Direccion']
                    },
                    { 
                        model: Estado, 
                        as: 'Estado',
                        attributes: ['IdEstado', 'Nombre', 'Color']
                    },
                    { 
                        model: DetalleVenta, 
                        as: 'Detalles',
                        include: [
                            { model: Producto, as: 'Producto', attributes: ['Nombre', 'Descripcion'] },
                            { model: Talla, as: 'Talla', attributes: ['Nombre'] }
                        ]
                    }
                ]
            });

            if (!venta) {
                return res.status(404).json({ success: false, message: 'Venta no encontrada' });
            }

            const subtotal = venta.Detalles.reduce((sum, d) => sum + d.Subtotal, 0);
            const impuesto = subtotal * 0.19;
            const total = subtotal + impuesto;

            res.json({
                success: true,
                data: {
                    ...venta.toJSON(),
                    subtotal,
                    subtotalFormateado: new Intl.NumberFormat('es-CO', {
                        style: 'currency',
                        currency: 'COP',
                        minimumFractionDigits: 0
                    }).format(subtotal),
                    impuesto,
                    impuestoFormateado: new Intl.NumberFormat('es-CO', {
                        style: 'currency',
                        currency: 'COP',
                        minimumFractionDigits: 0
                    }).format(impuesto),
                    total,
                    totalFormateado: new Intl.NumberFormat('es-CO', {
                        style: 'currency',
                        currency: 'COP',
                        minimumFractionDigits: 0
                    }).format(total)
                }
            });
        } catch (error) {
            console.error('❌ Error en generarReporteIndividual:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    }
};

export default ventaController;