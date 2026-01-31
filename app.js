// Sistema de notificaciones nativas
function mostrarNotificacion(mensaje, tipo = 'info') {
    // Intentar usar la API de Notificaciones del navegador
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('TPV - PanaderÃ­a', {
            body: mensaje,
            icon: tipo === 'success' ? 'âœ…' : tipo === 'error' ? 'âŒ' : 'â„¹ï¸',
            badge: 'ðŸ¥–',
            requireInteraction: false,
            silent: true
        });
    }
}


// Productos de la panaderÃ­a organizados por categorÃ­as
const categorias = {};

// Metadatos de categorÃ­as (nombres y colores)
let categoriasInfo = {};

// Array plano de todos los productos
const productos = [];

// Estado de la aplicaciÃ³n
let carrito = [];
let metodoPago = null;
let estadisticas = {};
let ventasTotales = 0;
let ventasTarjeta = 0;
let ventasEfectivo = 0;
let numTransacciones = 0;
let fechaReporteVisualizando = new Date(); // Fecha que se estÃ¡ visualizando en el reporte

// FunciÃ³n para obtener el lunes de una fecha dada
function obtenerLunesDeLaSemana(fecha) {
    const dia = fecha.getDay();
    const diff = fecha.getDate() - dia + (dia === 0 ? -6 : 1); // Ajustar cuando es domingo
    return new Date(fecha.setDate(diff));
}

// FunciÃ³n para obtener el sÃ¡bado de una semana que comienza en lunes dado
function obtenerSabadoDeLaSemana(lunes) {
    const sabado = new Date(lunes);
    sabado.setDate(sabado.getDate() + 5);
    return sabado;
}
let retiros = []; // Array para almacenar los retiros de efectivo
let transacciones = []; // Array para almacenar el historial detallado de transacciones
let categoriaActiva = null; // CategorÃ­a actualmente seleccionada
let modoReordenar = false; // Estado del modo reordenar
let elementoArrastrado = null; // Elemento que se estÃ¡ arrastrando

// Operaciones rÃ¡pidas configurables
let operacionesRetiro = [
    { id: 1, emoji: 'ðŸ—‘ï¸', nombre: 'Basura' },
    { id: 2, emoji: 'â›½', nombre: 'Gas' },
    { id: 3, emoji: 'ðŸ“¦', nombre: 'Suministros' },
    { id: 4, emoji: 'ðŸ”§', nombre: 'Mantenimiento' },
    { id: 5, emoji: 'ðŸšš', nombre: 'Proveedor' },
    { id: 6, emoji: 'ðŸ’¡', nombre: 'Servicios' }
];

let operacionesIngreso = [
    { id: 1, emoji: 'ðŸ’°', nombre: 'PrÃ©stamo' },
    { id: 2, emoji: 'ðŸŽ', nombre: 'Propina' },
    { id: 3, emoji: 'â†©ï¸', nombre: 'DevoluciÃ³n' },
    { id: 4, emoji: 'âš–ï¸', nombre: 'Ajuste' },
    { id: 5, emoji: 'ðŸ’µ', nombre: 'Fondo Caja' },
    { id: 6, emoji: 'ðŸ“', nombre: 'Otros' }
];

// Inicializar estadÃ­sticas
productos.forEach(producto => {
    estadisticas[producto.id] = 0;
});

// Inicializar la aplicaciÃ³n
document.addEventListener('DOMContentLoaded', () => {
    mostrarFecha();
    cargarDatosLocalStorage(); // Cargar primero los datos guardados
    cargarOperacionesDesdeLocalStorage(); // Cargar operaciones configuradas
    cargarOrdenProductos(); // Cargar orden personalizado de productos
    renderizarProductos();
    actualizarEstadisticas();
});

// Mostrar fecha actual
function mostrarFecha() {
    const fecha = new Date();
    const opciones = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('fecha').textContent = fecha.toLocaleDateString('es-ES', opciones);
}

// Renderizar productos por categorÃ­as
function renderizarProductos() {
    const tabsContainer = document.getElementById('categoriasTabs');
    const grid = document.getElementById('productosGrid');
    
    // Renderizar pestaÃ±as de categorÃ­as
    tabsContainer.innerHTML = '';
    
    const categoriasConProductos = Object.keys(categorias).filter(key => 
        categorias[key] && categorias[key].length > 0
    );
    
    if (categoriasConProductos.length === 0) {
        grid.innerHTML = '<p style="text-align: center; color: #999; padding: 40px;">No hay productos disponibles</p>';
        return;
    }
    
    // Si no hay categorÃ­a activa, seleccionar la primera
    if (!categoriaActiva || !categorias[categoriaActiva] || categorias[categoriaActiva].length === 0) {
        categoriaActiva = categoriasConProductos[0];
    }
    
    // Crear pestaÃ±as
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
    
    // Renderizar productos de la categorÃ­a activa
    grid.innerHTML = '';
    
    // Mostrar mensaje si estÃ¡ en modo reordenar
    if (modoReordenar) {
        const mensaje = document.createElement('div');
        mensaje.style.cssText = `
            background: #ffc107;
            color: #333;
            padding: 15px;
            border-radius: 10px;
            margin-bottom: 20px;
            text-align: center;
            font-weight: 600;
        `;
        mensaje.textContent = 'ðŸ”€ Modo Reordenar Activo - Arrastra los productos para cambiar su orden';
        grid.appendChild(mensaje);
        
        // BotÃ³n para agregar separador
        const btnAgregarSeparador = document.createElement('button');
        btnAgregarSeparador.className = 'btn-agregar-separador';
        btnAgregarSeparador.textContent = '+ Agregar Separador';
        btnAgregarSeparador.onclick = agregarSeparador;
        btnAgregarSeparador.style.cssText = `
            width: 100%;
            padding: 12px;
            background: linear-gradient(135deg, #6c757d 0%, #5a6268 100%);
            color: white;
            border: none;
            border-radius: 10px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            margin-bottom: 20px;
            transition: all 0.3s ease;
        `;
        btnAgregarSeparador.onmouseover = function() {
            this.style.transform = 'translateY(-2px)';
            this.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
        };
        btnAgregarSeparador.onmouseout = function() {
            this.style.transform = '';
            this.style.boxShadow = '';
        };
        grid.appendChild(btnAgregarSeparador);
    }
    
    const productosGrid = document.createElement('div');
    productosGrid.className = 'productos-categoria-grid';
    
    categorias[categoriaActiva].forEach((producto, index) => {
        const card = document.createElement('div');
        
        // Si es subcategorÃ­a, renderizar como separador
        if (producto.esSubcategoria) {
            card.className = 'subcategoria-card';
            
            if (modoReordenar) {
                // Agregar botones de reordenamiento para iPad
                card.innerHTML = `
                    <div class="subcategoria-nombre">${producto.nombre}</div>
                    <div class="reorder-buttons">
                        <button class="btn-reorder" onclick="moverProducto(${index}, -1)">â¬†ï¸</button>
                        <button class="btn-reorder" onclick="moverProducto(${index}, 1)">â¬‡ï¸</button>
                        <button class="btn-reorder btn-delete" onclick="eliminarSeparador(${producto.id})">ðŸ—‘ï¸</button>
                    </div>
                `;
                card.style.padding = '15px';
            } else {
                card.innerHTML = `
                    <div class="subcategoria-nombre">${producto.nombre}</div>
                `;
            }
        } else {
            // Producto normal
            card.className = 'producto-card';
            card.style.background = `linear-gradient(135deg, ${categoriasInfo[categoriaActiva]?.color || '#666'} 0%, ${categoriasInfo[categoriaActiva]?.color || '#666'}dd 100%)`;
            
            // Si estÃ¡ en modo reordenar, agregar botones
            if (modoReordenar) {
                card.innerHTML = `
                    <div class="nombre">${producto.nombre}</div>
                    <div class="reorder-buttons">
                        <button class="btn-reorder" onclick="moverProducto(${index}, -1)">â¬†ï¸</button>
                        <button class="btn-reorder" onclick="moverProducto(${index}, 1)">â¬‡ï¸</button>
                    </div>
                `;
            } else {
                card.onclick = () => agregarAlCarrito(producto);
                card.innerHTML = `
                    <div class="nombre">${producto.nombre}</div>
                `;
            }
        }
        
        card.setAttribute('data-id', producto.id);
        productosGrid.appendChild(card);
    });
    
    grid.appendChild(productosGrid);
    
    console.log('ðŸŽ¨ Productos renderizados - CategorÃ­a:', categoriaActiva);
}

// Cambiar categorÃ­a activa
function cambiarCategoria(categoriaKey) {
    categoriaActiva = categoriaKey;
    renderizarProductos();
}

// Agregar producto al carrito
function agregarAlCarrito(producto) {
    // Feedback visual en la tarjeta
    const card = document.querySelector(`.producto-card[data-id='${producto.id}']`);
    if (card) {
        card.classList.add('agregado');
        setTimeout(() => card.classList.remove('agregado'), 350);
    }

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
    mostrarNotificacion(`Agregado: ${producto.nombre}`, 'success');
}

