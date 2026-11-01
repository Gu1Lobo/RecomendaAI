const jwt = require('jsonwebtoken');
require('dotenv').config();

// Protege rotas: exige um token JWT válido no header
// "Authorization: Bearer <token>". Se válido, injeta req.userId.
function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
        return res.status(401).json({ error: 'Token não fornecido.' });
    }

    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = payload.userId;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Token inválido ou expirado.' });
    }
}

module.exports = { requireAuth };
