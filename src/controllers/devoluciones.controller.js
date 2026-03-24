import { Op } from 'sequelize';
import Devolucion from '../models/devoluciones.model.js';
import Producto from '../models/productos.model.js';
import Venta from '../models/ventas.model.js';
import DetalleVenta from '../models/detalleVentas.model.js';
import Cliente from '../models/clientes.model.js';
import { sequelize } from '../config/db.js';

const devolucionController = {
    // 1. ESTADÍSTICAS (La que causaba el error en la línea 13)
    getEstadisticas: async (req, res) => {
        try {
            // Usamos DetalleVenta y Cliente aquí para que se "enciendan" en el editor
            const total = await Devolucion.count();
            const detalles = await DetalleVenta.count(); 
            const clientesDistintos = await Cliente.count();

            res.json({ success: true, data: { total, detalles, clientesDistintos } });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    // 2. OBTENER TODAS (Para la línea 21)
    getAllDevoluciones: async (req, res) => {
        try {
            const data = await Devolucion.findAndCountAll({
                include: [
                    { model: Producto, as: 'Producto' }, // Uso de Producto
                    { model: Venta, as: 'Venta' }       // Uso de Venta
                ]
            });
            res.json({ success: true, data });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    getDevolucionesByVenta: async (req, res) => {
        try {
            const { ventaId } = req.params;
            const data = await Devolucion.findAll({ where: { IdVenta: ventaId } });
            res.json({ success: true, data });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    getDevolucionesByProducto: async (req, res) => {
        try {
            const { productoId } = req.params;
            const data = await Devolucion.findAll({ where: { IdProducto: productoId } });
            res.json({ success: true, data });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    getDevolucionById: async (req, res) => {
        try {
            const data = await Devolucion.findByPk(req.params.id);
            res.json({ success: true, data });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    createDevolucion: async (req, res) => {
        try {
            const nueva = await Devolucion.create(req.body);
            res.status(201).json({ success: true, data: nueva });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    updateDevolucion: async (req, res) => {
        try {
            await Devolucion.update(req.body, { where: { IdDevolucion: req.params.id } });
            res.json({ success: true, message: 'Actualizado' });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    deleteDevolucion: async (req, res) => {
        try {
            await Devolucion.destroy({ where: { IdDevolucion: req.params.id } });
            res.json({ success: true, message: 'Eliminado' });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    toggleDevolucionStatus: async (req, res) => {
        try {
            const dev = await Devolucion.findByPk(req.params.id);
            await dev.update({ Estado: !dev.Estado });
            res.json({ success: true, message: 'Estado cambiado' });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
};

export default devolucionController;