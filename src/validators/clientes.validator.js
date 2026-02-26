// utils/validators/clientes.validator.js
const { Op } = require('sequelize');
const Cliente = require('../../models/Clientes');

/**
 * Validador específico para clientes
 */

const validateClienteData = async (data, id = null) => {
    const errors = [];

    // Validar Tipo de Documento
    if (data.TipoDocumento !== undefined) {
        const tiposValidos = [1, 2, 3, 4];
        if (!tiposValidos.includes(Number(data.TipoDocumento))) {
            errors.push('Tipo de documento no válido');
        }
    }

    // Validar Documento
    if (data.Documento !== undefined) {
        if (!data.Documento) {
            errors.push('El número de documento es requerido');
        } else {
            const whereClause = { Documento: data.Documento };
            if (id) whereClause.IdCliente = { [Op.ne]: id };
            
            const existe = await Cliente.findOne({ where: whereClause });
            if (existe) errors.push('Ya existe un cliente con ese documento');
        }
    }

    // Validar Nombre
    if (data.Nombre !== undefined && (!data.Nombre || data.Nombre.length < 3)) {
        errors.push('El nombre debe tener al menos 3 caracteres');
    }

    // Validar Correo
    if (data.Correo !== undefined) {
        if (!data.Correo) {
            errors.push('El correo es requerido');
        } else {
            const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailPattern.test(data.Correo)) {
                errors.push('Correo electrónico inválido');
            }
        }
    }

    return errors;
};

const sanitizeClienteData = (data) => {
    const sanitized = {};
    
    if (data.Nombre) sanitized.Nombre = data.Nombre.trim().replace(/\s+/g, ' ');
    if (data.Correo) sanitized.Correo = data.Correo.toLowerCase().trim();
    if (data.Telefono) sanitized.Telefono = data.Telefono.trim();
    if (data.Departamento) sanitized.Departamento = data.Departamento.trim();
    if (data.Ciudad) sanitized.Ciudad = data.Ciudad.trim();
    if (data.Direccion) sanitized.Direccion = data.Direccion.trim();
    if (data.Documento) sanitized.Documento = Number(data.Documento);
    if (data.TipoDocumento) sanitized.TipoDocumento = Number(data.TipoDocumento);
    
    return sanitized;
};

module.exports = {
    validateClienteData,
    sanitizeClienteData
};