// Content Script - The "Magic" Filler

// 1. Escuchar datos desde Synaptica (si estamos en la app)
window.addEventListener("message", (event) => {
    if (event.source !== window) return;

    if (event.data.type && event.data.type === "SYNAPTICA_BRIDGE_DATA") {
        console.log("Synaptica Bridge: Recibidos datos del ticket", event.data.payload);
        chrome.runtime.sendMessage({
            type: 'SAVE_INVOICE_DATA',
            payload: event.data.payload
        }, (response) => {
            console.log("Synaptica Bridge: Datos guardados en extensión");
            showToast("Datos listos para pegar en el portal 🚀");
        });
    }
});

// Escuchar mensajes del Popup (Manual Trigger)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'FORCE_SHOW_UI') {
        createMagicButton(true); // Force creation
        sendResponse({ status: 'ok' });
    }
    if (request.type === 'FORCE_AUTOFILL') {
        autofill();
        sendResponse({ status: 'ok' });
    }
});

function showToast(msg) {
    const toast = document.createElement('div');
    toast.textContent = msg;
    toast.style.cssText = `
        position: fixed; bottom: 20px; right: 20px; 
        background: #10b981; color: white; padding: 12px 24px; 
        border-radius: 8px; font-family: sans-serif; z-index: 9999;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        animation: slideIn 0.3s ease-out;
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// 2. Detectar si estamos en un portal de facturación
function checkForInvoiceFields() {
    if (window.location.hostname.includes("localhost") || window.location.hostname.includes("synaptica")) return;

    // Heurística Mejorada: Buscar inputs visibles
    const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"]):not([type="submit"])'));
    let score = 0;

    inputs.forEach(input => {
        const text = (input.name + " " + input.id + " " + input.placeholder + " " + (input.getAttribute('aria-label') || "")).toLowerCase();

        // Palabras clave de facturación
        if (text.match(/rfc|tax|uid|nit/)) score += 3;
        if (text.match(/folio|ticket|referencia|transaccion|transaction|factura/)) score += 2;
        if (text.match(/monto|total|importe|venta|subtotal|amount/)) score += 2;
        if (text.match(/fecha|date|dia/)) score += 1;
        if (text.match(/sucursal|store|tienda|branch/)) score += 1;
    });

    // Si hay al menos 2 inputs y alguna palabra clave, o muchos inputs
    if (score >= 2 || inputs.length >= 3) {
        console.log("Synaptica Bridge: Portal detectado. Score:", score);
        createMagicButton();
    }
}

function createMagicButton(force = false) {
    if (document.getElementById('synaptica-magic-btn')) return;

    const btn = document.createElement('button');
    btn.id = 'synaptica-magic-btn';
    btn.innerHTML = `
        <span style="font-size: 16px;">⚡</span> 
        <span style="font-weight: bold; margin-left: 5px;">Pegar Datos</span>
    `;
    btn.className = 'synaptica-float-btn';

    btn.onclick = (e) => {
        e.preventDefault();
        autofill();
    };

    document.body.appendChild(btn);
    if (force) showToast("Botón forzado manualmente");
}

function autofill() {
    chrome.runtime.sendMessage({ type: 'GET_INVOICE_DATA' }, (response) => {
        if (response && response.data) {
            const data = response.data;
            let filled = 0;

            const inputs = document.querySelectorAll('input, select');
            inputs.forEach(input => {
                // Heurística de Llenado: Buscar en atributos Y etiquetas cercanas
                let text = (input.name + " " + input.id + " " + input.placeholder + " " + (input.getAttribute('aria-label') || "")).toLowerCase();

                // Intentar buscar label asociado
                if (input.id) {
                    const label = document.querySelector(`label[for="${input.id}"]`);
                    if (label) text += " " + label.textContent.toLowerCase();
                }

                // RFC
                if (text.match(/rfc|tax/)) {
                    setNativeValue(input, data.rfc);
                    filled++;
                }
                // TICKET / FOLIO
                else if (text.match(/folio|ticket|referencia|transaccion|factura/)) {
                    setNativeValue(input, data.ticket_number);
                    filled++;
                }
                // MONTO
                else if (text.match(/monto|importe|total|venta|cantidad/)) {
                    setNativeValue(input, data.total_amount);
                    filled++;
                }
                // SUCURSAL (Nuevo)
                else if (text.match(/sucursal|tienda|store/)) {
                    setNativeValue(input, data.store_name || "5505");
                    filled++;
                }
                // FECHA
                else if (text.match(/fecha|date/) || input.type === 'date') {
                    if (data.date) {
                        const dateObj = new Date(data.date);
                        // Intentar varios formatos si es texto
                        if (input.type === 'text') {
                            // DD/MM/YYYY es común en latam
                            const day = dateObj.getDate().toString().padStart(2, '0');
                            const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
                            const year = dateObj.getFullYear();
                            setNativeValue(input, `${day}/${month}/${year}`);
                        } else {
                            // YYYY-MM-DD para input date
                            setNativeValue(input, dateObj.toISOString().split('T')[0]);
                        }
                        filled++;
                    }
                }
            });

            const btn = document.getElementById('synaptica-magic-btn');
            if (btn) {
                if (filled > 0) {
                    btn.innerHTML = `✅ ${filled} campos`;
                    btn.style.background = "#10b981";
                    setTimeout(() => btn.remove(), 2000);
                } else {
                    btn.innerHTML = `🤷‍♂️ 0 campos`;
                    showToast("No encontré campos obvios. Intenta llenar manualmente.");
                }
            }
        } else {
            alert("⚠️ Synaptica Bridge está vacío. Copia un ticket primero.");
        }
    });
}

function setNativeValue(element, value) {
    if (!value) return;

    // Si ya tiene valor, preferimos no sobreescribir si es el mismo, pero aquí somos agresivos
    const lastValue = element.value;
    element.value = value;

    const event = new Event('input', { bubbles: true });
    // Hack para React 15/16 inputs
    const tracker = element._valueTracker;
    if (tracker) {
        tracker.setValue(lastValue);
    }
    element.dispatchEvent(event);
    element.dispatchEvent(new Event('change', { bubbles: true }));
    element.dispatchEvent(new Event('blur', { bubbles: true })); // Trigger validation on blur
}

// Iniciar chequeo
setTimeout(checkForInvoiceFields, 1500); // Esperar a que cargue la app (SPA)
setInterval(checkForInvoiceFields, 5000); // Re-chequear por si navegamos
