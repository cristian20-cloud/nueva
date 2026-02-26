// controllers/categorias.controller.js
import { Op } from 'sequelize';
import Categoria from '../models/categorias.model.js';
import Producto from '../models/productos.model.js';
import { validateCategoria, sanitizeCategoria } from '../utils/validationUtils.js';
import { successResponse, errorResponse, paginationResponse } from '../utils/response.js';

/**
 * Controlador de Categorías - CRUD COMPLETO
 */
const categoriaController = {
    // GET /api/categorias - Obtener todas (con filtros)
    getAllCategorias: async (req, res) => {
        try {
            const { page = 1, limit = 10, search = '', estado } = req.query;
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

            const { count, rows } = await Categoria.findAndCountAll({
                where: whereClause,
                limit: parseInt(limit),
                offset: parseInt(offset),
                order: [['IdCategoria', 'DESC']]
            });

            const categoriasConProductos = await Promise.all(rows.map(async (categoria) => {
                const totalProductos = await Producto.count({
                    where: { IdCategoria: categoria.IdCategoria }
                });
                
                return {
                    ...categoria.toJSON(),
                    totalProductos
                };
            }));

            return paginationResponse(
                res, 
                categoriasConProductos, 
                count, 
                parseInt(page), 
                parseInt(limit),
                'Categorías obtenidas exitosamente'
            );

        } catch (error) {
            console.error('❌ Error en getAllCategorias:', error);
            return errorResponse(res, 'Error al obtener las categorías', 500, error.message);
        }
    },

    // GET /api/categorias/:id - Obtener una categoría por ID
    getCategoriaById: async (req, res) => {
        try {
            const { id } = req.params;

            if (isNaN(id)) {
                return errorResponse(res, 'ID de categoría inválido', 400);
            }

            const categoria = await Categoria.findByPk(id);

            if (!categoria) {
                return errorResponse(res, 'Categoría no encontrada', 404);
            }

            const productos = await Producto.findAll({
                where: { IdCategoria: id, Estado: true },
                limit: 5,
                order: [['Nombre', 'ASC']]
            });

            return successResponse(res, {
                categoria,
                productos,
                totalProductos: await Producto.count({ where: { IdCategoria: id } })
            }, 'Categoría obtenida exitosamente');

        } catch (error) {
            console.error('❌ Error en getCategoriaById:', error);
            return errorResponse(res, 'Error al obtener la categoría', 500, error.message);
        }
    },

    // POST /api/categorias - Crear nueva categoría
    createCategoria: async (req, res) => {
        try {
            const { Nombre, Estado = true } = req.body;

            const validationErrors = await validateCategoria({ Nombre, Estado });
            if (validationErrors.length > 0) {
                return errorResponse(res, 'Datos de categoría inválidos', 400, validationErrors);
            }

            const sanitizedData = sanitizeCategoria({ Nombre, Estado });
            const nuevaCategoria = await Categoria.create(sanitizedData);

            return successResponse(res, nuevaCategoria, 'Categoría creada exitosamente', 201);

        } catch (error) {
            console.error('❌ Error en createCategoria:', error);
            
            if (error.name === 'SequelizeUniqueConstraintError') {
                return errorResponse(res, 'Ya existe una categoría con ese nombre', 400);
            }
            
            return errorResponse(res, 'Error al crear la categoría', 500, error.message);
        }
    },

    // PUT /api/categorias/:id - Actualizar categoría
    updateCategoria: async (req, res) => {
        try {
            const { id } = req.params;
            const { Nombre, Estado } = req.body;

            if (isNaN(id)) {
                return errorResponse(res, 'ID de categoría inválido', 400);
            }

            const categoria = await Categoria.findByPk(id);
            if (!categoria) {
                return errorResponse(res, 'Categoría no encontrada', 404);
            }

            const validationErrors = await validateCategoria({ Nombre, Estado }, id);
            if (validationErrors.length > 0) {
                return errorResponse(res, 'Datos de categoría inválidos', 400, validationErrors);
            }

            const sanitizedData = sanitizeCategoria({ Nombre, Estado });
            await categoria.update(sanitizedData);

            return successResponse(res, categoria, 'Categoría actualizada exitosamente');

        } catch (error) {
            console.error('❌ Error en updateCategoria:', error);
            
            if (error.name === 'SequelizeUniqueConstraintError') {
                return errorResponse(res, 'Ya existe otra categoría con ese nombre', 400);
            }
            
            return errorResponse(res, 'Error al actualizar la categoría', 500, error.message);
        }
    },

    // DELETE /api/categorias/:id - Eliminar categoría
    deleteCategoria: async (req, res) => {
        try {
            const { id } = req.params;

            if (isNaN(id)) {
                return errorResponse(res, 'ID de categoría inválido', 400);
            }

            const categoria = await Categoria.findByPk(id);
            if (!categoria) {
                return errorResponse(res, 'Categoría no encontrada', 404);
            }

            const productosAsociados = await Producto.count({
                where: { IdCategoria: id }
            });

            if (productosAsociados > 0) {
                return errorResponse(res, 
                    `No se puede eliminar la categoría porque tiene ${productosAsociados} productos asociados.`, 
                    400
                );
            }

            await categoria.destroy();
            return successResponse(res, null, 'Categoría eliminada exitosamente');

        } catch (error) {
            console.error('❌ Error en deleteCategoria:', error);
            return errorResponse(res, 'Error al eliminar la categoría', 500, error.message);
        }
    },

    // PATCH /api/categorias/:id/estado - Cambiar estado
    toggleCategoriaStatus: async (req, res) => {
        try {
            const { id } = req.params;

            if (isNaN(id)) {
                return errorResponse(res, 'ID de categoría inválido', 400);
            }

            const categoria = await Categoria.findByPk(id);
            if (!categoria) {
                return errorResponse(res, 'Categoría no encontrada', 404);
            }

            await categoria.update({ Estado: !categoria.Estado });

            return successResponse(res, {
                IdCategoria: categoria.IdCategoria,
                Nombre: categoria.Nombre,
                Estado: categoria.Estado
            }, `Categoría ${categoria.Estado ? 'activada' : 'desactivada'} exitosamente`);

        } catch (error) {
            console.error('❌ Error en toggleCategoriaStatus:', error);
            return errorResponse(res, 'Error al cambiar el estado', 500, error.message);
        }
    },

    // GET /api/categorias/activas - Obtener solo categorías activas
    getCategoriasActivas: async (req, res) => {
        try {
            const categorias = await Categoria.findAll({
                where: { Estado: true },
                attributes: ['IdCategoria', 'Nombre'],
                order: [['Nombre', 'ASC']]
            });

            return successResponse(res, categorias, 'Categorías activas obtenidas exitosamente');

        } catch (error) {
            console.error('❌ Error en getCategoriasActivas:', error);
            return errorResponse(res, 'Error al obtener categorías activas', 500, error.message);
        }
    },

    // GET /api/categorias/estadisticas - Estadísticas de categorías
    getEstadisticas: async (req, res) => {
        try {
            const totalCategorias = await Categoria.count();
            const activas = await Categoria.count({ where: { Estado: true } });
            const inactivas = await Categoria.count({ where: { Estado: false } });
            
            return successResponse(res, {
                total: totalCategorias,
                activas,
                inactivas
            }, 'Estadísticas obtenidas exitosamente');

        } catch (error) {
            console.error('❌ Error en getEstadisticas:', error);
            return errorResponse(res, 'Error al obtener estadísticas', 500, error.message);
        }
    }
};

export default categoriaController;