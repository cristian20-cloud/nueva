// controllers/estado.controller.js
import Estado from '../models/estado.model.js';
import { successResponse, errorResponse } from '../utils/response.js';

/**
 * Controlador de Estados
 */
const estadoController = {
    /**
     * Obtener todos los estados
     * @route GET /api/estados
     */
    getAll: async (req, res) => {
        try {
            const estados = await Estado.findAll({
                where: { Estado: true },
                order: [['IdEstado', 'ASC']]
            });

            return successResponse(res, estados, 'Estados obtenidos exitosamente');

        } catch (error) {
            console.error('❌ Error en getAll estados:', error);
            return errorResponse(res, 'Error al obtener estados', 500, error.message);
        }
    },

    /**
     * Obtener estado por ID
     * @route GET /api/estados/:id
     */
    getById: async (req, res) => {
        try {
            const { id } = req.params;

            const estado = await Estado.findByPk(id);
            if (!estado) {
                return errorResponse(res, 'Estado no encontrado', 404);
            }

            return successResponse(res, estado, 'Estado obtenido exitosamente');

        } catch (error) {
            console.error('❌ Error en getById estado:', error);
            return errorResponse(res, 'Error al obtener estado', 500, error.message);
        }
    },

    /**
     * Crear estado
     * @route POST /api/estados
     */
    create: async (req, res) => {
        try {
            const { Nombre } = req.body;

            const nuevoEstado = await Estado.create({
                Nombre,
                Estado: true
            });

            return successResponse(res, nuevoEstado, 'Estado creado exitosamente', 201);

        } catch (error) {
            console.error('❌ Error en create estado:', error);
            
            if (error.name === 'SequelizeUniqueConstraintError') {
                return errorResponse(res, 'El nombre del estado ya existe', 400);
            }
            
            return errorResponse(res, 'Error al crear estado', 500, error.message);
        }
    },

    /**
     * Actualizar estado
     * @route PUT /api/estados/:id
     */
    update: async (req, res) => {
        try {
            const { id } = req.params;
            const { Nombre, Estado: activo } = req.body;

            const estado = await Estado.findByPk(id);
            if (!estado) {
                return errorResponse(res, 'Estado no encontrado', 404);
            }

            await estado.update({ Nombre, Estado: activo });
            return successResponse(res, estado, 'Estado actualizado exitosamente');

        } catch (error) {
            console.error('❌ Error en update estado:', error);
            return errorResponse(res, 'Error al actualizar estado', 500, error.message);
        }
    },

    /**
     * Eliminar estado
     * @route DELETE /api/estados/:id
     */
    delete: async (req, res) => {
        try {
            const { id } = req.params;

            const estado = await Estado.findByPk(id);
            if (!estado) {
                return errorResponse(res, 'Estado no encontrado', 404);
            }

            await estado.update({ Estado: false });
            return successResponse(res, null, 'Estado eliminado exitosamente');

        } catch (error) {
            console.error('❌ Error en delete estado:', error);
            return errorResponse(res, 'Error al eliminar estado', 500, error.message);
        }
    }
};

export default estadoController;