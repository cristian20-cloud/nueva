// controllers/imagenes.controller.js
import Imagen from '../models/imagenes.model.js';
import Producto from '../models/productos.model.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { sequelize } from '../config/db.js';
import { Op } from 'sequelize';

/**
 * Controlador de Imágenes
 */
const imagenController = {
    /**
     * Obtener todas las imágenes (con filtros)
     * @route GET /api/imagenes
     */
    getAll: async (req, res) => {
        try {
            const { page = 1, limit = 20, IdProducto } = req.query;
            const offset = (page - 1) * limit;

            const whereClause = {};
            if (IdProducto) whereClause.IdProducto = IdProducto;

            const { count, rows } = await Imagen.findAndCountAll({
                where: whereClause,
                include: [{
                    model: Producto,
                    as: 'Producto',
                    attributes: ['IdProducto', 'Nombre']
                }],
                limit: parseInt(limit),
                offset: parseInt(offset),
                order: [['IdImagen', 'DESC']]
            });

            return res.json({
                success: true,
                data: rows,
                pagination: {
                    total: count,
                    page: parseInt(page),
                    totalPages: Math.ceil(count / limit)
                }
            });

        } catch (error) {
            console.error('❌ Error en getAll:', error);
            return errorResponse(res, 'Error al obtener imágenes', 500, error.message);
        }
    },

    /**
     * Obtener estadísticas de imágenes
     * @route GET /api/imagenes/estadisticas
     */
    getEstadisticas: async (req, res) => {
        try {
            const totalImagenes = await Imagen.count();
            
            const imagenesPorProducto = await Imagen.findAll({
                attributes: [
                    'IdProducto',
                    [sequelize.fn('COUNT', sequelize.col('IdImagen')), 'cantidad']
                ],
                include: [{
                    model: Producto,
                    as: 'Producto',
                    attributes: ['Nombre']
                }],
                group: ['IdProducto'],
                order: [[sequelize.literal('cantidad'), 'DESC']],
                limit: 10
            });

            return successResponse(res, {
                total: totalImagenes,
                porProducto: imagenesPorProducto
            }, 'Estadísticas obtenidas exitosamente');

        } catch (error) {
            console.error('❌ Error en getEstadisticas:', error);
            return errorResponse(res, 'Error al obtener estadísticas', 500, error.message);
        }
    },

    /**
     * Obtener imágenes por producto
     * @route GET /api/imagenes/producto/:productoId
     */
    getByProducto: async (req, res) => {
        try {
            const { productoId } = req.params;

            if (isNaN(productoId)) {
                return errorResponse(res, 'ID de producto inválido', 400);
            }

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
     * Obtener imagen principal de un producto
     * @route GET /api/imagenes/producto/:productoId/principal
     */
    getPrincipalByProducto: async (req, res) => {
        try {
            const { productoId } = req.params;

            const imagen = await Imagen.findOne({
                where: { 
                    IdProducto: productoId,
                    EsPrincipal: true
                }
            });

            if (!imagen) {
                // Si no hay imagen principal, devolver la primera
                const primeraImagen = await Imagen.findOne({
                    where: { IdProducto: productoId },
                    order: [['IdImagen', 'ASC']]
                });
                
                if (primeraImagen) {
                    return successResponse(res, primeraImagen, 'Imagen obtenida exitosamente');
                }
                
                return errorResponse(res, 'No hay imágenes para este producto', 404);
            }

            return successResponse(res, imagen, 'Imagen obtenida exitosamente');

        } catch (error) {
            console.error('❌ Error en getPrincipalByProducto:', error);
            return errorResponse(res, 'Error al obtener imagen', 500, error.message);
        }
    },

    /**
     * Obtener imagen por ID
     * @route GET /api/imagenes/:id
     */
    getById: async (req, res) => {
        try {
            const { id } = req.params;

            if (isNaN(id)) {
                return errorResponse(res, 'ID de imagen inválido', 400);
            }

            const imagen = await Imagen.findByPk(id, {
                include: [{
                    model: Producto,
                    as: 'Producto',
                    attributes: ['IdProducto', 'Nombre', 'Descripcion']
                }]
            });
            
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
        const transaction = await sequelize.transaction();
        try {
            const { IdProducto, Url, EsPrincipal = false } = req.body;

            if (!IdProducto || !Url) {
                await transaction.rollback();
                return errorResponse(res, 'IdProducto y Url son requeridos', 400);
            }

            // Verificar producto
            const producto = await Producto.findByPk(IdProducto);
            if (!producto) {
                await transaction.rollback();
                return errorResponse(res, 'Producto no encontrado', 404);
            }

            // Si es principal, quitar principal de las demás
            if (EsPrincipal) {
                await Imagen.update(
                    { EsPrincipal: false },
                    { where: { IdProducto }, transaction }
                );
            }

            const nuevaImagen = await Imagen.create({
                IdProducto,
                Url,
                EsPrincipal
            }, { transaction });

            await transaction.commit();

            return successResponse(res, nuevaImagen, 'Imagen creada exitosamente', 201);

        } catch (error) {
            await transaction.rollback();
            console.error('❌ Error en create imagen:', error);
            return errorResponse(res, 'Error al crear imagen', 500, error.message);
        }
    },

    /**
     * Crear múltiples imágenes
     * @route POST /api/imagenes/multiples
     */
    createMultiple: async (req, res) => {
        const transaction = await sequelize.transaction();
        try {
            const { IdProducto, urls } = req.body;

            if (!IdProducto) {
                await transaction.rollback();
                return errorResponse(res, 'IdProducto es requerido', 400);
            }

            if (!urls || !Array.isArray(urls) || urls.length === 0) {
                await transaction.rollback();
                return errorResponse(res, 'Debe proporcionar un array de URLs', 400);
            }

            // Verificar producto
            const producto = await Producto.findByPk(IdProducto);
            if (!producto) {
                await transaction.rollback();
                return errorResponse(res, 'Producto no encontrado', 404);
            }

            const imagenes = [];
            for (const url of urls) {
                const nueva = await Imagen.create({
                    IdProducto,
                    Url: url,
                    EsPrincipal: false
                }, { transaction });
                imagenes.push(nueva);
            }

            await transaction.commit();

            return successResponse(res, imagenes, 'Imágenes creadas exitosamente', 201);

        } catch (error) {
            await transaction.rollback();
            console.error('❌ Error en createMultiple:', error);
            return errorResponse(res, 'Error al crear imágenes', 500, error.message);
        }
    },

    /**
     * Actualizar imagen
     * @route PUT /api/imagenes/:id
     */
    update: async (req, res) => {
        const transaction = await sequelize.transaction();
        try {
            const { id } = req.params;
            const { Url, EsPrincipal } = req.body;

            if (isNaN(id)) {
                await transaction.rollback();
                return errorResponse(res, 'ID de imagen inválido', 400);
            }

            const imagen = await Imagen.findByPk(id);
            if (!imagen) {
                await transaction.rollback();
                return errorResponse(res, 'Imagen no encontrada', 404);
            }

            // Si se marca como principal, quitar principal de las demás del mismo producto
            if (EsPrincipal && !imagen.EsPrincipal) {
                await Imagen.update(
                    { EsPrincipal: false },
                    { where: { IdProducto: imagen.IdProducto }, transaction }
                );
            }

            const updateData = {};
            if (Url) updateData.Url = Url;
            if (EsPrincipal !== undefined) updateData.EsPrincipal = EsPrincipal;

            await imagen.update(updateData, { transaction });
            await transaction.commit();

            return successResponse(res, imagen, 'Imagen actualizada exitosamente');

        } catch (error) {
            await transaction.rollback();
            console.error('❌ Error en update imagen:', error);
            return errorResponse(res, 'Error al actualizar imagen', 500, error.message);
        }
    },

    /**
     * Establecer imagen como principal
     * @route PATCH /api/imagenes/:id/principal
     */
    setPrincipal: async (req, res) => {
        const transaction = await sequelize.transaction();
        try {
            const { id } = req.params;

            if (isNaN(id)) {
                await transaction.rollback();
                return errorResponse(res, 'ID de imagen inválido', 400);
            }

            const imagen = await Imagen.findByPk(id);
            if (!imagen) {
                await transaction.rollback();
                return errorResponse(res, 'Imagen no encontrada', 404);
            }

            // Quitar principal de todas las imágenes del producto
            await Imagen.update(
                { EsPrincipal: false },
                { where: { IdProducto: imagen.IdProducto }, transaction }
            );

            // Establecer esta como principal
            await imagen.update({ EsPrincipal: true }, { transaction });
            await transaction.commit();

            return successResponse(res, imagen, 'Imagen establecida como principal');

        } catch (error) {
            await transaction.rollback();
            console.error('❌ Error en setPrincipal:', error);
            return errorResponse(res, 'Error al establecer imagen principal', 500, error.message);
        }
    },

    /**
     * Eliminar imagen
     * @route DELETE /api/imagenes/:id
     */
    delete: async (req, res) => {
        const transaction = await sequelize.transaction();
        try {
            const { id } = req.params;

            if (isNaN(id)) {
                await transaction.rollback();
                return errorResponse(res, 'ID de imagen inválido', 400);
            }

            const imagen = await Imagen.findByPk(id);
            if (!imagen) {
                await transaction.rollback();
                return errorResponse(res, 'Imagen no encontrada', 404);
            }

            await imagen.destroy({ transaction });
            await transaction.commit();

            return successResponse(res, null, 'Imagen eliminada exitosamente');

        } catch (error) {
            await transaction.rollback();
            console.error('❌ Error en delete imagen:', error);
            return errorResponse(res, 'Error al eliminar imagen', 500, error.message);
        }
    },

    /**
     * Eliminar múltiples imágenes
     * @route POST /api/imagenes/eliminar-multiples
     */
    deleteMultiple: async (req, res) => {
        const transaction = await sequelize.transaction();
        try {
            const { ids } = req.body;

            if (!ids || !Array.isArray(ids) || ids.length === 0) {
                await transaction.rollback();
                return errorResponse(res, 'Debe proporcionar un array de IDs', 400);
            }

            const eliminadas = await Imagen.destroy({
                where: { IdImagen: ids },
                transaction
            });

            await transaction.commit();

            return successResponse(res, { eliminadas }, 'Imágenes eliminadas exitosamente');

        } catch (error) {
            await transaction.rollback();
            console.error('❌ Error en deleteMultiple:', error);
            return errorResponse(res, 'Error al eliminar imágenes', 500, error.message);
        }
    }
};

export default imagenController;