// controllers/ordenesCompraController.js
class OrdenesCompraController {
    constructor(db) {
      this.db = db;
    }
  
    // Crear una nueva orden de compra
    async crearOrdenCompra(req, res) {
      const connection = await this.db.getConnection();
      try {
        await connection.beginTransaction();
  
        const { proveedor_id, productos, notas } = req.body;
  
        // 1. Validaciones básicas
        if (!proveedor_id || !productos || !Array.isArray(productos) || productos.length === 0) {
          await connection.rollback();
          return res.status(400).json({ error: 'Se requiere proveedor_id y una lista de productos.' });
        }
  
        const numero_orden = `OC-${Date.now()}`;
        // 2. Insertar la cabecera de la orden de compra
        const [ordenResult] = await connection.execute(
          'INSERT INTO ordenes_compra (numero_orden, proveedor_id, estado, notas) VALUES (?, ?, ?, ?)',
          [numero_orden, proveedor_id, 'pendiente', notas]
        );
        const ordenId = ordenResult.insertId;
  
        let totalOrden = 0;
  
        // 3. Insertar los detalles de la orden
        for (const item of productos) {
          const { producto_id, cantidad, precio_unitario } = item;
          if (!producto_id || !cantidad || !precio_unitario) {
            await connection.rollback();
            return res.status(400).json({ error: 'Cada producto debe tener producto_id, cantidad y precio_unitario.' });
          }
  
          // Verificar que el producto existe
          const [producto] = await connection.execute('SELECT id FROM productos WHERE id = ?', [producto_id]);
          if (producto.length === 0) {
            throw new Error(`El producto con ID ${producto_id} no existe.`);
          }
  
          await connection.execute(
            'INSERT INTO detalle_ordenes_compra (orden_compra_id, producto_id, cantidad_solicitada, precio_unitario) VALUES (?, ?, ?, ?)',
            [ordenId, producto_id, cantidad, precio_unitario]
          );
  
          totalOrden += cantidad * precio_unitario;
        }
  
        // 4. Actualizar el total en la orden de compra
        await connection.execute(
          'UPDATE ordenes_compra SET total = ? WHERE id = ?',
          [totalOrden, ordenId]
        );
  
        await connection.commit();
  
        res.status(201).json({
          message: 'Orden de compra creada exitosamente',
          orden_id: ordenId,
          total: totalOrden
        });
  
      } catch (error) {
        await connection.rollback();
        console.error('Error al crear la orden de compra:', error);
        res.status(500).json({ error: 'Error interno del servidor', details: error.message });
      } finally {
        if (connection) connection.release();
      }
    }
}
  
module.exports = OrdenesCompraController;