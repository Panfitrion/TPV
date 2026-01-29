// Productos de la panadería organizados por categorías
const categorias = {};

// Metadatos de categorías (nombres y colores)
let categoriasInfo = {};

// Array plano de todos los productos
const productos = [];

// Estado de la aplicación
let carrito = [];
let metodoPago = null;
let estadisticas = {};
let ventasTotales = 0;
let ventasTarjeta = 0;
let ventasEfectivo = 0;
let numTransacciones = 0;
let fechaReporteVisualizando = new Date(); // Fecha que se está visualizando en el reporte

// Función para obtener el lunes de una fecha dada
function obtenerLunesDeLaSemana(fecha) {
    const dia = fecha.getDay();
    const diff = fecha.getDate() - dia + (dia === 0 ? -6 : 1); // Ajustar cuando es domingo
    return new Date(fecha.setDate(diff));
}

// Función para obtener el sábado de una semana que comienza en lunes dado
function obtenerSabadoDeLaSemana(lunes) {
    const sabado = new Date(lunes);
    sabado.setDate(sabado.getDate() + 5);
    return sabado;
}
let retiros = []; // Array para almacenar los retiros de efectivo
let categoriaActiva = null; // Categoría actualmente seleccionada
let modoReordenar = false; // Estado del modo reordenar
let elementoArrastrado = null; // Elemento que se está arrastrando

// Operaciones rápidas configurables
let operacionesRetiro = [
    { id: 1, emoji: '🗑️', nombre: 'Basura' },
    { id: 2, emoji: '⛽', nombre: 'Gas' },
    { id: 3, emoji: '📦', nombre: 'Suministros' },
    { id: 4, emoji: '🔧', nombre: 'Mantenimiento' },
    { id: 5, emoji: '🚚', nombre: 'Proveedor' },
    { id: 6, emoji: '💡', nombre: 'Servicios' }
];

let operacionesIngreso = [
    { id: 1, emoji: '💰', nombre: 'Préstamo' },
    { id: 2, emoji: '🎁', nombre: 'Propina' },
    { id: 3, emoji: '↩️', nombre: 'Devolución' },
    { id: 4, emoji: '⚖️', nombre: 'Ajuste' },
    { id: 5, emoji: '💵', nombre: 'Fondo Caja' },
    { id: 6, emoji: '📝', nombre: 'Otros' }
];

// Inicializar estadísticas
productos.forEach(producto => {
    estadisticas[producto.id] = 0;
});

// Inicializar la aplicación
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
    
    // Mostrar mensaje si está en modo reordenar
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
        mensaje.textContent = '🔀 Modo Reordenar Activo - Arrastra los productos para cambiar su orden';
        grid.appendChild(mensaje);
        
        // Botón para agregar separador
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
    
    categorias[categoriaActiva].forEach(producto => {
        const card = document.createElement('div');
        
        // Si es subcategoría, renderizar como separador
        if (producto.esSubcategoria) {
            card.className = 'subcategoria-card';
            card.innerHTML = `
                <div class="subcategoria-nombre">${producto.nombre}</div>
            `;
            
            // En modo reordenar también puede moverse
            if (modoReordenar) {
                card.draggable = true;
                card.style.cursor = 'move';
                card.ondragstart = (e) => handleDragStart(e, producto);
                card.ondragend = handleDragEnd;
                card.ondragover = handleDragOver;
                card.ondrop = (e) => handleDrop(e, producto);
            }
        } else {
            // Producto normal
            card.className = 'producto-card';
            card.style.background = `linear-gradient(135deg, ${categoriasInfo[categoriaActiva]?.color || '#666'} 0%, ${categoriasInfo[categoriaActiva]?.color || '#666'}dd 100%)`;
            
            // Si está en modo reordenar, hacer arrastrable y cambiar cursor
            if (modoReordenar) {
                card.draggable = true;
                card.style.cursor = 'move';
                card.ondragstart = (e) => handleDragStart(e, producto);
                card.ondragend = handleDragEnd;
                card.ondragover = handleDragOver;
                card.ondrop = (e) => handleDrop(e, producto);
            } else {
                card.onclick = () => agregarAlCarrito(producto);
            }
            
            card.innerHTML = `
                <div class="nombre">${producto.nombre}</div>
            `;
        }
        
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
        
        // Guardar catálogo (productos y categorías) en clave separada para mayor robustez
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
        
        console.log('✅ Datos guardados correctamente:', datos);
    } catch (error) {
        console.error('❌ Error al guardar datos:', error);
        alert('Error al guardar los datos. Por favor verifica el espacio disponible.');
    }
}

