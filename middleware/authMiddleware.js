// Por seguridad, esta clave debería estar en una variable de entorno (process.env.API_KEY)
const API_KEY = 'clave-secreta-para-sistemas-externos';

const apiKeyAuth = (req, res, next) => {
    const apiKey = req.headers['x-api-key'];

    if (!apiKey) {
        return res.status(401).json({ message: 'Acceso no autorizado: Falta la API Key.' });
    }

    if (apiKey !== API_KEY) {
        return res.status(403).json({ message: 'Acceso prohibido: API Key incorrecta.' });
    }

    next();
};

module.exports = apiKeyAuth;
