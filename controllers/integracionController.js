class IntegracionController {
    constructor(integracionService) {
        this.integracionService = integracionService;
    }

    /**
     * @swagger
     * /api/integracion/productos:
     *   get:
     *     summary: Obtiene la lista de productos (Endpoint no implementado).
     *     tags: [Integracion]
     *     responses:
     *       501:
     *         description: Endpoint no implementado.
     */
    async getAllProducts(req, res) {
        try {
            // Lógica para obtener productos (a implementar en el servicio)
            res.status(501).json({ message: 'Endpoint no implementado aún.' });
        } catch (error) {
            res.status(500).json({ message: 'Error en el servidor', error: error.message });
        }
    }

    /**
     * @swagger
     * /api/integracion/productos/stock:
     *   put:
     *     summary: Actualiza el stock de uno o más productos.
     *     tags: [Integracion]
     *     security:
     *       - ApiKeyAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               productos:
     *                 type: array
     *                 items:
     *                   type: object
     *                   properties:
     *                     codigo:
     *                       type: string
     *                       description: Código único del producto.
     *                     stock_nuevo:
     *                       type: integer
     *                       description: La nueva cantidad total de stock.
     *             example:
     *               productos:
     *                 - codigo: "PROD001"
     *                   stock_nuevo: 150
     *                 - codigo: "PROD002"
     *                   stock_nuevo: 80
     *     responses:
     *       200:
     *         description: Stock actualizado correctamente.
     *       400:
     *         description: Datos de entrada inválidos.
     *       500:
     *         description: Error en el servidor.
     */
    async updateStock(req, res) {
        try {
            const { productos } = req.body;

            if (!productos || !Array.isArray(productos)) {
                return res.status(400).json({ message: 'El cuerpo de la petición debe contener un array de "productos".' });
            }

            const resultado = await this.integracionService.updateStock(productos);
            res.status(200).json(resultado);

        } catch (error) {
            // El servicio ya loguea el error, aquí solo respondemos al cliente.
            res.status(500).json({ message: 'Error al actualizar el stock', error: error.message });
        }
    }
}

module.exports = IntegracionController;
