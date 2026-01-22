// Productos de la panadería organizados por categorías
const categorias = {
    bebidas: [
        { id: 1, nombre: 'Americano Chico', precio: 20.00, categoria: 'bebidas' },
        { id: 2, nombre: 'Americano Grande', precio: 25.00, categoria: 'bebidas' }
    ],
    panDulce: [
        { id: 3, nombre: 'Croissant Almendra', precio: 25.00, categoria: 'panDulce' },
        { id: 4, nombre: 'Croissant Cristal', precio: 22.00, categoria: 'panDulce' },
        { id: 5, nombre: 'Croissant Chocolate', precio: 28.00, categoria: 'panDulce' },
        { id: 6, nombre: 'Concha', precio: 8.00, categoria: 'panDulce' },
        { id: 7, nombre: 'Cuernito', precio: 10.00, categoria: 'panDulce' },
        { id: 8, nombre: 'Dona', precio: 12.00, categoria: 'panDulce' },
        { id: 9, nombre: 'Ojo de Buey', precio: 12.00, categoria: 'panDulce' }
    ],
    panBlanco: [
        { id: 10, nombre: 'Pan Blanco', precio: 15.00, categoria: 'panBlanco' },
        { id: 11, nombre: 'Pan Integral', precio: 18.00, categoria: 'panBlanco' },
        { id: 12, nombre: 'Bolillo', precio: 3.00, categoria: 'panBlanco' },
        { id: 13, nombre: 'Bisquet', precio: 5.00, categoria: 'panBlanco' }
    ],
    hogazas: [
        { id: 14, nombre: 'Hogaza', precio: 35.00, categoria: 'hogazas' },
        { id: 15, nombre: 'Baguette', precio: 20.00, categoria: 'hogazas' }
    ]
};

// Metadatos de categorías (nombres y colores)
let categoriasInfo = {
    bebidas: { nombre: 'Bebidas', color: '#3498db' },
    panDulce: { nombre: 'Pan Dulce', color: '#2ecc71' },
    panBlanco: { nombre: 'Pan Blanco', color: '#e74c3c' },
    hogazas: { nombre: 'Hogazas / Baguette', color: '#f39c12' }
};

// Array plano de todos los productos
const productos = [];
Object.keys(categorias).forEach(cat => {
    productos.push(...categorias[cat]);
});

// Estado de la aplicación
let carrito = [];
let metodoPago = null;
let estadisticas = {};
let ventasTotales = 0;
let ventasTarjeta = 0;
let ventasEfectivo = 0;
let numTransacciones = 0;
let fechaReporteVisualizando = new Date(); // Fecha que se está visualizando en el reporte
let retiros = []; // Array para almacenar los retiros de efectivo
let categoriaActiva = null; // Categoría actualmente seleccionada

// Inicializar estadísticas
productos.forEach(producto => {
    estadisticas[producto.id] = 0;
});

// Inicializar la aplicación
document.addEventListener('DOMContentLoaded', () => {
    mostrarFecha();
    cargarDatosLocalStorage(); // Cargar primero los datos guardados
    renderizarProductos();
    actualizarEstadisticas();
});

// Mostrar fecha actual
function mostrarFecha() {
    const fecha = new Date();
    const opciones = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('fecha').textContent = fecha.toLocaleDateString('es-ES', opciones);
}

// Renderizar productos por categorías
function renderizarProductos() {
    const tabsContainer = document.getElementById('categoriasTabs');
    const grid = document.getElementById('productosGrid');
    
    // Renderizar pestañas de categorías
    tabsContainer.innerHTML = '';
    
    const categoriasConProductos = Object.keys(categorias).filter(key => 
        categorias[key] && categorias[key].length > 0
    );
    
    if (categoriasConProductos.length === 0) {
        grid.innerHTML = '<p style="text-align: center; color: #999; padding: 40px;">No hay productos disponibles</p>';
        return;
    }
    
    // Si no hay categoría activa, seleccionar la primera
    if (!categoriaActiva || !categorias[categoriaActiva] || categorias[categoriaActiva].length === 0) {
        categoriaActiva = categoriasConProductos[0];
    }
    
    // Crear pestañas
    categoriasConProductos.forEach(categoriaKey => {
        const tab = document.createElement('button');
        tab.className = 'categoria-tab';
        if (categoriaKey === categoriaActiva) {
            tab.classList.add('active');
        }
        tab.style.borderColor = categoriasInfo[categoriaKey]?.color || '#666';
        tab.style.setProperty('--categoria-color', categoriasInfo[categoriaKey]?.color || '#666');
        tab.textContent = categoriasInfo[categoriaKey]?.nombre || categoriaKey;
        tab.onclick = () => cambiarCategoria(categoriaKey);
        tabsContainer.appendChild(tab);
    });
    
    // Renderizar productos de la categoría activa
    grid.innerHTML = '';
    
    const productosGrid = document.createElement('div');
    productosGrid.className = 'productos-categoria-grid';
    
    categorias[categoriaActiva].forEach(producto => {
        const card = document.createElement('div');
        card.className = 'producto-card';
        card.style.background = `linear-gradient(135deg, ${categoriasInfo[categoriaActiva]?.color || '#666'} 0%, ${categoriasInfo[categoriaActiva]?.color || '#666'}dd 100%)`;
        card.onclick = () => agregarAlCarrito(producto);
        
        card.innerHTML = `
            <div class="nombre">${producto.nombre}</div>
        `;
        
        productosGrid.appendChild(card);
    });
    
    grid.appendChild(productosGrid);
    
    console.log('🎨 Productos renderizados - Categoría:', categoriaActiva);
}

