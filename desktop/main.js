const { app, BrowserWindow, ipcMain, Menu, session } = require('electron')
const path = require('path')
const fs = require('fs')

const isDev = process.env.WORDBLASTER_DEV === '1'
const DEFAULT_CONFIG_PATH = path.join(__dirname, 'default-config.json')

let mainWindow = null
let lastLoadError = null

// Allow sound effects and Web Speech voiceover without autoplay blocks
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required')

function getUserConfigPath() {
  return path.join(app.getPath('userData'), 'config.json')
}

function readJsonSafe(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'))
    }
  } catch (err) {
    console.warn('Could not read config:', filePath, err.message)
  }
  return {}
}

function normalizeServerUrl(raw) {
  if (!raw || typeof raw !== 'string') return ''
  let trimmed = raw.trim()
  if (!trimmed) return ''
  if (!/^https?:\/\//i.test(trimmed)) {
    trimmed = `https://${trimmed}`
  }
  try {
    const parsed = new URL(trimmed)
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return ''
    }
    // Strip trailing slashes for consistent origin comparison
    return parsed.origin + parsed.pathname.replace(/\/+$/, '')
  } catch {
    return ''
  }
}

function readConfig() {
  const defaults = readJsonSafe(DEFAULT_CONFIG_PATH)
  const userCfg = readJsonSafe(getUserConfigPath())
  const envUrl = normalizeServerUrl(process.env.WORDBLASTER_URL || '')
  const userUrl = normalizeServerUrl(userCfg.serverUrl || '')
  const defaultUrl = normalizeServerUrl(defaults.serverUrl || '')

  return {
    serverUrl: envUrl || userUrl || defaultUrl || '',
    windowBounds: userCfg.windowBounds || null,
    isMaximized: Boolean(userCfg.isMaximized)
  }
}

function writeConfig(patch) {
  const existing = readJsonSafe(getUserConfigPath())
  const next = { ...existing, ...patch }
  const cfgPath = getUserConfigPath()
  fs.mkdirSync(path.dirname(cfgPath), { recursive: true })
  fs.writeFileSync(cfgPath, JSON.stringify(next, null, 2), 'utf8')
  return next
}

function getAllowedOrigin(serverUrl) {
  try {
    return new URL(serverUrl).origin
  } catch {
    return ''
  }
}

function isTrustedInternalSender(event) {
  const url = event?.senderFrame?.url || ''
  return url.startsWith('file://')
}

function loadSetupScreen(win) {
  win.loadFile(path.join(__dirname, 'setup.html'))
}

function loadOfflineScreen(win) {
  win.loadFile(path.join(__dirname, 'offline.html'))
}

function loadAppUrl(win, serverUrl) {
  lastLoadError = null
  win.loadURL(serverUrl).catch((err) => {
    // ERR_ABORTED (-3) happens normally on redirects or rapid reloads
    if (err && err.code === 'ERR_ABORTED') return
    lastLoadError = err?.message || 'Could not reach the Word Blaster server.'
    loadOfflineScreen(win)
  })
}

function createWindow() {
  const config = readConfig()
  const bounds = config.windowBounds || {}

  mainWindow = new BrowserWindow({
    title: 'Word Blaster',
    width: bounds.width || 1280,
    height: bounds.height || 820,
    x: typeof bounds.x === 'number' ? bounds.x : undefined,
    y: typeof bounds.y === 'number' ? bounds.y : undefined,
    minWidth: 900,
    minHeight: 640,
    backgroundColor: '#1a1a2e',
    icon: path.join(__dirname, 'assets', process.platform === 'win32' ? 'icon.ico' : 'icon.png'),
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      devTools: isDev,
      spellcheck: false
    }
  })

  // Remove the top application menu so kids cannot open browser/window menus
  Menu.setApplicationMenu(null)
  mainWindow.setMenuBarVisibility(false)

  if (config.isMaximized) {
    mainWindow.maximize()
  }

  mainWindow.once('ready-to-show', () => {
    if (mainWindow) mainWindow.show()
  })

  // Kid-proof: block all popups and external browser launches (e.g., SoroMath Discord/GitHub links)
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))

  // Kid-proof: prevent attaching <webview> tags
  mainWindow.webContents.on('will-attach-webview', (event) => {
    event.preventDefault()
  })

  // Kid-proof: lock main-frame navigation strictly to configured Word Blaster origin or internal file:// screens
  const enforceOriginLock = (event, targetUrl) => {
    if (!targetUrl) return
    if (targetUrl.startsWith('file://')) return

    const currentConfig = readConfig()
    const allowedOrigin = getAllowedOrigin(currentConfig.serverUrl)
    try {
      const targetOrigin = new URL(targetUrl).origin
      if (allowedOrigin && targetOrigin === allowedOrigin) {
        return
      }
    } catch {
      // Invalid URL — block it
    }
    event.preventDefault()
  }

  mainWindow.webContents.on('will-navigate', enforceOriginLock)
  mainWindow.webContents.on('will-redirect', (event, targetUrl, _isInPlace, isMainFrame) => {
    if (isMainFrame) {
      enforceOriginLock(event, targetUrl)
    }
  })

  // Keyboard lockdown + hidden parent shortcut (Ctrl+Shift+Alt+P) to change server URL
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown') return
    const key = (input.key || '').toLowerCase()
    const ctrlOrCmd = input.control || input.meta

    // Hidden parent shortcut: Ctrl + Shift + Alt + P -> open server setup screen
    if (ctrlOrCmd && input.shift && input.alt && key === 'p') {
      event.preventDefault()
      loadSetupScreen(mainWindow)
      return
    }

    // Block DevTools, View Source, New Tab/Window, Address Bar shortcuts
    if (!isDev) {
      if (key === 'f12') {
        event.preventDefault()
        return
      }
      if (ctrlOrCmd && input.shift && (key === 'i' || key === 'j' || key === 'c')) {
        event.preventDefault()
        return
      }
      if (ctrlOrCmd && (key === 'u' || key === 't' || key === 'n' || key === 'l' || key === 'p')) {
        event.preventDefault()
        return
      }
    }
  })

  // Show built-in offline screen if initial load fails (e.g., offline before first sync)
  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    if (!isMainFrame) return
    if (errorCode === -3) return // ERR_ABORTED
    if (validatedURL && validatedURL.startsWith('file://')) return

    lastLoadError = `${errorDescription || 'Network error'} (${errorCode})`
    loadOfflineScreen(mainWindow)
  })

  // Persist window size and maximized state
  const persistBounds = () => {
    if (!mainWindow || mainWindow.isDestroyed()) return
    const isMaximized = mainWindow.isMaximized()
    const nextBounds = isMaximized ? readConfig().windowBounds : mainWindow.getBounds()
    writeConfig({
      isMaximized,
      ...(nextBounds ? { windowBounds: nextBounds } : {})
    })
  }

  mainWindow.on('close', persistBounds)
  mainWindow.on('closed', () => {
    mainWindow = null
  })

  if (config.serverUrl) {
    loadAppUrl(mainWindow, config.serverUrl)
  } else {
    loadSetupScreen(mainWindow)
  }
}

