// controllers/productos.controller.js
import { Op } from 'sequelize';
import Producto from '../models/productos.model.js';
import Categoria from '../models/categorias.model.js';
import Talla from '../models/tallas.model.js';
import { sequelize } from '../config/db.js';
import { validateProducto, sanitizeProducto } from '../utils/validationUtils.js';

const productoController = {
    /**
     * Obtener todos los productos
     */
    getAllProductos: async (req, res) => {
        try {
            const { page = 1, limit = 10, search = '', categoria } = req.query;
            const offset = (page - 1) * limit;

            const whereClause = {};
            if (search) {
                whereClause.Nombre = { [Op.iLike]: `%${search}%` };
            }
            if (categoria) {
                whereClause.IdCategoria = categoria;
            }

            const { count, rows } = await Producto.findAndCountAll({
                where: whereClause,
                include: [
                    { model: Categoria, as: 'Categoria', attributes: ['Nombre'] },
                    { model: Talla, as: 'Tallas', attributes: ['IdTalla', 'Nombre', 'Cantidad'] }
                ],
                limit: parseInt(limit),
                offset: parseInt(offset),
                order: [['Nombre', 'ASC']]
            });

            // Calcular stock total para cada producto
            const productosConStock = rows.map(producto => {
                const stockTotal = producto.Tallas?.reduce((sum, t) => sum + t.Cantidad, 0) || 0;
                return {
                    ...producto.toJSON(),
                    stockTotal,
                    precioEfectivo: producto.EnOferta ? producto.PrecioOferta : producto.PrecioVenta
                };
            });

            res.json({
                success: true,
                data: productosConStock,
                pagination: {
                    total: count,
                    page: parseInt(page),
                    totalPages: Math.ceil(count / limit)
                }
            });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * Obtener producto por ID
     */
    getProductoById: async (req, res) => {
        try {
            const { id } = req.params;

            const producto = await Producto.findByPk(id, {
                include: [
                    { model: Categoria, as: 'Categoria', attributes: ['IdCategoria', 'Nombre'] },
                    { model: Talla, as: 'Tallas', attributes: ['IdTalla', 'Nombre', 'Cantidad'] }
                ]
            });

            if (!producto) {
                return res.status(404).json({ success: false, message: 'Producto no encontrado' });
            }

            const stockTotal = producto.Tallas?.reduce((sum, t) => sum + t.Cantidad, 0) || 0;

            res.json({
                success: true,
                data: {
                    ...producto.toJSON(),
                    stockTotal,
                    precioEfectivo: producto.EnOferta ? producto.PrecioOferta : producto.PrecioVenta
                }
            });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * Crear producto
     */
    createProducto: async (req, res) => {
        const transaction = await sequelize.transaction();
        
        try {
            const validationErrors = await validateProducto(req.body);
            if (validationErrors.length > 0) {
                await transaction.rollback();
                return res.status(400).json({ success: false, errors: validationErrors });
            }

            const sanitizedData = sanitizeProducto(req.body);
            
            const nuevoProducto = await Producto.create({
                ...sanitizedData,
                Estado: true,
                EnOferta: false
            }, { transaction });

            await transaction.commit();

            res.status(201).json({
                success: true,
                data: nuevoProducto,
                message: 'Producto creado exitosamente'
            });
        } catch (error) {
            await transaction.rollback();
            res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * Actualizar producto
     */
    updateProducto: async (req, res) => {
        const transaction = await sequelize.transaction();
        
        try {
            const { id } = req.params;

            const producto = await Producto.findByPk(id);
            if (!producto) {
                await transaction.rollback();
                return res.status(404).json({ success: false, message: 'Producto no encontrado' });
            }

            const validationErrors = await validateProducto(req.body, id);
            if (validationErrors.length > 0) {
                await transaction.rollback();
                return res.status(400).json({ success: false, errors: validationErrors });
            }

            const sanitizedData = sanitizeProducto(req.body);
            
            await producto.update(sanitizedData, { transaction });
            await transaction.commit();

            res.json({
                success: true,
                data: producto,
                message: 'Producto actualizado exitosamente'
            });
        } catch (error) {
            await transaction.rollback();
            res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * Activar/desactivar oferta y calcular descuento
     */
    toggleOferta: async (req, res) => {
        const transaction = await sequelize.transaction();
        
        try {
            const { id } = req.params;
            const { enOferta, precioOferta, porcentaje } = req.body;

            const producto = await Producto.findByPk(id);
            if (!producto) {
                await transaction.rollback();
                return res.status(404).json({ success: false, message: 'Producto no encontrado' });
            }

            let updateData = {};

            if (enOferta) {
                // Calcular precio de oferta
                let precioFinal;
                let porcentajeFinal;

                if (precioOferta) {
                    precioFinal = precioOferta;
                    porcentajeFinal = Math.round((1 - precioOferta / producto.PrecioVenta) * 100);
                } else if (porcentaje) {
                    porcentajeFinal = porcentaje;
                    precioFinal = producto.PrecioVenta * (1 - porcentaje / 100);
                } else {
                    await transaction.rollback();
                    return res.status(400).json({ 
                        success: false, 
                        message: 'Debe proporcionar precio de oferta o porcentaje de descuento' 
                    });
                }

                updateData = {
                    EnOferta: true,
                    PrecioOferta: Math.round(precioFinal),
                    PorcentajeDescuento: porcentajeFinal
                };
            } else {
                updateData = {
                    EnOferta: false,
                    PrecioOferta: null,
                    PorcentajeDescuento: null
                };
            }

            await producto.update(updateData, { transaction });
            await transaction.commit();

            res.json({
                success: true,
                data: {
                    IdProducto: producto.IdProducto,
                    Nombre: producto.Nombre,
                    PrecioVenta: producto.PrecioVenta,
                    EnOferta: producto.EnOferta,
                    PrecioOferta: producto.PrecioOferta,
                    PorcentajeDescuento: producto.PorcentajeDescuento
                },
                message: enOferta ? 'Oferta activada' : 'Oferta desactivada'
            });

        } catch (error) {
            await transaction.rollback();
            res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * Eliminar producto
     */
    deleteProducto: async (req, res) => {
        const transaction = await sequelize.transaction();
        
        try {
            const { id } = req.params;

            const producto = await Producto.findByPk(id);
            if (!producto) {
                await transaction.rollback();
                return res.status(404).json({ success: false, message: 'Producto no encontrado' });
            }

            // Verificar si tiene tallas asociadas
            const tallas = await Talla.count({ where: { IdProducto: id } });
            if (tallas > 0) {
                await transaction.rollback();
                return res.status(400).json({ 
                    success: false, 
                    message: 'No se puede eliminar el producto porque tiene tallas asociadas' 
                });
            }

            await producto.destroy({ transaction });
            await transaction.commit();

            res.json({ success: true, message: 'Producto eliminado exitosamente' });
        } catch (error) {
            await transaction.rollback();
            res.status(500).json({ success: false, message: error.message });
        }
    }
};

export default productoController;