// Cambiar categoría activa
function cambiarCategoria(categoriaKey) {
    categoriaActiva = categoriaKey;
    renderizarProductos();
}

// Agregar producto al carrito
function agregarAlCarrito(producto) {
    const itemExistente = carrito.find(item => item.id === producto.id);
    
    if (itemExistente) {
        itemExistente.cantidad++;
    } else {
        carrito.push({
            ...producto,
            cantidad: 1
        });
    }
    
    renderizarCarrito();
    calcularTotal();
}

// Renderizar carrito
function renderizarCarrito() {
    const carritoItems = document.getElementById('carritoItems');
    
    if (carrito.length === 0) {
        carritoItems.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">Carrito vacío</p>';
        return;
    }
    
    carritoItems.innerHTML = '';
    
    carrito.forEach(item => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'carrito-item';
        
        itemDiv.innerHTML = `
            <div class="carrito-item-info">
                <div class="carrito-item-nombre">${item.nombre}</div>
                <div class="carrito-item-precio">$${item.precio.toFixed(2)}</div>
            </div>
            <div class="carrito-item-cantidad">
                <button class="btn-cantidad" onclick="cambiarCantidad(${item.id}, -1)">-</button>
                <span class="cantidad">${item.cantidad}</span>
                <button class="btn-cantidad" onclick="cambiarCantidad(${item.id}, 1)">+</button>
            </div>
        `;
        
        carritoItems.appendChild(itemDiv);
    });
}

// Cambiar cantidad de un producto
function cambiarCantidad(productoId, cambio) {
    const item = carrito.find(i => i.id === productoId);
    
    if (item) {
        item.cantidad += cambio;
        
        if (item.cantidad <= 0) {
            carrito = carrito.filter(i => i.id !== productoId);
        }
        
        renderizarCarrito();
        calcularTotal();
    }
}

// Calcular total del carrito
function calcularTotal() {
    const total = carrito.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
    document.getElementById('totalCarrito').textContent = total.toFixed(2);
    
    if (metodoPago === 'efectivo') {
        calcularCambio();
    }
}

// Limpiar carrito
function limpiarCarrito() {
    carrito = [];
    renderizarCarrito();
    calcularTotal();
}

// Seleccionar método de pago e iniciar proceso automáticamente
function seleccionarMetodo(metodo) {
    if (carrito.length === 0) {
        alert('El carrito está vacío');
        return;
    }
    
    metodoPago = metodo;
    const total = parseFloat(document.getElementById('totalCarrito').textContent);
    
    if (metodo === 'efectivo') {
        // Abrir modal de efectivo
        abrirModalEfectivo();
    } else if (metodo === 'tarjeta') {
        // Pago con tarjeta - confirmar primero
        if (confirm(`¿Confirmar pago con tarjeta por $${total.toFixed(2)}?`)) {
            registrarVenta(total);
            alert('✅ Venta registrada correctamente');
        }
    }
}

// Agregar denominación al monto recibido
function agregarDenominacion(valor) {
    const montoActual = parseFloat(document.getElementById('montoRecibido').value) || 0;
    const nuevoMonto = montoActual + valor;
    
    document.getElementById('montoRecibido').value = nuevoMonto;
    document.getElementById('montoRecibidoDisplay').textContent = nuevoMonto.toFixed(2);
    
    calcularCambio();
}

// Resetear monto recibido
function resetearMonto() {
    document.getElementById('montoRecibido').value = '0';
    document.getElementById('montoRecibidoDisplay').textContent = '0.00';
    
    // Limpiar también el cambio
    const cambioDisplay = document.getElementById('cambioDisplay');
    if (cambioDisplay) {
        cambioDisplay.textContent = '0.00';
        cambioDisplay.style.color = '#666';
    }
}

// Abrir modal de efectivo
function abrirModalEfectivo() {
    const total = parseFloat(document.getElementById('totalCarrito').textContent);
    document.getElementById('totalAPagar').textContent = `$${total.toFixed(2)}`;
    document.getElementById('modalEfectivo').classList.remove('hidden');
    resetearMonto();
}

// Cerrar modal de efectivo
function cerrarModalEfectivo() {
    document.getElementById('modalEfectivo').classList.add('hidden');
    resetearMonto();
    
    // Asegurar que todo esté limpio
    const cambioDisplay = document.getElementById('cambioDisplay');
    if (cambioDisplay) {
        cambioDisplay.textContent = '0.00';
        cambioDisplay.style.color = '#666';
    }
}

