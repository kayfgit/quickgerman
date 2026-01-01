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

// Escape to hide
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        ipcRenderer.send('hide-window');
    }
});
