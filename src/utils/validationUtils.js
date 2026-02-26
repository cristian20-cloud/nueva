// src/utils/validationUtils.js
import { Op } from 'sequelize';
import Categoria from '../models/categorias.model.js';
import Producto from '../models/productos.model.js';
import Proveedor from '../models/proveedores.model.js';
import Cliente from '../models/clientes.model.js';
import Usuario from '../models/usuarios.model.js';
import Rol from '../models/roles.model.js';

// ============================================
// VALIDACIONES DE CATEGORÍAS
// ============================================

/**
 * Validar datos de categoría
 * @param {Object} data - Datos de la categoría a validar
 * @param {number|null} id - ID de la categoría (para actualización)
 * @returns {Promise<Array>} - Array de errores de validación
 */
export const validateCategoria = async (data, id = null) => {
    const errors = [];

    if (data.Nombre !== undefined) {
        if (!data.Nombre || data.Nombre.trim() === '') {
            errors.push('El nombre de la categoría no puede estar vacío');
        } else if (data.Nombre.length < 2) {
            errors.push('El nombre debe tener al menos 2 caracteres');
        } else if (data.Nombre.length > 100) {
            errors.push('El nombre no puede exceder los 100 caracteres');
        } else if (!/^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s]+$/.test(data.Nombre)) {
            errors.push('El nombre solo puede contener letras, números y espacios');
        } else {
            try {
                const whereClause = {
                    Nombre: { [Op.like]: data.Nombre.trim() }
                };
                
                if (id) {
                    whereClause.IdCategoria = { [Op.ne]: id };
                }
                
                const existingCategoria = await Categoria.findOne({ where: whereClause });
                
                if (existingCategoria) {
                    errors.push('Ya existe una categoría con ese nombre');
                }
            } catch (error) {
                console.error('Error al verificar categoría duplicada:', error);
                errors.push('Error al verificar disponibilidad del nombre');
            }
        }
    }

    if (data.Estado !== undefined && typeof data.Estado !== 'boolean') {
        errors.push('El estado debe ser un valor booleano');
    }

    return errors;
};

/**
 * Sanitizar datos de categoría
 * @param {Object} data - Datos a sanitizar
 * @returns {Object} - Datos sanitizados
 */
export const sanitizeCategoria = (data) => {
    const sanitized = {};

    if (data.Nombre !== undefined) {
        sanitized.Nombre = data.Nombre ? data.Nombre.trim().replace(/\s+/g, ' ') : '';
    }

    if (data.Estado !== undefined) {
        sanitized.Estado = data.Estado;
    }

    return sanitized;
};

// ============================================
// VALIDACIONES DE PRODUCTOS
// ============================================

/**
 * Validar datos de producto
 * @param {Object} data - Datos del producto a validar
 * @param {number|null} id - ID del producto (para actualización)
 * @returns {Promise<Array>} - Array de errores de validación
 */
export const validateProducto = async (data, id = null) => {
    const errors = [];

    if (data.Nombre !== undefined) {
        if (!data.Nombre || data.Nombre.trim() === '') {
            errors.push('El nombre del producto no puede estar vacío');
        } else if (data.Nombre.length < 3) {
            errors.push('El nombre debe tener al menos 3 caracteres');
        } else if (data.Nombre.length > 200) {
            errors.push('El nombre no puede exceder los 200 caracteres');
        } else {
            try {
                const whereClause = {
                    Nombre: { [Op.like]: data.Nombre.trim() }
                };
                
                if (id) {
                    whereClause.IdProducto = { [Op.ne]: id };
                }
                
                const existingProducto = await Producto.findOne({ where: whereClause });
                
                if (existingProducto) {
                    errors.push('Ya existe un producto con ese nombre');
                }
            } catch (error) {
                console.error('Error al verificar producto duplicado:', error);
                errors.push('Error al verificar disponibilidad del nombre');
            }
        }
    }

    if (data.Precio !== undefined) {
        if (isNaN(data.Precio)) {
            errors.push('El precio debe ser un número válido');
        } else if (data.Precio < 0) {
            errors.push('El precio no puede ser negativo');
        }
    }

    if (data.PrecioVenta !== undefined) {
        if (isNaN(data.PrecioVenta)) {
            errors.push('El precio de venta debe ser un número válido');
        } else if (data.PrecioVenta < 0) {
            errors.push('El precio de venta no puede ser negativo');
        } else if (data.Precio !== undefined && data.PrecioVenta < data.Precio) {
            errors.push('El precio de venta no puede ser menor al precio de compra');
        }
    }

    if (data.Stock !== undefined) {
        if (!Number.isInteger(Number(data.Stock))) {
            errors.push('El stock debe ser un número entero');
        } else if (Number(data.Stock) < 0) {
            errors.push('El stock no puede ser negativo');
        }
    }

    if (data.IdCategoria !== undefined) {
        if (!data.IdCategoria) {
            errors.push('Debe seleccionar una categoría');
        } else {
            try {
                const categoria = await Categoria.findByPk(data.IdCategoria);
                if (!categoria) {
                    errors.push('La categoría seleccionada no existe');
                } else if (!categoria.Estado) {
                    errors.push('La categoría seleccionada está inactiva');
                }
            } catch (error) {
                console.error('Error al verificar categoría:', error);
                errors.push('Error al verificar la categoría');
            }
        }
    }

    if (data.url !== undefined && data.url !== null && data.url !== '') {
        const urlPattern = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
        if (!urlPattern.test(data.url)) {
            errors.push('La URL de la imagen no es válida');
        }
    }

    return errors;
};

