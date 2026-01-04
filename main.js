const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, screen, clipboard } = require('electron');
const path = require('path');
const fs = require('fs');
const { uIOhook, UiohookKey } = require('uiohook-napi');
const { exec } = require('child_process');

let mainWindow = null;
let tray = null;
let isVisible = false;

// Track modifier key states
let shiftPressed = false;
let qPressed = false;

const stateFile = path.join(app.getPath('userData'), 'window-state.json');

let currentMode = 'translation'; // 'translation' | 'settings'

// Default states
const defaultState = {
    translation: { width: 800, height: 400 },
    settings: { width: 400, height: 800 }
};

// Fix: Disable hardware acceleration to prevent flickering on Windows with transparent windows
app.disableHardwareAcceleration();

function loadState() {
    try {
        if (fs.existsSync(stateFile)) {
            const data = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
            // Ensure structure is varied or migrated
            if (!data.translation) {
                return {
                    translation: { ...defaultState.translation, ...data }, // best effort migration
                    settings: defaultState.settings
                };
            }
            return data;
        }
    } catch (e) {
        console.error('Failed to load window state:', e);
    }
    return { ...defaultState };
}

function saveState() {
    if (!mainWindow) return;
    try {
        const bounds = mainWindow.getBounds();
        const fullState = loadState();

        // Update only the current mode's bounds
        fullState[currentMode] = bounds;

        fs.writeFileSync(stateFile, JSON.stringify(fullState));
    } catch (e) {
        console.error('Failed to save window state:', e);
    }
}

