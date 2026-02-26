// utils/hash.js
const bcrypt = require('bcryptjs');

/**
 * Utilidades para hash de contraseñas
 */

const saltRounds = 10;

/**
 * Encriptar contraseña
 * @param {string} password - Contraseña en texto plano
 * @returns {Promise<string>} - Contraseña encriptada
 */
const hashPassword = async (password) => {
    try {
        const salt = await bcrypt.genSalt(saltRounds);
        const hash = await bcrypt.hash(password, salt);
        return hash;
    } catch (error) {
        console.error('❌ Error al encriptar contraseña:', error);
        throw new Error('Error al encriptar contraseña');
    }
};

/**
 * Comparar contraseña con hash
 * @param {string} password - Contraseña en texto plano
 * @param {string} hash - Hash almacenado
 * @returns {Promise<boolean>} - true si coinciden
 */
const comparePassword = async (password, hash) => {
    try {
        return await bcrypt.compare(password, hash);
    } catch (error) {
        console.error('❌ Error al comparar contraseñas:', error);
        throw new Error('Error al comparar contraseñas');
    }
};

module.exports = {
    hashPassword,
    comparePassword
};