/**
 * Sanitizar datos de producto
 * @param {Object} data - Datos a sanitizar
 * @returns {Object} - Datos sanitizados
 */
export const sanitizeProducto = (data) => {
    const sanitized = {};

    const camposPermitidos = [
        'Nombre', 'Descripcion', 'Stock', 'Precio', 
        'PrecioVenta', 'IdCategoria', 'IdTallas', 'url'
    ];

    camposPermitidos.forEach(campo => {
        if (data[campo] !== undefined) {
            if (campo === 'Nombre' && data[campo]) {
                sanitized[campo] = data[campo].trim().replace(/\s+/g, ' ');
            } else if (campo === 'Descripcion' && data[campo]) {
                sanitized[campo] = data[campo].trim();
            } else if (campo === 'url' && data[campo]) {
                sanitized[campo] = data[campo].trim();
            } else if (campo === 'Stock' || campo === 'Precio' || campo === 'PrecioVenta') {
                sanitized[campo] = Number(data[campo]);
            } else {
                sanitized[campo] = data[campo];
            }
        }
    });

    return sanitized;
};

// ============================================
// VALIDACIONES DE PROVEEDORES
// ============================================

/**
 * Validar datos de proveedor
 * @param {Object} data - Datos del proveedor a validar
 * @param {number|null} id - ID del proveedor (para actualización)
 * @returns {Promise<Array>} - Array de errores de validación
 */
