// controllers/permisos.controller.js
import { Op } from 'sequelize';
import Permiso from '../models/permisos.model.js';
import DetallePermiso from '../models/detallePermisos.model.js';
import { sequelize } from '../config/db.js';
import Usuario from '../models/usuarios.model.js';

/**
 * Controlador de Permisos
 * Maneja todas las operaciones para permisos
 */
const permisoController = {
    /**
     * Obtener todos los permisos agrupados por módulo
     * @route GET /api/permisos
     */
    getAllPermisos: async (req, res) => {
        try {
            const permisos = await Permiso.findAll({
                order: [['Modulo', 'ASC'], ['IdPermiso', 'ASC']]
            });

            // Agrupar por módulo
            const permisosPorModulo = {};
            const modulos = [
                'Dashboard',
                'Categorías',
                'Productos',
                'Proveedores',
                'Compras',
                'Clientes',
                'Ventas',
                'Devoluciones',
                'Usuarios',
                'Roles',
                'Permisos'
            ];

            modulos.forEach(modulo => {
                permisosPorModulo[modulo] = permisos
                    .filter(p => p.Modulo === modulo)
                    .map(p => ({
                        IdPermiso: p.IdPermiso,
                        Nombre: p.Nombre,
                        Accion: p.Accion
                    }));
            });

            res.status(200).json({
                success: true,
                data: permisosPorModulo,
                message: 'Permisos obtenidos exitosamente'
            });

        } catch (error) {
            console.error('❌ Error en getAllPermisos:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener los permisos',
                error: error.message
            });
        }
    },

    /**
     * Obtener permisos de un rol específico
     * @route GET /api/permisos/rol/:rolId
     */
    getPermisosByRol: async (req, res) => {
        try {
            const { rolId } = req.params;

            const permisos = await DetallePermiso.findAll({
                where: { IdRol: rolId },
                include: [{
                    model: Permiso,
                    as: 'Permiso',
                    attributes: ['IdPermiso', 'Nombre', 'Modulo', 'Accion']
                }]
            });

            const permisosFormateados = permisos.map(p => ({
                IdPermiso: p.IdPermiso,
                Nombre: p.Permiso?.Nombre,
                Modulo: p.Permiso?.Modulo,
                Accion: p.Permiso?.Accion
            }));

            res.status(200).json({
                success: true,
                data: permisosFormateados,
                message: 'Permisos del rol obtenidos exitosamente'
            });

        } catch (error) {
            console.error('❌ Error en getPermisosByRol:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener permisos del rol',
                error: error.message
            });
        }
    },

    /**
     * Inicializar permisos por defecto (ejecutar una vez)
     * @route POST /api/permisos/init
     */
    initPermisos: async (req, res) => {
        const transaction = await sequelize.transaction();
        
        try {
            // Definir permisos por módulo
            const permisosDefecto = [
                // Dashboard
                { IdPermiso: 'ver_dashboard', Nombre: 'Ver Dashboard', Modulo: 'Dashboard', Accion: 'ver' },
                
                // Categorías
                { IdPermiso: 'ver_categorias', Nombre: 'Ver Categorías', Modulo: 'Categorías', Accion: 'ver' },
                { IdPermiso: 'crear_categorias', Nombre: 'Crear Categorías', Modulo: 'Categorías', Accion: 'crear' },
                { IdPermiso: 'editar_categorias', Nombre: 'Editar Categorías', Modulo: 'Categorías', Accion: 'editar' },
                { IdPermiso: 'eliminar_categorias', Nombre: 'Eliminar Categorías', Modulo: 'Categorías', Accion: 'eliminar' },
                { IdPermiso: 'activar_categorias', Nombre: 'Activar/Desactivar Categorías', Modulo: 'Categorías', Accion: 'activar' },
                
                // Productos
                { IdPermiso: 'ver_productos', Nombre: 'Ver Productos', Modulo: 'Productos', Accion: 'ver' },
                { IdPermiso: 'crear_productos', Nombre: 'Crear Productos', Modulo: 'Productos', Accion: 'crear' },
                { IdPermiso: 'editar_productos', Nombre: 'Editar Productos', Modulo: 'Productos', Accion: 'editar' },
                { IdPermiso: 'eliminar_productos', Nombre: 'Eliminar Productos', Modulo: 'Productos', Accion: 'eliminar' },
                { IdPermiso: 'activar_productos', Nombre: 'Activar/Desactivar Productos', Modulo: 'Productos', Accion: 'activar' },
                
                // Proveedores
                { IdPermiso: 'ver_proveedores', Nombre: 'Ver Proveedores', Modulo: 'Proveedores', Accion: 'ver' },
                { IdPermiso: 'crear_proveedores', Nombre: 'Crear Proveedores', Modulo: 'Proveedores', Accion: 'crear' },
                { IdPermiso: 'editar_proveedores', Nombre: 'Editar Proveedores', Modulo: 'Proveedores', Accion: 'editar' },
                { IdPermiso: 'eliminar_proveedores', Nombre: 'Eliminar Proveedores', Modulo: 'Proveedores', Accion: 'eliminar' },
                { IdPermiso: 'activar_proveedores', Nombre: 'Activar/Desactivar Proveedores', Modulo: 'Proveedores', Accion: 'activar' },
                
                // Compras
                { IdPermiso: 'ver_compras', Nombre: 'Ver Compras', Modulo: 'Compras', Accion: 'ver' },
                { IdPermiso: 'crear_compras', Nombre: 'Crear Compras', Modulo: 'Compras', Accion: 'crear' },
                { IdPermiso: 'anular_compras', Nombre: 'Anular Compras', Modulo: 'Compras', Accion: 'anular' },
                
                // Clientes
                { IdPermiso: 'ver_clientes', Nombre: 'Ver Clientes', Modulo: 'Clientes', Accion: 'ver' },
                { IdPermiso: 'crear_clientes', Nombre: 'Crear Clientes', Modulo: 'Clientes', Accion: 'crear' },
                { IdPermiso: 'editar_clientes', Nombre: 'Editar Clientes', Modulo: 'Clientes', Accion: 'editar' },
                { IdPermiso: 'eliminar_clientes', Nombre: 'Eliminar Clientes', Modulo: 'Clientes', Accion: 'eliminar' },
                { IdPermiso: 'activar_clientes', Nombre: 'Activar/Desactivar Clientes', Modulo: 'Clientes', Accion: 'activar' },
                
                // Ventas
                { IdPermiso: 'ver_ventas', Nombre: 'Ver Ventas', Modulo: 'Ventas', Accion: 'ver' },
                { IdPermiso: 'crear_ventas', Nombre: 'Crear Ventas', Modulo: 'Ventas', Accion: 'crear' },
                { IdPermiso: 'anular_ventas', Nombre: 'Anular Ventas', Modulo: 'Ventas', Accion: 'anular' },
                
                // Devoluciones
                { IdPermiso: 'ver_devoluciones', Nombre: 'Ver Devoluciones', Modulo: 'Devoluciones', Accion: 'ver' },
                { IdPermiso: 'crear_devoluciones', Nombre: 'Crear Devoluciones', Modulo: 'Devoluciones', Accion: 'crear' },
                { IdPermiso: 'editar_devoluciones', Nombre: 'Editar Devoluciones', Modulo: 'Devoluciones', Accion: 'editar' },
                { IdPermiso: 'eliminar_devoluciones', Nombre: 'Eliminar Devoluciones', Modulo: 'Devoluciones', Accion: 'eliminar' },
                { IdPermiso: 'activar_devoluciones', Nombre: 'Activar/Desactivar Devoluciones', Modulo: 'Devoluciones', Accion: 'activar' },
                
                // Usuarios
                { IdPermiso: 'ver_usuarios', Nombre: 'Ver Usuarios', Modulo: 'Usuarios', Accion: 'ver' },
                { IdPermiso: 'crear_usuarios', Nombre: 'Crear Usuarios', Modulo: 'Usuarios', Accion: 'crear' },
                { IdPermiso: 'editar_usuarios', Nombre: 'Editar Usuarios', Modulo: 'Usuarios', Accion: 'editar' },
                { IdPermiso: 'eliminar_usuarios', Nombre: 'Eliminar Usuarios', Modulo: 'Usuarios', Accion: 'eliminar' },
                { IdPermiso: 'activar_usuarios', Nombre: 'Activar/Desactivar Usuarios', Modulo: 'Usuarios', Accion: 'activar' },
                
                // Roles
                { IdPermiso: 'ver_roles', Nombre: 'Ver Roles', Modulo: 'Roles', Accion: 'ver' },
                { IdPermiso: 'crear_roles', Nombre: 'Crear Roles', Modulo: 'Roles', Accion: 'crear' },
                { IdPermiso: 'editar_roles', Nombre: 'Editar Roles', Modulo: 'Roles', Accion: 'editar' },
                { IdPermiso: 'eliminar_roles', Nombre: 'Eliminar Roles', Modulo: 'Roles', Accion: 'eliminar' },
                { IdPermiso: 'asignar_permisos', Nombre: 'Asignar Permisos a Roles', Modulo: 'Roles', Accion: 'editar' },
                
                // Permisos
                { IdPermiso: 'ver_permisos', Nombre: 'Ver Permisos', Modulo: 'Permisos', Accion: 'ver' }
            ];

            for (const permiso of permisosDefecto) {
                await Permiso.findOrCreate({
                    where: { IdPermiso: permiso.IdPermiso },
                    defaults: permiso,
                    transaction
                });
            }

            await transaction.commit();

            res.status(200).json({
                success: true,
                message: 'Permisos inicializados exitosamente',
                data: { total: permisosDefecto.length }
            });

        } catch (error) {
            await transaction.rollback();
            console.error('❌ Error en initPermisos:', error);
            res.status(500).json({
                success: false,
                message: 'Error al inicializar permisos',
                error: error.message
            });
        }
    },

    /**
     * Verificar si un usuario tiene un permiso específico
     * @route GET /api/permisos/verificar
     */
    verificarPermiso: async (req, res) => {
        try {
            const { usuarioId, permisoId } = req.query;

            if (!usuarioId || !permisoId) {
                return res.status(400).json({
                    success: false,
                    message: 'Debe proporcionar usuarioId y permisoId'
                });
            }

            const usuario = await Usuario.findByPk(usuarioId);
            
            if (!usuario) {
                return res.status(404).json({
                    success: false,
                    message: 'Usuario no encontrado'
                });
            }

            const tienePermiso = await DetallePermiso.findOne({
                where: {
                    IdRol: usuario.IdRol,
                    IdPermiso: permisoId
                }
            });

            res.status(200).json({
                success: true,
                data: {
                    usuarioId,
                    permisoId,
                    tienePermiso: !!tienePermiso
                },
                message: 'Verificación completada'
            });

        } catch (error) {
            console.error('❌ Error en verificarPermiso:', error);
            res.status(500).json({
                success: false,
                message: 'Error al verificar permiso',
                error: error.message
            });
        }
    }
};

export default permisoController;