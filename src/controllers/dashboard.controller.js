// controllers/dashboard.controller.js
import { Op } from 'sequelize';
import { sequelize } from '../config/db.js';

// ✅ TODAS LAS IMPORTACIONES CORREGIDAS - usando .model.js
import Categoria from '../models/categorias.model.js';
import Producto from '../models/productos.model.js';
import Proveedor from '../models/proveedores.model.js';
import Compra from '../models/compras.model.js';
import Cliente from '../models/clientes.model.js';
import Venta from '../models/ventas.model.js';
import Devolucion from '../models/devoluciones.model.js';
import Usuario from '../models/usuarios.model.js';
import Talla from '../models/tallas.model.js';
import Estado from '../models/estado.model.js';
import DetalleVenta from '../models/detalleVentas.model.js';

const dashboardController = {
    /**
     * Dashboard básico para todos los usuarios autenticados
     * @route GET /api/dashboard
     */
    getDashboardBasico: async (req, res) => {
        try {
            const usuario = req.usuario;
            
            let data = {
                usuario: {
                    nombre: usuario.nombre,
                    tipo: usuario.tipo,
                    rol: usuario.rol
                }
            };

            // Si es cliente, mostrar su información específica
            if (usuario.tipo === 'cliente') {
                const cliente = await Cliente.findOne({
                    where: { IdUsuario: usuario.id }
                });
                
                if (cliente) {
                    const ultimasCompras = await Venta.findAll({
                        where: { IdCliente: cliente.IdCliente },
                        order: [['Fecha', 'DESC']],
                        limit: 5
                    });
                    
                    data.cliente = {
                        nombre: cliente.Nombre,
                        saldo: cliente.SaldoaFavor,
                        ultimasCompras
                    };
                }
            }

            res.json({
                success: true,
                data
            });
        } catch (error) {
            console.error('❌ Error en getDashboardBasico:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * Información del perfil del usuario
     * @route GET /api/dashboard/perfil
     */
    getPerfilInfo: async (req, res) => {
        try {
            const usuario = req.usuario;
            
            let perfil = {
                id: usuario.id,
                nombre: usuario.nombre,
                correo: usuario.correo,
                tipo: usuario.tipo,
                rol: usuario.rol
            };

            // Si es cliente, obtener datos adicionales
            if (usuario.tipo === 'cliente') {
                const cliente = await Cliente.findOne({
                    where: { IdUsuario: usuario.id }
                });
                
                if (cliente) {
                    perfil.cliente = {
                        id: cliente.IdCliente,
                        documento: cliente.formatearDocumento(),
                        telefono: cliente.Telefono,
                        direccion: cliente.Direccion,
                        ciudad: cliente.Ciudad
                    };
                }
            }

            res.json({
                success: true,
                data: perfil
            });
        } catch (error) {
            console.error('❌ Error en getPerfilInfo:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * Dashboard específico para clientes
     * @route GET /api/dashboard/cliente
     */
    getDashboardCliente: async (req, res) => {
        try {
            const cliente = await Cliente.findOne({
                where: { IdUsuario: req.usuario.id }
            });

            if (!cliente) {
                return res.status(404).json({ success: false, message: 'Cliente no encontrado' });
            }

            const compras = await Venta.findAll({
                where: { IdCliente: cliente.IdCliente },
                order: [['Fecha', 'DESC']],
                limit: 10
            });

            const totalCompras = await Venta.sum('Total', {
                where: { IdCliente: cliente.IdCliente }
            }) || 0;

            res.json({
                success: true,
                data: {
                    cliente: {
                        nombre: cliente.Nombre,
                        documento: cliente.formatearDocumento(),
                        saldo: cliente.SaldoaFavor
                    },
                    estadisticas: {
                        totalCompras,
                        cantidadCompras: compras.length
                    },
                    ultimasCompras: compras
                }
            });
        } catch (error) {
            console.error('❌ Error en getDashboardCliente:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * Obtener compras del cliente actual
     * @route GET /api/dashboard/cliente/compras
     */
    getMisCompras: async (req, res) => {
        try {
            const cliente = await Cliente.findOne({
                where: { IdUsuario: req.usuario.id }
            });

            if (!cliente) {
                return res.status(404).json({ success: false, message: 'Cliente no encontrado' });
            }

            const { page = 1, limit = 10 } = req.query;
            const offset = (page - 1) * limit;

            const { count, rows } = await Venta.findAndCountAll({
                where: { IdCliente: cliente.IdCliente },
                include: [{ model: Estado, as: 'Estado', attributes: ['Nombre'] }],
                limit: parseInt(limit),
                offset: parseInt(offset),
                order: [['Fecha', 'DESC']]
            });

            res.json({
                success: true,
                data: rows,
                pagination: {
                    total: count,
                    page: parseInt(page),
                    totalPages: Math.ceil(count / limit)
                }
            });
        } catch (error) {
            console.error('❌ Error en getMisCompras:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * Obtener facturas del cliente actual
     * @route GET /api/dashboard/cliente/facturas
     */
    getMisFacturas: async (req, res) => {
        try {
            const cliente = await Cliente.findOne({
                where: { IdUsuario: req.usuario.id }
            });

            if (!cliente) {
                return res.status(404).json({ success: false, message: 'Cliente no encontrado' });
            }

            const facturas = await Venta.findAll({
                where: { 
                    IdCliente: cliente.IdCliente,
                    IdEstado: 1 // Completadas
                },
                include: [{ model: DetalleVenta, as: 'Detalles' }],
                order: [['Fecha', 'DESC']],
                limit: 20
            });

            res.json({
                success: true,
                data: facturas
            });
        } catch (error) {
            console.error('❌ Error en getMisFacturas:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * Obtener estadísticas completas para el dashboard (admin/empleados)
     * @route GET /api/dashboard/estadisticas
     */
    getDashboardStats: async (req, res) => {
        try {
            // 📦 CONTEO DE REGISTROS
            const totalCategorias = await Categoria.count();
            const totalProductos = await Producto.count();
            const totalProveedores = await Proveedor.count();
            const totalCompras = await Compra.count();
            const totalClientes = await Cliente.count();
            const totalVentas = await Venta.count();
            const totalDevoluciones = await Devolucion.count();
            const totalUsuarios = await Usuario.count();

            // 💰 TOTALES DE VENTAS Y COMPRAS
            const ventasHoy = await Venta.sum('Total', {
                where: {
                    Fecha: {
                        [Op.gte]: new Date().setHours(0, 0, 0, 0)
                    },
                    IdEstado: 1 // Completadas
                }
            }) || 0;

            const ventasMes = await Venta.sum('Total', {
                where: {
                    Fecha: {
                        [Op.gte]: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
                    },
                    IdEstado: 1
                }
            }) || 0;

            const comprasMes = await Compra.sum('Total', {
                where: {
                    Fecha: {
                        [Op.gte]: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
                    },
                    Estado: true
                }
            }) || 0;

            // 📉 STOCK BAJO (productos con stock menor a 10)
            const productosStockBajo = await Producto.findAll({
                where: { Stock: { [Op.lt]: 10 } },
                limit: 5,
                include: [{ model: Talla, as: 'Tallas' }]
            });

            // 📈 ÚLTIMAS VENTAS
            const ultimasVentas = await Venta.findAll({
                limit: 5,
                order: [['Fecha', 'DESC']],
                include: [
                    { model: Cliente, as: 'Cliente', attributes: ['Nombre'] },
                    { model: Estado, as: 'Estado', attributes: ['Nombre'] }
                ]
            });

            // 📊 VENTAS POR MES (últimos 6 meses)
            const ventasPorMes = await Venta.findAll({
                attributes: [
                    [sequelize.fn('DATE_FORMAT', sequelize.col('Fecha'), '%Y-%m'), 'mes'],
                    [sequelize.fn('COUNT', sequelize.col('IdVenta')), 'cantidad'],
                    [sequelize.fn('SUM', sequelize.col('Total')), 'total']
                ],
                where: {
                    Fecha: {
                        [Op.gte]: new Date(new Date().setMonth(new Date().getMonth() - 6))
                    },
                    IdEstado: 1
                },
                group: ['mes'],
                order: [[sequelize.literal('mes'), 'ASC']]
            });

            // 🏆 TOP PRODUCTOS MÁS VENDIDOS
            const topProductos = await DetalleVenta.findAll({
                attributes: [
                    'IdProducto',
                    [sequelize.fn('SUM', sequelize.col('Cantidad')), 'totalVendido'],
                    [sequelize.fn('SUM', sequelize.col('Subtotal')), 'totalIngresos']
                ],
                include: [{
                    model: Producto,
                    as: 'Producto',
                    attributes: ['Nombre', 'url']
                }],
                group: ['IdProducto'],
                order: [[sequelize.literal('totalVendido'), 'DESC']],
                limit: 5
            });

            // 👑 TOP CLIENTES
            const topClientes = await Venta.findAll({
                attributes: [
                    'IdCliente',
                    [sequelize.fn('COUNT', sequelize.col('IdVenta')), 'totalCompras'],
                    [sequelize.fn('SUM', sequelize.col('Total')), 'totalGastado']
                ],
                where: { IdEstado: 1 },
                include: [{
                    model: Cliente,
                    as: 'Cliente',
                    attributes: ['Nombre', 'Correo']
                }],
                group: ['IdCliente'],
                order: [[sequelize.literal('totalGastado'), 'DESC']],
                limit: 5
            });

            // 📊 ESTADO DE CAJA
            const caja = {
                ventasHoy,
                ventasMes,
                comprasMes,
                balanceMes: ventasMes - comprasMes
            };

            res.json({
                success: true,
                data: {
                    conteos: {
                        categorias: totalCategorias,
                        productos: totalProductos,
                        proveedores: totalProveedores,
                        compras: totalCompras,
                        clientes: totalClientes,
                        ventas: totalVentas,
                        devoluciones: totalDevoluciones,
                        usuarios: totalUsuarios
                    },
                    caja,
                    stockBajo: productosStockBajo.map(p => ({
                        IdProducto: p.IdProducto,
                        Nombre: p.Nombre,
                        Stock: p.Stock,
                        Tallas: p.Tallas?.map(t => ({
                            Nombre: t.Nombre,
                            Cantidad: t.Cantidad
                        }))
                    })),
                    ultimasVentas: ultimasVentas.map(v => ({
                        IdVenta: v.IdVenta,
                        Cliente: v.Cliente?.Nombre,
                        Total: v.Total,
                        Fecha: v.Fecha,
                        Estado: v.Estado?.Nombre
                    })),
                    ventasPorMes,
                    topProductos: topProductos.map(p => ({
                        Producto: p.Producto?.Nombre,
                        Imagen: p.Producto?.url,
                        TotalVendido: parseInt(p.dataValues.totalVendido),
                        TotalIngresos: p.dataValues.totalIngresos
                    })),
                    topClientes: topClientes.map(c => ({
                        Cliente: c.Cliente?.Nombre,
                        Correo: c.Cliente?.Correo,
                        TotalCompras: parseInt(c.dataValues.totalCompras),
                        TotalGastado: c.dataValues.totalGastado
                    }))
                }
            });

        } catch (error) {
            console.error('❌ Error en dashboard:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * Obtener resumen rápido (cards superiores)
     * @route GET /api/dashboard/resumen
     */
    getResumen: async (req, res) => {
        try {
            const hoy = new Date().setHours(0, 0, 0, 0);
            const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

            // Ventas del día
            const ventasHoy = await Venta.count({
                where: {
                    Fecha: { [Op.gte]: hoy },
                    IdEstado: 1
                }
            });

            const totalVentasHoy = await Venta.sum('Total', {
                where: {
                    Fecha: { [Op.gte]: hoy },
                    IdEstado: 1
                }
            }) || 0;

            // Ventas del mes
            const totalVentasMes = await Venta.sum('Total', {
                where: {
                    Fecha: { [Op.gte]: inicioMes },
                    IdEstado: 1
                }
            }) || 0;

            // Productos con stock bajo
            const productosBajoStock = await Producto.count({
                where: { Stock: { [Op.lt]: 10 } }
            });

            // Clientes nuevos hoy
            const clientesHoy = await Cliente.count({
                where: {
                    createdAt: { [Op.gte]: hoy }
                }
            });

            res.json({
                success: true,
                data: {
                    ventasHoy: {
                        cantidad: ventasHoy,
                        total: totalVentasHoy,
                        totalFormateado: new Intl.NumberFormat('es-CO', {
                            style: 'currency',
                            currency: 'COP'
                        }).format(totalVentasHoy)
                    },
                    ventasMes: {
                        total: totalVentasMes,
                        totalFormateado: new Intl.NumberFormat('es-CO', {
                            style: 'currency',
                            currency: 'COP'
                        }).format(totalVentasMes)
                    },
                    productosBajoStock,
                    clientesNuevosHoy: clientesHoy
                }
            });

        } catch (error) {
            console.error('❌ Error en resumen:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * Obtener gráficos para el dashboard
     * @route GET /api/dashboard/graficos
     */
    getGraficos: async (req, res) => {
        try {
            const { periodo = 'mes' } = req.query;

            let fechaInicio;
            const ahora = new Date();

            if (periodo === 'semana') {
                fechaInicio = new Date(ahora.setDate(ahora.getDate() - 7));
            } else if (periodo === 'mes') {
                fechaInicio = new Date(ahora.setMonth(ahora.getMonth() - 1));
            } else if (periodo === 'año') {
                fechaInicio = new Date(ahora.setFullYear(ahora.getFullYear() - 1));
            }

            // Ventas por día
            const ventasPorDia = await Venta.findAll({
                attributes: [
                    [sequelize.fn('DATE', sequelize.col('Fecha')), 'dia'],
                    [sequelize.fn('COUNT', sequelize.col('IdVenta')), 'cantidad'],
                    [sequelize.fn('SUM', sequelize.col('Total')), 'total']
                ],
                where: {
                    Fecha: { [Op.gte]: fechaInicio },
                    IdEstado: 1
                },
                group: [sequelize.fn('DATE', sequelize.col('Fecha'))],
                order: [[sequelize.literal('dia'), 'ASC']]
            });

            // Productos por categoría
            const productosPorCategoria = await Producto.findAll({
                attributes: [
                    'IdCategoria',
                    [sequelize.fn('COUNT', sequelize.col('IdProducto')), 'cantidad']
                ],
                include: [{
                    model: Categoria,
                    as: 'Categoria',
                    attributes: ['Nombre']
                }],
                group: ['IdCategoria']
            });

            res.json({
                success: true,
                data: {
                    ventasPorDia: ventasPorDia.map(v => ({
                        dia: v.dataValues.dia,
                        cantidad: parseInt(v.dataValues.cantidad),
                        total: v.dataValues.total
                    })),
                    productosPorCategoria: productosPorCategoria.map(p => ({
                        categoria: p.Categoria?.Nombre,
                        cantidad: parseInt(p.dataValues.cantidad)
                    }))
                }
            });

        } catch (error) {
            console.error('❌ Error en gráficos:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * Obtener gráfico de ventas
     * @route GET /api/dashboard/graficos/ventas
     */
    getGraficoVentas: async (req, res) => {
        try {
            const ventasPorDia = await Venta.findAll({
                attributes: [
                    [sequelize.fn('DATE', sequelize.col('Fecha')), 'dia'],
                    [sequelize.fn('SUM', sequelize.col('Total')), 'total']
                ],
                where: {
                    Fecha: {
                        [Op.gte]: new Date(new Date().setDate(new Date().getDate() - 30))
                    },
                    IdEstado: 1
                },
                group: [sequelize.fn('DATE', sequelize.col('Fecha'))],
                order: [[sequelize.literal('dia'), 'ASC']]
            });

            res.json({
                success: true,
                data: ventasPorDia.map(v => ({
                    fecha: v.dataValues.dia,
                    total: v.dataValues.total
                }))
            });
        } catch (error) {
            console.error('❌ Error en getGraficoVentas:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * Obtener gráfico de productos más vendidos
     * @route GET /api/dashboard/graficos/productos
     */
    getGraficoProductos: async (req, res) => {
        try {
            const topProductos = await DetalleVenta.findAll({
                attributes: [
                    'IdProducto',
                    [sequelize.fn('SUM', sequelize.col('Cantidad')), 'total']
                ],
                include: [{
                    model: Producto,
                    as: 'Producto',
                    attributes: ['Nombre']
                }],
                group: ['IdProducto'],
                order: [[sequelize.literal('total'), 'DESC']],
                limit: 10
            });

            res.json({
                success: true,
                data: topProductos.map(p => ({
                    producto: p.Producto?.Nombre,
                total: parseInt(p.dataValues.total)
                }))
            });
        } catch (error) {
            console.error('❌ Error en getGraficoProductos:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * Obtener reporte de ventas diarias
     * @route GET /api/dashboard/reportes/ventas-diarias
     */
    getVentasDiarias: async (req, res) => {
        try {
            const { fecha } = req.query;
            const fechaConsulta = fecha ? new Date(fecha) : new Date();
            fechaConsulta.setHours(0, 0, 0, 0);
            const fechaFin = new Date(fechaConsulta);
            fechaFin.setHours(23, 59, 59, 999);

            const ventas = await Venta.findAll({
                where: {
                    Fecha: {
                        [Op.between]: [fechaConsulta, fechaFin]
                    },
                    IdEstado: 1
                },
                include: [
                    { model: Cliente, as: 'Cliente', attributes: ['Nombre'] },
                    { model: DetalleVenta, as: 'Detalles' }
                ]
            });

            const total = ventas.reduce((sum, v) => sum + v.Total, 0);
            const cantidad = ventas.length;

            res.json({
                success: true,
                data: {
                    fecha: fechaConsulta.toISOString().split('T')[0],
                    cantidad,
                    total,
                    ventas
                }
            });
        } catch (error) {
            console.error('❌ Error en getVentasDiarias:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * Obtener productos más vendidos
     * @route GET /api/dashboard/reportes/productos-mas-vendidos
     */
    getProductosMasVendidos: async (req, res) => {
        try {
            const { limite = 10 } = req.query;

            const productos = await DetalleVenta.findAll({
                attributes: [
                    'IdProducto',
                    [sequelize.fn('SUM', sequelize.col('Cantidad')), 'totalVendido'],
                    [sequelize.fn('SUM', sequelize.col('Subtotal')), 'totalIngresos']
                ],
                include: [{
                    model: Producto,
                    as: 'Producto',
                    attributes: ['Nombre', 'PrecioVenta', 'url']
                }],
                group: ['IdProducto'],
                order: [[sequelize.literal('totalVendido'), 'DESC']],
                limit: parseInt(limite)
            });

            res.json({
                success: true,
                data: productos.map(p => ({
                    producto: p.Producto?.Nombre,
                    imagen: p.Producto?.url,
                    precio: p.Producto?.PrecioVenta,
                    totalVendido: parseInt(p.dataValues.totalVendido),
                    totalIngresos: p.dataValues.totalIngresos
                }))
            });
        } catch (error) {
            console.error('❌ Error en getProductosMasVendidos:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * Obtener clientes frecuentes
     * @route GET /api/dashboard/reportes/clientes-frecuentes
     */
    getClientesFrecuentes: async (req, res) => {
        try {
            const { limite = 10 } = req.query;

            const clientes = await Venta.findAll({
                attributes: [
                    'IdCliente',
                    [sequelize.fn('COUNT', sequelize.col('IdVenta')), 'totalCompras'],
                    [sequelize.fn('SUM', sequelize.col('Total')), 'totalGastado']
                ],
                where: { IdEstado: 1 },
                include: [{
                    model: Cliente,
                    as: 'Cliente',
                    attributes: ['Nombre', 'Correo', 'Telefono']
                }],
                group: ['IdCliente'],
                order: [[sequelize.literal('totalCompras'), 'DESC']],
                limit: parseInt(limite)
            });

            res.json({
                success: true,
                data: clientes.map(c => ({
                    cliente: c.Cliente?.Nombre,
                    correo: c.Cliente?.Correo,
                    telefono: c.Cliente?.Telefono,
                    totalCompras: parseInt(c.dataValues.totalCompras),
                    totalGastado: c.dataValues.totalGastado
                }))
            });
        } catch (error) {
            console.error('❌ Error en getClientesFrecuentes:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * Obtener reporte de rentabilidad
     * @route GET /api/dashboard/reportes/rentabilidad
     */
    getRentabilidad: async (req, res) => {
        try {
            const { periodo = 'mes' } = req.query;

            let fechaInicio;
            const ahora = new Date();

            if (periodo === 'semana') {
                fechaInicio = new Date(ahora.setDate(ahora.getDate() - 7));
            } else if (periodo === 'mes') {
                fechaInicio = new Date(ahora.setMonth(ahora.getMonth() - 1));
            } else if (periodo === 'año') {
                fechaInicio = new Date(ahora.setFullYear(ahora.getFullYear() - 1));
            }

            const totalVentas = await Venta.sum('Total', {
                where: {
                    Fecha: { [Op.gte]: fechaInicio },
                    IdEstado: 1
                }
            }) || 0;

            const totalCompras = await Compra.sum('Total', {
                where: {
                    Fecha: { [Op.gte]: fechaInicio },
                    Estado: true
                }
            }) || 0;

            const totalDevoluciones = await Devolucion.sum('MontoReembolsado', {
                where: {
                    Fecha: { [Op.gte]: fechaInicio },
                    Estado: 'aprobada'
                }
            }) || 0;

            const utilidad = totalVentas - totalCompras - totalDevoluciones;
            const margen = totalVentas > 0 ? (utilidad / totalVentas) * 100 : 0;

            res.json({
                success: true,
                data: {
                    periodo,
                    totalVentas,
                    totalCompras,
                    totalDevoluciones,
                    utilidad,
                    margen: margen.toFixed(2)
                }
            });
        } catch (error) {
            console.error('❌ Error en getRentabilidad:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * Obtener KPI de ventas hoy
     * @route GET /api/dashboard/kpi/ventas-hoy
     */
    getVentasHoy: async (req, res) => {
        try {
            const hoy = new Date().setHours(0, 0, 0, 0);
            
            const cantidad = await Venta.count({
                where: {
                    Fecha: { [Op.gte]: hoy },
                    IdEstado: 1
                }
            });

            const total = await Venta.sum('Total', {
                where: {
                    Fecha: { [Op.gte]: hoy },
                    IdEstado: 1
                }
            }) || 0;

            res.json({
                success: true,
                data: {
                    cantidad,
                    total,
                    totalFormateado: new Intl.NumberFormat('es-CO', {
                        style: 'currency',
                        currency: 'COP'
                    }).format(total)
                }
            });
        } catch (error) {
            console.error('❌ Error en getVentasHoy:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * Obtener productos con bajo stock
     * @route GET /api/dashboard/kpi/productos-bajo-stock
     */
    getProductosBajoStock: async (req, res) => {
        try {
            const { umbral = 10 } = req.query;

            const productos = await Producto.findAll({
                where: { Stock: { [Op.lt]: umbral } },
                include: [{ model: Talla, as: 'Tallas' }],
                order: [['Stock', 'ASC']],
                limit: 20
            });

            const cantidad = productos.length;

            res.json({
                success: true,
                data: {
                    cantidad,
                    productos: productos.map(p => ({
                        id: p.IdProducto,
                        nombre: p.Nombre,
                        stock: p.Stock,
                        tallas: p.Tallas?.map(t => ({
                            nombre: t.Nombre,
                            cantidad: t.Cantidad
                        }))
                    }))
                }
            });
        } catch (error) {
            console.error('❌ Error en getProductosBajoStock:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * Obtener alertas del sistema
     * @route GET /api/dashboard/kpi/alertas
     */
    getAlertas: async (req, res) => {
        try {
            const stockBajo = await Producto.count({
                where: { Stock: { [Op.lt]: 10 } }
            });

            const devolucionesPendientes = await Devolucion.count({
                where: { Estado: 'pendiente' }
            });

            const ventasPendientes = await Venta.count({
                where: { IdEstado: 2 } // Pendientes
            });

            res.json({
                success: true,
                data: {
                    alertas: [
                        {
                            tipo: 'stock',
                            mensaje: `${stockBajo} productos con stock bajo`,
                            nivel: stockBajo > 0 ? 'advertencia' : 'ok',
                            cantidad: stockBajo
                        },
                        {
                            tipo: 'devoluciones',
                            mensaje: `${devolucionesPendientes} devoluciones pendientes`,
                            nivel: devolucionesPendientes > 0 ? 'info' : 'ok',
                            cantidad: devolucionesPendientes
                        },
                        {
                            tipo: 'ventas',
                            mensaje: `${ventasPendientes} ventas pendientes`,
                            nivel: ventasPendientes > 0 ? 'info' : 'ok',
                            cantidad: ventasPendientes
                        }
                    ]
                }
            });
        } catch (error) {
            console.error('❌ Error en getAlertas:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    }
};

export default dashboardController;