export const validateProveedor = async (data, id = null) => {
    const errors = [];

    if (data.Nombre !== undefined) {
        if (!data.Nombre || data.Nombre.trim() === '') {
            errors.push('El nombre de la empresa es requerido');
        } else if (data.Nombre.length < 3) {
            errors.push('El nombre debe tener al menos 3 caracteres');
        } else if (data.Nombre.length > 200) {
            errors.push('El nombre no puede exceder los 200 caracteres');
        }
    }

    if (data.TipoDocumento !== undefined) {
        const tiposValidos = ['NIT', 'CC', 'CE', 'RUT'];
        if (!tiposValidos.includes(data.TipoDocumento)) {
            errors.push('Tipo de documento no válido. Debe ser: NIT, CC, CE o RUT');
        }
    }

    if (data.NumeroDocumento !== undefined) {
        if (!data.NumeroDocumento || data.NumeroDocumento.trim() === '') {
            errors.push('El número de documento es requerido');
        } else {
            const documentoLimpio = data.NumeroDocumento.replace(/[\s-]/g, '');
            
            if (documentoLimpio.length < 5) {
                errors.push('El número de documento debe tener al menos 5 dígitos');
            } else if (documentoLimpio.length > 20) {
                errors.push('El número de documento no puede exceder los 20 dígitos');
            }
            
            if (data.TipoDocumento === 'NIT') {
                const nitPattern = /^\d{9,10}-\d{1}$|^\d{9,10}$/;
                if (!nitPattern.test(data.NumeroDocumento.replace(/\s/g, ''))) {
                    errors.push('Formato de NIT inválido. Debe ser: 123456789-1 o 123456789');
                }
            }

            try {
                const whereClause = {
                    NumeroDocumento: { [Op.like]: data.NumeroDocumento.trim() }
                };
                
                if (id) {
                    whereClause.IdProveedor = { [Op.ne]: id };
                }
                
                const existingProveedor = await Proveedor.findOne({ where: whereClause });
                
                if (existingProveedor) {
                    errors.push('Ya existe un proveedor con ese número de documento');
                }
            } catch (error) {
                console.error('Error al verificar documento duplicado:', error);
                errors.push('Error al verificar disponibilidad del documento');
            }
        }
    }

    if (data.Correo !== undefined) {
        if (!data.Correo || data.Correo.trim() === '') {
            errors.push('El correo electrónico es requerido');
        } else {
            const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailPattern.test(data.Correo)) {
                errors.push('Debe proporcionar un correo electrónico válido');
            }

            try {
                const whereClause = {
                    Correo: { [Op.like]: data.Correo.trim() }
                };
                
                if (id) {
                    whereClause.IdProveedor = { [Op.ne]: id };
                }
                
                const existingProveedor = await Proveedor.findOne({ where: whereClause });
                
                if (existingProveedor) {
                    errors.push('Ya existe un proveedor con ese correo electrónico');
                }
            } catch (error) {
                console.error('Error al verificar correo duplicado:', error);
                errors.push('Error al verificar disponibilidad del correo');
            }
        }
    }

    if (data.Telefono !== undefined && data.Telefono) {
        const telefonoLimpio = data.Telefono.replace(/[\s+()-]/g, '');
        if (telefonoLimpio.length < 7) {
            errors.push('El teléfono debe tener al menos 7 dígitos');
        } else if (telefonoLimpio.length > 15) {
            errors.push('El teléfono no puede exceder los 15 dígitos');
        }
        
        const telefonoPattern = /^(\+?57)?[0-9]{7,10}$/;
        if (!telefonoPattern.test(telefonoLimpio)) {
            errors.push('Formato de teléfono inválido. Ejemplo: +57 300 123 4567');
        }
    }

    if (data.Direccion !== undefined && data.Direccion && data.Direccion.length > 200) {
        errors.push('La dirección no puede exceder los 200 caracteres');
    }

    if (data.Estado !== undefined && typeof data.Estado !== 'boolean') {
        errors.push('El estado debe ser un valor booleano');
    }

    return errors;
};

/**
 * Sanitizar datos de proveedor
 * @param {Object} data - Datos a sanitizar
 * @returns {Object} - Datos sanitizados
 */
export const sanitizeProveedor = (data) => {
    const sanitized = {};

    const camposPermitidos = [
        'Nombre', 'TipoDocumento', 'NumeroDocumento', 
        'Telefono', 'Direccion', 'Correo', 'Estado'
    ];

    camposPermitidos.forEach(campo => {
        if (data[campo] !== undefined) {
            if (campo === 'Nombre' && data[campo]) {
                sanitized[campo] = data[campo].trim().replace(/\s+/g, ' ');
            } else if (campo === 'Correo' && data[campo]) {
                sanitized[campo] = data[campo].trim().toLowerCase();
            } else if (campo === 'NumeroDocumento' && data[campo]) {
                let documento = data[campo].trim().replace(/\s+/g, '');
                if (data.TipoDocumento === 'NIT' && !documento.includes('-')) {
                    if (documento.length >= 9) {
                        documento = documento.slice(0, -1) + '-' + documento.slice(-1);
                    }
                }
                sanitized[campo] = documento;
            } else if (campo === 'Telefono' && data[campo]) {
                sanitized[campo] = data[campo].trim().replace(/\s+/g, ' ');
            } else if (campo === 'Direccion' && data[campo]) {
                sanitized[campo] = data[campo].trim();
            } else {
                sanitized[campo] = data[campo];
            }
        }
    });

    return sanitized;
};

// ============================================
// VALIDACIONES DE CLIENTES
// ============================================

/**
 * Validar datos de cliente
 * @param {Object} data - Datos del cliente a validar
 * @param {number|null} id - ID del cliente (para actualización)
 * @returns {Promise<Array>} - Array de errores de validación
 */
