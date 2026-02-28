// controllers/devoluciones.controller.js
import { Op } from 'sequelize';
import Devolucion from '../models/devoluciones.model.js';
import Producto from '../models/productos.model.js';
import Venta from '../models/ventas.model.js';
import DetalleVenta from '../models/detalleVentas.model.js';
import Cliente from '../models/clientes.model.js';
import { validateDevolucion } from '../utils/validationUtils.js';
import { sequelize } from '../config/db.js';

/**
 * Controlador de Devoluciones
 * Maneja todas las operaciones CRUD para devoluciones
 */
const devolucionController = {
    /**
     * Obtener todas las devoluciones con filtros
     * @route GET /api/devoluciones
     */
    getAllDevoluciones: async (req, res) => {
        try {
            const { 
                page = 1, 
                limit = 10, 
                search = '', 
                fechaInicio,
                fechaFin,
                producto,
                venta,
                estado
            } = req.query;

            const offset = (page - 1) * limit;

            // Construir filtros
            const whereClause = {};
            
            if (search) {
                whereClause[Op.or] = [
                    { '$Producto.Nombre$': { [Op.iLike]: `%${search}%` } },
                    { IdDevolucion: isNaN(search) ? null : search },
                    { '$Venta.IdVenta$': isNaN(search) ? null : search },
                    { '$Venta.Cliente.Documento$': isNaN(search) ? null : search }
                ];
            }
            
            if (fechaInicio || fechaFin) {
                whereClause.Fecha = {};
                if (fechaInicio) whereClause.Fecha[Op.gte] = new Date(fechaInicio);
                if (fechaFin) whereClause.Fecha[Op.lte] = new Date(fechaFin);
            }
            
            if (producto) {
                whereClause.IdProducto = producto;
            }
            
            if (venta) {
                whereClause.IdVenta = venta;
            }
            
            if (estado !== undefined) {
                whereClause.Estado = estado === 'true';
            }

            // Consultar devoluciones con relaciones
            const { count, rows } = await Devolucion.findAndCountAll({
                where: whereClause,
                include: [
                    {
                        model: Producto,
                        as: 'Producto',
                        attributes: ['IdProducto', 'Nombre', 'PrecioVenta']
                    },
                    {
                        model: Venta,
                        as: 'Venta',
                        include: [{
                            model: Cliente,
                            as: 'Cliente',
                            attributes: ['IdCliente', 'Nombre', 'Documento']
                        }]
                    }
                ],
                limit: parseInt(limit),
                offset: parseInt(offset),
                order: [['Fecha', 'DESC']]
            });

            // Formatear respuesta para la interfaz
            const devolucionesFormateadas = rows.map(devolucion => ({
                IdDevolucion: devolucion.IdDevolucion,
                DocumentoCliente: devolucion.Venta?.Cliente?.Documento || 'N/A',
                Cliente: devolucion.Venta?.Cliente?.Nombre || 'N/A',
                Producto: devolucion.Producto?.Nombre || 'N/A',
                IdProducto: devolucion.IdProducto,
                Cantidad: devolucion.Cantidad,
                Monto: devolucion.Monto,
                MontoFormateado: devolucion.formatearMonto(),
                Fecha: devolucion.formatearFecha(),
                FechaOriginal: devolucion.Fecha,
                Motivo: devolucion.Motivo,
                IdVenta: devolucion.IdVenta,
                Estado: devolucion.Estado,
                EstadoTexto: devolucion.Estado ? 'Activa' : 'Anulada'
            }));

            const totalPages = Math.ceil(count / limit);

            res.status(200).json({
                success: true,
                data: devolucionesFormateadas,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages,
                    totalItems: count,
                    itemsPerPage: parseInt(limit),
                    showingFrom: offset + 1,
                    showingTo: Math.min(offset + parseInt(limit), count)
                },
                message: 'Devoluciones obtenidas exitosamente'
            });

        } catch (error) {
            console.error('❌ Error en getAllDevoluciones:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener las devoluciones',
                error: error.message
            });
        }
    },

    /**
     * Obtener una devolución por ID
     * @route GET /api/devoluciones/:id
     */
    getDevolucionById: async (req, res) => {
        try {
            const { id } = req.params;

            if (isNaN(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'ID de devolución inválido'
                });
            }

            const devolucion = await Devolucion.findByPk(id, {
                include: [
                    {
                        model: Producto,
                        as: 'Producto',
                        attributes: ['IdProducto', 'Nombre', 'Descripcion', 'PrecioVenta', 'url']
                    },
                    {
                        model: Venta,
                        as: 'Venta',
                        include: [
                            {
                                model: Cliente,
                                as: 'Cliente',
                                attributes: ['IdCliente', 'Nombre', 'Documento', 'Telefono', 'Correo']
                            },
                            {
                                model: DetalleVenta,
                                as: 'Detalles',
                                where: { IdProducto: sequelize.col('Devolucion.IdProducto') },
                                required: false
                            }
                        ]
                    }
                ]
            });

            if (!devolucion) {
                return res.status(404).json({
                    success: false,
                    message: 'Devolución no encontrada'
                });
            }

            res.status(200).json({
                success: true,
                data: {
                    IdDevolucion: devolucion.IdDevolucion,
                    Venta: {
                        IdVenta: devolucion.Venta?.IdVenta,
                        Fecha: devolucion.Venta?.Fecha,
                        Total: devolucion.Venta?.Total
                    },
                    Cliente: devolucion.Venta?.Cliente ? {
                        IdCliente: devolucion.Venta.Cliente.IdCliente,
                        Nombre: devolucion.Venta.Cliente.Nombre,
                        Documento: devolucion.Venta.Cliente.Documento,
                        Telefono: devolucion.Venta.Cliente.Telefono,
                        Correo: devolucion.Venta.Cliente.Correo
                    } : null,
                    Producto: {
                        IdProducto: devolucion.Producto?.IdProducto,
                        Nombre: devolucion.Producto?.Nombre,
                        Descripcion: devolucion.Producto?.Descripcion,
                        PrecioVenta: devolucion.Producto?.PrecioVenta,
                        Imagen: devolucion.Producto?.url
                    },
                    Cantidad: devolucion.Cantidad,
                    Monto: devolucion.Monto,
                    MontoFormateado: devolucion.formatearMonto(),
                    Fecha: devolucion.formatearFecha(),
                    FechaOriginal: devolucion.Fecha,
                    Motivo: devolucion.Motivo,
                    Estado: devolucion.Estado,
                    EstadoTexto: devolucion.Estado ? 'Activa' : 'Anulada'
                },
                message: 'Devolución obtenida exitosamente'
            });

        } catch (error) {
            console.error('❌ Error en getDevolucionById:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener la devolución',
                error: error.message
            });
        }
    },

    /**
     * Crear una nueva devolución
     * @route POST /api/devoluciones
     */
    createDevolucion: async (req, res) => {
        const transaction = await sequelize.transaction();
        
        try {
            const { IdVenta, IdProducto, Cantidad, Motivo } = req.body;

            // Validar datos básicos
            if (!IdVenta) {
                await transaction.rollback();
                return res.status(400).json({
                    success: false,
                    message: 'Debe especificar la venta original'
                });
            }

            if (!IdProducto) {
                await transaction.rollback();
                return res.status(400).json({
                    success: false,
                    message: 'Debe especificar el producto a devolver'
                });
            }

            if (!Cantidad || Cantidad <= 0) {
                await transaction.rollback();
                return res.status(400).json({
                    success: false,
                    message: 'La cantidad debe ser mayor a 0'
                });
            }

            if (!Motivo || Motivo.trim() === '') {
                await transaction.rollback();
                return res.status(400).json({
                    success: false,
                    message: 'Debe proporcionar un motivo de devolución'
                });
            }

            // Verificar venta
            const venta = await Venta.findByPk(IdVenta, {
                include: [{
                    model: DetalleVenta,
                    as: 'Detalles',
                    where: { IdProducto },
                    required: false
                }]
            });

            if (!venta) {
                await transaction.rollback();
                return res.status(404).json({
                    success: false,
                    message: 'Venta no encontrada'
                });
            }

            // Verificar producto
            const producto = await Producto.findByPk(IdProducto);
            if (!producto) {
                await transaction.rollback();
                return res.status(404).json({
                    success: false,
                    message: 'Producto no encontrado'
                });
            }

            // Verificar que el producto esté en la venta
            const detalleVenta = await DetalleVenta.findOne({
                where: {
                    IdVenta,
                    IdProducto
                }
            });

            if (!detalleVenta) {
                await transaction.rollback();
                return res.status(400).json({
                    success: false,
                    message: 'El producto no está incluido en la venta especificada'
                });
            }

            // Verificar cantidad a devolver (no puede ser mayor a la cantidad vendida)
            if (Cantidad > detalleVenta.Cantidad) {
                await transaction.rollback();
                return res.status(400).json({
                    success: false,
                    message: `La cantidad a devolver (${Cantidad}) no puede ser mayor a la cantidad vendida (${detalleVenta.Cantidad})`
                });
            }

            // Verificar devoluciones previas
            const devolucionesPrevias = await Devolucion.sum('Cantidad', {
                where: {
                    IdVenta,
                    IdProducto,
                    Estado: true
                }
            }) || 0;

            if (devolucionesPrevias + Cantidad > detalleVenta.Cantidad) {
                await transaction.rollback();
                return res.status(400).json({
                    success: false,
                    message: `La cantidad total devuelta (${devolucionesPrevias + Cantidad}) excede la cantidad vendida (${detalleVenta.Cantidad})`
                });
            }

            // Calcular monto de devolución
            const monto = Cantidad * detalleVenta.Precio;

            // Crear devolución
            const nuevaDevolucion = await Devolucion.create({
                IdProducto,
                IdVenta,
                Cantidad,
                Motivo,
                Fecha: new Date(),
                Monto: monto,
                Estado: true
            }, { transaction });

            // Actualizar stock del producto (devolver al inventario)
            await Producto.increment('Stock', {
                by: Cantidad,
                where: { IdProducto },
                transaction
            });

            // Actualizar el detalle de venta (marcar como devuelto parcialmente)
            await detalleVenta.update({
                CantidadDevuelta: devolucionesPrevias + Cantidad,
                Devuelto: (devolucionesPrevias + Cantidad) === detalleVenta.Cantidad
            }, { transaction });

            await transaction.commit();

            res.status(201).json({
                success: true,
                data: {
                    IdDevolucion: nuevaDevolucion.IdDevolucion,
                    Monto: nuevaDevolucion.Monto,
                    MontoFormateado: nuevaDevolucion.formatearMonto(),
                    Fecha: nuevaDevolucion.formatearFecha()
                },
                message: 'Devolución registrada exitosamente'
            });

        } catch (error) {
            await transaction.rollback();
            console.error('❌ Error en createDevolucion:', error);
            res.status(500).json({
                success: false,
                message: 'Error al registrar la devolución',
                error: error.message
            });
        }
    },

    /**
     * Actualizar una devolución
     * @route PUT /api/devoluciones/:id
     */
    updateDevolucion: async (req, res) => {
        const transaction = await sequelize.transaction();
        
        try {
            const { id } = req.params;
            const { Motivo, Estado } = req.body;

            if (isNaN(id)) {
                await transaction.rollback();
                return res.status(400).json({
                    success: false,
                    message: 'ID de devolución inválido'
                });
            }

            const devolucion = await Devolucion.findByPk(id);
            if (!devolucion) {
                await transaction.rollback();
                return res.status(404).json({
                    success: false,
                    message: 'Devolución no encontrada'
                });
            }

            // Validar motivo si se proporciona
            if (Motivo !== undefined) {
                if (!Motivo || Motivo.trim() === '') {
                    await transaction.rollback();
                    return res.status(400).json({
                        success: false,
                        message: 'El motivo no puede estar vacío'
                    });
                }
                if (Motivo.length < 5) {
                    await transaction.rollback();
                    return res.status(400).json({
                        success: false,
                        message: 'El motivo debe tener al menos 5 caracteres'
                    });
                }
            }

            const updateData = {};
            if (Motivo) updateData.Motivo = Motivo;
            if (Estado !== undefined) updateData.Estado = Estado;

            await devolucion.update(updateData, { transaction });
            await transaction.commit();

            res.status(200).json({
                success: true,
                data: {
                    IdDevolucion: devolucion.IdDevolucion,
                    Motivo: devolucion.Motivo,
                    Estado: devolucion.Estado,
                    EstadoTexto: devolucion.Estado ? 'Activa' : 'Anulada'
                },
                message: 'Devolución actualizada exitosamente'
            });

        } catch (error) {
            await transaction.rollback();
            console.error('❌ Error en updateDevolucion:', error);
            res.status(500).json({
                success: false,
                message: 'Error al actualizar la devolución',
                error: error.message
            });
        }
    },

    /**
     * Procesar reembolso de devolución
     * @route POST /api/devoluciones/:id/reembolso
     */
    procesarReembolso: async (req, res) => {
        const transaction = await sequelize.transaction();
        
        try {
            const { id } = req.params;
            const { metodoReembolso, observaciones } = req.body;

            const devolucion = await Devolucion.findByPk(id, {
                include: [{ model: Venta, as: 'Venta' }]
            });

            if (!devolucion) {
                await transaction.rollback();
                return res.status(404).json({
                    success: false,
                    message: 'Devolución no encontrada'
                });
            }

            if (!devolucion.Estado) {
                await transaction.rollback();
                return res.status(400).json({
                    success: false,
                    message: 'No se puede procesar reembolso de una devolución anulada'
                });
            }

            if (devolucion.Reembolsado) {
                await transaction.rollback();
                return res.status(400).json({
                    success: false,
                    message: 'Esta devolución ya ha sido reembolsada'
                });
            }

            await devolucion.update({
                Reembolsado: true,
                MetodoReembolso: metodoReembolso || 'Efectivo',
                ObservacionesReembolso: observaciones,
                FechaReembolso: new Date()
            }, { transaction });

            await transaction.commit();

            res.json({
                success: true,
                data: devolucion,
                message: 'Reembolso procesado exitosamente'
            });
        } catch (error) {
            await transaction.rollback();
            console.error('❌ Error en procesarReembolso:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * Anular devolución (NO eliminar)
     * @route POST /api/devoluciones/:id/anular
     */
    anularDevolucion: async (req, res) => {
        const transaction = await sequelize.transaction();
        
        try {
            const { id } = req.params;
            const { motivo } = req.body;

            const devolucion = await Devolucion.findByPk(id);
            if (!devolucion) {
                await transaction.rollback();
                return res.status(404).json({
                    success: false,
                    message: 'Devolución no encontrada'
                });
            }

            if (!devolucion.Estado) {
                await transaction.rollback();
                return res.status(400).json({
                    success: false,
                    message: 'La devolución ya está anulada'
                });
            }

            // Revertir el stock (quitar del inventario lo que se había devuelto)
            await Producto.decrement('Stock', {
                by: devolucion.Cantidad,
                where: { IdProducto: devolucion.IdProducto },
                transaction
            });

            await devolucion.update({
                Estado: false,
                MotivoAnulacion: motivo || 'Sin motivo especificado',
                FechaAnulacion: new Date()
            }, { transaction });

            await transaction.commit();

            res.json({
                success: true,
                message: 'Devolución anulada exitosamente'
            });
        } catch (error) {
            await transaction.rollback();
            console.error('❌ Error en anularDevolucion:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * Cambiar estado de la devolución (activar/desactivar)
     * @route PATCH /api/devoluciones/:id/estado
     */
    toggleDevolucionStatus: async (req, res) => {
        const transaction = await sequelize.transaction();
        
        try {
            const { id } = req.params;

            if (isNaN(id)) {
                await transaction.rollback();
                return res.status(400).json({
                    success: false,
                    message: 'ID de devolución inválido'
                });
            }

            const devolucion = await Devolucion.findByPk(id);
            if (!devolucion) {
                await transaction.rollback();
                return res.status(404).json({
                    success: false,
                    message: 'Devolución no encontrada'
                });
            }

            // Si se va a desactivar, revertir el stock (quitar del inventario)
            // Si se va a activar, devolver el stock al inventario
            if (devolucion.Estado) {
                // Desactivando: quitar del inventario
                await Producto.decrement('Stock', {
                    by: devolucion.Cantidad,
                    where: { IdProducto: devolucion.IdProducto },
                    transaction
                });
            } else {
                // Activando: devolver al inventario
                await Producto.increment('Stock', {
                    by: devolucion.Cantidad,
                    where: { IdProducto: devolucion.IdProducto },
                    transaction
                });
            }

            await devolucion.update({ Estado: !devolucion.Estado }, { transaction });
            await transaction.commit();

            res.status(200).json({
                success: true,
                data: {
                    IdDevolucion: devolucion.IdDevolucion,
                    Estado: devolucion.Estado,
                    EstadoTexto: devolucion.Estado ? 'Activa' : 'Anulada'
                },
                message: `Devolución ${devolucion.Estado ? 'activada' : 'anulada'} exitosamente`
            });

        } catch (error) {
            await transaction.rollback();
            console.error('❌ Error en toggleDevolucionStatus:', error);
            res.status(500).json({
                success: false,
                message: 'Error al cambiar el estado de la devolución',
                error: error.message
            });
        }
    },

    /**
     * Obtener devoluciones por venta
     * @route GET /api/devoluciones/venta/:ventaId
     */
    getDevolucionesByVenta: async (req, res) => {
        try {
            const { ventaId } = req.params;

            const devoluciones = await Devolucion.findAll({
                where: { IdVenta: ventaId },
                include: [{
                    model: Producto,
                    as: 'Producto',
                    attributes: ['IdProducto', 'Nombre']
                }],
                order: [['Fecha', 'DESC']]
            });

            const devolucionesFormateadas = devoluciones.map(d => ({
                IdDevolucion: d.IdDevolucion,
                Producto: d.Producto?.Nombre,
                Cantidad: d.Cantidad,
                Monto: d.formatearMonto(),
                Fecha: d.formatearFecha(),
                Motivo: d.Motivo,
                Estado: d.Estado ? 'Activa' : 'Anulada'
            }));

            res.status(200).json({
                success: true,
                data: devolucionesFormateadas,
                total: devoluciones.length,
                message: 'Devoluciones de la venta obtenidas exitosamente'
            });

        } catch (error) {
            console.error('❌ Error en getDevolucionesByVenta:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener devoluciones de la venta',
                error: error.message
            });
        }
    },

    /**
     * Obtener devoluciones por producto
     * @route GET /api/devoluciones/producto/:productoId
     */
    getDevolucionesByProducto: async (req, res) => {
        try {
            const { productoId } = req.params;

            const devoluciones = await Devolucion.findAll({
                where: { IdProducto: productoId },
                include: [{
                    model: Venta,
                    as: 'Venta',
                    include: [{
                        model: Cliente,
                        as: 'Cliente',
                        attributes: ['Nombre']
                    }]
                }],
                order: [['Fecha', 'DESC']]
            });

            const devolucionesFormateadas = devoluciones.map(d => ({
                IdDevolucion: d.IdDevolucion,
                Cliente: d.Venta?.Cliente?.Nombre || 'N/A',
                Cantidad: d.Cantidad,
                Monto: d.formatearMonto(),
                Fecha: d.formatearFecha(),
                Motivo: d.Motivo,
                Estado: d.Estado ? 'Activa' : 'Anulada'
            }));

            res.status(200).json({
                success: true,
                data: devolucionesFormateadas,
                message: 'Devoluciones del producto obtenidas exitosamente'
            });

        } catch (error) {
            console.error('❌ Error en getDevolucionesByProducto:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener devoluciones del producto',
                error: error.message
            });
        }
    },

    /**
     * Obtener devoluciones por fecha
     * @route GET /api/devoluciones/fecha
     */
    getDevolucionesByFecha: async (req, res) => {
        try {
            const { fecha } = req.query;

            if (!fecha) {
                return res.status(400).json({
                    success: false,
                    message: 'Debe proporcionar una fecha'
                });
            }

            const fechaInicio = new Date(fecha);
            fechaInicio.setHours(0, 0, 0, 0);
            const fechaFin = new Date(fecha);
            fechaFin.setHours(23, 59, 59, 999);

            const devoluciones = await Devolucion.findAll({
                where: {
                    Fecha: {
                        [Op.between]: [fechaInicio, fechaFin]
                    }
                },
                include: [
                    { model: Producto, as: 'Producto', attributes: ['Nombre'] },
                    { model: Venta, as: 'Venta', include: [{ model: Cliente, as: 'Cliente' }] }
                ],
                order: [['Fecha', 'ASC']]
            });

            res.json({
                success: true,
                data: devoluciones,
                message: 'Devoluciones obtenidas exitosamente'
            });
        } catch (error) {
            console.error('❌ Error en getDevolucionesByFecha:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * Obtener devoluciones por cliente
     * @route GET /api/devoluciones/cliente/:clienteId
     */
    getDevolucionesByCliente: async (req, res) => {
        try {
            const { clienteId } = req.params;

            const devoluciones = await Devolucion.findAll({
                include: [{
                    model: Venta,
                    as: 'Venta',
                    where: { IdCliente: clienteId },
                    required: true,
                    include: [{ model: Cliente, as: 'Cliente' }]
                }],
                order: [['Fecha', 'DESC']]
            });

            res.json({
                success: true,
                data: devoluciones,
                message: 'Devoluciones del cliente obtenidas exitosamente'
            });
        } catch (error) {
            console.error('❌ Error en getDevolucionesByCliente:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * Obtener estadísticas de devoluciones
     * @route GET /api/devoluciones/estadisticas
     */
    getEstadisticas: async (req, res) => {
        try {
            const totalDevoluciones = await Devolucion.count();
            const devolucionesActivas = await Devolucion.count({ where: { Estado: true } });
            const devolucionesAnuladas = await Devolucion.count({ where: { Estado: false } });
            
            const totalMontoDevuelto = await Devolucion.sum('Monto', { where: { Estado: true } }) || 0;
            
            // Devoluciones por mes (últimos 6 meses)
            const fechaLimite = new Date();
            fechaLimite.setMonth(fechaLimite.getMonth() - 6);
            
            const devolucionesPorMes = await Devolucion.findAll({
                attributes: [
                    [sequelize.fn('DATE_FORMAT', sequelize.col('Fecha'), '%Y-%m'), 'mes'],
                    [sequelize.fn('COUNT', sequelize.col('IdDevolucion')), 'cantidad'],
                    [sequelize.fn('SUM', sequelize.col('Monto')), 'total']
                ],
                where: {
                    Fecha: { [Op.gte]: fechaLimite },
                    Estado: true
                },
                group: ['mes'],
                order: [[sequelize.literal('mes'), 'ASC']]
            });

            // Top productos devueltos
            const topProductosDevueltos = await Devolucion.findAll({
                attributes: [
                    'IdProducto',
                    [sequelize.fn('COUNT', sequelize.col('IdDevolucion')), 'vecesDevuelto'],
                    [sequelize.fn('SUM', sequelize.col('Cantidad')), 'totalUnidades'],
                    [sequelize.fn('SUM', sequelize.col('Monto')), 'totalMonto']
                ],
                where: { Estado: true },
                include: [{
                    model: Producto,
                    as: 'Producto',
                    attributes: ['Nombre']
                }],
                group: ['IdProducto'],
                order: [[sequelize.literal('vecesDevuelto'), 'DESC']],
                limit: 5
            });

            // Motivos más comunes
            const motivosComunes = await Devolucion.findAll({
                attributes: [
                    'Motivo',
                    [sequelize.fn('COUNT', sequelize.col('IdDevolucion')), 'cantidad']
                ],
                where: { Estado: true },
                group: ['Motivo'],
                order: [[sequelize.literal('cantidad'), 'DESC']],
                limit: 5
            });

            res.status(200).json({
                success: true,
                data: {
                    totalDevoluciones,
                    devolucionesActivas,
                    devolucionesAnuladas,
                    totalMontoDevuelto,
                    totalMontoDevueltoFormateado: new Intl.NumberFormat('es-CO', {
                        style: 'currency',
                        currency: 'COP',
                        minimumFractionDigits: 0
                    }).format(totalMontoDevuelto),
                    devolucionesPorMes,
                    topProductosDevueltos,
                    motivosComunes
                },
                message: 'Estadísticas obtenidas exitosamente'
            });

        } catch (error) {
            console.error('❌ Error en getEstadisticas:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener estadísticas',
                error: error.message
            });
        }
    },

    /**
     * Generar reportes de devoluciones
     * @route GET /api/devoluciones/reportes
     */
    generarReportes: async (req, res) => {
        try {
            const { fechaInicio, fechaFin, tipo = 'general' } = req.query;

            const whereClause = { Estado: true };
            
            if (fechaInicio && fechaFin) {
                whereClause.Fecha = {
                    [Op.between]: [new Date(fechaInicio), new Date(fechaFin)]
                };
            }

            const devoluciones = await Devolucion.findAll({
                where: whereClause,
                include: [
                    { model: Producto, as: 'Producto' },
                    { model: Venta, as: 'Venta', include: [{ model: Cliente, as: 'Cliente' }] }
                ],
                order: [['Fecha', 'DESC']]
            });

            const totalDevuelto = devoluciones.reduce((sum, d) => sum + d.Monto, 0);
            const totalUnidades = devoluciones.reduce((sum, d) => sum + d.Cantidad, 0);

            res.json({
                success: true,
                data: {
                    tipo,
                    periodo: { fechaInicio, fechaFin },
                    resumen: {
                        cantidad: devoluciones.length,
                        totalDevuelto,
                        totalUnidades,
                        promedioPorDevolucion: devoluciones.length > 0 ? totalDevuelto / devoluciones.length : 0
                    },
                    devoluciones
                }
            });
        } catch (error) {
            console.error('❌ Error en generarReportes:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    }
};

export default devolucionController;