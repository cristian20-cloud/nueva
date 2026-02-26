// controllers/tallas.controller.js
import Talla from '../models/tallas.model.js';
import { successResponse, errorResponse } from '../utils/response.js';

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
            const tallas = await Talla.findAll({
                order: [['Nombre', 'ASC']]
            });

            return successResponse(res, tallas, 'Tallas obtenidas exitosamente');

        } catch (error) {
            console.error('❌ Error en getAll tallas:', error);
            return errorResponse(res, 'Error al obtener tallas', 500, error.message);
        }
    },

    /**
     * Obtener talla por ID
     * @route GET /api/tallas/:id
     */
    getById: async (req, res) => {
        try {
            const { id } = req.params;

            const talla = await Talla.findByPk(id);
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
        try {
            const { Nombre, Cantidad = 0 } = req.body;

            const nuevaTalla = await Talla.create({
                Nombre: Nombre.toUpperCase().trim(),
                Cantidad
            });

            return successResponse(res, nuevaTalla, 'Talla creada exitosamente', 201);

        } catch (error) {
            console.error('❌ Error en create talla:', error);
            
            if (error.name === 'SequelizeUniqueConstraintError') {
                return errorResponse(res, 'El nombre de la talla ya existe', 400);
            }
            
            return errorResponse(res, 'Error al crear talla', 500, error.message);
        }
    },

    /**
     * Actualizar talla
     * @route PUT /api/tallas/:id
     */
    update: async (req, res) => {
        try {
            const { id } = req.params;
            const { Nombre, Cantidad } = req.body;

            const talla = await Talla.findByPk(id);
            if (!talla) {
                return errorResponse(res, 'Talla no encontrada', 404);
            }

            const updateData = {};
            if (Nombre) updateData.Nombre = Nombre.toUpperCase().trim();
            if (Cantidad !== undefined) updateData.Cantidad = Cantidad;

            await talla.update(updateData);
            return successResponse(res, talla, 'Talla actualizada exitosamente');

        } catch (error) {
            console.error('❌ Error en update talla:', error);
            return errorResponse(res, 'Error al actualizar talla', 500, error.message);
        }
    },

    /**
     * Eliminar talla
     * @route DELETE /api/tallas/:id
     */
    delete: async (req, res) => {
        try {
            const { id } = req.params;

            const talla = await Talla.findByPk(id);
            if (!talla) {
                return errorResponse(res, 'Talla no encontrada', 404);
            }

            await talla.destroy();
            return successResponse(res, null, 'Talla eliminada exitosamente');

        } catch (error) {
            console.error('❌ Error en delete talla:', error);
            return errorResponse(res, 'Error al eliminar talla', 500, error.message);
        }
    }
};

export default tallaController;