export const validateCliente = async (data, id = null) => {
    const errors = [];
    
    if (data.Nombre !== undefined && (!data.Nombre || data.Nombre.length < 3)) {
        errors.push('El nombre debe tener al menos 3 caracteres');
    }
    
    if (data.Correo !== undefined) {
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(data.Correo)) {
            errors.push('Correo electrónico inválido');
        } else {
            try {
                const whereClause = {
                    Correo: { [Op.like]: data.Correo.trim() }
                };
                
                if (id) {
                    whereClause.IdCliente = { [Op.ne]: id };
                }
                
                const existingCliente = await Cliente.findOne({ where: whereClause });
                
                if (existingCliente) {
                    errors.push('Ya existe un cliente con ese correo electrónico');
                }
            } catch (error) {
                console.error('Error al verificar correo duplicado:', error);
                errors.push('Error al verificar disponibilidad del correo');
            }
        }
    }
    
    if (data.Documento !== undefined && !data.Documento) {
        errors.push('El documento es requerido');
    }
    
    return errors;
};

/**
 * Sanitizar datos de cliente
 * @param {Object} data - Datos a sanitizar
 * @returns {Object} - Datos sanitizados
 */
export const sanitizeCliente = (data) => {
    const sanitized = {};
    
    if (data.Nombre) sanitized.Nombre = data.Nombre.trim();
    if (data.Correo) sanitized.Correo = data.Correo.toLowerCase().trim();
    if (data.Documento) sanitized.Documento = data.Documento;
    if (data.Telefono) sanitized.Telefono = data.Telefono.trim();
    if (data.Direccion) sanitized.Direccion = data.Direccion.trim();
    if (data.Ciudad) sanitized.Ciudad = data.Ciudad.trim();
    if (data.Departamento) sanitized.Departamento = data.Departamento.trim();
    
    return sanitized;
};

// ============================================
// VALIDACIONES DE USUARIOS
// ============================================

/**
 * Validar datos de usuario
 * @param {Object} data - Datos del usuario a validar
 * @param {number|null} id - ID del usuario (para actualización)
 * @returns {Promise<Array>} - Array de errores de validación
 */
export const validateUsuario = async (data, id = null) => {
    const errors = [];

    if (data.Nombre !== undefined && (!data.Nombre || data.Nombre.length < 3)) {
        errors.push('El nombre debe tener al menos 3 caracteres');
    }

    if (data.Correo !== undefined) {
        if (!data.Correo) {
            errors.push('El correo es requerido');
        } else {
            const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailPattern.test(data.Correo)) {
                errors.push('Correo electrónico inválido');
            } else {
                try {
                    const whereClause = {
                        Correo: { [Op.like]: data.Correo.trim() }
                    };
                    
                    if (id) {
                        whereClause.IdUsuario = { [Op.ne]: id };
                    }
                    
                    const existingUsuario = await Usuario.findOne({ where: whereClause });
                    
                    if (existingUsuario) {
                        errors.push('Ya existe un usuario con ese correo electrónico');
                    }
                } catch (error) {
                    console.error('Error al verificar correo duplicado:', error);
                    errors.push('Error al verificar disponibilidad del correo');
                }
            }
        }
    }

    if (data.Clave !== undefined && (!data.Clave || data.Clave.length < 6)) {
        errors.push('La contraseña debe tener al menos 6 caracteres');
    }

    if (data.IdRol !== undefined) {
        try {
            const rol = await Rol.findByPk(data.IdRol);
            if (!rol) {
                errors.push('El rol seleccionado no existe');
            }
        } catch (error) {
            console.error('Error al verificar rol:', error);
            errors.push('Error al verificar el rol');
        }
    }

    return errors;
};

/**
 * Sanitizar datos de usuario
 * @param {Object} data - Datos a sanitizar
 * @returns {Object} - Datos sanitizados
 */
export const sanitizeUsuario = (data) => {
    const sanitized = {};
    
    if (data.Nombre) sanitized.Nombre = data.Nombre.trim();
    if (data.Correo) sanitized.Correo = data.Correo.toLowerCase().trim();
    if (data.IdRol) sanitized.IdRol = data.IdRol;
    if (data.Estado !== undefined) sanitized.Estado = data.Estado;
    
    return sanitized;
};

/**
 * Validar login
 * @param {Object} data - Datos de login
 * @returns {Array} - Array de errores de validación
 */
export const validateLogin = (data) => {
    const errors = [];

    if (!data.correo || data.correo.trim() === '') {
        errors.push('El correo es requerido');
    }

    if (!data.clave || data.clave.trim() === '') {
        errors.push('La contraseña es requerida');
    }

    return errors;
};

