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
  // ---- Напоминания (BACKLOG 66.9): чистый план «что и когда показать», без обращения к телефону (проверяется тестами). ----
  // settings = { water: { enabled, fromHour, toHour, everyHours }, workout: { enabled, time: 'HH:MM', weekdays: [1..7] } } — дни ISO: 1 = понедельник … 7 = воскресенье.
  var WATER_ID0 = 1000, WORKOUT_ID0 = 2000, MAX_WATER = 24
  function clampInt(v, lo, hi, dflt) {
    var n = Math.floor(Number(v))
    if (!isFinite(n)) return dflt
    return Math.min(hi, Math.max(lo, n))
  }
  function reminderTexts(lang) {
    return lang && String(lang).slice(0, 2) === 'ru'
      ? { waterT: 'Пора выпить воды', waterB: 'Отметьте стакан в Life Dashboard.', workT: 'Время тренировки', workB: 'Откройте Life Dashboard и начните тренировку.' }
      : { waterT: 'Time for water', waterB: 'Log a glass in Life Dashboard.', workT: 'Workout time', workB: 'Open Life Dashboard and start your workout.' }
  }
  function reminderPlan(settings, lang) {
    var s = settings || {}, x = reminderTexts(lang), plan = []
    var w = s.water
    if (w && w.enabled) {
      var from = clampInt(w.fromHour, 0, 23, 9), to = clampInt(w.toHour, 0, 23, 21), step = clampInt(w.everyHours, 1, 12, 2)
      if (to < from) { var tmp = from; from = to; to = tmp }
      for (var h = from, i = 0; h <= to && i < MAX_WATER; h += step, i++) plan.push({ id: WATER_ID0 + i, title: x.waterT, body: x.waterB, on: { hour: h, minute: 0 } })
    }
    var k = s.workout
    if (k && k.enabled) {
      var m = /^(\d{1,2}):(\d{2})$/.exec(String(k.time || '18:30'))
      var hh = m ? clampInt(m[1], 0, 23, 18) : 18, mm = m ? clampInt(m[2], 0, 59, 30) : 30
      var days = (Array.isArray(k.weekdays) ? k.weekdays : [1, 2, 3, 4, 5, 6, 7]).map(Number).filter(function (d) { return d >= 1 && d <= 7 && d === Math.floor(d) })
      days = days.filter(function (d, j) { return days.indexOf(d) === j })
      for (var q = 0; q < days.length; q++) plan.push({ id: WORKOUT_ID0 + days[q], title: x.workT, body: x.workB, on: { weekday: (days[q] % 7) + 1, hour: hh, minute: mm } }) // Capacitor: 1 = воскресенье
    }
    return plan
  }
  function allReminderIds() {
    var ids = []
    for (var i = 0; i < MAX_WATER; i++) ids.push(WATER_ID0 + i)
    for (var d = 1; d <= 7; d++) ids.push(WORKOUT_ID0 + d)
    return ids
  }
  var HAPTIC_MAP = { light: ['impact', 'LIGHT'], medium: ['impact', 'MEDIUM'], success: ['notification', 'SUCCESS'], warning: ['notification', 'WARNING'] }
  globalThis.__ldNative = {
    isNative: false, shouldExitOnBack: shouldExitOnBack, isLightColor: isLightColor, reminderPlan: reminderPlan, allReminderIds: allReminderIds, hapticMap: HAPTIC_MAP,
    // В браузере — ничего не делают (возвращают false); в приложении заменяются настоящими ниже.
    haptic: function () { return Promise.resolve(false) },
    applyReminders: function () { return Promise.resolve(false) },
  }

  if (!cap || !cap.isNativePlatform || !cap.isNativePlatform()) return
  var P = cap.Plugins || {}
  globalThis.__ldNative.isNative = true

  if (P.App) {
    P.App.addListener('backButton', function () {
      if (shouldExitOnBack(location.pathname, history.length)) P.App.exitApp()
      else history.back()
    })
  }

  // Вибро: короткий отклик на действие (нажатие «+» воды, выполненный подход). Нет плагина или ошибка — молча ничего.
  if (P.Haptics) {
    globalThis.__ldNative.haptic = function (kind) {
      var m = HAPTIC_MAP[kind] || HAPTIC_MAP.light
      try {
        var r = m[0] === 'notification' ? P.Haptics.notification({ type: m[1] }) : P.Haptics.impact({ style: m[1] })
        return Promise.resolve(r).then(function () { return true }, function () { return false })
      } catch (e) { return Promise.resolve(false) }
    }
  }
  // Локальные напоминания: заменяем прежние (по известным id) новыми по плану. Разрешение просим только когда есть что показывать.
  if (P.LocalNotifications) {
    globalThis.__ldNative.applyReminders = function (settings) {
      var LN = P.LocalNotifications, plan = reminderPlan(settings, document.documentElement.lang)
      var cancel = function () { return LN.cancel({ notifications: allReminderIds().map(function (id) { return { id: id } }) }) }
      if (!plan.length) return Promise.resolve(cancel()).then(function () { return true }, function () { return false })
      return Promise.resolve(LN.checkPermissions())
        .then(function (p) { return p && p.display === 'granted' ? p : LN.requestPermissions() })
        .then(function (p) {
          if (!p || p.display !== 'granted') return false
          return Promise.resolve(cancel()).then(function () {
            return LN.schedule({ notifications: plan.map(function (n) { return { id: n.id, title: n.title, body: n.body, schedule: { on: n.on, allowWhileIdle: true } } }) })
          }).then(function () { return true })
        })
        .catch(function () { return false })
    }
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
