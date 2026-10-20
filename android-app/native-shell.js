// Нативные мелочи внутри приложения (BACKLOG 66.6). В обычном браузере ничего не делает. Подключается build-www.mjs в каждую страницу.
;(function () {
  var cap = globalThis.Capacitor
  var ROOT_PATHS = ['/', '/login/', '/dashboard/', '/index.html']

  // «Назад» на корневых страницах закрывает приложение, на остальных — возвращает по истории.
  function shouldExitOnBack(pathname, historyLength) {
    return ROOT_PATHS.indexOf(pathname) >= 0 || historyLength <= 1
  }
  // Светлый ли цвет #rrggbb: от этого зависит, тёмные или светлые значки в строке состояния.
  function isLightColor(hex) {
    var m = /^#([0-9a-f]{6})$/i.exec(hex || '')
    if (!m) return false
    var n = parseInt(m[1], 16)
    var r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255
    return 0.299 * r + 0.587 * g + 0.114 * b > 150
  }
  globalThis.__ldNative = { shouldExitOnBack: shouldExitOnBack, isLightColor: isLightColor }

  if (!cap || !cap.isNativePlatform || !cap.isNativePlatform()) return
  var P = cap.Plugins || {}

  if (P.App) {
    P.App.addListener('backButton', function () {
      if (shouldExitOnBack(location.pathname, history.length)) P.App.exitApp()
      else history.back()
    })
  }

  function applyStatusBar() {
    if (!P.StatusBar) return
    var meta = document.querySelector('meta[name="theme-color"]')
    var color = meta && meta.getAttribute('content')
    if (!color) return
    try {
      P.StatusBar.setBackgroundColor({ color: color })
      // Style.Dark = светлые значки (для тёмного фона); Style.Light = тёмные значки (для светлого фона)
      P.StatusBar.setStyle({ style: isLightColor(color) ? 'LIGHT' : 'DARK' })
    } catch (e) { /* строка состояния — косметика */ }
  }
  document.addEventListener('DOMContentLoaded', function () {
    applyStatusBar()
    var meta = document.querySelector('meta[name="theme-color"]')
    if (meta && globalThis.MutationObserver) new MutationObserver(applyStatusBar).observe(meta, { attributes: true, attributeFilter: ['content'] })
    // Заставку приложения прячем, когда страница загрузилась (в Capacitor launchAutoHide отключён, чтобы не мелькал белый экран).
    if (P.SplashScreen) setTimeout(function () { P.SplashScreen.hide() }, 150)
  })
})()
