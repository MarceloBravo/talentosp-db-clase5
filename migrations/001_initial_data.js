// seeders/001_initial_data.js
class Seeder {
    constructor(db) {
      this.db = db;
    }
  
    async run() {
      console.log('🌱 Ejecutando seeders...');
  
      // Datos de productos
      const productos = [
        ['ELE001', 'Laptop Gaming Pro', 'Laptop para gaming de alto rendimiento', 1200.00, 1500.00, 5, 2, 50, 1, 1],
        ['ELE002', 'Mouse Óptico Wireless', 'Mouse inalámbrico ergonómico', 15.50, 29.99, 25, 5, 100, 1, 1],
        ['ROP001', 'Camiseta Algodón Premium', 'Camiseta de algodón 100%', 8.00, 19.99, 100, 10, 200, 2, 2],
        ['ELE003', 'Auriculares Bluetooth', 'Auriculares inalámbricos con cancelación de ruido', 45.00, 89.99, 15, 3, 80, 1, 1],
        ['HOG001', 'Juego de Ollas Acero', 'Set de 5 ollas de acero inoxidable', 25.00, 49.99, 8, 2, 20, 3, 3],
        ['DEP001', 'Pelota Fútbol Profesional', 'Pelota de fútbol tamaño oficial', 12.00, 24.99, 30, 5, 100, 4, 2]
      ];
  
      for (const producto of productos) {
        await this.db.execute(`
          INSERT INTO productos
          (codigo, nombre, descripcion, precio_compra, precio_venta, stock_actual, stock_minimo, stock_maximo, categoria_id, proveedor_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, producto);
      }
  
      console.log('✅ Datos iniciales insertados');
  
      // Crear algunos movimientos de inventario
      const movimientos = [
        [1, 1, 5, 0, 5, 'COMPRA-001', 'Compra inicial'],
        [2, 1, 25, 0, 25, 'COMPRA-002', 'Compra inicial'],
        [1, 2, -1, 5, 4, 'VENTA-001', 'Venta a cliente'],
        [3, 1, 100, 0, 100, 'COMPRA-003', 'Compra inicial']
      ];
  
      for (const movimiento of movimientos) {
        await this.db.execute(`
          INSERT INTO movimientos_inventario
          (producto_id, tipo_movimiento_id, cantidad, stock_anterior, stock_nuevo, referencia, notas)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, movimiento);
      }
  
      console.log('✅ Movimientos de inventario creados');
    }
  }
  
  module.exports = Seeder;