// utils/jwt.js
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'tu_secreto_super_secreto';
const JWT_EXPIRES = process.env.JWT_EXPIRES || '7d';

/**
 * Generar token JWT
 * @param {Object} payload - Datos a incluir en el token
 * @returns {string} - Token generado
 */
export const generateToken = (payload) => {
    try {
        return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });
    } catch (error) {
        console.error('❌ Error al generar token:', error);
        throw new Error('Error al generar token');
    }
};

/**
 * Verificar token JWT
 * @param {string} token - Token a verificar
 * @returns {Object} - Payload decodificado
 */
export const verifyToken = (token) => {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (error) {
        console.error('❌ Error al verificar token:', error);
        throw new Error('Token inválido o expirado');
    }
};

/**
 * Decodificar token sin verificar
 * @param {string} token - Token a decodificar
 * @returns {Object} - Payload decodificado
 */
export const decodeToken = (token) => {
    try {
        return jwt.decode(token);
    } catch (error) {
        console.error('❌ Error al decodificar token:', error);
        return null;
    }
};