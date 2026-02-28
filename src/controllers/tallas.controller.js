// controllers/tallas.controller.js
import { Op } from 'sequelize';
import Talla from '../models/tallas.model.js';
import Producto from '../models/productos.model.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { sequelize } from '../config/db.js';

/**
 * Controlador de Tallas
 */
const tallaController = {
    /**
     * Obtener todas las tallas
     * @route GET /api/tallas
     */
    getAll: async (req, res) => {
        try {
            const { page = 1, limit = 20, search = '', producto, estado } = req.query;
            const offset = (page - 1) * limit;

            const whereClause = {};
            
            if (search) {
                whereClause[Op.or] = [
                    { Nombre: { [Op.iLike]: `%${search}%` } }
                ];
            }
            
            if (estado !== undefined) {
                whereClause.Estado = estado === 'true';
            }

            const include = [];
            if (producto) {
                include.push({
                    model: Producto,
                    as: 'Producto',
                    where: { IdProducto: producto },
                    attributes: ['IdProducto', 'Nombre']
                });
            }

            const { count, rows } = await Talla.findAndCountAll({
                where: whereClause,
                include: include.length > 0 ? include : [{
                    model: Producto,
                    as: 'Producto',
                    attributes: ['IdProducto', 'Nombre']
                }],
                limit: parseInt(limit),
                offset: parseInt(offset),
                order: [['Nombre', 'ASC']]
            });

            const totalPages = Math.ceil(count / limit);

            return res.json({
                success: true,
                data: rows,
                pagination: {
                    total: count,
                    page: parseInt(page),
                    totalPages,
                    limit: parseInt(limit)
                }
            });

        } catch (error) {
            console.error('❌ Error en getAll tallas:', error);
            return errorResponse(res, 'Error al obtener tallas', 500, error.message);
        }
    },

    /**
     * Obtener tallas activas (catálogo)
     * @route GET /api/tallas/activas
     */
    getActivas: async (req, res) => {
        try {
            const tallas = await Talla.findAll({
                where: { Estado: true },
                attributes: ['IdTalla', 'Nombre'],
                order: [['Nombre', 'ASC']]
            });

            return successResponse(res, tallas, 'Tallas activas obtenidas exitosamente');

        } catch (error) {
            console.error('❌ Error en getActivas:', error);
            return errorResponse(res, 'Error al obtener tallas activas', 500, error.message);
        }
    },

    /**
     * Obtener tallas por categoría
     * @route GET /api/tallas/categoria/:categoriaId
     */
    getByCategoria: async (req, res) => {
        try {
            const { categoriaId } = req.params;

            const tallas = await Talla.findAll({
                include: [{
                    model: Producto,
                    as: 'Producto',
                    where: { IdCategoria: categoriaId, Estado: true },
                    attributes: [],
                    required: true
                }],
                attributes: ['IdTalla', 'Nombre'],
                group: ['Talla.IdTalla', 'Talla.Nombre'],
                order: [['Nombre', 'ASC']]
            });

            return successResponse(res, tallas, 'Tallas obtenidas exitosamente');

        } catch (error) {
            console.error('❌ Error en getByCategoria:', error);
            return errorResponse(res, 'Error al obtener tallas por categoría', 500, error.message);
        }
    },

    /**
     * Obtener talla por ID
     * @route GET /api/tallas/:id
     */
    getById: async (req, res) => {
        try {
            const { id } = req.params;

            if (isNaN(id)) {
                return errorResponse(res, 'ID de talla inválido', 400);
            }

            const talla = await Talla.findByPk(id, {
                include: [{
                    model: Producto,
                    as: 'Producto',
                    attributes: ['IdProducto', 'Nombre', 'PrecioVenta']
                }]
            });

            if (!talla) {
                return errorResponse(res, 'Talla no encontrada', 404);
            }

            return successResponse(res, talla, 'Talla obtenida exitosamente');

        } catch (error) {
            console.error('❌ Error en getById talla:', error);
            return errorResponse(res, 'Error al obtener talla', 500, error.message);
        }
    },

    /**
     * Crear talla
     * @route POST /api/tallas
     */
    create: async (req, res) => {
        const transaction = await sequelize.transaction();
        try {
            const { Nombre, Cantidad = 0, IdProducto, Estado = true } = req.body;

            if (!Nombre) {
                await transaction.rollback();
                return errorResponse(res, 'El nombre de la talla es requerido', 400);
            }

            // Verificar si ya existe la talla para el mismo producto
            if (IdProducto) {
                const existe = await Talla.findOne({
                    where: {
                        Nombre: Nombre.toUpperCase().trim(),
                        IdProducto
                    }
                });

                if (existe) {
                    await transaction.rollback();
                    return errorResponse(res, 'Esta talla ya existe para el producto', 400);
                }
            }

            const nuevaTalla = await Talla.create({
                Nombre: Nombre.toUpperCase().trim(),
                Cantidad: parseInt(Cantidad),
                IdProducto,
                Estado
            }, { transaction });

            await transaction.commit();

            return successResponse(res, nuevaTalla, 'Talla creada exitosamente', 201);

        } catch (error) {
            await transaction.rollback();
            console.error('❌ Error en create talla:', error);
            
            if (error.name === 'SequelizeUniqueConstraintError') {
                return errorResponse(res, 'El nombre de la talla ya existe', 400);
            }
            
            return errorResponse(res, 'Error al crear talla', 500, error.message);
        }
    },

    /**
     * Crear múltiples tallas
     * @route POST /api/tallas/multiples
     */
    createMultiple: async (req, res) => {
        const transaction = await sequelize.transaction();
        try {
            const { tallas } = req.body;

            if (!tallas || !Array.isArray(tallas) || tallas.length === 0) {
                await transaction.rollback();
                return errorResponse(res, 'Debe proporcionar un array de tallas', 400);
            }

            const creadas = [];
            for (const item of tallas) {
                const { Nombre, Cantidad = 0, IdProducto } = item;

                // Verificar si ya existe
                const existe = await Talla.findOne({
                    where: {
                        Nombre: Nombre.toUpperCase().trim(),
                        IdProducto
                    }
                });

                if (!existe) {
                    const nueva = await Talla.create({
                        Nombre: Nombre.toUpperCase().trim(),
                        Cantidad: parseInt(Cantidad),
                        IdProducto,
                        Estado: true
                    }, { transaction });
                    creadas.push(nueva);
                }
            }

            await transaction.commit();

            return successResponse(res, creadas, `${creadas.length} tallas creadas exitosamente`, 201);

        } catch (error) {
            await transaction.rollback();
            console.error('❌ Error en createMultiple:', error);
            return errorResponse(res, 'Error al crear tallas', 500, error.message);
        }
    },

    /**
     * Actualizar talla
     * @route PUT /api/tallas/:id
     */
    update: async (req, res) => {
        const transaction = await sequelize.transaction();
        try {
            const { id } = req.params;
            const { Nombre, Cantidad, Estado } = req.body;

            if (isNaN(id)) {
                await transaction.rollback();
                return errorResponse(res, 'ID de talla inválido', 400);
            }

            const talla = await Talla.findByPk(id);
            if (!talla) {
                await transaction.rollback();
                return errorResponse(res, 'Talla no encontrada', 404);
            }

            const updateData = {};
            if (Nombre) updateData.Nombre = Nombre.toUpperCase().trim();
            if (Cantidad !== undefined) updateData.Cantidad = parseInt(Cantidad);
            if (Estado !== undefined) updateData.Estado = Estado;

            await talla.update(updateData, { transaction });
            await transaction.commit();

            return successResponse(res, talla, 'Talla actualizada exitosamente');

        } catch (error) {
            await transaction.rollback();
            console.error('❌ Error en update talla:', error);
            return errorResponse(res, 'Error al actualizar talla', 500, error.message);
        }
    },

    /**
     * Actualización parcial de talla
     * @route PATCH /api/tallas/:id
     */
    patch: async (req, res) => {
        const transaction = await sequelize.transaction();
        try {
            const { id } = req.params;

            if (isNaN(id)) {
                await transaction.rollback();
                return errorResponse(res, 'ID de talla inválido', 400);
            }

            const talla = await Talla.findByPk(id);
            if (!talla) {
                await transaction.rollback();
                return errorResponse(res, 'Talla no encontrada', 404);
            }

            // Procesar campos específicos
            const updateData = { ...req.body };
            if (updateData.Nombre) {
                updateData.Nombre = updateData.Nombre.toUpperCase().trim();
            }

            await talla.update(updateData, { transaction });
            await transaction.commit();

            return successResponse(res, talla, 'Talla actualizada parcialmente');

        } catch (error) {
            await transaction.rollback();
            console.error('❌ Error en patch talla:', error);
            return errorResponse(res, 'Error al actualizar talla', 500, error.message);
        }
    },

    /**
     * Cambiar estado de la talla (activar/desactivar)
     * @route PATCH /api/tallas/:id/estado
     */
    toggleStatus: async (req, res) => {
        const transaction = await sequelize.transaction();
        try {
            const { id } = req.params;

            if (isNaN(id)) {
                await transaction.rollback();
                return errorResponse(res, 'ID de talla inválido', 400);
            }

            const talla = await Talla.findByPk(id);
            if (!talla) {
                await transaction.rollback();
                return errorResponse(res, 'Talla no encontrada', 404);
            }

            await talla.update({ Estado: !talla.Estado }, { transaction });
            await transaction.commit();

            return successResponse(res, {
                IdTalla: talla.IdTalla,
                Nombre: talla.Nombre,
                Estado: talla.Estado
            }, `Talla ${talla.Estado ? 'activada' : 'desactivada'} exitosamente`);

        } catch (error) {
            await transaction.rollback();
            console.error('❌ Error en toggleStatus:', error);
            return errorResponse(res, 'Error al cambiar estado', 500, error.message);
        }
    },

    /**
     * Eliminar talla
     * @route DELETE /api/tallas/:id
     */
    delete: async (req, res) => {
        const transaction = await sequelize.transaction();
        try {
            const { id } = req.params;

            if (isNaN(id)) {
                await transaction.rollback();
                return errorResponse(res, 'ID de talla inválido', 400);
            }

            const talla = await Talla.findByPk(id);
            if (!talla) {
                await transaction.rollback();
                return errorResponse(res, 'Talla no encontrada', 404);
            }

            // Verificar si está siendo usada (esto depende de tu modelo)
            // const enUso = await DetalleVenta.count({ where: { IdTalla: id } });
            // if (enUso > 0) {
            //     await transaction.rollback();
            //     return errorResponse(res, 'No se puede eliminar la talla porque está en uso', 400);
            // }

            // Opción 1: Borrado físico
            await talla.destroy({ transaction });

            // Opción 2: Borrado lógico (recomendado)
            // await talla.update({ Estado: false }, { transaction });

            await transaction.commit();

            return successResponse(res, null, 'Talla eliminada exitosamente');

        } catch (error) {
            await transaction.rollback();
            console.error('❌ Error en delete talla:', error);
            return errorResponse(res, 'Error al eliminar talla', 500, error.message);
        }
    },

    /**
     * Eliminar múltiples tallas
     * @route POST /api/tallas/eliminar-multiples
     */
    deleteMultiple: async (req, res) => {
        const transaction = await sequelize.transaction();
        try {
            const { ids } = req.body;

            if (!ids || !Array.isArray(ids) || ids.length === 0) {
                await transaction.rollback();
                return errorResponse(res, 'Debe proporcionar un array de IDs', 400);
            }

            const eliminadas = await Talla.destroy({
                where: { IdTalla: ids },
                transaction
            });

            await transaction.commit();

            return successResponse(res, { eliminadas }, `${eliminadas} tallas eliminadas exitosamente`);

        } catch (error) {
            await transaction.rollback();
            console.error('❌ Error en deleteMultiple:', error);
            return errorResponse(res, 'Error al eliminar tallas', 500, error.message);
        }
    }
};

export default tallaController;