// controllers/detallePermisos.controller.js
import DetallePermiso from '../models/detallePermisos.model.js';
import Rol from '../models/roles.model.js';
import Permiso from '../models/permisos.model.js';
import { successResponse, errorResponse } from '../utils/response.js';

/**
 * Controlador de Detalle de Permisos
 */
const detallePermisoController = {
    /**
     * Obtener permisos por rol
     * @route GET /api/detalle-permisos/rol/:rolId
     */
    getByRol: async (req, res) => {
        try {
            const { rolId } = req.params;

            const detalles = await DetallePermiso.findAll({
                where: { IdRol: rolId },
                include: [{
                    model: Permiso,
                    as: 'Permiso',
                    attributes: ['IdPermiso', 'Nombre', 'Modulo', 'Accion']
                }]
            });

            return successResponse(res, detalles, 'Permisos obtenidos exitosamente');

        } catch (error) {
            console.error('❌ Error en getByRol:', error);
            return errorResponse(res, 'Error al obtener permisos', 500, error.message);
        }
    },

    /**
     * Asignar permisos a un rol
     * @route POST /api/detalle-permisos/asignar
     */
    asignar: async (req, res) => {
        try {
            const { IdRol, permisos } = req.body;

            // Eliminar permisos actuales
            await DetallePermiso.destroy({
                where: { IdRol }
            });

            // Asignar nuevos permisos
            const asignados = [];
            for (const idPermiso of permisos) {
                const nuevo = await DetallePermiso.create({
                    IdRol,
                    IdPermiso: idPermiso
                });
                asignados.push(nuevo);
            }

            return successResponse(res, { asignados: asignados.length }, 'Permisos asignados exitosamente');

        } catch (error) {
            console.error('❌ Error en asignar permisos:', error);
            return errorResponse(res, 'Error al asignar permisos', 500, error.message);
        }
    },

    /**
     * Quitar un permiso de un rol
     * @route DELETE /api/detalle-permisos/:id
     */
    remove: async (req, res) => {
        try {
            const { id } = req.params;

            const detalle = await DetallePermiso.findByPk(id);
            if (!detalle) {
                return errorResponse(res, 'Registro no encontrado', 404);
            }

            await detalle.destroy();
            return successResponse(res, null, 'Permiso removido exitosamente');

        } catch (error) {
            console.error('❌ Error en remove permiso:', error);
            return errorResponse(res, 'Error al remover permiso', 500, error.message);
        }
    },

    /**
     * Verificar si un rol tiene un permiso específico
     * @route GET /api/detalle-permisos/verificar
     */
    verificar: async (req, res) => {
        try {
            const { IdRol, IdPermiso } = req.query;

            const existe = await DetallePermiso.findOne({
                where: { IdRol, IdPermiso }
            });

            return successResponse(res, { tienePermiso: !!existe }, 'Verificación completada');

        } catch (error) {
            console.error('❌ Error en verificar permiso:', error);
            return errorResponse(res, 'Error al verificar permiso', 500, error.message);
        }
    }
};

export default detallePermisoController;