// Confirmar pago en efectivo
function confirmarPagoEfectivo() {
    const total = parseFloat(document.getElementById('totalCarrito').textContent);
    const montoRecibido = parseFloat(document.getElementById('montoRecibido').value) || 0;
    
    if (montoRecibido < total) {
        alert('El monto recibido es insuficiente');
        return;
    }
    
    const cambio = montoRecibido - total;
    
    // Registrar la venta primero
    registrarVenta(total);
    
    // Cerrar modal de efectivo
    cerrarModalEfectivo();
    
    // Mostrar modal de cambio
    document.getElementById('cambioTotal').textContent = total.toFixed(2);
    document.getElementById('cambioRecibido').textContent = montoRecibido.toFixed(2);
    document.getElementById('cambioMonto').textContent = cambio.toFixed(2);
    document.getElementById('modalCambio').classList.remove('hidden');
    
    // Auto-cerrar después de 3 segundos
    setTimeout(() => {
        cerrarModalCambio();
    }, 3000);
}

// Cerrar modal de cambio
function cerrarModalCambio() {
    document.getElementById('modalCambio').classList.add('hidden');
}

// Calcular cambio (para visualización en modal)
function calcularCambio() {
    const total = parseFloat(document.getElementById('totalCarrito').textContent) || parseFloat(document.getElementById('totalAPagar').textContent.replace('$', ''));
    const montoRecibido = parseFloat(document.getElementById('montoRecibido').value) || 0;
    const cambio = montoRecibido - total;
    
    // Actualizar display si existe el elemento cambio
    const cambioElement = document.getElementById('cambio');
    if (cambioElement) {
        cambioElement.textContent = cambio >= 0 ? cambio.toFixed(2) : '0.00';
    }
    
    // Actualizar display del cambio en el modal
    const cambioDisplay = document.getElementById('cambioDisplay');
    if (cambioDisplay) {
        if (cambio >= 0) {
            cambioDisplay.textContent = cambio.toFixed(2);
            cambioDisplay.style.color = '#28a745';
        } else {
            cambioDisplay.textContent = '0.00';
            cambioDisplay.style.color = '#dc3545';
        }
    }
}

// Registrar venta
function registrarVenta(total) {
    // Actualizar estadísticas
    carrito.forEach(item => {
        estadisticas[item.id] += item.cantidad;
    });
    
    ventasTotales += total;
    numTransacciones++;
    
    // Registrar por método de pago
    if (metodoPago === 'efectivo') {
        ventasEfectivo += total;
    } else if (metodoPago === 'tarjeta') {
        ventasTarjeta += total;
    }
    
    // Guardar en localStorage
    guardarDatosLocalStorage();
    
    // Limpiar carrito y resetear
    carrito = [];
    renderizarCarrito();
    calcularTotal();
    
    metodoPago = null;
    
    // Actualizar estadísticas en pantalla
    actualizarEstadisticas();
}

// Actualizar estadísticas
function actualizarEstadisticas() {
    // Esta función se mantiene por compatibilidad
    // Los datos se muestran cuando se abre el modal de reporte
}

// Guardar datos en LocalStorage
function guardarDatosLocalStorage() {
    const fechaKey = new Date().toDateString();
    const datos = {
        estadisticas,
        ventasTotales,
        ventasTarjeta,
        ventasEfectivo,
        numTransacciones,
        fecha: fechaKey,
        categorias: JSON.parse(JSON.stringify(categorias)),
        categoriasInfo: JSON.parse(JSON.stringify(categoriasInfo)),
        retiros: JSON.parse(JSON.stringify(retiros))
    };
    
    try {
        // Guardar datos del día actual
        localStorage.setItem('panaderiaDatos', JSON.stringify(datos));
        
        // Guardar también en histórico por fecha
        const historico = JSON.parse(localStorage.getItem('panaderiaHistorico') || '{}');
        historico[fechaKey] = datos;
        localStorage.setItem('panaderiaHistorico', JSON.stringify(historico));
        
        console.log('✅ Datos guardados correctamente:', datos);
    } catch (error) {
        console.error('❌ Error al guardar datos:', error);
        alert('Error al guardar los datos. Por favor verifica el espacio disponible.');
    }
}

