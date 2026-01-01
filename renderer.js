const { ipcRenderer } = require('electron');
const translator = require('./translator');

const inputText = document.getElementById('inputText');
const outputText = document.getElementById('outputText');
const swapBtn = document.getElementById('swapBtn');
const sourceLang = document.getElementById('sourceLang');
const targetLang = document.getElementById('targetLang');
const loading = document.getElementById('loading');

let currentDirection = 'de-en';
let debounceTimer = null;
let currentRequestId = 0; // Track request to prevent stale results

async function doTranslate() {
    const text = inputText.value.trim();

    if (!text) {
        outputText.textContent = 'Translation';
        outputText.className = 'text-white/50 text-4xl select-text';
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
                outputText.className = 'text-white/95 text-4xl select-text';
            } else {
                outputText.textContent = 'No translation found';
                outputText.className = 'text-white/50 text-4xl select-text';
            }
        }
    } catch (err) {
        if (requestId === currentRequestId) {
            outputText.textContent = 'Translation error';
            outputText.className = 'text-red-400/80 text-4xl select-text';
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
    if (currentOutput && currentOutput !== 'Translation' && currentOutput !== 'No translation found' && currentOutput !== 'Translation error') {
        inputText.value = currentOutput;
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

// Escape to hide
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        ipcRenderer.send('hide-window');
    }
});
