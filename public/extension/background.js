// Background Script
// Simplemente sirve para confirmar que la extensión está viva
console.log("Synaptica Bridge Background Running");

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'SAVE_INVOICE_DATA') {
        chrome.storage.local.set({ 'synaptica_invoice_data': request.payload }, () => {
            console.log("Data saved:", request.payload);
            sendResponse({ status: 'success' });
        });
        return true;
    }

    if (request.type === 'GET_INVOICE_DATA') {
        chrome.storage.local.get(['synaptica_invoice_data'], (result) => {
            sendResponse({ data: result.synaptica_invoice_data });
        });
        return true;
    }
});