// Cargar datos de LocalStorage
function cargarDatosLocalStorage() {
    try {
        const datosGuardados = localStorage.getItem('panaderiaDatos');
        
        if (datosGuardados) {
            const datos = JSON.parse(datosGuardados);
            const fechaHoy = new Date().toDateString();
            
            console.log('📦 Datos encontrados en localStorage:', datos);
            
            // Solo cargar datos si son del mismo día
            if (datos.fecha === fechaHoy) {
                estadisticas = datos.estadisticas || {};
                ventasTotales = datos.ventasTotales || 0;
                ventasTarjeta = datos.ventasTarjeta || 0;
                ventasEfectivo = datos.ventasEfectivo || 0;
                numTransacciones = datos.numTransacciones || 0;
                retiros = datos.retiros || [];
                
                // Cargar productos personalizados si existen
                if (datos.categorias) {
                    // Limpiar categorías existentes primero
                    Object.keys(categorias).forEach(cat => {
                        categorias[cat] = [];
                    });
                    
                    // Cargar categorías guardadas
                    Object.keys(datos.categorias).forEach(cat => {
                        categorias[cat] = datos.categorias[cat];
                    });
                    
                    // Actualizar array de productos
                    productos.length = 0;
                    Object.keys(categorias).forEach(cat => {
                        if (categorias[cat] && categorias[cat].length > 0) {
                            productos.push(...categorias[cat]);
                        }
                    });
                    
                    console.log('📦 Productos cargados:', productos.length);
                }
                
                // Cargar info de categorías si existe
                if (datos.categoriasInfo) {
                    categoriasInfo = datos.categoriasInfo;
                }
                
                // Asegurar que todos los productos tengan estadísticas
                productos.forEach(producto => {
                    if (estadisticas[producto.id] === undefined) {
                        estadisticas[producto.id] = 0;
                    }
                });
                
                console.log('✅ Datos del día actual cargados correctamente');
            } else {
                console.log('📅 Los datos son de otro día, comenzando nuevo día');
            }
        } else {
            console.log('📝 No hay datos guardados, comenzando nuevo día');
        }
    } catch (error) {
        console.error('❌ Error al cargar datos:', error);
        alert('Error al cargar los datos guardados. Se iniciará con datos vacíos.');
    }
}

// Toggle reporte
function toggleReporte() {
    const reporteDetallado = document.getElementById('reporteDetallado');
    reporteDetallado.classList.toggle('hidden');
}

// Descargar reporte
function descargarReporte() {
    const fecha = new Date();
    const fechaStr = fecha.toLocaleDateString('es-ES');
    
    let contenido = `REPORTE DE VENTAS - PANADERÍA\n`;
    contenido += `Fecha: ${fechaStr}\n`;
    contenido += `${'='.repeat(50)}\n\n`;
    
    contenido += `PRODUCTOS VENDIDOS:\n`;
    contenido += `${'-'.repeat(50)}\n`;
    
    let hayVentas = false;
    productos.forEach(producto => {
        const cantidad = estadisticas[producto.id];
        if (cantidad > 0) {
            hayVentas = true;
            contenido += `${producto.nombre.padEnd(30)} ${cantidad.toString().padStart(5)} unidades\n`;
        }
    });
    
    if (!hayVentas) {
        contenido += `No hay ventas registradas\n`;
    }
    
    contenido += `\n${'-'.repeat(50)}\n`;
    contenido += `RESUMEN DE VENTAS:\n`;
    contenido += `${'-'.repeat(50)}\n`;
    contenido += `💳 Ventas con Tarjeta:    $${ventasTarjeta.toFixed(2).padStart(10)}\n`;
    contenido += `💵 Ventas en Efectivo:    $${ventasEfectivo.toFixed(2).padStart(10)}\n`;
    contenido += `${'-'.repeat(50)}\n`;
    contenido += `💰 TOTAL DEL DÍA:         $${ventasTotales.toFixed(2).padStart(10)}\n`;
    contenido += `🧾 Transacciones:         ${numTransacciones.toString().padStart(10)}\n`;
    contenido += `${'-'.repeat(50)}\n`;
    
    // Agregar retiros si existen
    if (retiros.length > 0) {
        contenido += `\n${'-'.repeat(50)}\n`;
        contenido += `💸 RETIROS DE EFECTIVO:\n`;
        contenido += `${'-'.repeat(50)}\n`;
        retiros.forEach(retiro => {
            const fechaRetiro = new Date(retiro.fecha);
            const horaRetiro = fechaRetiro.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
            contenido += `${horaRetiro} - $${retiro.monto.toFixed(2).padStart(10)}\n`;
            contenido += `  Justificación: ${retiro.justificacion}\n\n`;
        });
        contenido += `${'-'.repeat(50)}\n`;
    }
    
    const blob = new Blob([contenido], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reporte-panaderia-${fecha.getFullYear()}-${(fecha.getMonth()+1).toString().padStart(2,'0')}-${fecha.getDate().toString().padStart(2,'0')}.txt`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
}

// ========== MODALES REPORTE Y PRODUCTOS ==========

// Modal Reporte
function abrirModalReporte() {
    fechaReporteVisualizando = new Date(); // Resetear a hoy
    actualizarVistaReporte();
    document.getElementById('modalReporte').classList.remove('hidden');
}

function cerrarModalReporte() {
    document.getElementById('modalReporte').classList.add('hidden');
}

function cambiarDiaReporte(dias) {
    fechaReporteVisualizando.setDate(fechaReporteVisualizando.getDate() + dias);
    actualizarVistaReporte();
}

function actualizarVistaReporte() {
    const fechaKey = fechaReporteVisualizando.toDateString();
    const esHoy = fechaKey === new Date().toDateString();
    
    // Mostrar la fecha
    document.getElementById('reporteFechaModal').textContent = fechaReporteVisualizando.toLocaleDateString('es-ES', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
    
    // Cargar datos del día seleccionado
    let datosDelDia;
    if (esHoy) {
        // Si es hoy, usar datos actuales
        datosDelDia = {
            estadisticas,
            ventasTotales,
            ventasTarjeta,
            ventasEfectivo,
            numTransacciones,
            retiros
        };
    } else {
        // Si es otro día, buscar en histórico
        const historico = JSON.parse(localStorage.getItem('panaderiaHistorico') || '{}');
        datosDelDia = historico[fechaKey] || {
            estadisticas: {},
            ventasTotales: 0,
            ventasTarjeta: 0,
            ventasEfectivo: 0,
            numTransacciones: 0,
            retiros: []
        };
    }
    
    // Actualizar productos vendidos (solo cantidad)
    const reporteProductos = document.getElementById('reporteProductos');
    reporteProductos.innerHTML = '';
    
    let hayVentas = false;
    productos.forEach(producto => {
        const cantidad = datosDelDia.estadisticas[producto.id] || 0;
        
        if (cantidad > 0) {
            hayVentas = true;
            const itemDiv = document.createElement('div');
            itemDiv.className = 'producto-vendido-item';
            
            itemDiv.innerHTML = `
                <span class="producto-nombre">${producto.nombre}</span>
                <span class="producto-cantidad">${cantidad} unidades</span>
            `;
            
            reporteProductos.appendChild(itemDiv);
        }
    });
    
    if (!hayVentas) {
        reporteProductos.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">No hay ventas registradas en esta fecha</p>';
    }
    
    // Actualizar totales
    document.getElementById('reporteTarjeta').textContent = datosDelDia.ventasTarjeta.toFixed(2);
    document.getElementById('reporteEfectivo').textContent = datosDelDia.ventasEfectivo.toFixed(2);
    document.getElementById('reporteTotalModal').textContent = datosDelDia.ventasTotales.toFixed(2);
    document.getElementById('reporteTransaccionesModal').textContent = datosDelDia.numTransacciones;
    
    // Actualizar retiros
    const reporteRetiros = document.getElementById('reporteRetiros');
    reporteRetiros.innerHTML = '';
    
    const retirosDelDia = datosDelDia.retiros || [];
    if (retirosDelDia.length > 0) {
        retirosDelDia.forEach(retiro => {
            const retiroDiv = document.createElement('div');
            retiroDiv.className = 'retiro-item';
            
            const fechaRetiro = new Date(retiro.fecha);
            const horaRetiro = fechaRetiro.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
            
            retiroDiv.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: start; padding: 10px; border: 1px solid #eee; border-radius: 5px; margin-bottom: 10px; background: #f9f9f9;">
                    <div style="flex: 1;">
                        <div style="font-weight: bold; color: #d9534f;">-$${retiro.monto.toFixed(2)}</div>
                        <div style="font-size: 12px; color: #666; margin-top: 5px;">${retiro.justificacion}</div>
                    </div>
                    <div style="font-size: 12px; color: #999;">${horaRetiro}</div>
                </div>
            `;
            
            reporteRetiros.appendChild(retiroDiv);
        });
    } else {
        reporteRetiros.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">No hay retiros registrados en esta fecha</p>';
    }
}

