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
     * Obtener estadísticas completas para el dashboard
     * @route GET /api/dashboard
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
    }
};

export default dashboardController;