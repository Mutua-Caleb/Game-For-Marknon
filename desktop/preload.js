const { contextBridge, ipcRenderer } = require('electron')

const isInternalPage = window.location.protocol === 'file:'

const desktopApi = {
  isDesktopApp: true,
  platform: process.platform
}

if (isInternalPage) {
  desktopApi.getConfig = () => ipcRenderer.invoke('desktop:get-config')
  desktopApi.testServerUrl = (url) => ipcRenderer.invoke('desktop:test-server-url', url)
  desktopApi.saveServerUrl = (url) => ipcRenderer.invoke('desktop:save-server-url', url)
  desktopApi.retryConnection = () => ipcRenderer.invoke('desktop:retry-connection')
  desktopApi.openSetup = () => ipcRenderer.invoke('desktop:open-setup')
  desktopApi.getLastError = () => ipcRenderer.invoke('desktop:get-last-error')
}

contextBridge.exposeInMainWorld('wordBlasterDesktop', Object.freeze(desktopApi))