function createWindow() {
    const savedState = loadState();

    // Always start in translation mode
    currentMode = 'translation';
    const startBounds = savedState.translation || defaultState.translation;

    let windowOptions = {
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        skipTaskbar: true,
        resizable: true,
        show: false,
        width: startBounds.width,
        height: startBounds.height,
        x: startBounds.x,
        y: startBounds.y,
        minWidth: 800, // Enforce translation constraints initially
        minHeight: 400,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    };

    if (!windowOptions.x || !windowOptions.y) {
        windowOptions.center = true;
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

    // Handle manual hide request from renderer
    ipcMain.on('hide-window', () => {
        hideWindow();
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

// Smoothly animate window size
// Smoothly animate window size
function animateWindowSize(targetBounds, callback) {
    if (!mainWindow) return;

    const { width: startWidth, height: startHeight } = mainWindow.getBounds();
    const { width: targetWidth, height: targetHeight } = targetBounds;

    // If already correct size, just ensure window constraints and callback
    if (startWidth === targetWidth && startHeight === targetHeight) {
        if (callback) callback();
        return;
    }

    const startTime = Date.now();
    const duration = 300; // ms

    const animate = () => {
        const now = Date.now();
        const progress = Math.min((now - startTime) / duration, 1);

        // Ease out cubic
        const ease = 1 - Math.pow(1 - progress, 3);

        const newWidth = Math.round(startWidth + (targetWidth - startWidth) * ease);
        const newHeight = Math.round(startHeight + (targetHeight - startHeight) * ease);

        mainWindow.setSize(newWidth, newHeight);

        if (progress < 1) {
            setTimeout(animate, 10);
        } else {
            mainWindow.setSize(targetWidth, targetHeight); // Ensure final size
            if (callback) callback();
        }
    };

    animate();
}

ipcMain.on('set-mode', (event, mode) => {
    if (mode === currentMode) return;

    // 1. Save current state before switching
    saveState();

    // 2. Load target state
    const savedState = loadState();
    const targetBounds = savedState[mode] || defaultState[mode];

    // 3. Update constraints based on mode
    if (mode === 'settings') {
        mainWindow.setMinimumSize(400, 800);
    } else {
        // Translation mode
        mainWindow.setMinimumSize(800, 400);
    }

    // 4. Update current mode tracker
    currentMode = mode;

    // 5. Animate to new size
    animateWindowSize(targetBounds, () => {
        // Optional: Ensure center if switching for the first time or if things look weird?
    });
});

function createTray() {
    const icon = path.join(__dirname, 'build', 'icons', 'icon.ico')

    tray = new Tray(icon);
    tray.setToolTip('QuickGerman - Ctrl + ` to toggle');

    const contextMenu = Menu.buildFromTemplate([
        { label: 'Show/Hide (Ctrl + `)', click: toggleWindow },
        { label: 'Settings', click: toggleWindow },
        { type: 'separator' },
        { label: 'Quit', click: () => app.quit() }
    ]);

    tray.setContextMenu(contextMenu);
    tray.on('click', toggleWindow);
}

// Simulates Ctrl+C using VBScript (faster than PowerShell)
const vbsScriptPath = path.join(app.getPath('userData'), 'simulate_copy.vbs');

function ensureVbsScript() {
    const vbsContent = `
Set WshShell = WScript.CreateObject("WScript.Shell")
WshShell.SendKeys "^c"
`;
    try {
        if (!fs.existsSync(vbsScriptPath)) {
            fs.writeFileSync(vbsScriptPath, vbsContent);
        }
    } catch (e) {
        console.error('Failed to create VBS script:', e);
    }
}

function simulateCopy(callback) {
    // 1. Clear clipboard to ensure we don't read old data
    clipboard.clear();

    // 2. Execute VBScript to send Ctrl+C
    exec(`cscript //Nologo "${vbsScriptPath}"`, (error, stdout, stderr) => {
        if (error) {
            console.error(`exec error: ${error}`);
            callback('');
            return;
        }

        // 3. Poll for clipboard content change (max 500ms)
        let attempts = 0;
        const maxAttempts = 10;

        const checkClipboard = setInterval(() => {
            const text = clipboard.readText();
            attempts++;

            if (text && text.trim().length > 0) {
                clearInterval(checkClipboard);
                callback(text);
            } else if (attempts >= maxAttempts) {
                clearInterval(checkClipboard);
                // Even if empty, callback to finish (maybe user highlighted nothing)
                callback('');
            }
        }, 50); // Check every 50ms
    });
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
            // If window is NOT visible, we assume user might be highlighting text
            if (!mainWindow || !mainWindow.isVisible()) {
                simulateCopy((text) => {
                    showWindow();
                    if (mainWindow && text && text.trim().length > 0) {
                        // Send text to renderer
                        mainWindow.webContents.send('set-input', text);
                    }
                });
            } else {
                // If already visible, just toggle (hide)
                toggleWindow();
            }
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

// Settings Management
const settingsFile = path.join(app.getPath('userData'), 'settings.json');

const defaultSettings = {
    spellcheck: true,
    startOnStartup: false,
    theme: 'light'
};

function loadSettings() {
    try {
        if (fs.existsSync(settingsFile)) {
            return { ...defaultSettings, ...JSON.parse(fs.readFileSync(settingsFile, 'utf8')) };
        }
    } catch (e) {
        console.error('Failed to load settings:', e);
    }
    return { ...defaultSettings };
}

function saveSettings(settings) {
    try {
        fs.writeFileSync(settingsFile, JSON.stringify(settings));
    } catch (e) {
        console.error('Failed to save settings:', e);
    }
}

// Settings IPC
ipcMain.handle('get-settings', () => {
    return loadSettings();
});

ipcMain.on('save-settings', (event, settings) => {
    saveSettings(settings);
});

ipcMain.on('set-startup', (event, enabled) => {
    app.setLoginItemSettings({
        openAtLogin: enabled,
        openAsHidden: false
    });
});

app.whenReady().then(() => {
    ensureVbsScript();
    createWindow();
    createTray();
    setupGlobalHotkey();

    // Apply startup setting on launch
    const settings = loadSettings();
    app.setLoginItemSettings({
        openAtLogin: settings.startOnStartup || false,
        openAsHidden: false
    });
});

app.on('window-all-closed', (e) => {
    e.preventDefault();
});

app.on('before-quit', () => {
    uIOhook.stop();
});
