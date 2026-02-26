// controllers/proveedores.controller.js
import { Op } from 'sequelize';
import Proveedor from '../models/proveedores.model.js';
import Compra from '../models/compras.model.js';
import { validateProveedor, sanitizeProveedor } from '../utils/validationUtils.js';
import { sequelize } from '../config/db.js';

/**
 * Controlador de Proveedores
 * Maneja todas las operaciones CRUD para proveedores
 */
const proveedorController = {
    /**
     * Obtener todos los proveedores con filtros
     * @route GET /api/proveedores
     */
    getAllProveedores: async (req, res) => {
        try {
            const { 
                page = 1, 
                limit = 7, 
                search = '', 
                tipoDocumento,
                estado,
                todos = false
            } = req.query;

            const offset = (page - 1) * limit;

            // Construir filtros
            const whereClause = {};
            
            if (!todos) {
                if (search) {
                    whereClause[Op.or] = [
                        { Nombre: { [Op.like]: `%${search}%` } },
                        { NumeroDocumento: { [Op.like]: `%${search}%` } },
                        { Correo: { [Op.like]: `%${search}%` } },
                        { Telefono: { [Op.like]: `%${search}%` } }
                    ];
                }
                
                if (tipoDocumento) {
                    whereClause.TipoDocumento = tipoDocumento;
                }
                
                if (estado !== undefined) {
                    whereClause.Estado = estado === 'true';
                }
            }

            // Consultar proveedores
            const { count, rows } = await Proveedor.findAndCountAll({
                where: whereClause,
                limit: parseInt(limit),
                offset: parseInt(offset),
                order: [['Nombre', 'ASC']]
            });

            // Formatear respuesta para la interfaz
            const proveedoresFormateados = rows.map(proveedor => ({
                IdProveedor: proveedor.IdProveedor,
                TipoProveedor: proveedor.getTipoProveedor(),
                Empresa: proveedor.Nombre,
                NIT: proveedor.NumeroDocumento,
                Correo: proveedor.Correo,
                Telefono: proveedor.Telefono || 'No registrado',
                Direccion: proveedor.Direccion || 'No registrada',
                Estado: proveedor.Estado,
                EstadoTexto: proveedor.Estado ? 'Activo' : 'Inactivo'
            }));

            const totalPages = Math.ceil(count / limit);

            res.status(200).json({
                success: true,
                data: proveedoresFormateados,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages,
                    totalItems: count,
                    itemsPerPage: parseInt(limit),
                    showingFrom: offset + 1,
                    showingTo: Math.min(offset + parseInt(limit), count)
                },
                filters: {
                    tipoDocumento: tipoDocumento || 'todos',
                    estado: estado || 'todos'
                },
                message: 'Proveedores obtenidos exitosamente'
            });

        } catch (error) {
            console.error('❌ Error en getAllProveedores:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener los proveedores',
                error: error.message
            });
        }
    },

    /**
     * Obtener un proveedor por ID
     * @route GET /api/proveedores/:id
     */
    getProveedorById: async (req, res) => {
        try {
            const { id } = req.params;

            if (isNaN(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'ID de proveedor inválido'
                });
            }

            const proveedor = await Proveedor.findByPk(id);

            if (!proveedor) {
                return res.status(404).json({
                    success: false,
                    message: 'Proveedor no encontrado'
                });
            }

            // Obtener estadísticas de compras
            const totalCompras = await Compra.sum('Total', {
                where: { IdProveedor: id }
            }) || 0;

            const cantidadCompras = await Compra.count({
                where: { IdProveedor: id }
            });

            res.status(200).json({
                success: true,
                data: {
                    ...proveedor.toJSON(),
                    TipoProveedor: proveedor.getTipoProveedor(),
                    Estadisticas: {
                        totalCompras,
                        cantidadCompras,
                        promedioCompras: cantidadCompras > 0 ? totalCompras / cantidadCompras : 0
                    }
                },
                message: 'Proveedor obtenido exitosamente'
            });

        } catch (error) {
            console.error('❌ Error en getProveedorById:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener el proveedor',
                error: error.message
            });
        }
    },

    /**
     * Crear un nuevo proveedor
     * @route POST /api/proveedores
     */
    createProveedor: async (req, res) => {
        const transaction = await sequelize.transaction();
        
        try {
            const data = req.body;

            // Validar datos
            const validationErrors = await validateProveedor(data);
            if (validationErrors.length > 0) {
                await transaction.rollback();
                return res.status(400).json({
                    success: false,
                    errors: validationErrors,
                    message: 'Datos del proveedor inválidos'
                });
            }

            // Sanitizar datos
            const sanitizedData = sanitizeProveedor(data);

            // Crear proveedor
            const nuevoProveedor = await Proveedor.create({
                ...sanitizedData,
                Estado: true
            }, { transaction });

            await transaction.commit();

            res.status(201).json({
                success: true,
                data: nuevoProveedor,
                message: 'Proveedor registrado exitosamente'
            });

        } catch (error) {
            await transaction.rollback();
            console.error('❌ Error en createProveedor:', error);
            
            // Manejar errores de unicidad
            if (error.name === 'SequelizeUniqueConstraintError') {
                return res.status(400).json({
                    success: false,
                    message: 'El NIT o correo electrónico ya está registrado',
                    error: error.errors[0].message
                });
            }
            
            res.status(500).json({
                success: false,
                message: 'Error al registrar el proveedor',
                error: error.message
            });
        }
    },

    /**
     * Actualizar un proveedor
     * @route PUT /api/proveedores/:id
     */
    updateProveedor: async (req, res) => {
        const transaction = await sequelize.transaction();
        
        try {
            const { id } = req.params;
            const data = req.body;

            if (isNaN(id)) {
                await transaction.rollback();
                return res.status(400).json({
                    success: false,
                    message: 'ID de proveedor inválido'
                });
            }

            const proveedor = await Proveedor.findByPk(id);
            if (!proveedor) {
                await transaction.rollback();
                return res.status(404).json({
                    success: false,
                    message: 'Proveedor no encontrado'
                });
            }

            // Validar datos
            const validationErrors = await validateProveedor(data, id);
            if (validationErrors.length > 0) {
                await transaction.rollback();
                return res.status(400).json({
                    success: false,
                    errors: validationErrors,
                    message: 'Datos del proveedor inválidos'
                });
            }

            // Sanitizar datos
            const sanitizedData = sanitizeProveedor(data);

            await proveedor.update(sanitizedData, { transaction });
            await transaction.commit();

            res.status(200).json({
                success: true,
                data: proveedor,
                message: 'Proveedor actualizado exitosamente'
            });

        } catch (error) {
            await transaction.rollback();
            console.error('❌ Error en updateProveedor:', error);
            
            if (error.name === 'SequelizeUniqueConstraintError') {
                return res.status(400).json({
                    success: false,
                    message: 'El NIT o correo electrónico ya está registrado por otro proveedor'
                });
            }
            
            res.status(500).json({
                success: false,
                message: 'Error al actualizar el proveedor',
                error: error.message
            });
        }
    },

    /**
     * Eliminar un proveedor (borrado lógico)
     * @route DELETE /api/proveedores/:id
     */
    deleteProveedor: async (req, res) => {
        const transaction = await sequelize.transaction();
        
        try {
            const { id } = req.params;

            if (isNaN(id)) {
                await transaction.rollback();
                return res.status(400).json({
                    success: false,
                    message: 'ID de proveedor inválido'
                });
            }

            const proveedor = await Proveedor.findByPk(id);
            if (!proveedor) {
                await transaction.rollback();
                return res.status(404).json({
                    success: false,
                    message: 'Proveedor no encontrado'
                });
            }

            // Verificar si tiene compras asociadas
            const tieneCompras = await proveedor.tieneCompras();
            if (tieneCompras) {
                await transaction.rollback();
                return res.status(400).json({
                    success: false,
                    message: 'No se puede eliminar el proveedor porque tiene compras asociadas'
                });
            }

            await proveedor.update({ Estado: false }, { transaction });
            await transaction.commit();

            res.status(200).json({
                success: true,
                message: 'Proveedor desactivado exitosamente'
            });

        } catch (error) {
            await transaction.rollback();
            console.error('❌ Error en deleteProveedor:', error);
            res.status(500).json({
                success: false,
                message: 'Error al eliminar el proveedor',
                error: error.message
            });
        }
    },

    /**
     * Cambiar estado del proveedor
     * @route PATCH /api/proveedores/:id/estado
     */
    toggleProveedorStatus: async (req, res) => {
        const transaction = await sequelize.transaction();
        
        try {
            const { id } = req.params;

            if (isNaN(id)) {
                await transaction.rollback();
                return res.status(400).json({
                    success: false,
                    message: 'ID de proveedor inválido'
                });
            }

            const proveedor = await Proveedor.findByPk(id);
            if (!proveedor) {
                await transaction.rollback();
                return res.status(404).json({
                    success: false,
                    message: 'Proveedor no encontrado'
                });
            }

            await proveedor.update({ Estado: !proveedor.Estado }, { transaction });
            await transaction.commit();

            res.status(200).json({
                success: true,
                data: {
                    IdProveedor: proveedor.IdProveedor,
                    Estado: proveedor.Estado,
                    EstadoTexto: proveedor.Estado ? 'Activo' : 'Inactivo'
                },
                message: `Proveedor ${proveedor.Estado ? 'activado' : 'desactivado'} exitosamente`
            });

        } catch (error) {
            await transaction.rollback();
            console.error('❌ Error en toggleProveedorStatus:', error);
            res.status(500).json({
                success: false,
                message: 'Error al cambiar el estado del proveedor',
                error: error.message
            });
        }
    },

    /**
     * Obtener proveedores activos (para selects)
     * @route GET /api/proveedores/activos
     */
    getProveedoresActivos: async (req, res) => {
        try {
            const proveedores = await Proveedor.findAll({
                where: { Estado: true },
                attributes: ['IdProveedor', 'Nombre', 'TipoDocumento', 'NumeroDocumento'],
                order: [['Nombre', 'ASC']]
            });

            const proveedoresFormateados = proveedores.map(p => ({
                IdProveedor: p.IdProveedor,
                Nombre: p.Nombre,
                Identificacion: `${p.TipoDocumento}: ${p.NumeroDocumento}`,
                TipoProveedor: p.getTipoProveedor()
            }));

            res.status(200).json({
                success: true,
                data: proveedoresFormateados,
                message: 'Proveedores activos obtenidos exitosamente'
            });

        } catch (error) {
            console.error('❌ Error en getProveedoresActivos:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener proveedores activos',
                error: error.message
            });
        }
    },

    /**
     * Obtener estadísticas de proveedores
     * @route GET /api/proveedores/estadisticas
     */
    getEstadisticas: async (req, res) => {
        try {
            const totalProveedores = await Proveedor.count();
            const activos = await Proveedor.count({ where: { Estado: true } });
            const inactivos = await Proveedor.count({ where: { Estado: false } });
            
            const porTipoDocumento = await Proveedor.findAll({
                attributes: [
                    'TipoDocumento',
                    [sequelize.fn('COUNT', sequelize.col('TipoDocumento')), 'cantidad']
                ],
                group: ['TipoDocumento']
            });

            // Proveedores con más compras
            const proveedoresTop = await Proveedor.findAll({
                where: { Estado: true },
                attributes: ['IdProveedor', 'Nombre'],
                include: [{
                    model: Compra,
                    as: 'Compras',
                    attributes: []
                }],
                group: ['Proveedor.IdProveedor'],
                order: [[sequelize.fn('COUNT', sequelize.col('Compras.IdCompra')), 'DESC']],
                limit: 5
            });

            res.status(200).json({
                success: true,
                data: {
                    total: totalProveedores,
                    activos,
                    inactivos,
                    distribucionTipoDocumento: porTipoDocumento,
                    topProveedores: proveedoresTop
                },
                message: 'Estadísticas obtenidas exitosamente'
            });

        } catch (error) {
            console.error('❌ Error en getEstadisticas:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener estadísticas',
                error: error.message
            });
        }
    },

    /**
     * Buscar proveedor por NIT
     * @route GET /api/proveedores/nit/:nit
     */
    getProveedorByNIT: async (req, res) => {
        try {
            const { nit } = req.params;

            const proveedor = await Proveedor.findOne({
                where: { 
                    NumeroDocumento: nit,
                    TipoDocumento: 'NIT'
                }
            });

            if (!proveedor) {
                return res.status(404).json({
                    success: false,
                    message: 'Proveedor no encontrado con ese NIT'
                });
            }

            res.status(200).json({
                success: true,
                data: proveedor,
                message: 'Proveedor encontrado'
            });

        } catch (error) {
            console.error('❌ Error en getProveedorByNIT:', error);
            res.status(500).json({
                success: false,
                message: 'Error al buscar proveedor por NIT',
                error: error.message
            });
        }
    }
};

export default proveedorController;