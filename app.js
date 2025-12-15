// app.js - API principal del sistema de inventario
const express = require('express');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const ProductosController = require('./controllers/productosController');

dotenv.config();

const app = express();
app.use(express.json());

// Configuración de base de datos
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'sistema_inventario',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// Crear pool de conexiones
const pool = mysql.createPool(dbConfig);

// Inicializar controladores
const productosController = new ProductosController(pool);

// Middleware de logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Rutas de productos
app.get('/api/productos', productosController.listarProductos.bind(productosController));
app.get('/api/productos/:id', productosController.obtenerProducto.bind(productosController));
app.post('/api/productos', productosController.crearProducto.bind(productosController));
app.patch('/api/productos/:id/stock', productosController.actualizarStock.bind(productosController));

// Ruta de dashboard/reportes
app.get('/api/dashboard', async (req, res) => {
  try {
    // Estadísticas generales
    const [stats] = await pool.execute(`
      SELECT
        COUNT(CASE WHEN activo = 1 THEN 1 END) AS productos_activos,
        COUNT(CASE WHEN stock_actual <= stock_minimo THEN 1 END) AS productos_stock_bajo,
        SUM(stock_actual * precio_compra) AS valor_inventario_compra,
        SUM(stock_actual * precio_venta) AS valor_inventario_venta
      FROM productos
      WHERE activo = 1
    `);

    // Movimientos recientes
    const movimientos = await pool.execute(`
      SELECT
        mi.fecha_movimiento,
        p.nombre AS producto,
        mi.cantidad,
        tm.nombre AS tipo_movimiento,
        mi.referencia
      FROM movimientos_inventario mi
      JOIN productos p ON mi.producto_id = p.id
      JOIN tipos_movimiento tm ON mi.tipo_movimiento_id = tm.id
      ORDER BY mi.fecha_movimiento DESC
      LIMIT 10
    `);

    // Productos más vendidos (basado en movimientos de salida)
    const productosTop = await pool.execute(`
      SELECT
        p.nombre,
        SUM(ABS(mi.cantidad)) AS cantidad_movida,
        COUNT(*) AS movimientos
      FROM movimientos_inventario mi
      JOIN productos p ON mi.producto_id = p.id
      JOIN tipos_movimiento tm ON mi.tipo_movimiento_id = tm.id
      WHERE tm.tipo = 'salida' AND mi.fecha_movimiento >= DATE_SUB(CURRENT_DATE, INTERVAL 30 DAY)
      GROUP BY p.id, p.nombre
      ORDER BY cantidad_movida DESC
      LIMIT 5
    `);

    res.json({
      estadisticas: stats[0],
      movimientos_recientes: movimientos[0],
      productos_top: productosTop[0]
    });

  } catch (error) {
    console.error('Error obteniendo dashboard:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Ruta de categorías
app.get('/api/categorias', async (req, res) => {
  try {
    const categorias = await pool.execute(`
      SELECT
        c.id, c.nombre, c.descripcion,
        COUNT(p.id) AS productos_count,
        SUM(p.stock_actual) AS stock_total
      FROM categorias c
      LEFT JOIN productos p ON c.id = p.categoria_id AND p.activo = 1
      WHERE c.activa = 1
      GROUP BY c.id, c.nombre, c.descripcion
      ORDER BY c.nombre
    `);

    res.json({ categorias: categorias[0] });

  } catch (error) {
    console.error('Error obteniendo categorías:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Ruta de proveedores
app.get('/api/proveedores', async (req, res) => {
  try {
    const proveedores = await pool.execute(`
      SELECT
        pr.id, pr.nombre, pr.contacto, pr.email, pr.telefono,
        COUNT(p.id) AS productos_suministrados,
        AVG(p.precio_compra) AS precio_promedio_compra
      FROM proveedores pr
      LEFT JOIN productos p ON pr.id = p.proveedor_id AND p.activo = 1
      WHERE pr.activo = 1
      GROUP BY pr.id, pr.nombre, pr.contacto, pr.email, pr.telefono
      ORDER BY pr.nombre
    `);

    res.json({ proveedores: proveedores[0] });

  } catch (error) {
    console.error('Error obteniendo proveedores:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Middleware de error
app.use((error, req, res, next) => {
  console.error('Error no manejado:', error);
  res.status(500).json({
    error: 'Error interno del servidor',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
});

// 404
app.use((req, res) => {
  res.status(404).json({
    error: 'Ruta no encontrada',
    metodo: req.method,
    ruta: req.url
  });
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Sistema de Inventario ejecutándose en http://localhost:${PORT}`);
  console.log(`📊 Dashboard disponible en http://localhost:${PORT}/api/dashboard`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n👋 Cerrando conexiones...');
  await pool.end();
  console.log('✅ Servidor cerrado correctamente');
  process.exit(0);
});