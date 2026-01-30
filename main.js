const { app, BrowserWindow } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        title: "Aurea Financial",
        icon: path.join(__dirname, 'public/icon.ico'),
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
        },
        autoHideMenuBar: true
    });

    // Determine Environment
    const isDev = !app.isPackaged;
    const appUrl = isDev
        ? 'http://localhost:3000'
        : 'https://synaptica-appfin.vercel.app'; // Fixed: Point to Vercel Prod

    mainWindow.loadURL(appUrl);

    if (isDev) {
        // mainWindow.webContents.openDevTools();
    }

    mainWindow.on('closed', function () {
        mainWindow = null;
    });
}

app.on('ready', createWindow);

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', function () {
    if (mainWindow === null) {
        createWindow();
    }
});