// Modal Productos
function abrirModalProductos() {
    renderizarListaProductos();
    document.getElementById('modalProductos').classList.remove('hidden');
}

function cerrarModalProductos() {
    document.getElementById('modalProductos').classList.add('hidden');
    cancelarFormulario();
}

function renderizarListaProductos() {
    const lista = document.getElementById('productosLista');
    lista.innerHTML = '';
    
    Object.keys(categorias).forEach(categoriaKey => {
        const categoriaDiv = document.createElement('div');
        categoriaDiv.className = 'categoria-admin';
        
        const titulo = document.createElement('h4');
        titulo.textContent = categoriasInfo[categoriaKey]?.nombre || categoriaKey;
        titulo.className = 'categoria-admin-titulo';
        categoriaDiv.appendChild(titulo);
        
        categorias[categoriaKey].forEach(producto => {
            const prodDiv = document.createElement('div');
            prodDiv.className = 'producto-admin-item';
            
            prodDiv.innerHTML = `
                <div class="producto-admin-info">
                    <span class="producto-admin-nombre">${producto.nombre}</span>
                    <span class="producto-admin-precio">$${producto.precio.toFixed(2)}</span>
                </div>
                <div class="producto-admin-acciones">
                    <button class="btn-editar" onclick="editarProducto(${producto.id})">✏️</button>
                    <button class="btn-eliminar" onclick="eliminarProducto(${producto.id})">🗑️</button>
                </div>
            `;
            
            categoriaDiv.appendChild(prodDiv);
        });
        
        lista.appendChild(categoriaDiv);
    });
}

function mostrarFormularioProducto() {
    actualizarSelectCategorias();
    document.getElementById('formularioProducto').classList.remove('hidden');
    document.getElementById('tituloFormulario').textContent = 'Nuevo Producto';
    document.getElementById('productoIdEdit').value = '';
    document.getElementById('productoNombre').value = '';
    document.getElementById('productoPrecio').value = '';
    const primeraCategoria = Object.keys(categorias)[0];
    if (primeraCategoria) {
        document.getElementById('productoCategoria').value = primeraCategoria;
    }
}

