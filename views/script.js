// views/script.js

const API_URL = '/api';

document.addEventListener('DOMContentLoaded', () => {
    // Cargas iniciales
    cargarProductos();
    cargarCategorias();
    cargarProveedores();
    cargarDashboard();

    // Listeners de formularios
    document.getElementById('form-crear-producto').addEventListener('submit', crearProducto);
    document.getElementById('form-actualizar-stock').addEventListener('submit', actualizarStock);
    document.getElementById('form-crear-orden').addEventListener('submit', crearOrdenDeCompra);
});

// --- FUNCIONES DE CARGA DE DATOS ---

async function fetchData(endpoint) {
    try {
        const response = await fetch(`${API_URL}${endpoint}`);
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Error al cargar datos desde ${endpoint}:`, error);
        alert(`No se pudieron cargar los datos. Verifique la consola.`);
    }
}

async function cargarProductos() {
    const busqueda = document.getElementById('busqueda').value;
    const endpoint = busqueda ? `/productos?busqueda=${encodeURIComponent(busqueda)}` : '/productos';
    const data = await fetchData(endpoint);
    if (!data || !data.productos) return;

    const tbody = document.getElementById('tabla-productos').querySelector('tbody');
    tbody.innerHTML = '';
    data.productos[0].forEach(p => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${p.id}</td>
            <td>${p.codigo}</td>
            <td>${p.nombre}</td>
            <td>${p.stock_actual}</td>
            <td>${parseFloat(p.precio_venta).toFixed()}</td>
            <td>${p.categoria || 'N/A'}</td>
            <td>${p.proveedor || 'N/A'}</td>
            <td class="stock-${p.estado_stock}">${p.estado_stock}</td>
            <td>
                <button onclick="abrirModalStock(${p.id}, '${p.nombre}')">Stock</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

async function cargarCategorias() {
    const data = await fetchData('/categorias');
    if (!data || !data.categorias) return;

    const select = document.querySelector('#form-crear-producto select[name="categoria_id"]');
    select.innerHTML = '<option value="">Seleccione Categoría</option>';
    data.categorias.forEach(c => {
        const option = document.createElement('option');
        option.value = c.id;
        option.textContent = c.nombre;
        select.appendChild(option);
    });
}

async function cargarProveedores() {
    const data = await fetchData('/proveedores');
    if (!data || !data.proveedores) return;

    const selects = [
        document.querySelector('#form-crear-producto select[name="proveedor_id"]'),
        document.querySelector('#form-crear-orden select[name="proveedor_id"]')
    ];
    
    selects.forEach(select => {
        if (!select) return;
        select.innerHTML = '<option value="">Seleccione Proveedor</option>';
        data.proveedores.forEach(p => {
            const option = document.createElement('option');
            option.value = p.id;
            option.textContent = p.nombre;
            select.appendChild(option);
        });
    });
}

async function cargarDashboard() {
    const data = await fetchData('/dashboard');
    if (!data) return;
    
    const content = document.getElementById('dashboard-content');
    const stats = data.estadisticas;
    content.innerHTML = `
        <p><strong>Productos Activos:</strong> ${stats.productos_activos}</p>
        <p><strong>Productos con Stock Bajo:</strong> ${stats.productos_stock_bajo}</p>
        <p><strong>Valor del Inventario (Venta):</strong> $${parseFloat(stats.valor_inventario_venta).toFixed(2)}</p>
    `;
}

// --- FUNCIONES DE FORMULARIOS ---

async function postData(endpoint, body) {
    try {
        const response = await fetch(`${API_URL}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || `Error HTTP: ${response.status}`);
        }
        return result;
    } catch (error) {
        console.error(`Error en POST a ${endpoint}:`, error);
        alert(`Error: ${error.message}`);
        return null;
    }
}

async function crearProducto(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    const body = Object.fromEntries(formData.entries());

    // Convertir a números
    ['precio_compra', 'precio_venta', 'stock_actual', 'stock_minimo', 'categoria_id', 'proveedor_id'].forEach(key => {
        if(body[key]) body[key] = parseFloat(body[key]);
    });

    const result = await postData('/productos', body);
    if (result) {
        alert('Producto creado exitosamente!');
        form.reset();
        cargarProductos();
        cargarDashboard();
    }
}

