// Translate using MyMemory API
async function translate(text, direction) {
    const trimmed = text.trim();
    if (!trimmed) return null;

    try {
        const langPair = direction === 'de-en' ? 'de|en' : 'en|de';
        const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(trimmed)}&langpair=${langPair}`;

        const response = await fetch(url);
        const data = await response.json();

        if (data.responseStatus === 200 && data.responseData.translatedText) {
            return data.responseData.translatedText;
        }
    } catch (err) {
        console.error('Translation failed:', err);
    }

    return null;
}

module.exports = { translate };