/**
 * Validar cambio de contraseña
 * @param {Object} data - Datos de cambio de contraseña
 * @returns {Array} - Array de errores de validación
 */
export const validateCambioClave = (data) => {
    const errors = [];

    if (!data.claveActual || data.claveActual.trim() === '') {
        errors.push('Debe proporcionar la contraseña actual');
    }

    if (!data.claveNueva || data.claveNueva.trim() === '') {
        errors.push('Debe proporcionar la nueva contraseña');
    } else if (data.claveNueva.length < 6) {
        errors.push('La nueva contraseña debe tener al menos 6 caracteres');
    }

    return errors;
};

// ============================================
// VALIDACIONES DE ROLES
// ============================================

/**
 * Validar datos de rol
 * @param {Object} data - Datos del rol a validar
 * @param {number|null} id - ID del rol (para actualización)
 * @returns {Promise<Array>} - Array de errores de validación
 */
export const validateRol = async (data, id = null) => {
    const errors = [];

    if (data.Nombre !== undefined && (!data.Nombre || data.Nombre.trim() === '')) {
        errors.push('El nombre del rol es requerido');
    }

    return errors;
};

// ============================================
// VALIDACIONES DE DEVOLUCIONES
// ============================================

/**
 * Validar datos de devolución
 * @param {Object} data - Datos de la devolución a validar
 * @returns {Array} - Array de errores de validación
 */
export const validateDevolucion = (data) => {
    const errors = [];

    if (!data.IdVenta) {
        errors.push('Debe especificar la venta original');
    }

    if (!data.IdProducto) {
        errors.push('Debe especificar el producto a devolver');
    }

    if (!data.Cantidad) {
        errors.push('Debe especificar la cantidad a devolver');
    } else if (data.Cantidad <= 0) {
        errors.push('La cantidad debe ser mayor a 0');
    }

    if (!data.Motivo || data.Motivo.trim() === '') {
        errors.push('Debe proporcionar un motivo de devolución');
    } else if (data.Motivo.length < 5) {
        errors.push('El motivo debe tener al menos 5 caracteres');
    } else if (data.Motivo.length > 500) {
        errors.push('El motivo no puede exceder los 500 caracteres');
    }

    return errors;
};

// ============================================
// VALIDACIONES DE COMPRAS
// ============================================

/**
 * Validar datos de compra
 * @param {Object} data - Datos de la compra a validar
 * @returns {Array} - Array de errores de validación
 */
export const validateCompra = (data) => {
    const errors = [];

    if (!data.IdProveedor) {
        errors.push('Debe seleccionar un proveedor');
    }

    if (!data.productos || !Array.isArray(data.productos) || data.productos.length === 0) {
        errors.push('Debe incluir al menos un producto');
    }

    return errors;
};

/**
 * Validar detalle de compra
 * @param {Object} detalle - Detalle a validar
 * @returns {Array} - Array de errores de validación
 */
export const validateDetalleCompra = (detalle) => {
    const errors = [];

    if (!detalle.IdProducto) {
        errors.push('Debe seleccionar un producto');
    }

    if (!detalle.Cantidad || detalle.Cantidad <= 0) {
        errors.push('La cantidad debe ser mayor a 0');
    }

    if (!detalle.Precio || detalle.Precio <= 0) {
        errors.push('El precio debe ser mayor a 0');
    }

    return errors;
};

// ============================================
// VALIDACIONES DE VENTAS
// ============================================

/**
 * Validar datos de venta
 * @param {Object} data - Datos de la venta a validar
 * @returns {Array} - Array de errores de validación
 */
export const validateVenta = (data) => {
    const errors = [];

    if (!data.IdCliente) {
        errors.push('Debe seleccionar un cliente');
    }

    if (!data.productos || !Array.isArray(data.productos) || data.productos.length === 0) {
        errors.push('Debe incluir al menos un producto');
    }

    return errors;
};

/**
 * Validar detalle de venta
 * @param {Object} detalle - Detalle a validar
 * @returns {Array} - Array de errores de validación
 */
export const validateDetalleVenta = (detalle) => {
    const errors = [];

    if (!detalle.IdProducto) {
        errors.push('Debe seleccionar un producto');
    }

    if (!detalle.Cantidad || detalle.Cantidad <= 0) {
        errors.push('La cantidad debe ser mayor a 0');
    }

    return errors;
};