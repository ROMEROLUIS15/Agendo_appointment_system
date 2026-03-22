'use client'

/**
 * usePwaInstall — Captures the browser's beforeinstallprompt event.
 *
 * WHY module-level capture:
 *   beforeinstallprompt fires once, early in the page lifecycle — often
 *   BEFORE React mounts and useEffect registers a listener. If we only
 *   listen inside useEffect, we miss the event and canInstall is always false.
 *   Capturing at module level (outside React) guarantees the event is caught
 *   regardless of hydration timing.
 *
 * Returns:
 *  - canInstall:  true when the browser is ready to show the install dialog
 *  - install:     triggers the native install prompt
 *  - isInstalled: true when the app is already running as a standalone PWA
 *
 * Platform support:
 *  - Android Chrome / Chromium: full support
 *  - iOS Safari: not supported (Apple does not implement beforeinstallprompt)
 *  - Desktop Chrome/Edge: supported
 */

import { useState, useEffect, useCallback } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

// ── Module-level event store ──────────────────────────────────────────────────
// Runs once when this module loads — before any component mounts.
// This ensures the event is captured even if React is slow to hydrate.

let _deferred: BeforeInstallPromptEvent | null = null
const _subscribers = new Set<() => void>()

function notifySubscribers() {
  _subscribers.forEach(fn => fn())
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    _deferred = e as BeforeInstallPromptEvent
    notifySubscribers()
  })

  window.addEventListener('appinstalled', () => {
    _deferred = null
    notifySubscribers()
  })
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export interface PwaInstallState {
  canInstall:  boolean
  isInstalled: boolean
  install:     () => Promise<void>
}

export function usePwaInstall(): PwaInstallState {
  const [isInstalled, setIsInstalled] = useState(false)
  const [hasEvent,    setHasEvent]    = useState(() => _deferred !== null)

  useEffect(() => {
    // Check standalone mode on mount
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
      return
    }

    // Sync with the module-level store in case the event already fired
    setHasEvent(_deferred !== null)

    // Subscribe to future updates (event fires after mount, or app gets installed)
    const onUpdate = () => {
      setHasEvent(_deferred !== null)
      if (_deferred === null) setIsInstalled(true)
    }

    _subscribers.add(onUpdate)
    return () => { _subscribers.delete(onUpdate) }
  }, [])

  const install = useCallback(async () => {
    if (!_deferred) return
    await _deferred.prompt()
    const { outcome } = await _deferred.userChoice
    if (outcome === 'accepted') {
      _deferred = null
      setHasEvent(false)
      setIsInstalled(true)
    }
  }, [])

  return {
    canInstall:  hasEvent && !isInstalled,
    isInstalled,
    install,
  }
}
