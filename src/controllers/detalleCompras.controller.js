// controllers/detalleCompras.controller.js

import DetalleCompra from '../models/detalleCompras.model.js';
import Producto from '../models/productos.model.js';
import { successResponse, errorResponse } from '../utils/response.js';

/**
 * Controlador de Detalle de Compras
 * SOLO PARA CONSULTAS - Administrativo
 */

const detalleCompraController = {

    /**
     * Obtener TODOS los detalles
     * @route GET /api/detalle-compras
     */
    getAll: async (req, res) => {
        try {
            const detalles = await DetalleCompra.findAll({
                include: [{
                    model: Producto,
                    as: 'Producto',
                    attributes: ['IdProducto', 'Nombre', 'PrecioVenta']
                }],
                order: [['IdDetalleCompra', 'DESC']]
            });

            return successResponse(res, detalles, 'Detalles obtenidos exitosamente');

        } catch (error) {
            console.error('❌ Error en getAll:', error);
            return errorResponse(res, 'Error al obtener detalles', 500, error.message);
        }
    },

    /**
     * Obtener detalles por compra
     * @route GET /api/detalle-compras/compra/:compraId
     */
    getByCompra: async (req, res) => {
        try {
            const { compraId } = req.params;

            if (isNaN(compraId)) {
                return errorResponse(res, 'ID de compra inválido', 400);
            }

            const detalles = await DetalleCompra.findAll({
                where: { IdCompra: compraId },
                include: [{
                    model: Producto,
                    as: 'Producto',
                    attributes: ['IdProducto', 'Nombre', 'Descripcion', 'url', 'PrecioVenta']
                }],
                order: [['IdDetalleCompra', 'ASC']]
            });

            if (!detalles || detalles.length === 0) {
                return successResponse(res, [], 'No hay detalles para esta compra');
            }

            const detallesFormateados = detalles.map(detalle => ({
                IdDetalleCompra: detalle.IdDetalleCompra,
                IdProducto: detalle.IdProducto,
                Producto: {
                    Nombre: detalle.Producto?.Nombre || 'Producto no disponible',
                    Descripcion: detalle.Producto?.Descripcion,
                    Imagen: detalle.Producto?.url,
                    PrecioVenta: detalle.Producto?.PrecioVenta
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

            return successResponse(res, detallesFormateados, 'Detalles obtenidos exitosamente');

        } catch (error) {
            console.error('❌ Error en getByCompra:', error);
            return errorResponse(res, 'Error al obtener detalles', 500, error.message);
        }
    },

    /**
     * Obtener un detalle específico por ID
     * @route GET /api/detalle-compras/:id
     */
    getById: async (req, res) => {
        try {
            const { id } = req.params;

            if (isNaN(id)) {
                return errorResponse(res, 'ID de detalle inválido', 400);
            }

            const detalle = await DetalleCompra.findByPk(id, {
                include: [{
                    model: Producto,
                    as: 'Producto',
                    attributes: ['IdProducto', 'Nombre', 'Descripcion', 'url', 'PrecioVenta', 'Stock']
                }]
            });

            if (!detalle) {
                return errorResponse(res, 'Detalle no encontrado', 404);
            }

            return successResponse(res, detalle, 'Detalle obtenido exitosamente');

        } catch (error) {
            console.error('❌ Error en getById:', error);
            return errorResponse(res, 'Error al obtener detalle', 500, error.message);
        }
    }
};

export default detalleCompraController;