// reports/inventoryReports.js
class InventoryReports {
    constructor(db) {
      this.db = db;
    }
  
    // Reporte de productos con stock bajo
    async productosStockBajo() {
      const sql = `
        SELECT
          p.id, p.codigo, p.nombre,
          p.stock_actual, p.stock_minimo,
          (p.stock_minimo - p.stock_actual) AS unidades_faltantes,
          c.nombre AS categoria,
          pr.nombre AS proveedor,
          pr.email AS contacto_proveedor
        FROM productos p
        LEFT JOIN categorias c ON p.categoria_id = c.id
        LEFT JOIN proveedores pr ON p.proveedor_id = pr.id
        WHERE p.activo = 1
          AND p.stock_actual <= p.stock_minimo
        ORDER BY (p.stock_minimo - p.stock_actual) DESC
      `;
  
      const [productos] = await this.db.execute(sql);
      return productos;
    }
  
    // Reporte de rotación de inventario
    async rotacionInventario(meses = 6) {
      const sql = `
        SELECT
          p.nombre AS producto,
          p.stock_actual,
          COALESCE(ventas.total_vendido, 0) AS vendido_periodo,
          ROUND(
            COALESCE(ventas.total_vendido, 0) /
            GREATEST(p.stock_actual + COALESCE(ventas.total_vendido, 0), 1)
          , 2) AS tasa_rotacion,
          CASE
            WHEN COALESCE(ventas.total_vendido, 0) = 0 THEN 'Sin rotación'
            WHEN COALESCE(ventas.total_vendido, 0) / GREATEST(p.stock_actual + COALESCE(ventas.total_vendido, 0), 1) < 0.1 THEN 'Baja'
            WHEN COALESCE(ventas.total_vendido, 0) / GREATEST(p.stock_actual + COALESCE(ventas.total_vendido, 0), 1) < 0.3 THEN 'Media'
            ELSE 'Alta'
          END AS nivel_rotacion
        FROM productos p
        LEFT JOIN (
          SELECT
            mi.producto_id,
            SUM(ABS(mi.cantidad)) AS total_vendido
          FROM movimientos_inventario mi
          JOIN tipos_movimiento tm ON mi.tipo_movimiento_id = tm.id
          WHERE tm.tipo = 'salida'
            AND mi.fecha_movimiento >= DATE_SUB(CURRENT_DATE, INTERVAL ? MONTH)
          GROUP BY mi.producto_id
        ) ventas ON p.id = ventas.producto_id
        WHERE p.activo = 1
        ORDER BY tasa_rotacion DESC
      `;
  
      const [reporte] = await this.db.execute(sql, [meses]);
      return reporte;
    }
  
    // Reporte de valor del inventario
    async valorInventario() {
      const sql = `
        SELECT
          'Total Inventario' AS concepto,
          SUM(p.stock_actual * p.precio_compra) AS valor_compra,
          SUM(p.stock_actual * p.precio_venta) AS valor_venta,
          SUM((p.precio_venta - p.precio_compra) * p.stock_actual) AS ganancia_potencial
        FROM productos p
        WHERE p.activo = 1
  
        UNION ALL
  
        SELECT
          CONCAT('Por Categoría: ', c.nombre) AS concepto,
          SUM(p.stock_actual * p.precio_compra) AS valor_compra,
          SUM(p.stock_actual * p.precio_venta) AS valor_venta,
          SUM((p.precio_venta - p.precio_compra) * p.stock_actual) AS ganancia_potencial
        FROM productos p
        JOIN categorias c ON p.categoria_id = c.id
        WHERE p.activo = 1
        GROUP BY c.id, c.nombre
  
        UNION ALL
  
        SELECT
          CONCAT('Por Proveedor: ', pr.nombre) AS concepto,
          SUM(p.stock_actual * p.precio_compra) AS valor_compra,
          SUM(p.stock_actual * p.precio_venta) AS valor_venta,
          SUM((p.precio_venta - p.precio_compra) * p.stock_actual) AS ganancia_potencial
        FROM productos p
        JOIN proveedores pr ON p.proveedor_id = pr.id
        WHERE p.activo = 1
        GROUP BY pr.id, pr.nombre
      `;
  
      const [reporte] = await this.db.execute(sql);
      return reporte;
    }
  
    // Reporte de movimientos por período
    async movimientosPorPeriodo(fechaInicio, fechaFin) {
      const sql = `
        SELECT
          DATE(mi.fecha_movimiento) AS fecha,
          tm.nombre AS tipo_movimiento,
          tm.tipo,
          COUNT(*) AS cantidad_movimientos,
          SUM(ABS(mi.cantidad)) AS total_unidades,
          GROUP_CONCAT(DISTINCT p.nombre) AS productos_afectados
        FROM movimientos_inventario mi
        JOIN tipos_movimiento tm ON mi.tipo_movimiento_id = tm.id
        JOIN productos p ON mi.producto_id = p.id
        WHERE mi.fecha_movimiento BETWEEN ? AND ?
        GROUP BY DATE(mi.fecha_movimiento), tm.id, tm.nombre, tm.tipo
        ORDER BY fecha DESC, cantidad_movimientos DESC
      `;
  
      const [reporte] = await this.db.execute(sql, [fechaInicio, fechaFin]);
      return reporte;
    }
  
    // Análisis ABC de productos
    async analisisABC() {
      const sql = `
        WITH ventas_productos AS (
          SELECT
            p.id, p.nombre, p.stock_actual,
            COALESCE(SUM(ABS(mi.cantidad)), 0) AS unidades_vendidas,
            COALESCE(SUM(ABS(mi.cantidad) * p.precio_venta), 0) AS valor_vendido
          FROM productos p
          LEFT JOIN movimientos_inventario mi ON p.id = mi.producto_id
          LEFT JOIN tipos_movimiento tm ON mi.tipo_movimiento_id = tm.id
          WHERE p.activo = 1 AND (tm.tipo = 'salida' OR tm.id IS NULL)
          GROUP BY p.id, p.nombre, p.stock_actual
        ),
        ranking AS (
          SELECT *,
            ROW_NUMBER() OVER (ORDER BY valor_vendido DESC) AS ranking,
            SUM(valor_vendido) OVER () AS total_valor
          FROM ventas_productos
        )
        SELECT
          nombre,
          unidades_vendidas,
          valor_vendido,
          ROUND((valor_vendido / total_valor) * 100, 2) AS porcentaje_valor,
          CASE
            WHEN SUM(porcentaje_valor) OVER (ORDER BY valor_vendido DESC) <= 80 THEN 'A'
            WHEN SUM(porcentaje_valor) OVER (ORDER BY valor_vendido DESC) <= 95 THEN 'B'
            ELSE 'C'
          END AS clasificacion_abc
        FROM ranking
        ORDER BY valor_vendido DESC
      `;
  
      const [analisis] = await this.db.execute(sql);
      return analisis;
    }
  }
  
  module.exports = InventoryReports;