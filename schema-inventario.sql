-- Base de datos del sistema de inventario
DROP DATABASE IF EXISTS sistema_inventario;
CREATE DATABASE sistema_inventario;
USE sistema_inventario;

-- Tabla de categorías (jerarquía)
CREATE TABLE categorias (
  id INT PRIMARY KEY AUTO_INCREMENT,
  nombre VARCHAR(100) NOT NULL UNIQUE,
  descripcion TEXT,
  categoria_padre_id INT NULL,
  activa BOOLEAN DEFAULT TRUE,
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (categoria_padre_id) REFERENCES categorias(id) ON DELETE SET NULL,
  INDEX idx_padre (categoria_padre_id),
  INDEX idx_activa (activa)
);

-- Tabla de proveedores
CREATE TABLE proveedores (
  id INT PRIMARY KEY AUTO_INCREMENT,
  nombre VARCHAR(150) NOT NULL,
  contacto VARCHAR(100),
  email VARCHAR(150),
  telefono VARCHAR(20),
  direccion TEXT,
  activo BOOLEAN DEFAULT TRUE,
  fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_activo (activo),
  INDEX idx_email (email)
);

-- Tabla de productos
CREATE TABLE productos (
  id INT PRIMARY KEY AUTO_INCREMENT,
  codigo VARCHAR(50) UNIQUE NOT NULL,
  nombre VARCHAR(200) NOT NULL,
  descripcion TEXT,
  precio_compra DECIMAL(10,2),
  precio_venta DECIMAL(10,2) NOT NULL,
  stock_actual INT DEFAULT 0,
  stock_minimo INT DEFAULT 0,
  stock_maximo INT DEFAULT 1000,
  categoria_id INT,
  proveedor_id INT,
  activo BOOLEAN DEFAULT TRUE,
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE SET NULL,
  FOREIGN KEY (proveedor_id) REFERENCES proveedores(id) ON DELETE SET NULL,
  INDEX idx_codigo (codigo),
  INDEX idx_categoria (categoria_id),
  INDEX idx_proveedor (proveedor_id),
  INDEX idx_activo (activo),
  INDEX idx_stock (stock_actual, stock_minimo)
);

-- Tabla de tipos de movimiento
CREATE TABLE tipos_movimiento (
  id INT PRIMARY KEY AUTO_INCREMENT,
  nombre VARCHAR(50) NOT NULL UNIQUE,
  descripcion TEXT,
  tipo ENUM('entrada', 'salida', 'ajuste') NOT NULL,
  afecta_stock ENUM('positivo', 'negativo', 'neutro') NOT NULL
);

-- Tabla de movimientos de inventario
CREATE TABLE movimientos_inventario (
  id INT PRIMARY KEY AUTO_INCREMENT,
  producto_id INT NOT NULL,
  tipo_movimiento_id INT NOT NULL,
  cantidad INT NOT NULL,
  stock_anterior INT NOT NULL,
  stock_nuevo INT NOT NULL,
  referencia VARCHAR(100), -- Número de orden, factura, etc.
  notas TEXT,
  usuario_id INT, -- Quién realizó el movimiento
  fecha_movimiento TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE,
  FOREIGN KEY (tipo_movimiento_id) REFERENCES tipos_movimiento(id),
  INDEX idx_producto (producto_id),
  INDEX idx_tipo (tipo_movimiento_id),
  INDEX idx_fecha (fecha_movimiento),
  INDEX idx_usuario (usuario_id)
);

-- Tabla de órdenes de compra
CREATE TABLE ordenes_compra (
  id INT PRIMARY KEY AUTO_INCREMENT,
  numero_orden VARCHAR(50) UNIQUE NOT NULL,
  proveedor_id INT NOT NULL,
  fecha_orden DATE NOT NULL,
  fecha_entrega_esperada DATE,
  fecha_entrega_real DATE,
  estado ENUM('pendiente', 'parcial', 'completa', 'cancelada') DEFAULT 'pendiente',
  total DECIMAL(10,2) DEFAULT 0.00,
  notas TEXT,
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (proveedor_id) REFERENCES proveedores(id),
  INDEX idx_proveedor (proveedor_id),
  INDEX idx_estado (estado),
  INDEX idx_fecha (fecha_orden)
);

-- Tabla de detalle de órdenes de compra
CREATE TABLE detalle_ordenes_compra (
  id INT PRIMARY KEY AUTO_INCREMENT,
  orden_compra_id INT NOT NULL,
  producto_id INT NOT NULL,
  cantidad_solicitada INT NOT NULL,
  cantidad_recibida INT DEFAULT 0,
  precio_unitario DECIMAL(10,2) NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  
  FOREIGN KEY (orden_compra_id) REFERENCES ordenes_compra(id) ON DELETE CASCADE,
  FOREIGN KEY (producto_id) REFERENCES productos(id),
  INDEX idx_orden (orden_compra_id),
  INDEX idx_producto (producto_id)
);

-- Insertar datos iniciales
INSERT INTO tipos_movimiento (nombre, descripcion, tipo, afecta_stock) VALUES
('Compra a proveedor', 'Entrada por compra a proveedor', 'entrada', 'positivo'),
('Venta a cliente', 'Salida por venta a cliente', 'salida', 'negativo'),
('Devolución cliente', 'Entrada por devolución de cliente', 'entrada', 'positivo'),
('Ajuste inventario', 'Ajuste manual de inventario', 'ajuste', 'neutro'),
('Producto dañado', 'Salida por producto dañado', 'salida', 'negativo'),
('Transferencia almacén', 'Movimiento entre almacenes', 'ajuste', 'neutro');

INSERT INTO categorias (nombre, descripcion) VALUES
('Electrónica', 'Productos electrónicos y gadgets'),
('Ropa y Accesorios', 'Ropa, calzado y accesorios'),
('Hogar y Jardín', 'Artículos para el hogar y jardín'),
('Deportes', 'Equipamiento deportivo'),
('Libros', 'Libros y material educativo'),
('Alimentos', 'Productos alimenticios');

INSERT INTO proveedores (nombre, contacto, email, telefono, direccion) VALUES
('TechCorp S.A.', 'María González', 'compras@techcorp.com', '+34 600 123 456', 'Calle Tecnología 123, Madrid'),
('FashionPlus', 'Carlos Rodríguez', 'pedidos@fashionplus.es', '+34 600 654 321', 'Av. Moda 456, Barcelona'),
('HomeStyle', 'Ana Martínez', 'ventas@homestyle.com', '+34 600 987 654', 'Plaza Casa 789, Valencia');