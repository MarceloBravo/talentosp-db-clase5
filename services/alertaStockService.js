// services/alertaStockService.js
const { sendEmail } = require('./emailService');

async function verificarYNotificarStockBajo(db, productoId) {
  try {
    // 1. Obtener la información del producto y su umbral de stock mínimo
    const [productos] = await db.execute(
      'SELECT nombre, codigo, stock_actual, stock_minimo FROM productos WHERE id = ?',
      [productoId]
    );

    if (productos.length === 0) {
      console.warn(`Alerta de stock: Producto con ID ${productoId} no encontrado.`);
      return;
    }

    const producto = productos[0];

    // 2. Comprobar si el stock actual está por debajo del mínimo
    if (producto.stock_actual <= producto.stock_minimo) {
      console.log(`ALERTA: Stock bajo para el producto '${producto.nombre}' (ID: ${productoId}). Stock actual: ${producto.stock_actual}, Mínimo: ${producto.stock_minimo}`);

      // 3. Preparar y enviar el correo electrónico
      const subject = `Alerta de Stock Bajo: ${producto.nombre}`;
      const text = `
        ¡Atención!
        El producto '${producto.nombre}' (Código: ${producto.codigo}) ha alcanzado un nivel de stock bajo.
        
        - Stock Actual: ${producto.stock_actual} unidades.
        - Stock Mínimo: ${producto.stock_minimo} unidades.
        
        Por favor, considere realizar una nueva orden de compra.
      `;
      const html = `
        <h1>¡Atención! Alerta de Stock Bajo</h1>
        <p>El producto <strong>${producto.nombre}</strong> (Código: <em>${producto.codigo}</em>) ha alcanzado un nivel de stock bajo.</p>
        <ul>
          <li><strong>Stock Actual:</strong> ${producto.stock_actual} unidades.</li>
          <li><strong>Stock Mínimo:</strong> ${producto.stock_minimo} unidades.</li>
        </ul>
        <p>Por favor, considere realizar una nueva orden de compra.</p>
      `;

      await sendEmail({ subject, text, html });
    }
  } catch (error) {
    console.error(`Error en el servicio de alerta de stock para el producto ID ${productoId}:`, error);
    // No lanzamos el error para no interrumpir la operación principal (ej: actualización de stock)
  }
}

module.exports = { verificarYNotificarStockBajo };
