const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, screen } = require('electron');
const path = require('path');
const fs = require('fs');
const { uIOhook, UiohookKey } = require('uiohook-napi');

let mainWindow = null;
let tray = null;
let isVisible = false;

// Track modifier key states
let shiftPressed = false;
let qPressed = false;

const stateFile = path.join(app.getPath('userData'), 'window-state.json');

function loadState() {
    try {
        if (fs.existsSync(stateFile)) {
            return JSON.parse(fs.readFileSync(stateFile, 'utf8'));
        }
    } catch (e) {
        console.error('Failed to load window state:', e);
    }
    return null;
}

function saveState() {
    if (!mainWindow) return;
    try {
        const bounds = mainWindow.getBounds();
        fs.writeFileSync(stateFile, JSON.stringify(bounds));
    } catch (e) {
        console.error('Failed to save window state:', e);
    }
}

function createWindow() {
    let windowOptions = {
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        skipTaskbar: true,
        resizable: true,
        show: false,
        minWidth: 600,
        minHeight: 400,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    };

    const savedState = loadState();

    if (savedState) {
        windowOptions = { ...windowOptions, ...savedState };
    } else {
        // Default: 50% width, 35% height, centered
        const primaryDisplay = screen.getPrimaryDisplay();
        const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
        windowOptions.width = Math.round(screenWidth * 0.5);
        windowOptions.height = Math.round(screenHeight * 0.35);
        windowOptions.center = true;
        // Let Electron center it if no position is provided, or calculate it manually if needed,
        // but since we are not setting x/y in default options, we can rely on centerWindow() later
        // OR just set center: true in options if we want.
        // But the original code called centerWindow() in showWindow().
    }

    mainWindow = new BrowserWindow(windowOptions);

    mainWindow.loadFile('index.html');

    mainWindow.on('close', saveState);
    mainWindow.on('resize', saveState);
    mainWindow.on('move', saveState);

    // Hide handling on blur (loss of focus)
    mainWindow.on('blur', () => {
        if (mainWindow.isVisible()) {
            hideWindow();
        }
    });
}

function centerWindow() {
    if (!mainWindow) return;
    // centerWindow() deprecated in favor of saved state
}

function showWindow() {
    if (!mainWindow) return;
    if (mainWindow.isVisible()) {
        mainWindow.focus();
        return;
    }

    // Ensure it's on top and visible
    mainWindow.setAlwaysOnTop(true);
    mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

    mainWindow.show();

    // Aggressively grab focus
    if (app.focus) app.focus({ steal: true });
    mainWindow.focus();

    mainWindow.webContents.send('window-shown');
}

function hideWindow() {
    if (!mainWindow || !mainWindow.isVisible()) return;
    saveState();
    mainWindow.hide();
    mainWindow.webContents.send('window-hidden');
    if (app.hide) app.hide(); // Allow other apps to take focus immediately on macOS/some Windows configs
}

function toggleWindow() {
    if (mainWindow && mainWindow.isVisible()) {
        hideWindow();
    } else {
        showWindow();
    }
}

function createTray() {
    const icon = nativeImage.createFromDataURL(
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAdgAAAHYBTnsmCAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3Njape.org5vuPBoAAADfSURBVDiNpZMxDoJAEEV/LBZGrOxsNBwCL+AFvIGxs/YQHsRbWFhQGAsLExsv4QVs1QIjBRYgsDDZZjP/vzezM7s2EAAngIbGd6AT/VcboNXlmYgEgOu6sW3bNwCPSJKEOI4BcoAWwANefN+PsiyLgARwAMq8ACQBSL1VVQWYv/cEeAP+IpEkSZim6Q/wMRMRRxBEYZqmyLIMiDBJEmQJbNsuO2YBtdaEYYg0TeE4DpIkQQSQZdnCsiyU7TsA/5GR0LQsq0ySJGXHIqC1JggC5HmO3vDxN5EkSVE7cQJ+9hvgF2dZXGJb2wAAAABJRU5ErkJggg=='
    );

    tray = new Tray(icon);
    tray.setToolTip('QuickGerman - Ctrl + ` to toggle');

    const contextMenu = Menu.buildFromTemplate([
        { label: 'Show/Hide (Ctrl + `)', click: toggleWindow },
        { type: 'separator' },
        { label: 'Quit', click: () => app.quit() }
    ]);

    tray.setContextMenu(contextMenu);
    tray.on('click', toggleWindow);
}

function setupGlobalHotkey() {
    let ctrlPressed = false;
    let altPressed = false;

    // Monitor for Ctrl + Backtick (toggle) AND Alt + Tab (force hide)
    uIOhook.on('keydown', (e) => {
        // Ctrl tracking
        if (e.keycode === UiohookKey.Ctrl || e.keycode === UiohookKey.CtrlRight) {
            ctrlPressed = true;
        }

        // Alt tracking
        if (e.keycode === UiohookKey.Alt || e.keycode === UiohookKey.AltRight) {
            altPressed = true;
        }

        // Feature: Toggle with Ctrl + `
        if (ctrlPressed && e.keycode === UiohookKey.Backquote) {
            toggleWindow();
        }

        // Feature: Force close on Alt + Tab (even if out of focus)
        if (altPressed && e.keycode === UiohookKey.Tab) {
            if (mainWindow && mainWindow.isVisible()) {
                hideWindow();
            }
        }
    });

    uIOhook.on('keyup', (e) => {
        if (e.keycode === UiohookKey.Ctrl || e.keycode === UiohookKey.CtrlRight) {
            ctrlPressed = false;
        }
        if (e.keycode === UiohookKey.Alt || e.keycode === UiohookKey.AltRight) {
            altPressed = false;
        }
    });

    uIOhook.start();
}

app.whenReady().then(() => {
    createWindow();
    createTray();
    setupGlobalHotkey();
});

app.on('window-all-closed', (e) => {
    e.preventDefault();
});

app.on('before-quit', () => {
    uIOhook.stop();
});
