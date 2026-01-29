document.getElementById('force-ui').addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, { type: "FORCE_SHOW_UI" }, (response) => {
            if (chrome.runtime.lastError) {
                // If content script is not running (e.g. restrictive page), try to inject it
                executeScript(tabs[0].id);
            }
        });
    });
});

document.getElementById('force-fill').addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, { type: "FORCE_AUTOFILL" }, (response) => {
            if (chrome.runtime.lastError) {
                executeScript(tabs[0].id);
            }
        });
    });
});

function executeScript(tabId) {
    chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: ['content.js']
    });
}
