// controllers/clientes.controller.js
import { Op } from 'sequelize';
import Cliente from '../models/clientes.model.js';
import Venta from '../models/ventas.model.js';
import { validateCliente, sanitizeCliente } from '../utils/validationUtils.js';
import { sequelize } from '../config/db.js';

/**
 * Controlador de Clientes
 * Maneja todas las operaciones CRUD para clientes
 */
const clienteController = {
    /**
     * Obtener todos los clientes con filtros
     * @route GET /api/clientes
     */
    getAllClientes: async (req, res) => {
        try {
            const { page = 1, limit = 7, search = '', ciudad, estado, tipoDocumento } = req.query;
            const offset = (page - 1) * limit;

            const whereClause = {};
            
            if (search) {
                whereClause[Op.or] = [
                    { Nombre: { [Op.iLike]: `%${search}%` } },
                    { Correo: { [Op.iLike]: `%${search}%` } },
                    { Telefono: { [Op.iLike]: `%${search}%` } },
                    { Ciudad: { [Op.iLike]: `%${search}%` } }
                ];
            }
            
            if (ciudad) {
                whereClause.Ciudad = { [Op.iLike]: `%${ciudad}%` };
            }
            
            if (tipoDocumento) {
                whereClause.TipoDocumento = tipoDocumento;
            }
            
            if (estado !== undefined) {
                whereClause.Estado = estado === 'true' || estado === 'Activo';
            }

            const { count, rows } = await Cliente.findAndCountAll({
                where: whereClause,
                limit: parseInt(limit),
                offset: parseInt(offset),
                order: [['Nombre', 'ASC']]
            });

            const clientesFormateados = await Promise.all(rows.map(async (cliente) => {
                const totalCompras = await Venta.sum('Total', {
                    where: { IdCliente: cliente.IdCliente }
                }) || 0;
                
                const cantidadCompras = await Venta.count({
                    where: { IdCliente: cliente.IdCliente }
                });

                return {
                    IdCliente: cliente.IdCliente,
                    Nombre: cliente.Nombre,
                    Email: cliente.Correo,
                    Telefono: cliente.Telefono || 'No registrado',
                    Ciudad: cliente.Ciudad || 'No registrada',
                    Estado: cliente.Estado ? 'Activo' : 'Inactivo',
                    EstadoValor: cliente.Estado,
                    TipoDocumento: cliente.getTipoDocumentoTexto(),
                    Documento: cliente.Documento,
                    DocumentoCompleto: cliente.formatearDocumento(),
                    Direccion: cliente.Direccion,
                    SaldoaFavor: cliente.SaldoaFavor || '0',
                    Estadisticas: {
                        totalCompras,
                        cantidadCompras,
                        promedioCompras: cantidadCompras > 0 ? totalCompras / cantidadCompras : 0
                    }
                };
            }));

            const totalPages = Math.ceil(count / limit);

            res.status(200).json({
                success: true,
                data: clientesFormateados,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages,
                    totalItems: count,
                    itemsPerPage: parseInt(limit),
                    showingFrom: offset + 1,
                    showingTo: Math.min(offset + parseInt(limit), count)
                }
            });

        } catch (error) {
            console.error('❌ Error en getAllClientes:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * Obtener un cliente por ID
     * @route GET /api/clientes/:id
     */
    getClienteById: async (req, res) => {
        try {
            const { id } = req.params;

            if (isNaN(id)) {
                return res.status(400).json({ success: false, message: 'ID de cliente inválido' });
            }

            const cliente = await Cliente.findByPk(id);
            if (!cliente) {
                return res.status(404).json({ success: false, message: 'Cliente no encontrado' });
            }

            const compras = await Venta.findAll({
                where: { IdCliente: id },
                order: [['Fecha', 'DESC']],
                limit: 10,
                include: ['Detalles']
            });

            const totalCompras = await Venta.sum('Total', { where: { IdCliente: id } }) || 0;
            const cantidadCompras = await Venta.count({ where: { IdCliente: id } });

            res.status(200).json({
                success: true,
                data: {
                    ...cliente.toJSON(),
                    TipoDocumentoTexto: cliente.getTipoDocumentoTexto(),
                    DocumentoFormateado: cliente.formatearDocumento(),
                    EstadoTexto: cliente.Estado ? 'Activo' : 'Inactivo',
                    Estadisticas: {
                        totalCompras,
                        cantidadCompras,
                        promedioCompras: cantidadCompras > 0 ? totalCompras / cantidadCompras : 0
                    },
                    UltimasCompras: compras.map(c => ({
                        IdVenta: c.IdVenta,
                        Fecha: c.Fecha,
                        Total: c.Total,
                        Productos: c.Detalles?.length || 0
                    }))
                }
            });

        } catch (error) {
            console.error('❌ Error en getClienteById:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * Crear un nuevo cliente
     * @route POST /api/clientes
     */
    createCliente: async (req, res) => {
        const transaction = await sequelize.transaction();
        
        try {
            const data = req.body;

            const validationErrors = await validateCliente(data);
            if (validationErrors.length > 0) {
                await transaction.rollback();
                return res.status(400).json({ success: false, errors: validationErrors });
            }

            const sanitizedData = sanitizeCliente(data);
            const nuevoCliente = await Cliente.create({
                ...sanitizedData,
                Estado: true,
                SaldoaFavor: '0'
            }, { transaction });

            await transaction.commit();

            res.status(201).json({
                success: true,
                data: {
                    ...nuevoCliente.toJSON(),
                    TipoDocumentoTexto: nuevoCliente.getTipoDocumentoTexto()
                },
                message: 'Cliente registrado exitosamente'
            });

        } catch (error) {
            await transaction.rollback();
            console.error('❌ Error en createCliente:', error);
            
            if (error.name === 'SequelizeUniqueConstraintError') {
                return res.status(400).json({ success: false, message: 'El documento o correo ya está registrado' });
            }
            
            res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * Actualizar un cliente
     * @route PUT /api/clientes/:id
     */
    updateCliente: async (req, res) => {
        const transaction = await sequelize.transaction();
        
        try {
            const { id } = req.params;
            const data = req.body;

            if (isNaN(id)) {
                await transaction.rollback();
                return res.status(400).json({ success: false, message: 'ID de cliente inválido' });
            }

            const cliente = await Cliente.findByPk(id);
            if (!cliente) {
                await transaction.rollback();
                return res.status(404).json({ success: false, message: 'Cliente no encontrado' });
            }

            const validationErrors = await validateCliente(data, id);
            if (validationErrors.length > 0) {
                await transaction.rollback();
                return res.status(400).json({ success: false, errors: validationErrors });
            }

            const sanitizedData = sanitizeCliente(data);
            await cliente.update(sanitizedData, { transaction });
            await transaction.commit();

            res.status(200).json({
                success: true,
                data: {
                    ...cliente.toJSON(),
                    TipoDocumentoTexto: cliente.getTipoDocumentoTexto()
                },
                message: 'Cliente actualizado exitosamente'
            });

        } catch (error) {
            await transaction.rollback();
            console.error('❌ Error en updateCliente:', error);
            
            if (error.name === 'SequelizeUniqueConstraintError') {
                return res.status(400).json({ success: false, message: 'El documento o correo ya está registrado' });
            }
            
            res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * Eliminar un cliente (borrado lógico)
     * @route DELETE /api/clientes/:id
     */
    deleteCliente: async (req, res) => {
        const transaction = await sequelize.transaction();
        
        try {
            const { id } = req.params;

            if (isNaN(id)) {
                await transaction.rollback();
                return res.status(400).json({ success: false, message: 'ID de cliente inválido' });
            }

            const cliente = await Cliente.findByPk(id);
            if (!cliente) {
                await transaction.rollback();
                return res.status(404).json({ success: false, message: 'Cliente no encontrado' });
            }

            const ventasAsociadas = await Venta.count({ where: { IdCliente: id } });
            if (ventasAsociadas > 0) {
                await transaction.rollback();
                return res.status(400).json({ success: false, message: 'No se puede eliminar el cliente porque tiene ventas asociadas' });
            }

            await cliente.update({ Estado: false }, { transaction });
            await transaction.commit();

            res.status(200).json({ success: true, message: 'Cliente desactivado exitosamente' });

        } catch (error) {
            await transaction.rollback();
            console.error('❌ Error en deleteCliente:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * Cambiar estado del cliente (activar/desactivar)
     * @route PATCH /api/clientes/:id/estado
     */
    toggleClienteStatus: async (req, res) => {
        const transaction = await sequelize.transaction();
        
        try {
            const { id } = req.params;

            if (isNaN(id)) {
                await transaction.rollback();
                return res.status(400).json({ success: false, message: 'ID de cliente inválido' });
            }

            const cliente = await Cliente.findByPk(id);
            if (!cliente) {
                await transaction.rollback();
                return res.status(404).json({ success: false, message: 'Cliente no encontrado' });
            }

            await cliente.update({ Estado: !cliente.Estado }, { transaction });
            await transaction.commit();

            res.status(200).json({
                success: true,
                data: {
                    IdCliente: cliente.IdCliente,
                    Nombre: cliente.Nombre,
                    Estado: cliente.Estado,
                    EstadoTexto: cliente.Estado ? 'Activo' : 'Inactivo'
                },
                message: `Cliente ${cliente.Estado ? 'activado' : 'desactivado'} exitosamente`
            });

        } catch (error) {
            await transaction.rollback();
            console.error('❌ Error en toggleClienteStatus:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * Obtener clientes activos (para selects)
     * @route GET /api/clientes/activos
     */
    getClientesActivos: async (req, res) => {
        try {
            const clientes = await Cliente.findAll({
                where: { Estado: true },
                attributes: ['IdCliente', 'Nombre', 'TipoDocumento', 'Documento', 'Correo'],
                order: [['Nombre', 'ASC']]
            });

            const clientesFormateados = clientes.map(c => ({
                IdCliente: c.IdCliente,
                Nombre: c.Nombre,
                Identificacion: c.formatearDocumento(),
                Correo: c.Correo
            }));

            res.status(200).json({ success: true, data: clientesFormateados });

        } catch (error) {
            console.error('❌ Error en getClientesActivos:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * Buscar cliente por documento
     * @route GET /api/clientes/documento/:tipo/:numero
     */
    getClienteByDocumento: async (req, res) => {
        try {
            const { tipo, numero } = req.params;

            const cliente = await Cliente.findOne({
                where: { TipoDocumento: tipo, Documento: numero }
            });

            if (!cliente) {
                return res.status(404).json({ success: false, message: 'Cliente no encontrado' });
            }

            res.status(200).json({
                success: true,
                data: {
                    ...cliente.toJSON(),
                    TipoDocumentoTexto: cliente.getTipoDocumentoTexto()
                }
            });

        } catch (error) {
            console.error('❌ Error en getClienteByDocumento:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * Obtener clientes por ciudad
     * @route GET /api/clientes/ciudad/:ciudad
     */
    getClientesByCiudad: async (req, res) => {
        try {
            const { ciudad } = req.params;

            const clientes = await Cliente.findAll({
                where: { 
                    Ciudad: { [Op.iLike]: `%${ciudad}%` },
                    Estado: true
                },
                attributes: ['IdCliente', 'Nombre', 'Telefono', 'Correo', 'Direccion'],
                limit: 20
            });

            res.status(200).json({ success: true, data: clientes });

        } catch (error) {
            console.error('❌ Error en getClientesByCiudad:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * Obtener estadísticas de clientes
     * @route GET /api/clientes/estadisticas
     */
    getEstadisticas: async (req, res) => {
        try {
            const totalClientes = await Cliente.count();
            const activos = await Cliente.count({ where: { Estado: true } });
            const inactivos = await Cliente.count({ where: { Estado: false } });
            
            res.status(200).json({
                success: true,
                data: { total: totalClientes, activos, inactivos }
            });

        } catch (error) {
            console.error('❌ Error en getEstadisticas:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * Actualizar saldo a favor del cliente
     * @route PATCH /api/clientes/:id/saldo
     */
    updateSaldo: async (req, res) => {
        const transaction = await sequelize.transaction();
        
        try {
            const { id } = req.params;
            const { monto, operacion = 'sumar' } = req.body;

            if (isNaN(id)) {
                await transaction.rollback();
                return res.status(400).json({ success: false, message: 'ID de cliente inválido' });
            }

            const cliente = await Cliente.findByPk(id);
            if (!cliente) {
                await transaction.rollback();
                return res.status(404).json({ success: false, message: 'Cliente no encontrado' });
            }

            let saldoActual = parseFloat(cliente.SaldoaFavor) || 0;
            let nuevoSaldo;

            if (operacion === 'sumar') {
                nuevoSaldo = saldoActual + parseFloat(monto);
            } else if (operacion === 'restar') {
                nuevoSaldo = saldoActual - parseFloat(monto);
                if (nuevoSaldo < 0) {
                    await transaction.rollback();
                    return res.status(400).json({ success: false, message: 'Saldo insuficiente' });
                }
            }

            await cliente.update({ SaldoaFavor: nuevoSaldo.toString() }, { transaction });
            await transaction.commit();

            res.status(200).json({
                success: true,
                data: {
                    IdCliente: cliente.IdCliente,
                    SaldoAnterior: saldoActual,
                    SaldoActual: nuevoSaldo
                },
                message: 'Saldo actualizado exitosamente'
            });

        } catch (error) {
            await transaction.rollback();
            console.error('❌ Error en updateSaldo:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    }
};

export default clienteController;