// Renderizar carrito
function renderizarCarrito() {
    const carritoItems = document.getElementById('carritoItems');
    
    if (carrito.length === 0) {
        carritoItems.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">Carrito vacÃ­o</p>';
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
                <span class="cantidad">${item.cantidad}</span>
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

// Seleccionar mÃ©todo de pago e iniciar proceso automÃ¡ticamente
// Pantalla de cobro en efectivo (full-screen)
let pantallaEfectivoMonto = 0;
let pantallaEfectivoTotal = 0;

function seleccionarMetodo(metodo) {
    if (carrito.length === 0) {
        mostrarNotificacion('El carrito estÃ¡ vacÃ­o', 'error');
        return;
    }
    
    metodoPago = metodo;
    const total = parseFloat(document.getElementById('totalCarrito').textContent);
    
    if (metodo === 'efectivo') {
        mostrarPantallaEfectivo(total);
    } else if (metodo === 'tarjeta') {
        // Pago con tarjeta - registro directo sin confirmaciÃ³n
        registrarVenta(total);
        mostrarNotificacion('âœ… Venta registrada correctamente', 'success');
    }
}

function mostrarPantallaEfectivo(total) {
    pantallaEfectivoMonto = 0;
    pantallaEfectivoTotal = total;
    document.getElementById('pantallaEfectivoTotal').textContent = `$${total.toFixed(2)}`;
    document.getElementById('pantallaEfectivoRecibido').textContent = '0.00';
    document.getElementById('pantallaEfectivoCambio').textContent = '0.00';
    document.getElementById('mainContainer').classList.add('hidden');
    document.getElementById('pantallaEfectivo').classList.remove('hidden');
}
function pantallaEfectivoAgregar(valor) {
    pantallaEfectivoMonto += valor;
    document.getElementById('pantallaEfectivoRecibido').textContent = pantallaEfectivoMonto.toFixed(2);
    let cambio = pantallaEfectivoMonto - pantallaEfectivoTotal;
    document.getElementById('pantallaEfectivoCambio').textContent = cambio >= 0 ? cambio.toFixed(2) : '0.00';
}
function pantallaEfectivoReset() {
    pantallaEfectivoMonto = 0;
    document.getElementById('pantallaEfectivoRecibido').textContent = '0.00';
    document.getElementById('pantallaEfectivoCambio').textContent = '0.00';
}
function pantallaEfectivoCancelar() {
    document.getElementById('pantallaEfectivo').classList.add('hidden');
    document.getElementById('mainContainer').classList.remove('hidden');
}
function pantallaEfectivoConfirmar() {
    // Validar que el monto recibido sea suficiente
    if (pantallaEfectivoMonto < pantallaEfectivoTotal) {
        mostrarNotificacion('El monto recibido es insuficiente', 'error');
        return;
    }
    registrarVenta(pantallaEfectivoTotal, pantallaEfectivoMonto);
    mostrarNotificacion('âœ… Venta en efectivo registrada', 'success');
    pantallaEfectivoCancelar();
}

// Agregar denominaciÃ³n al monto recibido
// Escuchar mensaje de venta exitosa desde la ventana de efectivo
window.addEventListener('message', function(event) {
    if (event.data && event.data.tipo === 'ventaEfectivoExitosa') {
        limpiarCarrito();
        mostrarNotificacion('âœ… Venta en efectivo registrada', 'success');
        // AquÃ­ puedes agregar lÃ³gica para regresar a la pantalla principal si hay navegaciÃ³n
    }
});
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
    
    // Limpiar tambiÃ©n el cambio
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
    resetearMonto();
}

// Cerrar modal de efectivo
function cerrarModalEfectivo() {
    document.getElementById('modalEfectivo').classList.add('hidden');
        resetearMonto();
    
    // Asegurar que todo estÃ© limpio
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
        mostrarNotificacion('El monto recibido es insuficiente', 'error');
        return;
    }
    
    const cambio = montoRecibido - total;
    
    // Registrar la venta primero, pasando el monto recibido
    registrarVenta(total, montoRecibido);
    
    // Cerrar modal de efectivo
    cerrarModalEfectivo();
    
    // Mostrar modal de cambio
    document.getElementById('cambioTotal').textContent = total.toFixed(2);
    document.getElementById('cambioRecibido').textContent = montoRecibido.toFixed(2);
    document.getElementById('cambioMonto').textContent = cambio.toFixed(2);
    document.getElementById('modalCambio').classList.remove('hidden');
    
    // Auto-cerrar despuÃ©s de 3 segundos
    setTimeout(() => {
        cerrarModalCambio();
    }, 3000);
}

// Cerrar modal de cambio
function cerrarModalCambio() {
    document.getElementById('modalCambio').classList.add('hidden');
}

// Calcular cambio (para visualizaciÃ³n en modal)
function calcularCambio() {
    const total = parseFloat(document.getElementById('totalCarrito').textContent) || parseFloat(document.getElementById('totalAPagar')?.textContent?.replace('$', ''));
    const input = document.getElementById('montoRecibido');
    if (!input) return; // Si no existe el input, salir
    const montoRecibido = parseFloat(input.value) || 0;
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
function registrarVenta(total, montoRecibido = null) {
    // Crear registro detallado de la transacciÃ³n
    const transaccion = {
        id: Date.now(),
        fecha: new Date().toISOString(),
        items: JSON.parse(JSON.stringify(carrito)), // Copia profunda del carrito
        total: total,
        metodoPago: metodoPago,
        montoRecibido: montoRecibido,
        cambio: montoRecibido ? (montoRecibido - total) : 0
    };
    
    // Agregar transacciÃ³n al historial
    transacciones.push(transaccion);
    
    // Actualizar estadÃ­sticas
    carrito.forEach(item => {
        estadisticas[item.id] += item.cantidad;
    });
    
    ventasTotales += total;
    numTransacciones++;
    
    // Registrar por mÃ©todo de pago
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
    
    // Actualizar estadÃ­sticas en pantalla
    actualizarEstadisticas();
}

// Actualizar estadÃ­sticas
function actualizarEstadisticas() {
    // Esta funciÃ³n se mantiene por compatibilidad
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
        retiros: JSON.parse(JSON.stringify(retiros)),
        transacciones: JSON.parse(JSON.stringify(transacciones))
    };
    
    try {
        // Guardar datos del dÃ­a actual
        localStorage.setItem('panaderiaDatos', JSON.stringify(datos));
        
        // Guardar tambiÃ©n en histÃ³rico por fecha
        const historico = JSON.parse(localStorage.getItem('panaderiaHistorico') || '{}');
        historico[fechaKey] = datos;
        localStorage.setItem('panaderiaHistorico', JSON.stringify(historico));
        
        // Guardar catÃ¡logo (productos y categorÃ­as) en clave separada para mayor robustez
        try {
            const catalogo = {
                categorias: datos.categorias,
                categoriasInfo: datos.categoriasInfo,
                productos: JSON.parse(JSON.stringify(productos))
            };
            localStorage.setItem('panaderiaCatalogo', JSON.stringify(catalogo));
        } catch (errCat) {
            console.warn('No se pudo guardar panaderiaCatalogo:', errCat);
        }
        
        console.log('âœ… Datos guardados correctamente:', datos);
    } catch (error) {
        console.error('âŒ Error al guardar datos:', error);
        mostrarNotificacion('Error al guardar los datos. Por favor verifica el espacio disponible.', 'error');
    }
}

// Cargar datos de LocalStorage
function cargarDatosLocalStorage() {
    try {
        const catalogoGuardado = localStorage.getItem('panaderiaCatalogo');
        if (catalogoGuardado) {
            try {
                const catalogo = JSON.parse(catalogoGuardado);
                // Cargar categorÃ­as y productos desde catÃ¡logo persistente
                if (catalogo.categorias) {
                    Object.keys(categorias).forEach(cat => { categorias[cat] = []; });
                    Object.keys(catalogo.categorias).forEach(cat => { categorias[cat] = catalogo.categorias[cat]; });
                    productos.length = 0;
                    Object.keys(categorias).forEach(cat => { if (categorias[cat] && categorias[cat].length > 0) productos.push(...categorias[cat]); });
                    console.log('ðŸ“¦ CatÃ¡logo cargado desde panaderiaCatalogo:', productos.length);
                }

                if (catalogo.categoriasInfo) {
                    categoriasInfo = catalogo.categoriasInfo;
                }
            } catch (err) {
                console.warn('Error cargando panaderiaCatalogo:', err);
            }
        }

        const datosGuardados = localStorage.getItem('panaderiaDatos');

        if (datosGuardados) {
            const datos = JSON.parse(datosGuardados);
            const fechaHoy = new Date().toDateString();
            
            console.log('ðŸ“¦ Datos encontrados en localStorage:', datos);
            // Cargar categorÃ­as y productos siempre (el catÃ¡logo debe persistir)
            if (datos.categorias) {
                // Limpiar categorÃ­as existentes primero
                Object.keys(categorias).forEach(cat => {
                    categorias[cat] = [];
                });

                // Cargar categorÃ­as guardadas
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

                console.log('ðŸ“¦ Productos cargados:', productos.length);
            }

            // Cargar info de categorÃ­as si existe
            if (datos.categoriasInfo) {
                categoriasInfo = datos.categoriasInfo;
            }

            // Si los datos son del mismo dÃ­a, cargar estadÃ­sticas y ventas
            if (datos.fecha === fechaHoy) {
                estadisticas = datos.estadisticas || {};
                ventasTotales = datos.ventasTotales || 0;
                ventasTarjeta = datos.ventasTarjeta || 0;
                ventasEfectivo = datos.ventasEfectivo || 0;
                numTransacciones = datos.numTransacciones || 0;
                retiros = datos.retiros || [];
                transacciones = datos.transacciones || [];

                // Asegurar que todos los productos tengan estadÃ­sticas
                productos.forEach(producto => {
                    if (estadisticas[producto.id] === undefined) {
                        estadisticas[producto.id] = 0;
                    }
                });

                console.log('âœ… Datos del dÃ­a actual cargados correctamente');
            } else {
                // Si no son del mismo dÃ­a, mantener catÃ¡logo y reiniciar mÃ©tricas diarias
                estadisticas = estadisticas || {};
                ventasTotales = 0;
                ventasTarjeta = 0;
                ventasEfectivo = 0;
                numTransacciones = 0;
                retiros = [];
                transacciones = [];

                // Asegurar que los productos tengan entrada en estadisticas
                productos.forEach(producto => {
                    if (estadisticas[producto.id] === undefined) {
                        estadisticas[producto.id] = 0;
                    }
                });

                console.log('ðŸ“… Los datos son de otro dÃ­a â€” catÃ¡logo cargado, mÃ©tricas diarias reiniciadas');
            }
        } else {
            console.log('ðŸ“ No hay datos guardados, comenzando nuevo dÃ­a');
        }
    } catch (error) {
        console.error('âŒ Error al cargar datos:', error);
        mostrarNotificacion('Error al cargar los datos guardados. Se iniciarÃ¡ con datos vacÃ­os.', 'error');
    }
}

// Toggle reporte
function toggleReporte() {
    const reporteDetallado = document.getElementById('reporteDetallado');
    reporteDetallado.classList.toggle('hidden');
}

