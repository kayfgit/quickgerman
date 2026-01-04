const { ipcRenderer } = require('electron');
const translator = require('./translator');

const inputText = document.getElementById('inputText');
const outputText = document.getElementById('outputText');
const swapBtn = document.getElementById('swapBtn');
const sourceLang = document.getElementById('sourceLang');
const targetLang = document.getElementById('targetLang');
const loading = document.getElementById('loading');
const inputCount = document.getElementById('inputCount');
const outputCount = document.getElementById('outputCount');

let currentDirection = 'de-en';
let debounceTimer = null;
let currentRequestId = 0; // Track request to prevent stale results
let isSettingsOpen = false;

// Settings State
let appSettings = {
    spellcheck: true,
    startOnStartup: false,
    theme: 'light',
    hotkey: 'ctrl+`'
};

const headerControls = document.getElementById('header-controls');
const settingsBtn = document.getElementById('settingsBtn');
const mainHeader = document.getElementById('main-header');
const translatorView = document.getElementById('translator-view');
const settingsView = document.getElementById('settings-view');

// Settings Elements
const spellcheckToggle = document.getElementById('spellcheckToggle');
const startOnStartupToggle = document.getElementById('startOnStartupToggle');
const themeSelect = document.getElementById('themeSelect');
const hotkeySelect = document.getElementById('hotkeySelect');
const closeSettingsBtn = document.getElementById('closeSettingsBtn');

function updateCharCounts() {
    inputCount.textContent = `${inputText.value.length} characters`;
    outputCount.textContent = `${outputText.innerText.length} characters`;

    // Don't count placeholder text if it's the specific placeholder
    if (outputText.textContent === 'Translation will appear here...' || outputText.textContent === 'Translation error' || outputText.textContent === 'No translation found') {
        outputCount.textContent = '0 characters';
    }
}

async function doTranslate() {
    const text = inputText.value.trim();

    if (!text) {
        outputText.textContent = 'Translation will appear here...';
        outputText.className = 'w-full flex-1 text-gray-300 text-3xl leading-relaxed select-text selection:bg-green-100 selection:text-green-900 overflow-auto';
        updateCharCounts();
        return;
    }

    // Increment request ID to track this specific request
    const requestId = ++currentRequestId;

    loading.classList.remove('hidden');

    try {
        const result = await translator.translate(text, currentDirection);

        // Only update if this is still the latest request
        if (requestId === currentRequestId) {
            if (result) {
                outputText.textContent = result;
                outputText.className = 'w-full flex-1 text-gray-800 text-3xl leading-relaxed select-text selection:bg-green-100 selection:text-green-900 overflow-auto';
            } else {
                outputText.textContent = 'No translation found';
                outputText.className = 'w-full flex-1 text-gray-300 text-3xl leading-relaxed select-text selection:bg-green-100 selection:text-green-900 overflow-auto';
            }
            updateCharCounts();
        }
    } catch (err) {
        if (requestId === currentRequestId) {
            outputText.textContent = 'Translation error';
            outputText.className = 'w-full flex-1 text-red-400 text-3xl leading-relaxed select-text selection:bg-green-100 selection:text-green-900 overflow-auto';
            updateCharCounts();
        }
    } finally {
        if (requestId === currentRequestId) {
            loading.classList.add('hidden');
        }
    }
}

// Debounced translation
function translateWithDebounce() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(doTranslate, 300); // 300ms debounce
    updateCharCounts(); // Immediate update for input count
}

// Input event
inputText.addEventListener('input', translateWithDebounce);

// Swap languages
swapBtn.addEventListener('click', () => {
    if (currentDirection === 'de-en') {
        currentDirection = 'en-de';
        sourceLang.textContent = 'English';
        targetLang.textContent = 'German';
    } else {
        currentDirection = 'de-en';
        sourceLang.textContent = 'German';
        targetLang.textContent = 'English';
    }

    // Swap input and output if there's valid output
    const currentOutput = outputText.textContent;
    const trimmedOutput = currentOutput.trim();

    // Check against placeholders (ignoring whitespace)
    if (trimmedOutput &&
        trimmedOutput !== 'Translation will appear here...' &&
        trimmedOutput !== 'No translation found' &&
        trimmedOutput !== 'Translation error') {

        inputText.value = trimmedOutput;
    }

    translateWithDebounce();
});