async function actualizarStock(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    const body = Object.fromEntries(formData.entries());
    const productoId = body.producto_id;
    debugger;
    // El tipo de movimiento de venta (1) y ajuste negativo (3) deben ser negativos
    let cantidad = parseFloat(body.cantidad);
    if (['1', '3'].includes(body.tipo_movimiento_id)) {
        cantidad = -Math.abs(cantidad);
    }

    const payload = {
        cantidad: cantidad,
        tipo_movimiento_id: parseInt(body.tipo_movimiento_id),
        referencia: body.referencia
    };

    try {
        console.log(`${API_URL}/productos/${productoId}/stock`, JSON.stringify(payload));
        const response = await fetch(`${API_URL}/productos/${productoId}/stock`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || `Error HTTP: ${response.status}`);
        }
        alert('Stock actualizado!');
        form.reset();
        cerrarModalStock();
        cargarProductos();
        cargarDashboard();
    } catch (error) {
        console.error(`Error al actualizar stock:`, error);
        alert(`Error: ${error.message}`);
    }
}

async function crearOrdenDeCompra(event) {
    event.preventDefault();
    const form = event.target;
    const proveedor_id = form.querySelector('[name="proveedor_id"]').value;
    const notas = form.querySelector('[name="notas"]').value;
    debugger;
    const productos = [];
    const items = form.querySelectorAll('.producto-item');
    for (const item of items) {
        const producto_id = item.querySelector('.producto-select').value;
        const cantidad = item.querySelector('.cantidad-input').value;
        const precio_compra = item.querySelector('.precio-input').value;

        if (producto_id && cantidad > 0 && precio_compra > 0) {
            productos.push({
                producto_id: parseInt(producto_id),
                cantidad: parseInt(cantidad),
                precio_compra: parseFloat(precio_compra),
                precio_unitario: parseFloat(precio_compra) * 1.20
            });
        }
    }

    if (productos.length === 0) {
        return alert('Debe agregar al menos un producto a la orden.');
    }

    const body = { proveedor_id: parseInt(proveedor_id), notas, productos };
    debugger;
    const result = await postData('/ordenes-compra', body);
    if (result) {
        alert(`Orden de compra #${result.orden_id} creada exitosamente!`);
        form.reset();
        document.getElementById('productos-orden').innerHTML = '';
    }
}

// --- FUNCIONES DE MODAL Y UI ---

function abrirModalStock(id, nombre) {
    document.getElementById('modal-nombre-producto').textContent = nombre;
    document.querySelector('#form-actualizar-stock input[name="producto_id"]').value = id;
    document.getElementById('modal-stock').style.display = 'flex';
}

function cerrarModalStock() {
    document.getElementById('modal-stock').style.display = 'none';
    document.getElementById('form-actualizar-stock').reset();
}

let productoOptionsCache = null;
async function agregarProductoAOrden() {
    const container = document.getElementById('productos-orden');
    //debugger;
    if (!productoOptionsCache) {
        const data = await fetchData('/productos?limite=1000'); // Cargar todos los productos
        if (data && data.productos) {
            productoOptionsCache = data.productos[0].map(p => `<option value="${p.id}">${p.nombre} (${p.codigo})</option>`).join('');
        } else {
            alert('No se pudieron cargar los productos.');
            return;
        }
    }

    const div = document.createElement('div');
    div.className = 'producto-item';
    div.innerHTML = `
        <div>
            <select class="producto-select" required>${productoOptionsCache}</select>
            <input type="number" class="cantidad-input" placeholder="Cantidad" min="1" required>
            <input type="number" class="precio-input" placeholder="Precio Compra" step="0.01" min="0.01" required>
            <button type="button" onclick="this.parentElement.remove()">Quitar</button>
        </div>
    `;
    container.appendChild(div);
}

// Cerrar modal si se hace clic fuera del contenido
window.onclick = function(event) {
    const modal = document.getElementById('modal-stock');
    if (event.target == modal) {
        cerrarModalStock();
    }
}