// Descargar reporte
function descargarReporte() {
    // Calcular el lunes y sábado de la semana visualizada
    const lunesDeLaSemana = obtenerLunesDeLaSemana(new Date(fechaReporteVisualizando));
    const sabadoDeLaSemana = obtenerSabadoDeLaSemana(new Date(lunesDeLaSemana));
    
    const fechaStr = `${lunesDeLaSemana.toLocaleDateString('es-ES')} al ${sabadoDeLaSemana.toLocaleDateString('es-ES')}`;
    
    // Cargar datos de toda la semana
    const historico = JSON.parse(localStorage.getItem('panaderiaHistorico') || '{}');
    const hoy = new Date().toDateString();
    
    // Inicializar datos acumulados de la semana
    let datosDeLaSemana = {
        estadisticas: {},
        ventasTotales: 0,
        ventasTarjeta: 0,
        ventasEfectivo: 0,
        numTransacciones: 0,
        retiros: [],
        transacciones: []
    };
    
    // Iterar desde lunes hasta sábado
    const detallePorDia = [];
    for (let i = 0; i < 6; i++) {
        const fechaActual = new Date(lunesDeLaSemana);
        fechaActual.setDate(fechaActual.getDate() + i);
        const fechaKey = fechaActual.toDateString();
        
        let datosDia;
        if (fechaKey === hoy) {
            datosDia = {
                estadisticas,
                ventasTotales,
                ventasTarjeta,
                ventasEfectivo,
                numTransacciones,
                retiros,
                transacciones
            };
        } else {
            datosDia = historico[fechaKey] || {
                estadisticas: {},
                ventasTotales: 0,
                ventasTarjeta: 0,
                ventasEfectivo: 0,
                numTransacciones: 0,
                retiros: [],
                transacciones: []
            };
        }
        
        // Guardar detalle por día
        detallePorDia.push({
            fecha: new Date(fechaActual),
            ventasTotales: datosDia.ventasTotales || 0,
            ventasTarjeta: datosDia.ventasTarjeta || 0,
            ventasEfectivo: datosDia.ventasEfectivo || 0,
            numTransacciones: datosDia.numTransacciones || 0,
            estadisticas: datosDia.estadisticas || {},
            transacciones: datosDia.transacciones || [],
            retiros: datosDia.retiros || []
        });
        
        // Acumular datos
        datosDeLaSemana.ventasTotales += datosDia.ventasTotales;
        datosDeLaSemana.ventasTarjeta += datosDia.ventasTarjeta;
        datosDeLaSemana.ventasEfectivo += datosDia.ventasEfectivo;
        datosDeLaSemana.numTransacciones += datosDia.numTransacciones;
        datosDeLaSemana.retiros = datosDeLaSemana.retiros.concat(datosDia.retiros || []);
        datosDeLaSemana.transacciones = datosDeLaSemana.transacciones.concat(datosDia.transacciones || []);
        
        // Acumular estadísticas de productos
        Object.keys(datosDia.estadisticas).forEach(productoId => {
            if (!datosDeLaSemana.estadisticas[productoId]) {
                datosDeLaSemana.estadisticas[productoId] = 0;
            }
            datosDeLaSemana.estadisticas[productoId] += datosDia.estadisticas[productoId];
        });
    }
    
    // Crear PDF
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    let y = 20;
    const lineHeight = 7;
    const margin = 20;
    const pageWidth = doc.internal.pageSize.width;
    
    // Título
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.text('REPORTE SEMANAL DE VENTAS', pageWidth / 2, y, { align: 'center' });
    y += 10;
    
    doc.setFontSize(14);
    doc.text('Panadería', pageWidth / 2, y, { align: 'center' });
    y += 10;
    
    doc.setFontSize(11);
    doc.setFont(undefined, 'normal');
    doc.text(`Semana: ${fechaStr}`, pageWidth / 2, y, { align: 'center' });
    y += 15;
    
    // Productos vendidos
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('PRODUCTOS VENDIDOS (TOTAL SEMANAL)', margin, y);
    y += lineHeight;
    
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += lineHeight;
    
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    
    let hayVentas = false;
    productos.forEach(producto => {
        const cantidad = datosDeLaSemana.estadisticas[producto.id] || 0;
        if (cantidad > 0) {
            hayVentas = true;
            if (y > 270) {
                doc.addPage();
                y = 20;
            }
            doc.text(producto.nombre, margin, y);
            doc.text(`${cantidad} unidades`, pageWidth - margin - 30, y);
            y += lineHeight;
        }
    });
    
    if (!hayVentas) {
        doc.text('No hay ventas registradas', margin, y);
        y += lineHeight;
    }
    
    y += 5;
    
    // Resumen de ventas
    if (y > 240) {
        doc.addPage();
        y = 20;
    }
    
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('RESUMEN DE VENTAS SEMANAL', margin, y);
    y += lineHeight;
    
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += lineHeight + 3;
    
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    
    doc.text('Ventas con Tarjeta:', margin, y);
    doc.text(`$${datosDeLaSemana.ventasTarjeta.toFixed(2)}`, pageWidth - margin - 30, y);
    y += lineHeight;
    
    doc.text('Ventas en Efectivo:', margin, y);
    doc.text(`$${datosDeLaSemana.ventasEfectivo.toFixed(2)}`, pageWidth - margin - 30, y);
    y += lineHeight + 3;
    
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += lineHeight;
    
    doc.setFont(undefined, 'bold');
    doc.text('TOTAL DE LA SEMANA:', margin, y);
    doc.text(`$${datosDeLaSemana.ventasTotales.toFixed(2)}`, pageWidth - margin - 30, y);
    y += lineHeight;
    
    doc.setFont(undefined, 'normal');
    doc.text('Transacciones:', margin, y);
    doc.text(`${datosDeLaSemana.numTransacciones}`, pageWidth - margin - 30, y);
    y += lineHeight + 10;
    
    // ======== DETALLE POR DÍA ========
    doc.addPage();
    y = 20;
    
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('DETALLE DIARIO DE TRANSACCIONES', pageWidth / 2, y, { align: 'center' });
    y += 12;
    
    detallePorDia.forEach((dia, index) => {
        // Verificar si el día tiene transacciones
        if (dia.numTransacciones === 0 && (!dia.retiros || dia.retiros.length === 0)) {
            return; // Saltar días sin actividad
        }
        
        // Encabezado del día
        if (y > 250) {
            doc.addPage();
            y = 20;
        }
        
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        const nombreDia = dia.fecha.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
        doc.text(nombreDia.charAt(0).toUpperCase() + nombreDia.slice(1), margin, y);
        y += lineHeight;
        
        doc.setLineWidth(0.5);
        doc.line(margin, y, pageWidth - margin, y);
        y += lineHeight;
        
        // Resumen del día
        doc.setFontSize(9);
        doc.setFont(undefined, 'normal');
        doc.text(`Total: $${dia.ventasTotales.toFixed(2)} | Tarjeta: $${dia.ventasTarjeta.toFixed(2)} | Efectivo: $${dia.ventasEfectivo.toFixed(2)} | Transacciones: ${dia.numTransacciones}`, margin, y);
        y += lineHeight + 2;
        
        // Transacciones del día
        if (dia.transacciones && dia.transacciones.length > 0) {
            doc.setFont(undefined, 'bold');
            doc.setFontSize(10);
            doc.text('Ventas:', margin, y);
            y += lineHeight;
            
            doc.setFont(undefined, 'normal');
            doc.setFontSize(8);
            
            dia.transacciones.forEach((trans, idx) => {
                if (y > 275) {
                    doc.addPage();
                    y = 20;
                }
                
                const hora = new Date(trans.fecha).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
                const metodo = trans.metodoPago === 'tarjeta' ? '💳' : '💵';
                
                // Línea de transacción
                doc.text(`${idx + 1}. ${hora} ${metodo} - $${trans.total.toFixed(2)}`, margin + 3, y);
                y += lineHeight - 1;
                
                // Items de la transacción
                if (trans.items && trans.items.length > 0) {
                    trans.items.forEach(item => {
                        if (y > 275) {
                            doc.addPage();
                            y = 20;
                        }
                        doc.setFontSize(7);
                        doc.setTextColor(100);
                        doc.text(`   • ${item.cantidad}x ${item.nombre} ($${(item.precio * item.cantidad).toFixed(2)})`, margin + 6, y);
                        doc.setTextColor(0);
                        doc.setFontSize(8);
                        y += lineHeight - 2;
                    });
                }
                
                y += 1;
            });
            
            y += 3;
        }
        
        // Retiros del día
        if (dia.retiros && dia.retiros.length > 0) {
            if (y > 260) {
                doc.addPage();
                y = 20;
            }
            
            doc.setFont(undefined, 'bold');
            doc.setFontSize(10);
            doc.text('Retiros:', margin, y);
            y += lineHeight;
            
            doc.setFont(undefined, 'normal');
            doc.setFontSize(8);
            
            dia.retiros.forEach((retiro, idx) => {
                if (y > 275) {
                    doc.addPage();
                    y = 20;
                }
                
                const hora = new Date(retiro.fecha).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
                doc.text(`${idx + 1}. ${hora} - $${retiro.monto.toFixed(2)}`, margin + 3, y);
                y += lineHeight - 1;
                
                doc.setFontSize(7);
                doc.setTextColor(100);
                const maxWidth = pageWidth - 2 * margin - 6;
                const lines = doc.splitTextToSize(`   ${retiro.justificacion}`, maxWidth);
                doc.text(lines, margin + 6, y);
                y += lineHeight - 2 * (lines.length);
                doc.setTextColor(0);
                doc.setFontSize(8);
                y += 2;
            });
            
            y += 3;
        }
        
        y += 5; // Espacio entre días
    });
    
    // Descargar PDF
    const nombreArchivo = `reporte-semanal-${lunesDeLaSemana.getFullYear()}-${(lunesDeLaSemana.getMonth()+1).toString().padStart(2,'0')}-${lunesDeLaSemana.getDate().toString().padStart(2,'0')}.pdf`;
    doc.save(nombreArchivo);
}
function abrirModalReporte() {
    fechaReporteVisualizando = new Date(); // Resetear a hoy
    actualizarVistaReporte();
    document.getElementById('modalReporte').classList.remove('hidden');
}

function cerrarModalReporte() {
    document.getElementById('modalReporte').classList.add('hidden');
}

function cambiarDiaReporte(dias) {
    // Cambiar por días
    fechaReporteVisualizando.setDate(fechaReporteVisualizando.getDate() + dias);
    actualizarVistaReporte();
}

