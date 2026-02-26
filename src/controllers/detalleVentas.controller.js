// controllers/detalleVentas.controller.js
import DetalleVenta from '../models/detalleVentas.model.js';
import Producto from '../models/productos.model.js';

/**
 * Controlador de Detalle de Ventas
 * SOLO PARA CONSULTAS - Los detalles se crean/actualizan/eliminan desde ventas
 */
const detalleVentaController = {
    /**
     * Obtener detalles por venta
     * @route GET /api/detalle-ventas/venta/:ventaId
     */
    getByVenta: async (req, res) => {
        try {
            const { ventaId } = req.params;

            if (isNaN(ventaId)) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'ID de venta inválido' 
                });
            }

            const detalles = await DetalleVenta.findAll({
                where: { IdVenta: ventaId },
                include: [{
                    model: Producto,
                    as: 'Producto',
                    attributes: ['IdProducto', 'Nombre', 'url', 'Descripcion', 'PrecioVenta']
                }],
                order: [['IdDetalleVenta', 'ASC']]
            });

            if (!detalles || detalles.length === 0) {
                return res.json({ 
                    success: true, 
                    data: [], 
                    message: 'No hay detalles para esta venta' 
                });
            }

            const detallesFormateados = detalles.map(detalle => ({
                IdDetalleVenta: detalle.IdDetalleVenta,
                IdProducto: detalle.IdProducto,
                Producto: {
                    Nombre: detalle.Producto?.Nombre || 'Producto no disponible',
                    Descripcion: detalle.Producto?.Descripcion,
                    Imagen: detalle.Producto?.url
                },
                Cantidad: detalle.Cantidad,
                PrecioUnitario: detalle.Precio,
                Subtotal: detalle.Subtotal,
                SubtotalFormateado: new Intl.NumberFormat('es-CO', {
                    style: 'currency',
                    currency: 'COP',
                    minimumFractionDigits: 0
                }).format(detalle.Subtotal)
            }));

            res.json({ 
                success: true, 
                data: detallesFormateados 
            });

        } catch (error) {
            console.error('❌ Error en getByVenta:', error);
            res.status(500).json({ 
                success: false, 
                message: error.message 
            });
        }
    },

    /**
     * Obtener un detalle específico por ID
     * @route GET /api/detalle-ventas/:id
     */
    getById: async (req, res) => {
        try {
            const { id } = req.params;

            if (isNaN(id)) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'ID de detalle inválido' 
                });
            }

            const detalle = await DetalleVenta.findByPk(id, {
                include: [{
                    model: Producto,
                    as: 'Producto',
                    attributes: ['IdProducto', 'Nombre', 'Descripcion', 'url', 'PrecioVenta']
                }]
            });

            if (!detalle) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Detalle no encontrado' 
                });
            }

            res.json({ 
                success: true, 
                data: detalle 
            });

        } catch (error) {
            console.error('❌ Error en getById:', error);
            res.status(500).json({ 
                success: false, 
                message: error.message 
            });
        }
    },

    /**
     * Crear detalle de venta
     * @route POST /api/detalle-ventas
     */
    create: async (req, res) => {
        try {
            const { IdVenta, IdProducto, Cantidad, Precio } = req.body;

            const subtotal = Cantidad * Precio;
            const nuevoDetalle = await DetalleVenta.create({
                IdVenta,
                IdProducto,
                Cantidad,
                Precio,
                Subtotal: subtotal
            });

            res.status(201).json({
                success: true,
                data: nuevoDetalle,
                message: 'Detalle creado exitosamente'
            });
        } catch (error) {
            console.error('❌ Error en create:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * Actualizar detalle de venta
     * @route PUT /api/detalle-ventas/:id
     */
    update: async (req, res) => {
        try {
            const { id } = req.params;
            const { Cantidad, Precio } = req.body;

            const detalle = await DetalleVenta.findByPk(id);
            if (!detalle) {
                return res.status(404).json({ success: false, message: 'Detalle no encontrado' });
            }

            const subtotal = Cantidad * Precio;
            await detalle.update({
                Cantidad,
                Precio,
                Subtotal: subtotal
            });

            res.json({
                success: true,
                data: detalle,
                message: 'Detalle actualizado exitosamente'
            });
        } catch (error) {
            console.error('❌ Error en update:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * Eliminar detalle de venta
     * @route DELETE /api/detalle-ventas/:id
     */
    delete: async (req, res) => {
        try {
            const { id } = req.params;

            const detalle = await DetalleVenta.findByPk(id);
            if (!detalle) {
                return res.status(404).json({ success: false, message: 'Detalle no encontrado' });
            }

            await detalle.destroy();
            res.json({ success: true, message: 'Detalle eliminado exitosamente' });
        } catch (error) {
            console.error('❌ Error en delete:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    }
};

export default detalleVentaController;