// Single-instance lock so double-clicking Desktop icon focuses the open window
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })

  app.whenReady().then(() => {
    // Allow audio/speech/clipboard permissions only for our configured app origin
    session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
      const allowedPermissions = new Set(['media', 'audioCapture', 'clipboard-read', 'clipboard-sanitized-write'])
      const config = readConfig()
      const allowedOrigin = getAllowedOrigin(config.serverUrl)
      const requestingUrl = webContents.getURL() || ''
      const isAllowedOrigin = allowedOrigin && requestingUrl.startsWith(allowedOrigin)
      callback(Boolean(isAllowedOrigin && allowedPermissions.has(permission)))
    })

    createWindow()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow()
      }
    })
  })
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// IPC handlers — restricted strictly to internal file:// setup/offline screens
ipcMain.handle('desktop:get-config', (event) => {
  if (!isTrustedInternalSender(event)) return { serverUrl: '' }
  const cfg = readConfig()
  return { serverUrl: cfg.serverUrl }
})

ipcMain.handle('desktop:get-last-error', (event) => {
  if (!isTrustedInternalSender(event)) return ''
  return lastLoadError || ''
})

ipcMain.handle('desktop:test-server-url', async (event, rawUrl) => {
  if (!isTrustedInternalSender(event)) return { ok: false, error: 'Unauthorized' }
  const url = normalizeServerUrl(rawUrl)
  if (!url) {
    return { ok: false, error: 'Please enter a valid web address (for example: https://your-app.onrender.com).' }
  }

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 12000)
    const res = await fetch(`${url}/api/questions/topics`, { signal: controller.signal })
    clearTimeout(timeout)
    if (!res.ok) {
      return { ok: false, url, error: `Server responded with status ${res.status}. Check the URL and try again.` }
    }
    return { ok: true, url }
  } catch (err) {
    return {
      ok: false,
      url,
      error: err.name === 'AbortError'
        ? 'Connection timed out (the server may be waking up). Try again in a few seconds.'
        : 'Could not reach that server right now. Check the URL and internet connection.'
    }
  }
})

ipcMain.handle('desktop:save-server-url', (event, rawUrl) => {
  if (!isTrustedInternalSender(event)) return { ok: false, error: 'Unauthorized' }
  const url = normalizeServerUrl(rawUrl)
  if (!url) {
    return { ok: false, error: 'Please enter a valid URL starting with https://' }
  }
  writeConfig({ serverUrl: url })
  if (mainWindow && !mainWindow.isDestroyed()) {
    loadAppUrl(mainWindow, url)
  }
  return { ok: true, url }
})

ipcMain.handle('desktop:retry-connection', (event) => {
  if (!isTrustedInternalSender(event)) return false
  const cfg = readConfig()
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (cfg.serverUrl) {
      loadAppUrl(mainWindow, cfg.serverUrl)
    } else {
      loadSetupScreen(mainWindow)
    }
  }
  return true
})

ipcMain.handle('desktop:open-setup', (event) => {
  if (!isTrustedInternalSender(event)) return false
  if (mainWindow && !mainWindow.isDestroyed()) {
    loadSetupScreen(mainWindow)
  }
  return true
})