function actualizarVistaReporte() {
    // Mostrar datos del día seleccionado
    const fechaSeleccionada = new Date(fechaReporteVisualizando);
    
    // Mostrar la fecha del día
    const textoFecha = fechaSeleccionada.toLocaleDateString('es-ES', { 
        weekday: 'long', 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
    });
    document.getElementById('reporteFechaModal').textContent = textoFecha.charAt(0).toUpperCase() + textoFecha.slice(1);
    
    // Cargar datos del día seleccionado
    const historico = JSON.parse(localStorage.getItem('panaderiaHistorico') || '{}');
    const hoy = new Date().toDateString();
    const fechaKey = fechaSeleccionada.toDateString();
    
    let datosDelDia;
    if (fechaKey === hoy) {
        // Si es hoy, usar datos actuales
        datosDelDia = {
            estadisticas,
            ventasTotales,
            ventasTarjeta,
            ventasEfectivo,
            numTransacciones,
            retiros,
            transacciones
        };
    } else {
        // Si es otro día, buscar en histórico
        datosDelDia = historico[fechaKey] || {
            estadisticas: {},
            ventasTotales: 0,
            ventasTarjeta: 0,
            ventasEfectivo: 0,
            numTransacciones: 0,
            retiros: [],
            transacciones: []
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
                    <button class="btn-editar" onclick="editarProducto(${producto.id})">âœï¸</button>
                    <button class="btn-eliminar" onclick="eliminarProducto(${producto.id})">ðŸ—‘ï¸</button>
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
    const precioInput = document.getElementById('productoPrecio').value;
    const categoria = document.getElementById('productoCategoria').value;
    const idEdit = document.getElementById('productoIdEdit').value;
    
    const precio = parseFloat(precioInput);
    
    if (!nombre) {
        mostrarNotificacion('Por favor ingresa un nombre', 'error');
        return;
    }
    
    if (!precio || precio <= 0) {
        mostrarNotificacion('Por favor ingresa un precio vÃ¡lido mayor a 0', 'error');
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
            // Remover de categorÃ­a anterior
            categorias[categoriaEncontrada] = categorias[categoriaEncontrada].filter(p => p.id !== id);
            
            // Agregar a nueva categorÃ­a
            productoEncontrado.nombre = nombre;
            productoEncontrado.precio = precio;
            productoEncontrado.categoria = categoria;
            categorias[categoria].push(productoEncontrado);
        }
    } else {
        // Nuevo producto (asegurar ID vÃ¡lido si no hay productos aÃºn)
        const nuevoId = productos.length > 0 ? Math.max(...productos.map(p => p.id)) + 1 : 1;
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
    
    console.log('âœ… Producto guardado. Total de productos:', productos.length);
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
    // Eliminar directamente sin confirmaciÃ³n
    
    // Eliminar de todas las categorÃ­as
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
    
    // Eliminar estadÃ­sticas del producto
    delete estadisticas[id];
    
    // Guardar cambios en localStorage
    guardarDatosLocalStorage();
    
    // Actualizar vistas
    renderizarProductos();
    renderizarListaProductos();
    
    console.log('ðŸ—‘ï¸ Producto eliminado. Total de productos:', productos.length);
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
                mostrarNotificacion('El archivo CSV estÃ¡ vacÃ­o', 'error');
                return;
            }
            
            let productosImportados = 0;
            let errores = [];
            let categoriasCreadas = [];
            
            // Detectar si la primera lÃ­nea es encabezado
            const primeraLinea = lineas[0].toLowerCase();
            const tieneEncabezado = primeraLinea.includes('nombre') || primeraLinea.includes('precio') || primeraLinea.includes('categoria');
            const inicio = tieneEncabezado ? 1 : 0;
            
            // Obtener el ID mÃ¡ximo actual
            let maxId = productos.length > 0 ? Math.max(...productos.map(p => p.id)) : 0;
            
            // Colores predefinidos para categorÃ­as automÃ¡ticas
            const coloresDisponibles = ['#3498db', '#2ecc71', '#e74c3c', '#f39c12', '#9b59b6', '#1abc9c', '#e67e22', '#34495e'];
            
            for (let i = inicio; i < lineas.length; i++) {
                const linea = lineas[i].trim();
                if (!linea) continue;
                
                // Separar por coma (soporta comas en nombres con comillas)
                const valores = linea.match(/(".*?"|[^,]+)(?=\s*,|\s*$)/g);
                
                if (!valores || valores.length < 3) {
                    errores.push(`LÃ­nea ${i + 1}: formato incorrecto`);
                    continue;
                }
                
                const nombre = valores[0].replace(/"/g, '').trim();
                const precio = parseFloat(valores[1].replace(/"/g, '').trim());
                const categoriaNombre = valores[2].replace(/"/g, '').trim();
                
                // Validar datos
                if (!nombre) {
                    errores.push(`LÃ­nea ${i + 1}: nombre vacÃ­o`);
                    continue;
                }
                
                if (isNaN(precio) || precio <= 0) {
                    errores.push(`LÃ­nea ${i + 1}: precio invÃ¡lido (${valores[1]})`);
                    continue;
                }
                
                // Generar clave de categorÃ­a
                const categoriaKey = categoriaNombre
                    .toLowerCase()
                    .normalize('NFD')
                    .replace(/[\u0300-\u036f]/g, '')
                    .replace(/\s+/g, '_')
                    .replace(/[^a-z0-9_]/g, '');
                
                // Si la categorÃ­a no existe, crearla automÃ¡ticamente
                if (!categorias[categoriaKey]) {
                    categorias[categoriaKey] = [];
                    const colorIndex = Object.keys(categorias).length % coloresDisponibles.length;
                    categoriasInfo[categoriaKey] = {
                        nombre: categoriaNombre,
                        color: coloresDisponibles[colorIndex]
                    };
                    categoriasCreadas.push(categoriaNombre);
                }
                
                // Crear nuevo producto
                maxId++;
                const nuevoProducto = {
                    id: maxId,
                    nombre: nombre,
                    precio: precio,
                    categoria: categoriaKey
                };
                
                categorias[categoriaKey].push(nuevoProducto);
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
            actualizarSelectCategorias();
            
            // Mostrar resultado
            let mensaje = `âœ… ${productosImportados} productos importados correctamente`;
            if (categoriasCreadas.length > 0) {
                mensaje += `\n\nðŸ†• CategorÃ­as creadas: ${categoriasCreadas.join(', ')}`;
            }
            if (errores.length > 0) {
                mensaje += `\n\nâš ï¸ ${errores.length} errores:\n${errores.slice(0, 5).join('\n')}`;
                if (errores.length > 5) {
                    mensaje += `\n... y ${errores.length - 5} mÃ¡s`;
                }
            }
            mostrarNotificacion(mensaje, 'success');
            
            console.log('ðŸ“¥ CSV importado:', productosImportados, 'productos', categoriasCreadas.length, 'categorÃ­as creadas');
            
        } catch (error) {
            console.error('âŒ Error al importar CSV:', error);
            mostrarNotificacion('Error al procesar el archivo CSV. Verifica que el formato sea correcto:\nnombre,precio,categoria', 'error');
        }
        
        // Limpiar el input para permitir importar el mismo archivo nuevamente
        event.target.value = '';
    };
    
    lector.readAsText(archivo);
}

// ========== GESTIÃ“N DE CATEGORÃAS ==========

function toggleGestionCategorias() {
    const seccion = document.getElementById('gestionCategorias');
    seccion.classList.toggle('hidden');
    
    if (!seccion.classList.contains('hidden')) {
        renderizarListaCategorias();
    }
}

function mostrarFormularioCategoria() {
    document.getElementById('formularioCategoria').classList.remove('hidden');
    document.getElementById('tituloCategoriaForm').textContent = 'Nueva CategorÃ­a';
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
    const nombre = document.getElementById('categoriaNombre').value.trim();
    const color = document.getElementById('categoriaColor').value;
    const keyEdit = document.getElementById('categoriaKeyEdit').value;
    
    if (!nombre) {
        mostrarNotificacion('Por favor ingresa el nombre de la categorÃ­a', 'error');
        return;
    }
    
    // Generar clave automÃ¡ticamente desde el nombre
    // Convertir a minÃºsculas, quitar acentos y espacios
    const key = nombre
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Quitar acentos
        .replace(/\s+/g, '_') // Reemplazar espacios con guiones bajos
        .replace(/[^a-z0-9_]/g, ''); // Quitar caracteres especiales
    
    if (!key) {
        mostrarNotificacion('El nombre debe contener al menos letras o nÃºmeros', 'error');
        return;
    }
    
    if (!keyEdit && categorias[key]) {
        mostrarNotificacion('Ya existe una categorÃ­a con ese nombre', 'error');
        return;
    }
    
    if (keyEdit && keyEdit !== key) {
        // Editar categorÃ­a (cambiar key)
        categorias[key] = categorias[keyEdit];
        delete categorias[keyEdit];
        
        // Actualizar todos los productos de esa categorÃ­a
        categorias[key].forEach(prod => {
            prod.categoria = key;
        });
        
        delete categoriasInfo[keyEdit];
    } else if (!keyEdit) {
        // Nueva categorÃ­a
        categorias[key] = [];
    }
    
    // Actualizar info de la categorÃ­a
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
        document.getElementById('tituloCategoriaForm').textContent = 'Editar CategorÃ­a';
        document.getElementById('categoriaKeyEdit').value = key;
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
        mostrarNotificacion('Por favor ingresa un monto vÃ¡lido mayor a 0', 'error');
        return;
    }
    
    // Registrar sin confirmaciÃ³n
    
    // Crear registro detallado de la transacciÃ³n manual
    const transaccion = {
        id: Date.now(),
        fecha: new Date().toISOString(),
        items: [{
            id: 'manual',
            nombre: descripcion || 'Venta Manual',
            precio: monto,
            cantidad: 1
        }],
        total: monto,
        metodoPago: metodo,
        montoRecibido: null,
        cambio: 0,
        esVentaManual: true
    };
    
    // Agregar transacciÃ³n al historial
    transacciones.push(transaccion);
    
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
    
    // Actualizar estadÃ­sticas
    actualizarEstadisticas();
    
    // Cerrar modal
    cerrarModalVentaManual();
    
    let mensaje = `âœ… Venta manual registrada: $${monto.toFixed(2)}\nMÃ©todo: ${metodo === 'tarjeta' ? 'Tarjeta' : 'Efectivo'}`;
    if (descripcion) {
        mensaje += `\nDescripciÃ³n: ${descripcion}`;
    }
    mostrarNotificacion(mensaje, 'success');
    
    console.log('ðŸ’° Venta manual registrada:', { monto, metodo, descripcion });
}

function eliminarCategoria(key) {
    if (!categorias[key]) {
        mostrarNotificacion('La categorÃ­a no existe.', 'error');
        return;
    }
    
    if (categorias[key].length > 0) {
        mostrarNotificacion('No se puede eliminar una categorÃ­a que tiene productos. Elimina primero los productos.', 'error');
        return;
    }
    
    // Eliminar sin confirmaciÃ³n
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
                <button class="btn-editar" onclick="editarCategoria('${key}')">âœï¸</button>
                <button class="btn-eliminar" onclick="eliminarCategoria('${key}')">ðŸ—‘ï¸</button>
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
    cargarOperacionesDesdeLocalStorage();
    actualizarBotonesOperacionesRapidas();
    document.getElementById('modalRetiro').classList.remove('hidden');
    document.getElementById('montoRetiro').value = '';
    document.getElementById('justificacionRetiro').value = '';
}

// Cerrar modal de retiro
function cerrarModalRetiro() {
    document.getElementById('modalRetiro').classList.add('hidden');
}

// Seleccionar operaciÃ³n rÃ¡pida de retiro
function seleccionarRetiroRapido(tipo) {
    document.getElementById('justificacionRetiro').value = tipo;
    document.getElementById('montoRetiro').focus();
}

// Confirmar retiro
function confirmarRetiro() {
    const monto = parseFloat(document.getElementById('montoRetiro').value);
    const justificacion = document.getElementById('justificacionRetiro').value.trim();
    
    if (!monto || monto <= 0) {
        mostrarNotificacion('Por favor ingresa un monto vÃ¡lido mayor a 0', 'error');
        return;
    }
    
    if (!justificacion) {
        mostrarNotificacion('Por favor ingresa una justificaciÃ³n para el retiro', 'error');
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
    
    // Actualizar estadÃ­sticas
    actualizarEstadisticas();
    
    // Cerrar modal
    cerrarModalRetiro();
    
    mostrarNotificacion(`Retiro registrado: $${monto.toFixed(2)}\nJustificaciÃ³n: ${justificacion}`, 'success');
}

// ===== FUNCIONES DE INGRESOS DE EFECTIVO =====

let ingresos = []; // Array para almacenar los ingresos de efectivo

// Abrir modal de ingreso
function abrirModalIngreso() {
    cargarOperacionesDesdeLocalStorage();
    actualizarBotonesOperacionesRapidas();
    document.getElementById('modalIngreso').classList.remove('hidden');
    document.getElementById('montoIngreso').value = '';
    document.getElementById('conceptoIngreso').value = '';
}

// Cerrar modal de ingreso
function cerrarModalIngreso() {
    document.getElementById('modalIngreso').classList.add('hidden');
}

// Seleccionar operaciÃ³n rÃ¡pida de ingreso
function seleccionarIngresoRapido(tipo) {
    document.getElementById('conceptoIngreso').value = tipo;
    document.getElementById('montoIngreso').focus();
}

// Confirmar ingreso
function confirmarIngreso() {
    const monto = parseFloat(document.getElementById('montoIngreso').value);
    const concepto = document.getElementById('conceptoIngreso').value.trim();
    
    if (!monto || monto <= 0) {
        mostrarNotificacion('Por favor ingresa un monto vÃ¡lido mayor a 0', 'error');
        return;
    }
    
    if (!concepto) {
        mostrarNotificacion('Por favor ingresa un concepto para el ingreso', 'error');
        return;
    }
    
    // Crear registro del ingreso
    const ingreso = {
        id: Date.now(),
        fecha: new Date().toISOString(),
        monto: monto,
        concepto: concepto
    };
    
    // Agregar al array de ingresos
    if (!ingresos) ingresos = [];
    ingresos.push(ingreso);
    
    // Sumar al efectivo disponible
    ventasEfectivo += monto;
    ventasTotales += monto;
    
    // Guardar en localStorage
    guardarDatosLocalStorage();
    
    // Actualizar estadÃ­sticas
    actualizarEstadisticas();
    
    // Cerrar modal
    cerrarModalIngreso();
    
    mostrarNotificacion(`Ingreso registrado: $${monto.toFixed(2)}\nConcepto: ${concepto}`, 'success');
}

// ===== CONFIGURACIÃ“N DE OPERACIONES RÃPIDAS =====

// Abrir modal de configuraciÃ³n de operaciones
function abrirModalConfigOperaciones() {
    cargarOperacionesDesdeLocalStorage();
    renderizarOperaciones();
    document.getElementById('modalConfigOperaciones').classList.remove('hidden');
}

// Cerrar modal de configuraciÃ³n
function cerrarModalConfigOperaciones() {
    document.getElementById('modalConfigOperaciones').classList.add('hidden');
    cancelarFormularioOperacion();
}

// Renderizar listas de operaciones
function renderizarOperaciones() {
    // Renderizar retiros
    const listaRetiros = document.getElementById('listaOperacionesRetiro');
    listaRetiros.innerHTML = '';
    
    if (operacionesRetiro.length === 0) {
        listaRetiros.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">No hay operaciones configuradas</p>';
    } else {
        operacionesRetiro.forEach(op => {
            const div = document.createElement('div');
            div.className = 'operacion-item';
            div.innerHTML = `
                <div class="operacion-item-info">
                    <span class="operacion-item-emoji">${op.emoji}</span>
                    <span>${op.nombre}</span>
                </div>
                <div class="operacion-item-acciones">
                    <button class="btn-editar-op" onclick="editarOperacion('retiro', ${op.id})">âœï¸ Editar</button>
                    <button class="btn-eliminar-op" onclick="eliminarOperacion('retiro', ${op.id})">ðŸ—‘ï¸</button>
                </div>
            `;
            listaRetiros.appendChild(div);
        });
    }
    
    // Renderizar ingresos
    const listaIngresos = document.getElementById('listaOperacionesIngreso');
    listaIngresos.innerHTML = '';
    
    if (operacionesIngreso.length === 0) {
        listaIngresos.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">No hay operaciones configuradas</p>';
    } else {
        operacionesIngreso.forEach(op => {
            const div = document.createElement('div');
            div.className = 'operacion-item';
            div.innerHTML = `
                <div class="operacion-item-info">
                    <span class="operacion-item-emoji">${op.emoji}</span>
                    <span>${op.nombre}</span>
                </div>
                <div class="operacion-item-acciones">
                    <button class="btn-editar-op" onclick="editarOperacion('ingreso', ${op.id})">âœï¸ Editar</button>
                    <button class="btn-eliminar-op" onclick="eliminarOperacion('ingreso', ${op.id})">ðŸ—‘ï¸</button>
                </div>
            `;
            listaIngresos.appendChild(div);
        });
    }
    
    // Actualizar botones en los modales de retiro e ingreso
    actualizarBotonesOperacionesRapidas();
}

// Actualizar botones de operaciones rÃ¡pidas en los modales
function actualizarBotonesOperacionesRapidas() {
    // Actualizar modal de retiro
    const modalRetiro = document.getElementById('modalRetiro');
    const containerRetiro = modalRetiro.querySelector('.modal-body > .form-group:first-child > div');
    
    if (containerRetiro) {
        containerRetiro.innerHTML = '';
        operacionesRetiro.forEach(op => {
            const btn = document.createElement('button');
            btn.className = 'btn-operacion-rapida';
            btn.textContent = `${op.emoji} ${op.nombre}`;
            btn.onclick = () => seleccionarRetiroRapido(op.nombre);
            containerRetiro.appendChild(btn);
        });
    }
    
    // Actualizar modal de ingreso
    const modalIngreso = document.getElementById('modalIngreso');
    const containerIngreso = modalIngreso.querySelector('.modal-body > .form-group:first-child > div');
    
    if (containerIngreso) {
        containerIngreso.innerHTML = '';
        operacionesIngreso.forEach(op => {
            const btn = document.createElement('button');
            btn.className = 'btn-operacion-rapida';
            btn.textContent = `${op.emoji} ${op.nombre}`;
            btn.onclick = () => seleccionarIngresoRapido(op.nombre);
            containerIngreso.appendChild(btn);
        });
    }
}

// Mostrar formulario para agregar/editar operaciÃ³n
function mostrarFormularioOperacion(tipo) {
    document.getElementById('formularioOperacion').classList.remove('hidden');
    document.getElementById('tituloOperacionForm').textContent = tipo === 'retiro' ? 'Nueva OperaciÃ³n de Retiro' : 'Nueva OperaciÃ³n de Ingreso';
    document.getElementById('operacionIdEdit').value = '';
    document.getElementById('operacionTipoEdit').value = tipo;
    document.getElementById('operacionEmoji').value = '';
    document.getElementById('operacionNombre').value = '';
}

// Cancelar formulario
function cancelarFormularioOperacion() {
    document.getElementById('formularioOperacion').classList.add('hidden');
    document.getElementById('operacionIdEdit').value = '';
    document.getElementById('operacionTipoEdit').value = '';
    document.getElementById('operacionEmoji').value = '';
    document.getElementById('operacionNombre').value = '';
}

// Guardar operaciÃ³n
function guardarOperacion() {
    const emoji = document.getElementById('operacionEmoji').value.trim();
    const nombre = document.getElementById('operacionNombre').value.trim();
    const tipo = document.getElementById('operacionTipoEdit').value;
    const idEdit = document.getElementById('operacionIdEdit').value;
    
    if (!emoji) {
        mostrarNotificacion('Por favor ingresa un emoji', 'error');
        return;
    }
    
    if (!nombre) {
        mostrarNotificacion('Por favor ingresa un nombre', 'error');
        return;
    }
    
    const lista = tipo === 'retiro' ? operacionesRetiro : operacionesIngreso;
    
    if (idEdit) {
        // Editar existente
        const id = parseInt(idEdit);
        const operacion = lista.find(op => op.id === id);
        if (operacion) {
            operacion.emoji = emoji;
            operacion.nombre = nombre;
        }
    } else {
        // Nuevo
        const maxId = lista.length > 0 ? Math.max(...lista.map(op => op.id)) : 0;
        lista.push({
            id: maxId + 1,
            emoji: emoji,
            nombre: nombre
        });
    }
    
    guardarOperacionesEnLocalStorage();
    renderizarOperaciones();
    cancelarFormularioOperacion();
}

// Editar operaciÃ³n
function editarOperacion(tipo, id) {
    const lista = tipo === 'retiro' ? operacionesRetiro : operacionesIngreso;
    const operacion = lista.find(op => op.id === id);
    
    if (operacion) {
        document.getElementById('formularioOperacion').classList.remove('hidden');
        document.getElementById('tituloOperacionForm').textContent = tipo === 'retiro' ? 'Editar OperaciÃ³n de Retiro' : 'Editar OperaciÃ³n de Ingreso';
        document.getElementById('operacionIdEdit').value = operacion.id;
        document.getElementById('operacionTipoEdit').value = tipo;
        document.getElementById('operacionEmoji').value = operacion.emoji;
        document.getElementById('operacionNombre').value = operacion.nombre;
    }
}

// Eliminar operaciÃ³n
function eliminarOperacion(tipo, id) {
    // Eliminar directamente sin confirmaciÃ³n
    if (tipo === 'retiro') {
        operacionesRetiro = operacionesRetiro.filter(op => op.id !== id);
    } else {
        operacionesIngreso = operacionesIngreso.filter(op => op.id !== id);
    }
    
    guardarOperacionesEnLocalStorage();
    renderizarOperaciones();
}

// Guardar operaciones en localStorage
function guardarOperacionesEnLocalStorage() {
    localStorage.setItem('operacionesRetiro', JSON.stringify(operacionesRetiro));
    localStorage.setItem('operacionesIngreso', JSON.stringify(operacionesIngreso));
}

// Cargar operaciones desde localStorage
function cargarOperacionesDesdeLocalStorage() {
    const retirosGuardados = localStorage.getItem('operacionesRetiro');
    const ingresosGuardados = localStorage.getItem('operacionesIngreso');
    
    if (retirosGuardados) {
        operacionesRetiro = JSON.parse(retirosGuardados);
    }
    
    if (ingresosGuardados) {
        operacionesIngreso = JSON.parse(ingresosGuardados);
    }
    
    // Actualizar botones en los modales
    actualizarBotonesOperacionesRapidas();
}

// ===== MODO REORDENAR PRODUCTOS =====

// Agregar separador
function agregarSeparador() {
    const nombre = prompt('Nombre del separador:', '');
    
    if (!nombre || nombre.trim() === '') {
        return;
    }
    
    const nuevoId = productos.length > 0 ? Math.max(...productos.map(p => p.id)) + 1 : 1;
    const separador = {
        id: nuevoId,
        nombre: nombre.trim(),
        precio: 0,
        categoria: categoriaActiva,
        esSubcategoria: true
    };
    
    categorias[categoriaActiva].push(separador);
    
    // Actualizar array de productos
    productos.length = 0;
    Object.keys(categorias).forEach(cat => {
        productos.push(...categorias[cat]);
    });
    
    guardarDatosLocalStorage();
    renderizarProductos();
    mostrarNotificacion('Separador agregado correctamente');
}

// Mover producto/separador arriba o abajo
function moverProducto(index, direccion) {
    const nuevaPosicion = index + direccion;
    
    // Verificar lÃ­mites
    if (nuevaPosicion < 0 || nuevaPosicion >= categorias[categoriaActiva].length) {
        return;
    }
    
    // Intercambiar posiciones
    const temp = categorias[categoriaActiva][index];
    categorias[categoriaActiva][index] = categorias[categoriaActiva][nuevaPosicion];
    categorias[categoriaActiva][nuevaPosicion] = temp;
    
    // Actualizar array de productos
    productos.length = 0;
    Object.keys(categorias).forEach(cat => {
        productos.push(...categorias[cat]);
    });
    
    guardarDatosLocalStorage();
    renderizarProductos();
}

// Eliminar separador
function eliminarSeparador(id) {
    // Eliminar directamente sin confirmaciÃ³n
    
    categorias[categoriaActiva] = categorias[categoriaActiva].filter(p => p.id !== id);
    
    // Actualizar array de productos
    productos.length = 0;
    Object.keys(categorias).forEach(cat => {
        productos.push(...categorias[cat]);
    });
    
    guardarDatosLocalStorage();
    renderizarProductos();
    mostrarNotificacion('Separador eliminado');
}

// Activar/desactivar modo reordenar
function toggleModoReordenar() {
    modoReordenar = !modoReordenar;
    const btn = document.getElementById('btnReordenar');
    
    if (modoReordenar) {
        btn.textContent = 'âœ… Guardar Orden';
        btn.style.background = 'linear-gradient(135deg, #28a745 0%, #20c997 100%)';
        // Mostrar mensaje de ayuda
        mostrarNotificacion('Arrastra los productos para reordenarlos');
    } else {
        btn.textContent = 'ðŸ”€ Reordenar Productos';
        btn.style.background = '';
        // Guardar el orden
        guardarOrdenProductos();
        mostrarNotificacion('Orden guardado correctamente');
    }
    
    renderizarProductos();
}

// Guardar orden de productos
function guardarOrdenProductos() {
    const ordenPorCategoria = {};
    
    Object.keys(categorias).forEach(categoriaKey => {
        ordenPorCategoria[categoriaKey] = categorias[categoriaKey].map(p => p.id);
    });
    
    localStorage.setItem('ordenProductos', JSON.stringify(ordenPorCategoria));
}

// Cargar orden de productos
function cargarOrdenProductos() {
    const ordenGuardado = localStorage.getItem('ordenProductos');
    
    if (ordenGuardado) {
        try {
            const ordenPorCategoria = JSON.parse(ordenGuardado);
            
            // Reordenar productos segÃºn el orden guardado
            Object.keys(ordenPorCategoria).forEach(categoriaKey => {
                if (categorias[categoriaKey]) {
                    const orden = ordenPorCategoria[categoriaKey];
                    const productosOrdenados = [];
                    
                    // Primero agregar los productos en el orden guardado
                    orden.forEach(id => {
                        const producto = categorias[categoriaKey].find(p => p.id === id);
                        if (producto) {
                            productosOrdenados.push(producto);
                        }
                    });
                    
                    // Agregar productos nuevos que no estÃ©n en el orden guardado
                    categorias[categoriaKey].forEach(producto => {
                        if (!orden.includes(producto.id)) {
                            productosOrdenados.push(producto);
                        }
                    });
                    
                    categorias[categoriaKey] = productosOrdenados;
                }
            });
        } catch (error) {
            console.error('Error al cargar orden de productos:', error);
        }
    }
}

// Mostrar notificaciÃ³n temporal
function mostrarNotificacion(mensaje) {
    const notificacion = document.createElement('div');
    notificacion.textContent = mensaje;
    notificacion.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: #333;
        color: white;
        padding: 15px 30px;
        border-radius: 10px;
        z-index: 10000;
        font-weight: 600;
        box-shadow: 0 4px 15px rgba(0,0,0,0.3);
        animation: slideDown 0.3s ease-out;
    `;
    
    document.body.appendChild(notificacion);
    
    setTimeout(() => {
        notificacion.style.opacity = '0';
        notificacion.style.transform = 'translateX(-50%) translateY(-20px)';
        notificacion.style.transition = 'all 0.3s ease-out';
        setTimeout(() => {
            document.body.removeChild(notificacion);
        }, 300);
    }, 2500);
}

// Eventos de arrastrar
function handleDragStart(e, producto) {
    if (!modoReordenar) return;
    elementoArrastrado = producto;
    e.target.style.opacity = '0.5';
}

function handleDragEnd(e) {
    if (!modoReordenar) return;
    e.target.style.opacity = '1';
}

function handleDragOver(e) {
    if (!modoReordenar) return;
    e.preventDefault();
    return false;
}

function handleDrop(e, productoDestino) {
    if (!modoReordenar) return;
    e.stopPropagation();
    e.preventDefault();
    
    if (elementoArrastrado && elementoArrastrado.id !== productoDestino.id) {
        // Obtener Ã­ndices
        const productosCategoria = categorias[categoriaActiva];
        const indiceOrigen = productosCategoria.findIndex(p => p.id === elementoArrastrado.id);
        const indiceDestino = productosCategoria.findIndex(p => p.id === productoDestino.id);
        
        if (indiceOrigen !== -1 && indiceDestino !== -1) {
            // Reordenar
            productosCategoria.splice(indiceOrigen, 1);
            productosCategoria.splice(indiceDestino, 0, elementoArrastrado);
            
            // Re-renderizar
            renderizarProductos();
        }
    }
    
    return false;
}

// =====================================================
// SISTEMA MEJORADO DE REPORTES Y ANÁLISIS
// =====================================================

// Variables globales para los gráficos
let chartVentasPorHora = null;
let chartTendenciaSemanal = null;
let chartDistribucion = null;
let chartComparativa = null;
let tabActualReporte = 'resumen';

// Cambiar entre pestañas del reporte
function cambiarTabReporte(tab) {
    // Actualizar pestañas
    document.querySelectorAll('.reporte-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.reporte-tab-content').forEach(c => c.classList.remove('active'));
    
    event.target.classList.add('active');
    document.getElementById('tab' + tab.charAt(0).toUpperCase() + tab.slice(1)).classList.add('active');
    
    tabActualReporte = tab;
    
    // Renderizar contenido específico de la pestaña
    if (tab === 'graficos') {
        renderizarGraficos();
    } else if (tab === 'comparativa') {
        actualizarComparativa();
    } else if (tab === 'detalles') {
        renderizarDetalles();
    }
}

// Actualizar vista de reporte mejorada
function actualizarVistaReporte() {
    // Mostrar datos del día seleccionado
    const fechaSeleccionada = new Date(fechaReporteVisualizando);
    
    // Mostrar la fecha del día
    const textoFecha = fechaSeleccionada.toLocaleDateString('es-ES', { 
        weekday: 'long', 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
    });
    document.getElementById('reporteFechaModal').textContent = textoFecha.charAt(0).toUpperCase() + textoFecha.slice(1);
    
    // Cargar datos del día seleccionado
    const historico = JSON.parse(localStorage.getItem('panaderiaHistorico') || '{}');
    const hoy = new Date().toDateString();
    const fechaKey = fechaSeleccionada.toDateString();
    
    let datosDelDia;
    if (fechaKey === hoy) {
        datosDelDia = {
            estadisticas,
            ventasTotales,
            ventasTarjeta,
            ventasEfectivo,
            numTransacciones,
            retiros,
            transacciones
        };
    } else {
        datosDelDia = historico[fechaKey] || {
            estadisticas: {},
            ventasTotales: 0,
            ventasTarjeta: 0,
            ventasEfectivo: 0,
            numTransacciones: 0,
            retiros: [],
            transacciones: []
        };
    }
    
    // Obtener datos del día anterior para comparación
    const fechaAnterior = new Date(fechaSeleccionada);
    fechaAnterior.setDate(fechaAnterior.getDate() - 1);
    const fechaAnteriorKey = fechaAnterior.toDateString();
    const datosAyer = historico[fechaAnteriorKey] || { ventasTotales: 0, numTransacciones: 0 };
    
    // Actualizar métricas principales con comparativas
    actualizarMetricaPrincipal('metricaTotal', datosDelDia.ventasTotales, datosAyer.ventasTotales);
    actualizarMetricaPrincipal('metricaTransacciones', datosDelDia.numTransacciones, datosAyer.numTransacciones, false);
    
    const ticketPromedio = datosDelDia.numTransacciones > 0 ? datosDelDia.ventasTotales / datosDelDia.numTransacciones : 0;
    const ticketPromedioAyer = datosAyer.numTransacciones > 0 ? datosAyer.ventasTotales / datosAyer.numTransacciones : 0;
    actualizarMetricaPrincipal('metricaTicketPromedio', ticketPromedio, ticketPromedioAyer);
    
    // Producto más vendido
    const productoMasVendido = obtenerProductoMasVendido(datosDelDia.estadisticas);
    document.getElementById('metricaMasVendido').textContent = productoMasVendido || '-';
    
    // Actualizar métodos de pago con barras visuales
    const total = datosDelDia.ventasTotales || 0.01; // Evitar división por cero
    const porcentajeTarjeta = (datosDelDia.ventasTarjeta / total) * 100;
    const porcentajeEfectivo = (datosDelDia.ventasEfectivo / total) * 100;
    
    document.getElementById('reporteTarjeta').textContent = datosDelDia.ventasTarjeta.toFixed(2);
    document.getElementById('reporteEfectivo').textContent = datosDelDia.ventasEfectivo.toFixed(2);
    document.getElementById('barraTarjeta').style.width = porcentajeTarjeta + '%';
    document.getElementById('barraEfectivo').style.width = porcentajeEfectivo + '%';
    document.getElementById('porcentajeTarjeta').textContent = porcentajeTarjeta.toFixed(1) + '%';
    document.getElementById('porcentajeEfectivo').textContent = porcentajeEfectivo.toFixed(1) + '%';
    
    // Top 5 productos más vendidos
    renderizarTopProductos(datosDelDia.estadisticas);
    
    // Actualizar retiros (mismo código que antes)
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
    
    // Generar alertas inteligentes
    generarAlertas(datosDelDia, datosAyer);
}

// Actualizar métrica principal con indicador de cambio
function actualizarMetricaPrincipal(id, valorActual, valorAnterior, esDinero = true) {
    const elemento = document.getElementById(id);
    if (elemento) {
        elemento.textContent = esDinero ? valorActual.toFixed(2) : valorActual;
    }
    
    const cambioElemento = document.getElementById(id + 'Cambio');
    if (cambioElemento && valorAnterior > 0) {
        const diferencia = valorActual - valorAnterior;
        const porcentaje = (diferencia / valorAnterior) * 100;
        
        cambioElemento.classList.remove('positivo', 'negativo', 'neutral');
        
        if (Math.abs(porcentaje) < 1) {
            cambioElemento.classList.add('neutral');
            cambioElemento.textContent = 'Sin cambios';
        } else if (diferencia > 0) {
            cambioElemento.classList.add('positivo');
            cambioElemento.textContent = `${porcentaje.toFixed(1)}% vs ayer`;
        } else {
            cambioElemento.classList.add('negativo');
            cambioElemento.textContent = `${Math.abs(porcentaje).toFixed(1)}% vs ayer`;
        }
    } else if (cambioElemento) {
        cambioElemento.textContent = '';
    }
}

// Obtener producto más vendido
function obtenerProductoMasVendido(estadisticas) {
    let maxCantidad = 0;
    let productoMasVendido = null;
    
    Object.keys(estadisticas).forEach(productoId => {
        const cantidad = estadisticas[productoId];
        if (cantidad > maxCantidad) {
            maxCantidad = cantidad;
            const producto = productos.find(p => p.id == productoId);
            if (producto) {
                productoMasVendido = producto.nombre;
            }
        }
    });
    
    return productoMasVendido;
}

// Renderizar top 5 productos
function renderizarTopProductos(estadisticas) {
    const topProductos = document.getElementById('topProductos');
    topProductos.innerHTML = '';
    
    // Crear array de productos con cantidades
    const productosConCantidad = [];
    Object.keys(estadisticas).forEach(productoId => {
        const cantidad = estadisticas[productoId];
        if (cantidad > 0) {
            const producto = productos.find(p => p.id == productoId);
            if (producto) {
                productosConCantidad.push({
                    nombre: producto.nombre,
                    cantidad: cantidad
                });
            }
        }
    });
    
    // Ordenar por cantidad descendente
    productosConCantidad.sort((a, b) => b.cantidad - a.cantidad);
    
    // Tomar top 5
    const top5 = productosConCantidad.slice(0, 5);
    
    if (top5.length === 0) {
        topProductos.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">No hay ventas registradas</p>';
        return;
    }
    
    const maxCantidad = top5[0].cantidad;
    
    top5.forEach((producto, index) => {
        const porcentaje = (producto.cantidad / maxCantidad) * 100;
        
        const itemDiv = document.createElement('div');
        itemDiv.className = 'top-producto-item';
        itemDiv.innerHTML = `
            <div class="top-producto-posicion">#${index + 1}</div>
            <div class="top-producto-info">
                <div class="top-producto-nombre">${producto.nombre}</div>
                <div class="top-producto-barra">
                    <div class="top-producto-barra-fill" style="width: ${porcentaje}%"></div>
                </div>
            </div>
            <div class="top-producto-cantidad">${producto.cantidad} unidades</div>
        `;
        
        topProductos.appendChild(itemDiv);
    });
}

// Renderizar gráficos
function renderizarGraficos() {
    renderizarGraficoVentasPorHora();
    renderizarGraficoTendenciaSemanal();
    renderizarGraficoDistribucion();
}

// Gráfico de ventas por hora
function renderizarGraficoVentasPorHora() {
    const canvas = document.getElementById('chartVentasPorHora');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    // Destruir gráfico anterior si existe
    if (chartVentasPorHora) {
        chartVentasPorHora.destroy();
    }
    
    // Obtener datos del día actual
    const fechaSeleccionada = new Date(fechaReporteVisualizando);
    const historico = JSON.parse(localStorage.getItem('panaderiaHistorico') || '{}');
    const hoy = new Date().toDateString();
    const fechaKey = fechaSeleccionada.toDateString();
    
    let datosDelDia;
    if (fechaKey === hoy) {
        datosDelDia = { transacciones };
    } else {
        datosDelDia = historico[fechaKey] || { transacciones: [] };
    }
    
    // Agrupar ventas por hora
    const ventasPorHora = new Array(24).fill(0);
    
    (datosDelDia.transacciones || []).forEach(trans => {
        const fecha = new Date(trans.fecha);
        const hora = fecha.getHours();
        ventasPorHora[hora] += trans.total;
    });
    
    // Crear gráfico
    chartVentasPorHora = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Array.from({length: 24}, (_, i) => `${i}:00`),
            datasets: [{
                label: 'Ventas ($)',
                data: ventasPorHora,
                backgroundColor: 'rgba(30, 60, 114, 0.7)',
                borderColor: 'rgba(30, 60, 114, 1)',
                borderWidth: 2,
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return '$' + context.parsed.y.toFixed(2);
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '$' + value;
                        }
                    }
                }
            }
        }
    });
}

// Gráfico de tendencia semanal
function renderizarGraficoTendenciaSemanal() {
    const canvas = document.getElementById('chartTendenciaSemanal');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    if (chartTendenciaSemanal) {
        chartTendenciaSemanal.destroy();
    }
    
    // Obtener datos de los últimos 7 días
    const historico = JSON.parse(localStorage.getItem('panaderiaHistorico') || '{}');
    const hoy = new Date();
    
    const labels = [];
    const datosVentas = [];
    const datosTransacciones = [];
    
    for (let i = 6; i >= 0; i--) {
        const fecha = new Date(hoy);
        fecha.setDate(fecha.getDate() - i);
        const fechaKey = fecha.toDateString();
        
        const diaNombre = fecha.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' });
        labels.push(diaNombre);
        
        if (fechaKey === hoy.toDateString()) {
            datosVentas.push(ventasTotales);
            datosTransacciones.push(numTransacciones);
        } else {
            const datosDia = historico[fechaKey] || { ventasTotales: 0, numTransacciones: 0 };
            datosVentas.push(datosDia.ventasTotales);
            datosTransacciones.push(datosDia.numTransacciones);
        }
    }
    
    chartTendenciaSemanal = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Ventas ($)',
                    data: datosVentas,
                    borderColor: 'rgba(30, 60, 114, 1)',
                    backgroundColor: 'rgba(30, 60, 114, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    yAxisID: 'y'
                },
                {
                    label: 'Transacciones',
                    data: datosTransacciones,
                    borderColor: 'rgba(16, 185, 129, 1)',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                }
            },
            scales: {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    ticks: {
                        callback: function(value) {
                            return '$' + value;
                        }
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    grid: {
                        drawOnChartArea: false,
                    }
                }
            }
        }
    });
}

// Gráfico de distribución (pie)
function renderizarGraficoDistribucion() {
    const canvas = document.getElementById('chartDistribucion');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    if (chartDistribucion) {
        chartDistribucion.destroy();
    }
    
    // Obtener datos del día actual
    const fechaSeleccionada = new Date(fechaReporteVisualizando);
    const historico = JSON.parse(localStorage.getItem('panaderiaHistorico') || '{}');
    const hoy = new Date().toDateString();
    const fechaKey = fechaSeleccionada.toDateString();
    
    let datosDelDia;
    if (fechaKey === hoy) {
        datosDelDia = { ventasTarjeta, ventasEfectivo };
    } else {
        datosDelDia = historico[fechaKey] || { ventasTarjeta: 0, ventasEfectivo: 0 };
    }
    
    chartDistribucion = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Tarjeta', 'Efectivo'],
            datasets: [{
                data: [datosDelDia.ventasTarjeta, datosDelDia.ventasEfectivo],
                backgroundColor: [
                    'rgba(59, 130, 246, 0.8)',
                    'rgba(16, 185, 129, 0.8)'
                ],
                borderColor: [
                    'rgba(59, 130, 246, 1)',
                    'rgba(16, 185, 129, 1)'
                ],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                            return `${label}: $${value.toFixed(2)} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

// Actualizar comparativa
function actualizarComparativa() {
    const selector = document.getElementById('comparativaSelector');
    const tipo = selector.value;
    
    const fechaSeleccionada = new Date(fechaReporteVisualizando);
    const historico = JSON.parse(localStorage.getItem('panaderiaHistorico') || '{}');
    const hoy = new Date().toDateString();
    const fechaKey = fechaSeleccionada.toDateString();
    
    // Datos del día actual
    let datosHoy;
    if (fechaKey === hoy) {
        datosHoy = { ventasTotales, ventasTarjeta, ventasEfectivo, numTransacciones };
    } else {
        datosHoy = historico[fechaKey] || { ventasTotales: 0, ventasTarjeta: 0, ventasEfectivo: 0, numTransacciones: 0 };
    }
    
    // Datos de comparación
    let datosComparacion;
    let labelComparacion;
    
    if (tipo === 'ayer') {
        const ayer = new Date(fechaSeleccionada);
        ayer.setDate(ayer.getDate() - 1);
        const ayerKey = ayer.toDateString();
        datosComparacion = historico[ayerKey] || { ventasTotales: 0, ventasTarjeta: 0, ventasEfectivo: 0, numTransacciones: 0 };
        labelComparacion = 'Ayer';
    } else if (tipo === 'semana-pasada') {
        const semanaPasada = new Date(fechaSeleccionada);
        semanaPasada.setDate(semanaPasada.getDate() - 7);
        const semanaKey = semanaPasada.toDateString();
        datosComparacion = historico[semanaKey] || { ventasTotales: 0, ventasTarjeta: 0, ventasEfectivo: 0, numTransacciones: 0 };
        labelComparacion = 'Hace 1 semana';
    } else {
        // Promedio de la semana
        let sumaVentas = 0, sumaTransacciones = 0, dias = 0;
        for (let i = 0; i < 7; i++) {
            const fecha = new Date(fechaSeleccionada);
            fecha.setDate(fecha.getDate() - i);
            const key = fecha.toDateString();
            const datos = key === hoy ? { ventasTotales, numTransacciones } : (historico[key] || {});
            if (datos.ventasTotales) {
                sumaVentas += datos.ventasTotales;
                sumaTransacciones += datos.numTransacciones || 0;
                dias++;
            }
        }
        datosComparacion = {
            ventasTotales: dias > 0 ? sumaVentas / dias : 0,
            numTransacciones: dias > 0 ? sumaTransacciones / dias : 0
        };
        labelComparacion = 'Promedio semanal';
    }
    
    // Renderizar grid de comparación
    const grid = document.getElementById('comparativaGrid');
    grid.innerHTML = '';
    
    const metricas = [
        { key: 'ventasTotales', label: 'Total de Ventas', simbolo: '$' },
        { key: 'numTransacciones', label: 'Transacciones', simbolo: '' }
    ];
    
    metricas.forEach(metrica => {
        const valorHoy = datosHoy[metrica.key] || 0;
        const valorComparacion = datosComparacion[metrica.key] || 0;
        const diferencia = valorHoy - valorComparacion;
        const porcentaje = valorComparacion > 0 ? (diferencia / valorComparacion) * 100 : 0;
        
        let claseColor = 'neutral';
        if (Math.abs(porcentaje) >= 1) {
            claseColor = diferencia > 0 ? 'positivo' : 'negativo';
        }
        
        const itemDiv = document.createElement('div');
        itemDiv.className = 'comparativa-item';
        itemDiv.innerHTML = `
            <h5>${metrica.label}</h5>
            <div class="comparativa-valores">
                <span class="comparativa-hoy">${metrica.simbolo}${valorHoy.toFixed(metrica.simbolo ? 2 : 0)}</span>
                <span class="comparativa-anterior">${labelComparacion}: ${metrica.simbolo}${valorComparacion.toFixed(metrica.simbolo ? 2 : 0)}</span>
            </div>
            <div class="comparativa-diferencia ${claseColor}">
                ${diferencia > 0 ? '+' : ''}${porcentaje.toFixed(1)}%
            </div>
        `;
        
        grid.appendChild(itemDiv);
    });
    
    // Renderizar gráfico comparativo
    renderizarGraficoComparativa(datosHoy, datosComparacion, labelComparacion);
}

// Gráfico comparativo
function renderizarGraficoComparativa(datosHoy, datosComparacion, labelComparacion) {
    const canvas = document.getElementById('chartComparativa');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    if (chartComparativa) {
        chartComparativa.destroy();
    }
    
    chartComparativa = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Total Ventas', 'Tarjeta', 'Efectivo', 'Transacciones'],
            datasets: [
                {
                    label: 'Hoy',
                    data: [
                        datosHoy.ventasTotales || 0,
                        datosHoy.ventasTarjeta || 0,
                        datosHoy.ventasEfectivo || 0,
                        datosHoy.numTransacciones || 0
                    ],
                    backgroundColor: 'rgba(30, 60, 114, 0.7)',
                    borderColor: 'rgba(30, 60, 114, 1)',
                    borderWidth: 2
                },
                {
                    label: labelComparacion,
                    data: [
                        datosComparacion.ventasTotales || 0,
                        datosComparacion.ventasTarjeta || 0,
                        datosComparacion.ventasEfectivo || 0,
                        datosComparacion.numTransacciones || 0
                    ],
                    backgroundColor: 'rgba(107, 114, 128, 0.7)',
                    borderColor: 'rgba(107, 114, 128, 1)',
                    borderWidth: 2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

// Renderizar detalles
function renderizarDetalles() {
    // Obtener datos del día
    const fechaSeleccionada = new Date(fechaReporteVisualizando);
    const historico = JSON.parse(localStorage.getItem('panaderiaHistorico') || '{}');
    const hoy = new Date().toDateString();
    const fechaKey = fechaSeleccionada.toDateString();
    
    let datosDelDia;
    if (fechaKey === hoy) {
        datosDelDia = { estadisticas, transacciones };
    } else {
        datosDelDia = historico[fechaKey] || { estadisticas: {}, transacciones: [] };
    }
    
    // Renderizar todos los productos
    const reporteProductos = document.getElementById('reporteProductos');
    reporteProductos.innerHTML = '';
    
    let hayVentas = false;
    productos.forEach(producto => {
        const cantidad = (datosDelDia.estadisticas || {})[producto.id] || 0;
        
        if (cantidad > 0) {
            hayVentas = true;
            const total = cantidad * producto.precio;
            
            const card = document.createElement('div');
            card.className = 'producto-detalle-card';
            card.innerHTML = `
                <div class="producto-detalle-nombre">${producto.nombre}</div>
                <div class="producto-detalle-stats">
                    <div class="producto-detalle-stat">
                        <span>Cantidad:</span>
                        <strong>${cantidad}</strong>
                    </div>
                    <div class="producto-detalle-stat">
                        <span>Total:</span>
                        <strong>$${total.toFixed(2)}</strong>
                    </div>
                </div>
            `;
            
            reporteProductos.appendChild(card);
        }
    });
    
    if (!hayVentas) {
        reporteProductos.innerHTML = '<p style="text-align: center; color: #999; padding: 40px;">No hay productos vendidos en esta fecha</p>';
    }
    
    // Renderizar historial de transacciones
    const historial = document.getElementById('historialTransacciones');
    historial.innerHTML = '';
    
    const transaccionesDelDia = datosDelDia.transacciones || [];
    
    if (transaccionesDelDia.length === 0) {
        historial.innerHTML = '<p style="text-align: center; color: #999; padding: 40px;">No hay transacciones registradas</p>';
        return;
    }
    
    // Ordenar por fecha descendente (más reciente primero)
    transaccionesDelDia.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    
    transaccionesDelDia.forEach((trans, index) => {
        const fecha = new Date(trans.fecha);
        const hora = fecha.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        const metodo = trans.metodoPago === 'tarjeta' ? '💳 Tarjeta' : '💵 Efectivo';
        
        const transDiv = document.createElement('div');
        transDiv.className = 'transaccion-detalle-item';
        
        let itemsHTML = '';
        if (trans.items && trans.items.length > 0) {
            itemsHTML = trans.items.map(item => `
                <div class="transaccion-item">
                    <span>${item.cantidad}x ${item.nombre}</span>
                    <span>$${(item.precio * item.cantidad).toFixed(2)}</span>
                </div>
            `).join('');
        }
        
        transDiv.innerHTML = `
            <div class="transaccion-header">
                <div>
                    <span class="transaccion-hora">#${transaccionesDelDia.length - index} - ${hora}</span>
                    <span style="margin-left: 10px; color: #6b7280;">${metodo}</span>
                </div>
                <span class="transaccion-total">$${trans.total.toFixed(2)}</span>
            </div>
            <div class="transaccion-items">
                ${itemsHTML}
            </div>
        `;
        
        historial.appendChild(transDiv);
    });
}

// Generar alertas inteligentes
function generarAlertas(datosHoy, datosAyer) {
    const alertas = document.getElementById('alertasReporte');
    if (!alertas) return;
    
    alertas.innerHTML = '';
    
    const alertasArray = [];
    
    // Alerta: Ventas muy por debajo del promedio
    if (datosAyer.ventasTotales > 0) {
        const diferencia = ((datosHoy.ventasTotales - datosAyer.ventasTotales) / datosAyer.ventasTotales) * 100;
        
        if (diferencia < -20) {
            alertasArray.push({
                tipo: 'warning',
                icono: '⚠️',
                mensaje: `Las ventas están ${Math.abs(diferencia).toFixed(0)}% por debajo del día anterior`
            });
        } else if (diferencia > 20) {
            alertasArray.push({
                tipo: 'success',
                icono: '🎉',
                mensaje: `¡Excelente! Las ventas aumentaron ${diferencia.toFixed(0)}% respecto a ayer`
            });
        }
    }
    
    // Alerta: Día sin ventas
    if (datosHoy.numTransacciones === 0) {
        alertasArray.push({
            tipo: 'info',
            icono: 'ℹ️',
            mensaje: 'No hay transacciones registradas para este día'
        });
    }
    
    // Alerta: Muy pocas transacciones pero ventas altas
    if (datosHoy.numTransacciones > 0 && datosHoy.numTransacciones < 5 && datosHoy.ventasTotales > 1000) {
        alertasArray.push({
            tipo: 'info',
            icono: '📊',
            mensaje: `Ticket promedio muy alto: $${(datosHoy.ventasTotales / datosHoy.numTransacciones).toFixed(2)}`
        });
    }
    
    // Renderizar alertas
    alertasArray.forEach(alerta => {
        const alertaDiv = document.createElement('div');
        alertaDiv.className = `alerta-item ${alerta.tipo}`;
        alertaDiv.innerHTML = `
            <span class="alerta-icon">${alerta.icono}</span>
            <span class="alerta-texto">${alerta.mensaje}</span>
        `;
        alertas.appendChild(alertaDiv);
    });
}
