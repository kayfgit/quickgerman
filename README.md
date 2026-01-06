# QuickGerman

A lightning-fast, lightweight Electron app for translating German text to English with zero friction. No more copy-pasting between browser tabs—just highlight, press your hotkey, and get instant translations.

## Demo

https://github.com/user-attachments/assets/efc4e8e4-de62-4ca3-9b43-2b530cf16bbc

## Light Theme

<img width="750" height="400" alt="Light Translation View" src="https://github.com/user-attachments/assets/86941ab6-d8c7-4db6-bc26-7fda417d406f" />

<img width="250" height="390" alt="Light Settings View" src="https://github.com/user-attachments/assets/169ac9ff-8035-48a9-8c4b-bb8c7222f9df" />

## Dark Theme

<img width="750" height="400" alt="Dark Translation View" src="https://github.com/user-attachments/assets/78fc8ca1-d664-4232-b078-599b1fbb7cd9" />

<img width="250" height="395" alt="Dark Settings View" src="https://github.com/user-attachments/assets/a7c3a041-eeff-404d-a917-dc0b12aa159c" />

---

## Why QuickGerman?

Most translation tools require you to:
1. Highlight text
2. Copy it (`Ctrl + C`)
3. Switch to browser or translation app
4. Paste it (`Ctrl + V`)
5. Wait for translation
6. Switch back to your original app

QuickGerman eliminates steps 2-6. Just highlight and press your hotkey. That's it.

---

## Features

### Instant Translation with Highlight & Hotkey
The key feature: highlight any German text anywhere on your computer, press your custom hotkey (default: `Ctrl + \``), and QuickGerman automatically captures and translates it. No manual copying required.

### Smart Auto-Hide
The translation window appears on top of everything when summoned and automatically hides when you click away or lose focus. It stays out of your way until you need it.

### Light & Dark Themes
Choose between light and dark themes to match your workflow and reduce eye strain during late-night translation sessions.

### Launch on Startup
Optionally configure QuickGerman to start automatically when you log in, so it's always ready when you need it.

---

## Installation

### Option 1: Download the Installer (Recommended)
1. Download the latest `.exe` installer from the [Releases](../../releases) page
2. Run the installer and follow the prompts
3. Launch QuickGerman from your Start Menu or desktop shortcut 
4. The app will appear in your system tray

### Option 2: Build from Source
```bash
# Clone the repository
git clone https://github.com/kayfgit/QuickGerman.git
cd QuickGerman

# Install dependencies
npm install

# Run the app in development mode
npm start

# Or build the installer
npm run build
```

---

## Usage

1. **Open QuickGerman**: Click the tray icon or press your configured hotkey
2. **Translate highlighted text**:
   - Highlight any German text in any application
   - Press your hotkey (default: `Ctrl + \``)
   - The text is automatically captured and translated
3. **Manual translation**: Open the app and type or paste your German text directly
4. **Settings**: Click the settings icon to customize your hotkey, theme, and startup options

---

## Technical Details

- **Framework**: Electron 28.x
- **Global Hotkeys**: uiohook-napi for system-wide keyboard capture
- **Text Capture**: Native Windows automation via VBScript for seamless highlight-to-translate
- **Installer**: Built with electron-builder (NSIS)
- **Minimum Requirements**: Windows 7 or later

---

## Troubleshooting

**The hotkey doesn't work**
- Make sure another application isn't using the same hotkey
- Try changing to a different hotkey combination in settings
- Restart the app after changing hotkeys

**Text isn't being captured automatically**
- Ensure the text is fully highlighted before pressing the hotkey
- Some applications may have protected text that can't be captured
- Try manually copying the text and opening QuickGerman

**App doesn't start on Windows startup**
- Enable "Launch on startup" in settings
- Check if your antivirus is blocking the app from registering as a startup item

---

## Contributing

Contributions are welcome! Feel free to open issues or submit pull requests.

--- 

## License

MIT License - feel free to use, modify, and distribute as you see fit.