function cancelarFormulario() {
    document.getElementById('formularioProducto').classList.add('hidden');
    document.getElementById('productoIdEdit').value = '';
    document.getElementById('productoNombre').value = '';
    document.getElementById('productoPrecio').value = '';
}

function guardarProducto() {
    const nombre = document.getElementById('productoNombre').value.trim();
    const precio = parseFloat(document.getElementById('productoPrecio').value);
    const categoria = document.getElementById('productoCategoria').value;
    const idEdit = document.getElementById('productoIdEdit').value;
    
    if (!nombre || !precio || precio <= 0) {
        alert('Por favor completa todos los campos correctamente');
        return;
    }
    
    if (idEdit) {
        // Editar producto existente
        const id = parseInt(idEdit);
        let productoEncontrado = null;
        let categoriaEncontrada = null;
        
        Object.keys(categorias).forEach(cat => {
            const prod = categorias[cat].find(p => p.id === id);
            if (prod) {
                productoEncontrado = prod;
                categoriaEncontrada = cat;
            }
        });
        
        if (productoEncontrado) {
            // Remover de categoría anterior
            categorias[categoriaEncontrada] = categorias[categoriaEncontrada].filter(p => p.id !== id);
            
            // Agregar a nueva categoría
            productoEncontrado.nombre = nombre;
            productoEncontrado.precio = precio;
            productoEncontrado.categoria = categoria;
            categorias[categoria].push(productoEncontrado);
        }
    } else {
        // Nuevo producto
        const nuevoId = Math.max(...productos.map(p => p.id)) + 1;
        const nuevoProducto = {
            id: nuevoId,
            nombre: nombre,
            precio: precio,
            categoria: categoria
        };
        
        categorias[categoria].push(nuevoProducto);
        estadisticas[nuevoId] = 0;
    }
    
    // Actualizar array de productos
    productos.length = 0;
    Object.keys(categorias).forEach(cat => {
        productos.push(...categorias[cat]);
    });
    
    guardarDatosLocalStorage();
    renderizarProductos();
    renderizarListaProductos();
    cancelarFormulario();
    
    console.log('✅ Producto guardado. Total de productos:', productos.length);
}

function editarProducto(id) {
    let producto = null;
    
    Object.keys(categorias).forEach(cat => {
        const prod = categorias[cat].find(p => p.id === id);
        if (prod) {
            producto = prod;
        }
    });
    
    if (producto) {
        actualizarSelectCategorias();
        document.getElementById('formularioProducto').classList.remove('hidden');
        document.getElementById('tituloFormulario').textContent = 'Editar Producto';
        document.getElementById('productoIdEdit').value = producto.id;
        document.getElementById('productoNombre').value = producto.nombre;
        document.getElementById('productoPrecio').value = producto.precio;
        document.getElementById('productoCategoria').value = producto.categoria;
    }
}

function eliminarProducto(id) {
    if (!confirm('¿Estás seguro de que quieres eliminar este producto?')) {
        return;
    }
    
    // Eliminar de todas las categorías
    Object.keys(categorias).forEach(cat => {
        categorias[cat] = categorias[cat].filter(p => p.id !== id);
    });
    
    // Actualizar array de productos
    productos.length = 0;
    Object.keys(categorias).forEach(cat => {
        if (categorias[cat] && categorias[cat].length > 0) {
            productos.push(...categorias[cat]);
        }
    });
    
    // Eliminar estadísticas del producto
    delete estadisticas[id];
    
    // Guardar cambios en localStorage
    guardarDatosLocalStorage();
    
    // Actualizar vistas
    renderizarProductos();
    renderizarListaProductos();
    
    console.log('🗑️ Producto eliminado. Total de productos:', productos.length);
}

// ========== IMPORTAR CSV ==========

