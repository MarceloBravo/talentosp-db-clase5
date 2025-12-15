// init-inventory-system.js - Inicialización completa del sistema
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const InventoryReports = require('./reports/inventoryReports');

async function inicializarSistemaInventario() {
  let connection;

  try {
    console.log('🚀 Inicializando Sistema de Inventario...\n');

    // Conectar a MySQL
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      multipleStatements: true
    });

    // Crear base de datos
    await connection.execute('CREATE DATABASE IF NOT EXISTS sistema_inventario');
    await connection.execute('USE sistema_inventario');

    // Leer y ejecutar esquema
    const schemaPath = path.join(__dirname, 'schema-inventario.sql');
    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
    await connection.execute(schemaSQL);

    console.log('✅ Base de datos creada');

    // Insertar datos de ejemplo
    console.log('📝 Insertando datos de ejemplo...');

    // Más productos
    const productosAdicionales = [
      ['LIB001', 'JavaScript Avanzado', 'Libro sobre JavaScript moderno', 25.00, 45.99, 12, 3, 50, 5, 2],
      ['ALI001', 'Café Gourmet Premium', 'Café 100% arábica', 8.50, 16.99, 200, 20, 500, 6, 3],
      ['ELE004', 'Smartphone Android', 'Smartphone de gama media', 150.00, 299.99, 8, 2, 30, 1, 1],
      ['ROP002', 'Jeans Clásico', 'Jeans azul denim', 20.00, 39.99, 45, 5, 100, 2, 2],
      ['DEP002', 'Raqueta Tenis', 'Raqueta profesional carbono', 80.00, 159.99, 6, 1, 20, 4, 2]
    ];

    for (const producto of productosAdicionales) {
      await connection.execute(`
        INSERT INTO productos
        (codigo, nombre, descripcion, precio_compra, precio_venta, stock_actual, stock_minimo, stock_maximo, categoria_id, proveedor_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, producto);
    }

    // Simular movimientos de inventario
    const movimientos = [
      // Ventas
      [1, 2, -2, 5, 3, 'VENTA-001', 'Venta online'],     // Laptop
      [2, 2, -5, 25, 20, 'VENTA-002', 'Venta tienda'],   // Mouse
      [3, 2, -10, 100, 90, 'VENTA-003', 'Venta mayorista'], // Camisetas

      // Compras
      [1, 1, 3, 3, 6, 'COMPRA-004', 'Reposición stock'],  // Laptop
      [4, 1, 5, 15, 20, 'COMPRA-005', 'Compra inicial'],   // Auriculares

      // Ajustes
      [2, 4, -3, 20, 17, 'AJUSTE-001', 'Producto dañado'], // Mouse
      [5, 4, 2, 8, 10, 'AJUSTE-002', 'Inventario físico']  // Sartén
    ];

    for (const movimiento of movimientos) {
      await connection.execute(`
        INSERT INTO movimientos_inventario
        (producto_id, tipo_movimiento_id, cantidad, stock_anterior, stock_nuevo, referencia, notas)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, movimiento);
    }

    console.log('✅ Datos de ejemplo insertados');

    // Crear pool para reportes
    const pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: 'sistema_inventario',
      waitForConnections: true,
      connectionLimit: 10
    });

    // Ejecutar reportes
    const reports = new InventoryReports(pool);

    console.log('\n📊 REPORTES DEL SISTEMA:\n');

    // 1. Productos con stock bajo
    console.log('🚨 PRODUCTOS CON STOCK BAJO:');
    const stockBajo = await reports.productosStockBajo();
    stockBajo.forEach(p => {
      console.log(`  - ${p.nombre}: ${p.stock_actual}/${p.stock_minimo} unidades`);
    });

    // 2. Análisis ABC
    console.log('\n📈 ANÁLISIS ABC (6 meses):');
    const abc = await reports.analisisABC();
    abc.slice(0, 5).forEach((p, i) => {
      console.log(`  ${i+1}. ${p.nombre}: ${p.porcentaje_valor}% (${p.clasificacion_abc})`);
    });

    // 3. Valor del inventario
    console.log('\n💰 VALOR DEL INVENTARIO:');
    const valor = await reports.valorInventario();
    valor.forEach(v => {
      console.log(`  ${v.concepto}: $${v.valor_venta} (venta) / $${v.valor_compra} (compra)`);
    });

    // 4. Rotación de inventario
    console.log('\n🔄 ROTACIÓN DE INVENTARIO (6 meses):');
    const rotacion = await reports.rotacionInventario(6);
    rotacion.slice(0, 5).forEach(p => {
      console.log(`  ${p.producto}: ${p.nivel_rotacion} (${p.tasa_rotacion * 100}% rotación)`);
    });

    console.log('\n🎉 Sistema de Inventario inicializado exitosamente!');
    console.log('💡 Ejecuta "node app.js" para iniciar la API');

  } catch (error) {
    console.error('❌ Error inicializando sistema:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Ejecutar inicialización
inicializarSistemaInventario();