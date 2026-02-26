// controllers/imagenes.controller.js
import Imagen from '../models/imagenes.model.js';
import Producto from '../models/productos.model.js';
import { successResponse, errorResponse } from '../utils/response.js';

/**
 * Controlador de Imágenes
 */
const imagenController = {
    /**
     * Obtener imágenes por producto
     * @route GET /api/imagenes/producto/:productoId
     */
    getByProducto: async (req, res) => {
        try {
            const { productoId } = req.params;

            const imagenes = await Imagen.findAll({
                where: { IdProducto: productoId },
                order: [['IdImagen', 'ASC']]
            });

            return successResponse(res, imagenes, 'Imágenes obtenidas exitosamente');

        } catch (error) {
            console.error('❌ Error en getByProducto:', error);
            return errorResponse(res, 'Error al obtener imágenes', 500, error.message);
        }
    },

    /**
     * Obtener imagen por ID
     * @route GET /api/imagenes/:id
     */
    getById: async (req, res) => {
        try {
            const { id } = req.params;

            const imagen = await Imagen.findByPk(id);
            if (!imagen) {
                return errorResponse(res, 'Imagen no encontrada', 404);
            }

            return successResponse(res, imagen, 'Imagen obtenida exitosamente');

        } catch (error) {
            console.error('❌ Error en getById imagen:', error);
            return errorResponse(res, 'Error al obtener imagen', 500, error.message);
        }
    },

    /**
     * Crear imagen
     * @route POST /api/imagenes
     */
    create: async (req, res) => {
        try {
            const { IdProducto, Url } = req.body;

            // Verificar producto
            const producto = await Producto.findByPk(IdProducto);
            if (!producto) {
                return errorResponse(res, 'Producto no encontrado', 404);
            }

            const nuevaImagen = await Imagen.create({
                IdProducto,
                Url
            });

            return successResponse(res, nuevaImagen, 'Imagen creada exitosamente', 201);

        } catch (error) {
            console.error('❌ Error en create imagen:', error);
            return errorResponse(res, 'Error al crear imagen', 500, error.message);
        }
    },

    /**
     * Actualizar imagen
     * @route PUT /api/imagenes/:id
     */
    update: async (req, res) => {
        try {
            const { id } = req.params;
            const { Url } = req.body;

            const imagen = await Imagen.findByPk(id);
            if (!imagen) {
                return errorResponse(res, 'Imagen no encontrada', 404);
            }

            await imagen.update({ Url });
            return successResponse(res, imagen, 'Imagen actualizada exitosamente');

        } catch (error) {
            console.error('❌ Error en update imagen:', error);
            return errorResponse(res, 'Error al actualizar imagen', 500, error.message);
        }
    },

    /**
     * Eliminar imagen
     * @route DELETE /api/imagenes/:id
     */
    delete: async (req, res) => {
        try {
            const { id } = req.params;

            const imagen = await Imagen.findByPk(id);
            if (!imagen) {
                return errorResponse(res, 'Imagen no encontrada', 404);
            }

            await imagen.destroy();
            return successResponse(res, null, 'Imagen eliminada exitosamente');

        } catch (error) {
            console.error('❌ Error en delete imagen:', error);
            return errorResponse(res, 'Error al eliminar imagen', 500, error.message);
        }
    },

    /**
     * Subir múltiples imágenes
     * @route POST /api/imagenes/multiples
     */
    createMultiple: async (req, res) => {
        try {
            const { IdProducto, urls } = req.body;

            if (!urls || !Array.isArray(urls) || urls.length === 0) {
                return errorResponse(res, 'Debe proporcionar un array de URLs', 400);
            }

            const imagenes = [];
            for (const url of urls) {
                const nueva = await Imagen.create({
                    IdProducto,
                    Url: url
                });
                imagenes.push(nueva);
            }

            return successResponse(res, imagenes, 'Imágenes creadas exitosamente', 201);

        } catch (error) {
            console.error('❌ Error en createMultiple:', error);
            return errorResponse(res, 'Error al crear imágenes', 500, error.message);
        }
    }
};

export default imagenController;