function importarCSV(event) {
    const archivo = event.target.files[0];
    if (!archivo) return;
    
    const lector = new FileReader();
    
    lector.onload = function(e) {
        try {
            const contenido = e.target.result;
            const lineas = contenido.split('\n').filter(linea => linea.trim() !== '');
            
            if (lineas.length === 0) {
                alert('El archivo CSV está vacío');
                return;
            }
            
            let productosImportados = 0;
            let errores = [];
            
            // Detectar si la primera línea es encabezado
            const primeraLinea = lineas[0].toLowerCase();
            const tieneEncabezado = primeraLinea.includes('nombre') || primeraLinea.includes('precio') || primeraLinea.includes('categoria');
            const inicio = tieneEncabezado ? 1 : 0;
            
            // Obtener el ID máximo actual
            let maxId = productos.length > 0 ? Math.max(...productos.map(p => p.id)) : 0;
            
            for (let i = inicio; i < lineas.length; i++) {
                const linea = lineas[i].trim();
                if (!linea) continue;
                
                // Separar por coma (soporta comas en nombres con comillas)
                const valores = linea.match(/(".*?"|[^,]+)(?=\s*,|\s*$)/g);
                
                if (!valores || valores.length < 3) {
                    errores.push(`Línea ${i + 1}: formato incorrecto`);
                    continue;
                }
                
                const nombre = valores[0].replace(/"/g, '').trim();
                const precio = parseFloat(valores[1].replace(/"/g, '').trim());
                const categoria = valores[2].replace(/"/g, '').trim();
                
                // Validar datos
                if (!nombre) {
                    errores.push(`Línea ${i + 1}: nombre vacío`);
                    continue;
                }
                
                if (isNaN(precio) || precio <= 0) {
                    errores.push(`Línea ${i + 1}: precio inválido (${valores[1]})`);
                    continue;
                }
                
                if (!categorias[categoria]) {
                    errores.push(`Línea ${i + 1}: categoría "${categoria}" no existe`);
                    continue;
                }
                
                // Crear nuevo producto
                maxId++;
                const nuevoProducto = {
                    id: maxId,
                    nombre: nombre,
                    precio: precio,
                    categoria: categoria
                };
                
                categorias[categoria].push(nuevoProducto);
                estadisticas[maxId] = 0;
                productosImportados++;
            }
            
            // Actualizar array de productos
            productos.length = 0;
            Object.keys(categorias).forEach(cat => {
                if (categorias[cat] && categorias[cat].length > 0) {
                    productos.push(...categorias[cat]);
                }
            });
            
            // Guardar y actualizar
            guardarDatosLocalStorage();
            renderizarProductos();
            renderizarListaProductos();
            
            // Mostrar resultado
            let mensaje = `✅ ${productosImportados} productos importados correctamente`;
            if (errores.length > 0) {
                mensaje += `\n\n⚠️ ${errores.length} errores:\n${errores.slice(0, 5).join('\n')}`;
                if (errores.length > 5) {
                    mensaje += `\n... y ${errores.length - 5} más`;
                }
            }
            alert(mensaje);
            
            console.log('📥 CSV importado:', productosImportados, 'productos');
            
        } catch (error) {
            console.error('❌ Error al importar CSV:', error);
            alert('Error al procesar el archivo CSV. Verifica que el formato sea correcto:\nnombre,precio,categoria');
        }
        
        // Limpiar el input para permitir importar el mismo archivo nuevamente
        event.target.value = '';
    };
    
    lector.readAsText(archivo);
}

// ========== GESTIÓN DE CATEGORÍAS ==========

function toggleGestionCategorias() {
    const seccion = document.getElementById('gestionCategorias');
    seccion.classList.toggle('hidden');
    
    if (!seccion.classList.contains('hidden')) {
        renderizarListaCategorias();
    }
}

function mostrarFormularioCategoria() {
    document.getElementById('formularioCategoria').classList.remove('hidden');
    document.getElementById('tituloCategoriaForm').textContent = 'Nueva Categoría';
    document.getElementById('categoriaKeyEdit').value = '';
    document.getElementById('categoriaKey').value = '';
    document.getElementById('categoriaKey').disabled = false;
    document.getElementById('categoriaNombre').value = '';
    document.getElementById('categoriaColor').value = '#9b59b6';
}

function cancelarFormularioCategoria() {
    document.getElementById('formularioCategoria').classList.add('hidden');
    document.getElementById('categoriaKeyEdit').value = '';
    document.getElementById('categoriaKey').value = '';
    document.getElementById('categoriaNombre').value = '';
}

function guardarCategoria() {
    const key = document.getElementById('categoriaKey').value.trim().replace(/\s+/g, '');
    const nombre = document.getElementById('categoriaNombre').value.trim();
    const color = document.getElementById('categoriaColor').value;
    const keyEdit = document.getElementById('categoriaKeyEdit').value;
    
    if (!key || !nombre) {
        alert('Por favor completa todos los campos');
        return;
    }
    
    if (!keyEdit && categorias[key]) {
        alert('Ya existe una categoría con esta clave');
        return;
    }
    
    if (keyEdit && keyEdit !== key) {
        // Editar categoría (cambiar key)
        categorias[key] = categorias[keyEdit];
        delete categorias[keyEdit];
        
        // Actualizar todos los productos de esa categoría
        categorias[key].forEach(prod => {
            prod.categoria = key;
        });
        
        delete categoriasInfo[keyEdit];
    } else if (!keyEdit) {
        // Nueva categoría
        categorias[key] = [];
    }
    
    // Actualizar info de la categoría
    categoriasInfo[key] = { nombre, color };
    
    // Actualizar select de productos
    actualizarSelectCategorias();
    
    // Actualizar array de productos
    productos.length = 0;
    Object.keys(categorias).forEach(cat => {
        productos.push(...categorias[cat]);
    });
    
    guardarDatosLocalStorage();
    renderizarProductos();
    renderizarListaCategorias();
    cancelarFormularioCategoria();
}

function editarCategoria(key) {
    const info = categoriasInfo[key];
    
    if (info) {
        document.getElementById('formularioCategoria').classList.remove('hidden');
        document.getElementById('tituloCategoriaForm').textContent = 'Editar Categoría';
        document.getElementById('categoriaKeyEdit').value = key;
        document.getElementById('categoriaKey').value = key;
        document.getElementById('categoriaKey').disabled = true;
        document.getElementById('categoriaNombre').value = info.nombre;
        document.getElementById('categoriaColor').value = info.color;
    }
}

// ========== VENTA MANUAL ==========

function abrirModalVentaManual() {
    document.getElementById('modalVentaManual').classList.remove('hidden');
    document.getElementById('montoVentaManual').value = '';
    document.getElementById('descripcionVentaManual').value = '';
    document.getElementById('montoVentaManual').focus();
}

function cerrarModalVentaManual() {
    document.getElementById('modalVentaManual').classList.add('hidden');
}

function seleccionarMetodoVentaManual(metodo) {
    const monto = parseFloat(document.getElementById('montoVentaManual').value);
    const descripcion = document.getElementById('descripcionVentaManual').value.trim();
    
    if (!monto || monto <= 0) {
        alert('Por favor ingresa un monto válido mayor a 0');
        return;
    }
    
    if (!confirm(`¿Confirmar venta manual de $${monto.toFixed(2)} con ${metodo === 'tarjeta' ? 'tarjeta' : 'efectivo'}?`)) {
        return;
    }
    
    // Registrar la venta manual
    ventasTotales += monto;
    numTransacciones++;
    
    if (metodo === 'efectivo') {
        ventasEfectivo += monto;
    } else if (metodo === 'tarjeta') {
        ventasTarjeta += monto;
    }
    
    // Guardar en localStorage
    guardarDatosLocalStorage();
    
    // Actualizar estadísticas
    actualizarEstadisticas();
    
    // Cerrar modal
    cerrarModalVentaManual();
    
    let mensaje = `✅ Venta manual registrada: $${monto.toFixed(2)}\nMétodo: ${metodo === 'tarjeta' ? 'Tarjeta' : 'Efectivo'}`;
    if (descripcion) {
        mensaje += `\nDescripción: ${descripcion}`;
    }
    alert(mensaje);
    
    console.log('💰 Venta manual registrada:', { monto, metodo, descripcion });
}

function eliminarCategoria(key) {
    if (categorias[key].length > 0) {
        alert('No se puede eliminar una categoría que tiene productos. Elimina primero los productos.');
        return;
    }
    
    if (!confirm(`¿Estás seguro de eliminar la categoría "${categoriasInfo[key]?.nombre || key}"?`)) {
        return;
    }
    
    delete categorias[key];
    delete categoriasInfo[key];
    
    actualizarSelectCategorias();
    guardarDatosLocalStorage();
    renderizarProductos();
    renderizarListaCategorias();
}

function renderizarListaCategorias() {
    const lista = document.getElementById('categoriasLista');
    lista.innerHTML = '';
    
    Object.keys(categorias).forEach(key => {
        const info = categoriasInfo[key];
        const catDiv = document.createElement('div');
        catDiv.className = 'producto-admin-item';
        catDiv.style.borderLeft = `4px solid ${info?.color || '#666'}`;
        
        catDiv.innerHTML = `
            <div class="producto-admin-info">
                <span class="producto-admin-nombre">${info?.nombre || key}</span>
                <span class="producto-admin-precio">${categorias[key].length} productos</span>
            </div>
            <div class="producto-admin-acciones">
                <button class="btn-editar" onclick="editarCategoria('${key}')">✏️</button>
                <button class="btn-eliminar" onclick="eliminarCategoria('${key}')">🗑️</button>
            </div>
        `;
        
        lista.appendChild(catDiv);
    });
}

function actualizarSelectCategorias() {
    const select = document.getElementById('productoCategoria');
    select.innerHTML = '';
    
    Object.keys(categorias).forEach(key => {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = categoriasInfo[key]?.nombre || key;
        select.appendChild(option);
    });
}

// ===== FUNCIONES DE RETIROS DE EFECTIVO =====

// Abrir modal de retiro
function abrirModalRetiro() {
    document.getElementById('modalRetiro').classList.remove('hidden');
    document.getElementById('montoRetiro').value = '';
    document.getElementById('justificacionRetiro').value = '';
}

// Cerrar modal de retiro
function cerrarModalRetiro() {
    document.getElementById('modalRetiro').classList.add('hidden');
}

// Confirmar retiro
function confirmarRetiro() {
    const monto = parseFloat(document.getElementById('montoRetiro').value);
    const justificacion = document.getElementById('justificacionRetiro').value.trim();
    
    if (!monto || monto <= 0) {
        alert('Por favor ingresa un monto válido mayor a 0');
        return;
    }
    
    if (!justificacion) {
        alert('Por favor ingresa una justificación para el retiro');
        return;
    }
    
    // Crear registro del retiro
    const retiro = {
        id: Date.now(),
        fecha: new Date().toISOString(),
        monto: monto,
        justificacion: justificacion
    };
    
    // Agregar al array de retiros
    retiros.push(retiro);
    
    // Restar del efectivo disponible
    ventasEfectivo -= monto;
    ventasTotales -= monto;
    
    // Guardar en localStorage
    guardarDatosLocalStorage();
    
    // Actualizar estadísticas
    actualizarEstadisticas();
    
    // Cerrar modal
    cerrarModalRetiro();
    
    alert(`Retiro registrado: $${monto.toFixed(2)}\nJustificación: ${justificacion}`);
}