// Auto-focus when window shown
ipcRenderer.on('window-shown', () => {
    inputText.focus();
    inputText.select();
});

// Clear on hide (optional)
ipcRenderer.on('window-hidden', () => {
    // inputText.value = '';
    // outputText.textContent = 'Translation';
});

// Set input from clipboard or other sources
ipcRenderer.on('set-input', (event, text) => {
    inputText.value = text;
    // Trigger translation immediately
    doTranslate();
});

// Settings Toggle Logic
function toggleSettings() {
    isSettingsOpen = !isSettingsOpen;

    if (isSettingsOpen) {
        // Switch to Settings (Portrait 400x800)

        // 1. Hide Main Header
        mainHeader.classList.add('hidden');

        // 2. Hide Translator View
        translatorView.classList.add('opacity-0', 'pointer-events-none');

        // 3. Show Settings View
        settingsView.classList.remove('translate-x-full', 'opacity-0');

        // 4. Switch Mode (Main process handles size)
        ipcRenderer.send('set-mode', 'settings');

    } else {
        // Switch to Translator (Landscape 800x400)

        // 1. Hide Settings View
        settingsView.classList.add('translate-x-full', 'opacity-0');

        // 2. Show Main Header
        mainHeader.classList.remove('hidden');

        // 3. Show Translator View
        translatorView.classList.remove('opacity-0', 'pointer-events-none');

        // 4. Switch Mode (Main process handles size)
        ipcRenderer.send('set-mode', 'translation');
    }
}

// Initialize Settings
async function initSettings() {
    try {
        appSettings = await ipcRenderer.invoke('get-settings');

        // Apply UI state
        spellcheckToggle.checked = appSettings.spellcheck;
        startOnStartupToggle.checked = appSettings.startOnStartup || false;
        themeSelect.value = appSettings.theme || 'light';
        hotkeySelect.value = appSettings.hotkey || 'ctrl+`';

        // Apply Logic
        applySpellcheck(appSettings.spellcheck);

    } catch (e) {
        console.error('Failed to init settings:', e);
    }
}

function applySpellcheck(enabled) {
    inputText.spellcheck = enabled;
    // Force re-render of spellcheck attributes if needed (usually automatic on focus/blur)
    const currentVal = inputText.value;
    inputText.value = '';
    inputText.value = currentVal;
}

function saveSettings() {
    ipcRenderer.send('save-settings', appSettings);
}

// Event Listeners for Settings
spellcheckToggle.addEventListener('change', (e) => {
    appSettings.spellcheck = e.target.checked;
    applySpellcheck(appSettings.spellcheck);
    saveSettings();
});

startOnStartupToggle.addEventListener('change', (e) => {
    appSettings.startOnStartup = e.target.checked;
    ipcRenderer.send('set-startup', e.target.checked);
    saveSettings();
});

themeSelect.addEventListener('change', (e) => {
    appSettings.theme = e.target.value;
    // Theme application logic would go here
    saveSettings();
});

hotkeySelect.addEventListener('change', (e) => {
    appSettings.hotkey = e.target.value;
    ipcRenderer.send('set-hotkey', e.target.value);
    saveSettings();
});

// Close Settings Button
closeSettingsBtn.addEventListener('click', toggleSettings);

// Call init on load
initSettings();

// Toggle Button Listeners
settingsBtn.addEventListener('click', toggleSettings);

// Escape to hide (modified to close settings first if open)
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        if (isSettingsOpen) {
            toggleSettings();
        } else {
            ipcRenderer.send('hide-window');
        }
    }
});
