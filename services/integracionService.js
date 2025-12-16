// services/integracionService.js

class IntegracionService {
    constructor(dbPool) {
        this.pool = dbPool;
    }

    /**
     * Actualiza el stock de múltiples productos en una única transacción.
     * @param {Array<Object>} productos - Un array de objetos, donde cada objeto contiene `codigo` y `stock_nuevo`.
     * @returns {Object} - Resultado de la operación.
     */
    async updateStock(productos) {
        if (!Array.isArray(productos) || productos.length === 0) {
            throw new Error('La entrada debe ser un array de productos no vacío.');
        }

        const connection = await this.pool.getConnection();
        await connection.beginTransaction();

        try {
            let actualizados = 0;
            const TIPO_MOVIMIENTO_AJUSTE_INTEGRACION = 4; // Corresponde a 'Ajuste inventario'

            for (const producto of productos) {
                const { codigo, stock_nuevo } = producto;

                if (!codigo || stock_nuevo === undefined || isNaN(parseInt(stock_nuevo))) {
                    throw new Error(`Datos de producto inválidos: ${JSON.stringify(producto)}`);
                }

                // 1. Obtener el producto y su stock anterior
                const [rows] = await connection.execute(
                    'SELECT id, stock_actual FROM productos WHERE codigo = ?',
                    [codigo]
                );

                if (rows.length === 0) {
                    // Si el producto no existe, se podría crear o lanzar un error.
                    // Por ahora, lanzamos un error para ser estrictos.
                    throw new Error(`El producto con código '${codigo}' no existe.`);
                }

                const productoEncontrado = rows[0];
                const stockAnterior = productoEncontrado.stock_actual;
                const productoId = productoEncontrado.id;
                const cantidadMovimiento = stock_nuevo - stockAnterior;

                // 2. Actualizar el stock en la tabla de productos
                const [updateResult] = await connection.execute(
                    'UPDATE productos SET stock_actual = ? WHERE id = ?',
                    [stock_nuevo, productoId]
                );
                
                if (updateResult.affectedRows === 0) {
                     // Esto no debería ocurrir si el select funcionó, pero es una buena práctica de consistencia.
                    throw new Error(`No se pudo actualizar el producto con código '${codigo}'.`);
                }

                // 3. Registrar el movimiento en el inventario
                await connection.execute(
                    `INSERT INTO movimientos_inventario 
                        (producto_id, tipo_movimiento_id, cantidad, stock_anterior, stock_nuevo, referencia) 
                     VALUES (?, ?, ?, ?, ?, ?)`,
                    [productoId, TIPO_MOVIMIENTO_AJUSTE_INTEGRACION, cantidadMovimiento, stockAnterior, stock_nuevo, 'Integración Externa']
                );
                
                actualizados++;
            }

            await connection.commit();
            return {
                message: `Operación completada con éxito.`,
                productos_actualizados: actualizados
            };

        } catch (error) {
            await connection.rollback();
            console.error('Error en la transacción de actualización de stock:', error.message);
            // Re-lanzamos el error para que el controlador lo capture
            throw error;
        } finally {
            connection.release();
        }
    }
}

module.exports = IntegracionService;