// Cargar datos de LocalStorage
function cargarDatosLocalStorage() {
    try {
        const catalogoGuardado = localStorage.getItem('panaderiaCatalogo');
        if (catalogoGuardado) {
            try {
                const catalogo = JSON.parse(catalogoGuardado);
                // Cargar categorías y productos desde catálogo persistente
                if (catalogo.categorias) {
                    Object.keys(categorias).forEach(cat => { categorias[cat] = []; });
                    Object.keys(catalogo.categorias).forEach(cat => { categorias[cat] = catalogo.categorias[cat]; });
                    productos.length = 0;
                    Object.keys(categorias).forEach(cat => { if (categorias[cat] && categorias[cat].length > 0) productos.push(...categorias[cat]); });
                    console.log('📦 Catálogo cargado desde panaderiaCatalogo:', productos.length);
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
            
            console.log('📦 Datos encontrados en localStorage:', datos);
            // Cargar categorías y productos siempre (el catálogo debe persistir)
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

            // Si los datos son del mismo día, cargar estadísticas y ventas
            if (datos.fecha === fechaHoy) {
                estadisticas = datos.estadisticas || {};
                ventasTotales = datos.ventasTotales || 0;
                ventasTarjeta = datos.ventasTarjeta || 0;
                ventasEfectivo = datos.ventasEfectivo || 0;
                numTransacciones = datos.numTransacciones || 0;
                retiros = datos.retiros || [];

                // Asegurar que todos los productos tengan estadísticas
                productos.forEach(producto => {
                    if (estadisticas[producto.id] === undefined) {
                        estadisticas[producto.id] = 0;
                    }
                });

                console.log('✅ Datos del día actual cargados correctamente');
            } else {
                // Si no son del mismo día, mantener catálogo y reiniciar métricas diarias
                estadisticas = estadisticas || {};
                ventasTotales = 0;
                ventasTarjeta = 0;
                ventasEfectivo = 0;
                numTransacciones = 0;
                retiros = [];

                // Asegurar que los productos tengan entrada en estadisticas
                productos.forEach(producto => {
                    if (estadisticas[producto.id] === undefined) {
                        estadisticas[producto.id] = 0;
                    }
                });

                console.log('📅 Los datos son de otro día — catálogo cargado, métricas diarias reiniciadas');
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
        retiros: []
    };
    
    // Iterar desde lunes hasta sábado
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
                retiros
            };
        } else {
            datosDia = historico[fechaKey] || {
                estadisticas: {},
                ventasTotales: 0,
                ventasTarjeta: 0,
                ventasEfectivo: 0,
                numTransacciones: 0,
                retiros: []
            };
        }
        
        // Acumular datos
        datosDeLaSemana.ventasTotales += datosDia.ventasTotales;
        datosDeLaSemana.ventasTarjeta += datosDia.ventasTarjeta;
        datosDeLaSemana.ventasEfectivo += datosDia.ventasEfectivo;
        datosDeLaSemana.numTransacciones += datosDia.numTransacciones;
        datosDeLaSemana.retiros = datosDeLaSemana.retiros.concat(datosDia.retiros || []);
        
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
    doc.text('PRODUCTOS VENDIDOS', margin, y);
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
    doc.text('RESUMEN DE VENTAS', margin, y);
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
    y += lineHeight + 5;
    
    // Retiros
    if (datosDeLaSemana.retiros.length > 0) {
        if (y > 230) {
            doc.addPage();
            y = 20;
        }
        
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text('RETIROS DE EFECTIVO', margin, y);
        y += lineHeight;
        
        doc.setLineWidth(0.5);
        doc.line(margin, y, pageWidth - margin, y);
        y += lineHeight + 3;
        
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        
        datosDeLaSemana.retiros.forEach(retiro => {
            if (y > 270) {
                doc.addPage();
                y = 20;
            }
            
            const fechaRetiro = new Date(retiro.fecha);
            const horaRetiro = fechaRetiro.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
            const diaRetiro = fechaRetiro.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
            
            doc.text(`${diaRetiro} ${horaRetiro}`, margin, y);
            doc.text(`-$${retiro.monto.toFixed(2)}`, pageWidth - margin - 30, y);
            y += lineHeight;
            
            const maxWidth = pageWidth - 2 * margin;
            const lines = doc.splitTextToSize(`   ${retiro.justificacion}`, maxWidth);
            doc.text(lines, margin, y);
            y += lineHeight * lines.length + 3;
        });
    }
    
    // Descargar PDF
    const nombreArchivo = `reporte-semanal-${lunesDeLaSemana.getFullYear()}-${(lunesDeLaSemana.getMonth()+1).toString().padStart(2,'0')}-${lunesDeLaSemana.getDate().toString().padStart(2,'0')}.pdf`;
    doc.save(nombreArchivo);
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

function cambiarDiaReporte(semanas) {
    // Cambiar por semanas (7 días por semana)
    fechaReporteVisualizando.setDate(fechaReporteVisualizando.getDate() + (semanas * 7));
    actualizarVistaReporte();
}

function actualizarVistaReporte() {
    // Calcular el lunes y sábado de la semana
    const lunesDeLaSemana = obtenerLunesDeLaSemana(new Date(fechaReporteVisualizando));
    const sabadoDeLaSemana = obtenerSabadoDeLaSemana(new Date(lunesDeLaSemana));
    
    // Mostrar el rango de la semana
    const textoFecha = `Semana del ${lunesDeLaSemana.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })} al ${sabadoDeLaSemana.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}`;
    document.getElementById('reporteFechaModal').textContent = textoFecha;
    
    // Cargar datos de toda la semana (lunes a sábado)
    const historico = JSON.parse(localStorage.getItem('panaderiaHistorico') || '{}');
    const hoy = new Date().toDateString();
    
    // Inicializar datos acumulados de la semana
    let datosDeLaSemana = {
        estadisticas: {},
        ventasTotales: 0,
        ventasTarjeta: 0,
        ventasEfectivo: 0,
        numTransacciones: 0,
        retiros: []
    };
    
    // Iterar desde lunes hasta sábado
    for (let i = 0; i < 6; i++) {
        const fechaActual = new Date(lunesDeLaSemana);
        fechaActual.setDate(fechaActual.getDate() + i);
        const fechaKey = fechaActual.toDateString();
        
        let datosDia;
        if (fechaKey === hoy) {
            // Si es hoy, usar datos actuales
            datosDia = {
                estadisticas,
                ventasTotales,
                ventasTarjeta,
                ventasEfectivo,
                numTransacciones,
                retiros
            };
        } else {
            // Si es otro día, buscar en histórico
            datosDia = historico[fechaKey] || {
                estadisticas: {},
                ventasTotales: 0,
                ventasTarjeta: 0,
                ventasEfectivo: 0,
                numTransacciones: 0,
                retiros: []
            };
        }
        
        // Acumular datos
        datosDeLaSemana.ventasTotales += datosDia.ventasTotales;
        datosDeLaSemana.ventasTarjeta += datosDia.ventasTarjeta;
        datosDeLaSemana.ventasEfectivo += datosDia.ventasEfectivo;
        datosDeLaSemana.numTransacciones += datosDia.numTransacciones;
        datosDeLaSemana.retiros = datosDeLaSemana.retiros.concat(datosDia.retiros || []);
        
        // Acumular estadísticas de productos
        Object.keys(datosDia.estadisticas).forEach(productoId => {
            if (!datosDeLaSemana.estadisticas[productoId]) {
                datosDeLaSemana.estadisticas[productoId] = 0;
            }
            datosDeLaSemana.estadisticas[productoId] += datosDia.estadisticas[productoId];
        });
    }
    
    const datosDelDia = datosDeLaSemana;
    
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
    const precioInput = document.getElementById('productoPrecio').value;
    const categoria = document.getElementById('productoCategoria').value;
    const idEdit = document.getElementById('productoIdEdit').value;
    
    const precio = parseFloat(precioInput);
    
    if (!nombre) {
        alert('Por favor ingresa un nombre');
        return;
    }
    
    if (!precio || precio <= 0) {
        alert('Por favor ingresa un precio válido mayor a 0');
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
        // Nuevo producto (asegurar ID válido si no hay productos aún)
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
            let categoriasCreadas = [];
            
            // Detectar si la primera línea es encabezado
            const primeraLinea = lineas[0].toLowerCase();
            const tieneEncabezado = primeraLinea.includes('nombre') || primeraLinea.includes('precio') || primeraLinea.includes('categoria');
            const inicio = tieneEncabezado ? 1 : 0;
            
            // Obtener el ID máximo actual
            let maxId = productos.length > 0 ? Math.max(...productos.map(p => p.id)) : 0;
            
            // Colores predefinidos para categorías automáticas
            const coloresDisponibles = ['#3498db', '#2ecc71', '#e74c3c', '#f39c12', '#9b59b6', '#1abc9c', '#e67e22', '#34495e'];
            
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
                const categoriaNombre = valores[2].replace(/"/g, '').trim();
                
                // Validar datos
                if (!nombre) {
                    errores.push(`Línea ${i + 1}: nombre vacío`);
                    continue;
                }
                
                if (isNaN(precio) || precio <= 0) {
                    errores.push(`Línea ${i + 1}: precio inválido (${valores[1]})`);
                    continue;
                }
                
                // Generar clave de categoría
                const categoriaKey = categoriaNombre
                    .toLowerCase()
                    .normalize('NFD')
                    .replace(/[\u0300-\u036f]/g, '')
                    .replace(/\s+/g, '_')
                    .replace(/[^a-z0-9_]/g, '');
                
                // Si la categoría no existe, crearla automáticamente
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
            let mensaje = `✅ ${productosImportados} productos importados correctamente`;
            if (categoriasCreadas.length > 0) {
                mensaje += `\n\n🆕 Categorías creadas: ${categoriasCreadas.join(', ')}`;
            }
            if (errores.length > 0) {
                mensaje += `\n\n⚠️ ${errores.length} errores:\n${errores.slice(0, 5).join('\n')}`;
                if (errores.length > 5) {
                    mensaje += `\n... y ${errores.length - 5} más`;
                }
            }
            alert(mensaje);
            
            console.log('📥 CSV importado:', productosImportados, 'productos', categoriasCreadas.length, 'categorías creadas');
            
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
    const nombre = document.getElementById('categoriaNombre').value.trim();
    const color = document.getElementById('categoriaColor').value;
    const keyEdit = document.getElementById('categoriaKeyEdit').value;
    
    if (!nombre) {
        alert('Por favor ingresa el nombre de la categoría');
        return;
    }
    
    // Generar clave automáticamente desde el nombre
    // Convertir a minúsculas, quitar acentos y espacios
    const key = nombre
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Quitar acentos
        .replace(/\s+/g, '_') // Reemplazar espacios con guiones bajos
        .replace(/[^a-z0-9_]/g, ''); // Quitar caracteres especiales
    
    if (!key) {
        alert('El nombre debe contener al menos letras o números');
        return;
    }
    
    if (!keyEdit && categorias[key]) {
        alert('Ya existe una categoría con ese nombre');
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
    if (!categorias[key]) {
        alert('La categoría no existe.');
        return;
    }
    
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

// Seleccionar operación rápida de retiro
function seleccionarRetiroRapido(tipo) {
    document.getElementById('justificacionRetiro').value = tipo;
    document.getElementById('montoRetiro').focus();
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

// Seleccionar operación rápida de ingreso
function seleccionarIngresoRapido(tipo) {
    document.getElementById('conceptoIngreso').value = tipo;
    document.getElementById('montoIngreso').focus();
}

// Confirmar ingreso
function confirmarIngreso() {
    const monto = parseFloat(document.getElementById('montoIngreso').value);
    const concepto = document.getElementById('conceptoIngreso').value.trim();
    
    if (!monto || monto <= 0) {
        alert('Por favor ingresa un monto válido mayor a 0');
        return;
    }
    
    if (!concepto) {
        alert('Por favor ingresa un concepto para el ingreso');
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
    
    // Actualizar estadísticas
    actualizarEstadisticas();
    
    // Cerrar modal
    cerrarModalIngreso();
    
    alert(`Ingreso registrado: $${monto.toFixed(2)}\nConcepto: ${concepto}`);
}

// ===== CONFIGURACIÓN DE OPERACIONES RÁPIDAS =====

// Abrir modal de configuración de operaciones
function abrirModalConfigOperaciones() {
    cargarOperacionesDesdeLocalStorage();
    renderizarOperaciones();
    document.getElementById('modalConfigOperaciones').classList.remove('hidden');
}

// Cerrar modal de configuración
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
                    <button class="btn-editar-op" onclick="editarOperacion('retiro', ${op.id})">✏️ Editar</button>
                    <button class="btn-eliminar-op" onclick="eliminarOperacion('retiro', ${op.id})">🗑️</button>
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
                    <button class="btn-editar-op" onclick="editarOperacion('ingreso', ${op.id})">✏️ Editar</button>
                    <button class="btn-eliminar-op" onclick="eliminarOperacion('ingreso', ${op.id})">🗑️</button>
                </div>
            `;
            listaIngresos.appendChild(div);
        });
    }
    
    // Actualizar botones en los modales de retiro e ingreso
    actualizarBotonesOperacionesRapidas();
}

// Actualizar botones de operaciones rápidas en los modales
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

// Mostrar formulario para agregar/editar operación
function mostrarFormularioOperacion(tipo) {
    document.getElementById('formularioOperacion').classList.remove('hidden');
    document.getElementById('tituloOperacionForm').textContent = tipo === 'retiro' ? 'Nueva Operación de Retiro' : 'Nueva Operación de Ingreso';
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

// Guardar operación
function guardarOperacion() {
    const emoji = document.getElementById('operacionEmoji').value.trim();
    const nombre = document.getElementById('operacionNombre').value.trim();
    const tipo = document.getElementById('operacionTipoEdit').value;
    const idEdit = document.getElementById('operacionIdEdit').value;
    
    if (!emoji) {
        alert('Por favor ingresa un emoji');
        return;
    }
    
    if (!nombre) {
        alert('Por favor ingresa un nombre');
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

// Editar operación
function editarOperacion(tipo, id) {
    const lista = tipo === 'retiro' ? operacionesRetiro : operacionesIngreso;
    const operacion = lista.find(op => op.id === id);
    
    if (operacion) {
        document.getElementById('formularioOperacion').classList.remove('hidden');
        document.getElementById('tituloOperacionForm').textContent = tipo === 'retiro' ? 'Editar Operación de Retiro' : 'Editar Operación de Ingreso';
        document.getElementById('operacionIdEdit').value = operacion.id;
        document.getElementById('operacionTipoEdit').value = tipo;
        document.getElementById('operacionEmoji').value = operacion.emoji;
        document.getElementById('operacionNombre').value = operacion.nombre;
    }
}

// Eliminar operación
function eliminarOperacion(tipo, id) {
    if (!confirm('¿Estás seguro de eliminar esta operación?')) {
        return;
    }
    
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

// Activar/desactivar modo reordenar
function toggleModoReordenar() {
    modoReordenar = !modoReordenar;
    const btn = document.getElementById('btnReordenar');
    
    if (modoReordenar) {
        btn.textContent = '✅ Guardar Orden';
        btn.style.background = 'linear-gradient(135deg, #28a745 0%, #20c997 100%)';
        // Mostrar mensaje de ayuda
        mostrarNotificacion('Arrastra los productos para reordenarlos');
    } else {
        btn.textContent = '🔀 Reordenar Productos';
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
            
            // Reordenar productos según el orden guardado
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
                    
                    // Agregar productos nuevos que no estén en el orden guardado
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

// Mostrar notificación temporal
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
        // Obtener índices
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

