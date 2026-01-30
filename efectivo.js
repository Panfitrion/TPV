// efectivo.js - Solo lógica para cobro en efectivo en ventana nueva

let montoRecibido = 0;
let totalAPagar = 0;

function getTotalFromQuery() {
    const params = new URLSearchParams(window.location.search);
    return parseFloat(params.get('total')) || 0;
}

function actualizarDisplay() {
    document.getElementById('montoRecibidoDisplay').textContent = montoRecibido.toFixed(2);
    document.getElementById('cambioDisplay').textContent = (montoRecibido - totalAPagar >= 0 ? (montoRecibido - totalAPagar).toFixed(2) : '0.00');
}

function agregarDenominacion(valor) {
    montoRecibido += valor;
    actualizarDisplay();
}

function resetearMonto() {
    montoRecibido = 0;
    actualizarDisplay();
}

function confirmarPagoEfectivo() {
    if (window.opener && !window.opener.closed) {
        window.opener.postMessage({ tipo: 'ventaEfectivoExitosa' }, '*');
    }
    document.body.innerHTML = '<div style="text-align:center;padding:60px 10px;font-size:1.3em;color:#28a745;">✅ Venta completada<br><span style="font-size:0.8em;color:#555;">Cerrando ventana...</span></div>';
    setTimeout(() => { window.close(); }, 2000);
}

document.addEventListener('DOMContentLoaded', () => {
    totalAPagar = getTotalFromQuery();
    document.getElementById('totalAPagar').textContent = `$${totalAPagar.toFixed(2)}`;
    actualizarDisplay();
});
