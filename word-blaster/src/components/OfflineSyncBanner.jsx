import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'
import { prefetchOfflineData, syncOfflineData } from '../utils/api'
import {
  getOfflineStatus,
  initOfflineState,
  setOnlineStatus,
  subscribeOfflineStatus
} from '../utils/offlineStore'
import './OfflineSyncBanner.css'

const UPDATE_CHECK_INTERVAL_MS = 15 * 60 * 1000

function readLearner() {
  try {
    return JSON.parse(localStorage.getItem('learnerAccount'))
  } catch {
    return null
  }
}

function isStandaloneDesktop() {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: window-controls-overlay)').matches ||
    window.navigator.standalone === true
  )
}

function OfflineSyncBanner() {
  const { pathname } = useLocation()
  const [status, setStatus] = useState(getOfflineStatus)
  const [updateReady, setUpdateReady] = useState(false)
  const [installPrompt, setInstallPrompt] = useState(null)
  const [isInstalled, setIsInstalled] = useState(isStandaloneDesktop)
  const [syncMessage, setSyncMessage] = useState('')
  const updateSWRef = useRef(null)
  const swRegRef = useRef(null)

  const runSyncAndPrefetch = useCallback(async (showFeedback = false) => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setOnlineStatus(false)
      return
    }

    const learner = readLearner()
    const syncResult = await syncOfflineData()
    await prefetchOfflineData(learner)

    if (syncResult.synced > 0) {
      window.dispatchEvent(new CustomEvent('wordblaster:synced'))
      setSyncMessage(`Synced ${syncResult.synced} offline ${syncResult.synced === 1 ? 'item' : 'items'}`)
      window.setTimeout(() => setSyncMessage(''), 4000)
    } else if (showFeedback) {
      window.dispatchEvent(new CustomEvent('wordblaster:synced'))
      setSyncMessage('Content updated for offline play')
      window.setTimeout(() => setSyncMessage(''), 3000)
    }

    if (swRegRef.current) {
      swRegRef.current.update().catch(() => {})
    }
  }, [])

  // Register Service Worker with automatic update checks
  useEffect(() => {
    const updateSW = registerSW({
      immediate: true,
      onNeedRefresh() {
        setUpdateReady(true)
      },
      onRegisteredSW(_swUrl, registration) {
        swRegRef.current = registration || null
      },
      onRegisterError(err) {
        console.warn('Service worker registration failed:', err)
      }
    })
    updateSWRef.current = updateSW

    const interval = window.setInterval(() => {
      if (navigator.onLine && swRegRef.current) {
        swRegRef.current.update().catch(() => {})
      }
    }, UPDATE_CHECK_INTERVAL_MS)

    return () => window.clearInterval(interval)
  }, [])

  // Subscribe to offline store + online/offline browser events
  useEffect(() => {
    const unsubscribe = subscribeOfflineStatus(setStatus)
    initOfflineState().then(() => {
      if (navigator.onLine) {
        runSyncAndPrefetch(false)
      }
    })

    const handleOnline = () => {
      setOnlineStatus(true)
      runSyncAndPrefetch(false)
    }

    const handleOffline = () => {
      setOnlineStatus(false)
    }

    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && navigator.onLine) {
        if (swRegRef.current) {
          swRegRef.current.update().catch(() => {})
        }
        if (getOfflineStatus().pendingCount > 0) {
          runSyncAndPrefetch(false)
        }
      }
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      unsubscribe()
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [runSyncAndPrefetch])

  // Prefetch learner-specific data when landing on home after login
  useEffect(() => {
    if (pathname === '/' && navigator.onLine) {
      const learner = readLearner()
      if (learner?.id) {
        prefetchOfflineData(learner)
      }
    }
  }, [pathname])

  // Capture Edge/Chrome desktop install prompt
  useEffect(() => {
    const handleBeforeInstall = (event) => {
      event.preventDefault()
      setInstallPrompt(event)
    }
    const handleAppInstalled = () => {
      setInstallPrompt(null)
      setIsInstalled(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall)
    window.addEventListener('appinstalled', handleAppInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!installPrompt) return
    installPrompt.prompt()
    const choice = await installPrompt.userChoice
    if (choice?.outcome === 'accepted') {
      setInstallPrompt(null)
    }
  }

  const handleApplyUpdate = () => {
    if (updateSWRef.current) {
      updateSWRef.current(true)
    } else {
      window.location.reload()
    }
  }

  // Keep admin portal uncluttered unless an update is ready
  const isAdminRoute = pathname.startsWith('/admin')
  if (isAdminRoute && !updateReady) return null

  const isHomeOrLogin = pathname === '/' || pathname === '/login'
  const showInstall = Boolean(installPrompt) && !isInstalled && isHomeOrLogin
  const showImportantState = !status.online || status.syncing || status.pendingCount > 0 || updateReady || Boolean(syncMessage)

  if (!isHomeOrLogin && !showImportantState) {
    return null
  }

  const toneClass = !status.online
    ? 'is-offline'
    : status.syncing || status.prefetching
      ? 'is-syncing'
      : status.pendingCount > 0
        ? 'is-pending'
        : 'is-online'

  let label = status.offlineReady ? 'Offline Ready' : 'Online'
  if (syncMessage) {
    label = syncMessage
  } else if (!status.online) {
    label = status.pendingCount > 0
      ? `Offline · ${status.pendingCount} waiting to sync`
      : 'Offline mode'
  } else if (status.syncing) {
    label = `Syncing ${status.pendingCount}…`
  } else if (status.prefetching) {
    label = 'Updating offline cache…'
  } else if (status.pendingCount > 0) {
    label = `${status.pendingCount} pending sync`
  }

  return (
    <div className="offline-sync-dock" role="status" aria-live="polite">
      <div className={`offline-sync-pill ${toneClass}`}>
        <span className="offline-sync-dot" aria-hidden="true" />
        <span className="offline-sync-label">{label}</span>

        {status.online && !status.syncing && !status.prefetching && (isHomeOrLogin || status.pendingCount > 0) && (
          <button
            type="button"
            className="offline-sync-action"
            onClick={() => runSyncAndPrefetch(true)}
            title="Check for new questions and sync offline progress"
          >
            Sync
          </button>
        )}
      </div>

      {updateReady && (
        <button
          type="button"
          className="offline-update-btn"
          onClick={handleApplyUpdate}
        >
          Update ready · Refresh
        </button>
      )}

      {showInstall && (
        <button
          type="button"
          className="offline-install-btn"
          onClick={handleInstallClick}
        >
          Install Desktop App
        </button>
      )}
    </div>
  )
}

export default OfflineSyncBanner
