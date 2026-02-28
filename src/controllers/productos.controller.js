// controllers/productos.controller.js
import { Op } from 'sequelize';
import Producto from '../models/productos.model.js';
import Categoria from '../models/categorias.model.js';
import Talla from '../models/tallas.model.js';
import Imagen from '../models/imagenes.model.js';
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
                    { model: Categoria, as: 'Categoria', attributes: ['IdCategoria', 'Nombre'] },
                    { model: Talla, as: 'Tallas', attributes: ['IdTalla', 'Nombre', 'Cantidad'] },
                    { model: Imagen, as: 'Imagenes', attributes: ['IdImagen', 'Url', 'EsPrincipal'] }
                ],
                limit: parseInt(limit),
                offset: parseInt(offset),
                order: [['Nombre', 'ASC']]
            });

            // Calcular stock total para cada producto
            const productosConStock = rows.map(producto => {
                const stockTotal = producto.Tallas?.reduce((sum, t) => sum + t.Cantidad, 0) || 0;
                const imagenPrincipal = producto.Imagenes?.find(img => img.EsPrincipal)?.Url || 
                                        producto.Imagenes?.[0]?.Url || null;
                
                return {
                    ...producto.toJSON(),
                    stockTotal,
                    precioEfectivo: producto.EnOferta ? producto.PrecioOferta : producto.PrecioVenta,
                    imagenPrincipal
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
            console.error('❌ Error en getAllProductos:', error);
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
                    { model: Talla, as: 'Tallas', attributes: ['IdTalla', 'Nombre', 'Cantidad'] },
                    { model: Imagen, as: 'Imagenes', attributes: ['IdImagen', 'Url', 'EsPrincipal'] }
                ]
            });

            if (!producto) {
                return res.status(404).json({ success: false, message: 'Producto no encontrado' });
            }

            const stockTotal = producto.Tallas?.reduce((sum, t) => sum + t.Cantidad, 0) || 0;
            const imagenPrincipal = producto.Imagenes?.find(img => img.EsPrincipal)?.Url || 
                                    producto.Imagenes?.[0]?.Url || null;

            res.json({
                success: true,
                data: {
                    ...producto.toJSON(),
                    stockTotal,
                    precioEfectivo: producto.EnOferta ? producto.PrecioOferta : producto.PrecioVenta,
                    imagenPrincipal
                }
            });
        } catch (error) {
            console.error('❌ Error en getProductoById:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * Obtener productos por categoría
     */
    getProductosByCategoria: async (req, res) => {
        try {
            const { categoriaId } = req.params;
            const productos = await Producto.findAll({
                where: { IdCategoria: categoriaId, Estado: true },
                include: [
                    { model: Categoria, as: 'Categoria' },
                    { model: Talla, as: 'Tallas' },
                    { model: Imagen, as: 'Imagenes' }
                ]
            });
            res.json({ success: true, data: productos });
        } catch (error) {
            console.error('❌ Error en getProductosByCategoria:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * Obtener productos por talla
     */
    getProductosByTalla: async (req, res) => {
        try {
            const { tallaId } = req.params;
            const productos = await Producto.findAll({
                include: [
                    {
                        model: Talla,
                        as: 'Tallas',
                        where: { IdTalla: tallaId },
                        required: true
                    },
                    { model: Categoria, as: 'Categoria' },
                    { model: Imagen, as: 'Imagenes' }
                ]
            });
            res.json({ success: true, data: productos });
        } catch (error) {
            console.error('❌ Error en getProductosByTalla:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * Obtener productos con stock bajo
     */
    getProductosStockBajo: async (req, res) => {
        try {
            const { umbral = 5 } = req.query;
            const productos = await Producto.findAll({
                include: [
                    {
                        model: Talla,
                        as: 'Tallas',
                        required: true
                    },
                    { model: Categoria, as: 'Categoria' }
                ]
            });
            
            const productosStockBajo = productos.filter(producto => {
                const stockTotal = producto.Tallas?.reduce((sum, t) => sum + t.Cantidad, 0) || 0;
                return stockTotal < umbral;
            }).map(p => ({
                IdProducto: p.IdProducto,
                Nombre: p.Nombre,
                Categoria: p.Categoria?.Nombre,
                StockTotal: p.Tallas?.reduce((sum, t) => sum + t.Cantidad, 0) || 0,
                Tallas: p.Tallas
            }));

            res.json({ success: true, data: productosStockBajo });
        } catch (error) {
            console.error('❌ Error en getProductosStockBajo:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * Buscar productos
     */
    buscarProductos: async (req, res) => {
        try {
            const { q } = req.query;
            const productos = await Producto.findAll({
                where: {
                    Nombre: { [Op.iLike]: `%${q}%` },
                    Estado: true
                },
                include: [
                    { model: Categoria, as: 'Categoria' },
                    { model: Talla, as: 'Tallas' }
                ],
                limit: 20
            });
            res.json({ success: true, data: productos });
        } catch (error) {
            console.error('❌ Error en buscarProductos:', error);
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
            console.error('❌ Error en createProducto:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * Actualizar producto completo
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
            console.error('❌ Error en updateProducto:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * Actualización parcial de producto (PATCH)
     */
    patchProducto: async (req, res) => {
        const transaction = await sequelize.transaction();
        try {
            const { id } = req.params;
            const producto = await Producto.findByPk(id);
            if (!producto) {
                await transaction.rollback();
                return res.status(404).json({ success: false, message: 'Producto no encontrado' });
            }

            await producto.update(req.body, { transaction });
            await transaction.commit();

            res.json({ success: true, data: producto, message: 'Producto actualizado parcialmente' });
        } catch (error) {
            await transaction.rollback();
            console.error('❌ Error en patchProducto:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * Actualizar stock de un producto por talla
     */
    actualizarStock: async (req, res) => {
        const transaction = await sequelize.transaction();
        try {
            const { id } = req.params;
            const { tallaId, cantidad } = req.body;

            const talla = await Talla.findOne({
                where: { IdTalla: tallaId, IdProducto: id }
            });

            if (!talla) {
                await transaction.rollback();
                return res.status(404).json({ success: false, message: 'Talla no encontrada' });
            }

            talla.Cantidad = cantidad;
            await talla.save({ transaction });
            await transaction.commit();

            res.json({ success: true, message: 'Stock actualizado' });
        } catch (error) {
            await transaction.rollback();
            console.error('❌ Error en actualizarStock:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * Activar/desactivar producto
     */
    toggleProductoStatus: async (req, res) => {
        const transaction = await sequelize.transaction();
        try {
            const { id } = req.params;
            const producto = await Producto.findByPk(id);
            if (!producto) {
                await transaction.rollback();
                return res.status(404).json({ success: false, message: 'Producto no encontrado' });
            }

            producto.Estado = !producto.Estado;
            await producto.save({ transaction });
            await transaction.commit();

            res.json({
                success: true,
                data: { Estado: producto.Estado },
                message: `Producto ${producto.Estado ? 'activado' : 'desactivado'}`
            });
        } catch (error) {
            await transaction.rollback();
            console.error('❌ Error en toggleProductoStatus:', error);
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
            console.error('❌ Error en toggleOferta:', error);
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

            // Verificar si tiene imágenes asociadas
            const imagenes = await Imagen.count({ where: { IdProducto: id } });
            if (imagenes > 0) {
                await transaction.rollback();
                return res.status(400).json({ 
                    success: false, 
                    message: 'No se puede eliminar el producto porque tiene imágenes asociadas' 
                });
            }

            await producto.destroy({ transaction });
            await transaction.commit();

            res.json({ success: true, message: 'Producto eliminado exitosamente' });
        } catch (error) {
            await transaction.rollback();
            console.error('❌ Error en deleteProducto:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * Obtener productos públicos (catálogo)
     */
    getProductosPublicos: async (req, res) => {
        try {
            const productos = await Producto.findAll({
                where: { Estado: true },
                include: [
                    { model: Categoria, as: 'Categoria', attributes: ['Nombre'] },
                    { model: Talla, as: 'Tallas', attributes: ['IdTalla', 'Nombre', 'Cantidad'] },
                    { model: Imagen, as: 'Imagenes', attributes: ['Url', 'EsPrincipal'] }
                ],
                limit: 50
            });

            const productosFormateados = productos.map(p => {
                const imagenPrincipal = p.Imagenes?.find(img => img.EsPrincipal)?.Url || 
                                        p.Imagenes?.[0]?.Url || null;
                return {
                    IdProducto: p.IdProducto,
                    Nombre: p.Nombre,
                    Descripcion: p.Descripcion,
                    PrecioVenta: p.PrecioVenta,
                    EnOferta: p.EnOferta,
                    PrecioOferta: p.PrecioOferta,
                    PorcentajeDescuento: p.PorcentajeDescuento,
                    Categoria: p.Categoria?.Nombre,
                    Tallas: p.Tallas,
                    imagenPrincipal
                };
            });

            res.json({ success: true, data: productosFormateados });
        } catch (error) {
            console.error('❌ Error en getProductosPublicos:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * Obtener productos destacados (en oferta)
     */
    getProductosDestacados: async (req, res) => {
        try {
            const productos = await Producto.findAll({
                where: { Estado: true, EnOferta: true },
                include: [
                    { model: Categoria, as: 'Categoria' },
                    { model: Imagen, as: 'Imagenes' }
                ],
                limit: 10
            });

            const productosFormateados = productos.map(p => {
                const imagenPrincipal = p.Imagenes?.find(img => img.EsPrincipal)?.Url || 
                                        p.Imagenes?.[0]?.Url || null;
                return {
                    IdProducto: p.IdProducto,
                    Nombre: p.Nombre,
                    PrecioVenta: p.PrecioVenta,
                    PrecioOferta: p.PrecioOferta,
                    PorcentajeDescuento: p.PorcentajeDescuento,
                    Categoria: p.Categoria?.Nombre,
                    imagenPrincipal
                };
            });

            res.json({ success: true, data: productosFormateados });
        } catch (error) {
            console.error('❌ Error en getProductosDestacados:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * Obtener productos por categoría (público)
     */
    getProductosByCategoriaPublico: async (req, res) => {
        try {
            const { categoriaId } = req.params;
            const productos = await Producto.findAll({
                where: { IdCategoria: categoriaId, Estado: true },
                include: [
                    { model: Categoria, as: 'Categoria' },
                    { model: Talla, as: 'Tallas' },
                    { model: Imagen, as: 'Imagenes' }
                ],
                limit: 50
            });

            const productosFormateados = productos.map(p => {
                const imagenPrincipal = p.Imagenes?.find(img => img.EsPrincipal)?.Url || 
                                        p.Imagenes?.[0]?.Url || null;
                return {
                    IdProducto: p.IdProducto,
                    Nombre: p.Nombre,
                    Descripcion: p.Descripcion,
                    PrecioVenta: p.PrecioVenta,
                    EnOferta: p.EnOferta,
                    PrecioOferta: p.PrecioOferta,
                    Categoria: p.Categoria?.Nombre,
                    Tallas: p.Tallas,
                    imagenPrincipal
                };
            });

            res.json({ success: true, data: productosFormateados });
        } catch (error) {
            console.error('❌ Error en getProductosByCategoriaPublico:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    }
};

export default productoController;