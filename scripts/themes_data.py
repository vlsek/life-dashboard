"""Единый источник правды для тем сайта (BACKLOG 11:49: Mint + набор тем; ответ владельца 2026-10-04: сразу набор, выбор — на усмотрение).

Править ТОЛЬКО здесь, затем запустить `python3 scripts/apply_themes.py` из корня репозитория: он идемпотентно обновит блоки тем во всех
`web-*/src/style.css`, `src/lib/theme.ts`, подписи `theme_*` в `i18n.ts`, карты цветов в `index.html`, шапку и общий сайт.
Порядок словаря = порядок в выпадающем списке тем. kind: 'dark' | 'light' (от него зависят цвет золота стакана и color-scheme).
Ключи переменных: bg, card(--bg-card), border, text, dim(--text-dim), accent, at(--accent-text), ok(--success), bad(--danger),
hist(--hist-ok), wt/wb/wl(--water-top/bottom/line).
"""
DARK_W = dict(wt='#63b3f5', wb='#2f86dc', wl='#4aa3ee')
LIGHT_W = dict(wt='#3f95e0', wb='#1560b8', wl='#1560b8')
SEPIA_W = dict(wt='#3589d6', wb='#1157ac', wl='#1157ac')
SOLAR_W = dict(wt='#2f7fcf', wb='#0f4f9f', wl='#0f4f9f')
NORD_W = dict(wt='#7cc4ff', wb='#4a9be8', wl='#6bb6f5')
P={
 'dark':('dark','🌑 Dark','🌑 Тёмная',dict(bg='#121212',card='#1e1e1e',border='#333333',text='#e6e6e6',dim='#9a9a9a',accent='#5b8def',at='#ffffff',ok='#4caf6a',bad='#e05252',hist='#3fa66b',**DARK_W)),
 'monet':('dark','🎨 Monet','🎨 Monet',dict(bg='#0d0703',card='#1c1108',border='#3a2614',text='#f2cf9e',dim='#b8895c',accent='#f2a93c',at='#1c1108',ok='#8fbf5a',bad='#e0715c',hist='#3fa66b',**DARK_W)),
 'light':('light','☀️ Light','☀️ Светлая',dict(bg='#f7f4ef',card='#ffffff',border='#e2dccf',text='#2b2118',dim='#8a7a63',accent='#d97f2a',at='#ffffff',ok='#4c9a5f',bad='#c94f3f',hist='#3fa66b',**LIGHT_W)),
 'pink':('light','🌸 Pink','🌸 Розовая',dict(bg='#fff0f5',card='#ffe2ec',border='#ffb8ce',text='#5c1a33',dim='#a8577a',accent='#ff4f81',at='#ffffff',ok='#4c9a5f',bad='#d9534f',hist='#3fa66b',wt='#3184d6',wb='#1359b0',wl='#1359b0')),
 'mint':('light','🌿 Mint','🌿 Mint (мятная)',dict(bg='#effaf4',card='#ffffff',border='#cde8d8',text='#17392b',dim='#4a7561',accent='#13805a',at='#ffffff',ok='#2b7d4f',bad='#c0392b',hist='#3fa66b',**LIGHT_W)),
 'sepia':('light','📜 Sepia','📜 Сепия',dict(bg='#f4ecd8',card='#fbf5e6',border='#dccfae',text='#433422',dim='#6f5b3d',accent='#9a5b13',at='#ffffff',ok='#4f7d34',bad='#b5432f',hist='#5a8a3c',**SEPIA_W)),
 'solarlight':('light','🌞 Solarized Light','🌞 Solarized Light',dict(bg='#fdf6e3',card='#eee8d5',border='#d3cbb0',text='#33474f',dim='#586e75',accent='#1d6fa8',at='#ffffff',ok='#6b7a00',bad='#c0302d',hist='#859900',**SOLAR_W)),
 'nord':('dark','❄️ Nord','❄️ Nord',dict(bg='#2e3440',card='#3b4252',border='#4c566a',text='#eceff4',dim='#aab4c5',accent='#88c0d0',at='#2e3440',ok='#a3be8c',bad='#e07a84',hist='#a3be8c',**NORD_W)),
 'mocha':('dark','✨ Orchid','✨ Орхидея',dict(bg='#1e1e2e',card='#313244',border='#45475a',text='#cdd6f4',dim='#a6adc8',accent='#cba6f7',at='#1e1e2e',ok='#a6e3a1',bad='#f38ba8',hist='#a6e3a1',**DARK_W)),
 'amoled':('dark','⚫ AMOLED','⚫ AMOLED (чёрная)',dict(bg='#000000',card='#0d0d0d',border='#262626',text='#f2f2f2',dim='#9a9a9a',accent='#4ea1ff',at='#000000',ok='#4caf6a',bad='#ff6b6b',hist='#3fa66b',**DARK_W)),
 'contrast':('dark','◐ High contrast','◐ Высокий контраст',dict(bg='#000000',card='#0a0a0a',border='#ffffff',text='#ffffff',dim='#d6d6d6',accent='#ffd60a',at='#000000',ok='#5cff8a',bad='#ff8080',hist='#5cff8a',**DARK_W)),
 # --- BACKLOG 45.4: 12 новых тем (8 тёмных + 4 светлых), открыты всегда (в UNLOCK не входят) ---
 'dracula':('dark','🧛 Dracula','🧛 Дракула',dict(bg='#282a36',card='#343746',border='#4b4f66',text='#f8f8f2',dim='#b9bcd6',accent='#bd93f9',at='#1e1f29',ok='#50fa7b',bad='#ff6e6e',hist='#50fa7b',**DARK_W)),
 'gruvbox':('dark','🍂 Gruvbox','🍂 Gruvbox',dict(bg='#282828',card='#3c3836',border='#504945',text='#ebdbb2',dim='#bdae93',accent='#fabd2f',at='#282828',ok='#b8bb26',bad='#fb4934',hist='#b8bb26',**DARK_W)),
 'tokyonight':('dark','🌃 Tokyo Night','🌃 Ночной Токио',dict(bg='#1a1b26',card='#24283b',border='#3b4261',text='#c0caf5',dim='#9aa5ce',accent='#7aa2f7',at='#1a1b26',ok='#9ece6a',bad='#f7768e',hist='#9ece6a',**DARK_W)),
 'forest':('dark','🌲 Forest','🌲 Лес',dict(bg='#0f1a14',card='#17261d',border='#2a4535',text='#d8ecdf',dim='#93b8a1',accent='#4cc38a',at='#0f1a14',ok='#6fd08c',bad='#e8776b',hist='#4cc38a',**DARK_W)),
 'ocean':('dark','🌊 Ocean','🌊 Океан',dict(bg='#0a1622',card='#112334',border='#1f3a52',text='#d6e8f7',dim='#8fb0cc',accent='#3fb6e8',at='#0a1622',ok='#5fcf9a',bad='#ef7b7b',hist='#4cc38a',**DARK_W)),
 'sunset':('dark','🌇 Sunset','🌇 Закат',dict(bg='#1c1014',card='#2a181e',border='#4a2a33',text='#fbe3d6',dim='#d0a090',accent='#ff7a59',at='#1c1014',ok='#8fcf7a',bad='#ff6b7a',hist='#8fcf7a',**DARK_W)),
 'twilight':('dark','🔮 Twilight','🔮 Сумерки',dict(bg='#150f25',card='#1f1736',border='#372a5c',text='#e8e0ff',dim='#a99bd1',accent='#a78bfa',at='#150f25',ok='#7ee0a8',bad='#ff7b9c',hist='#7ee0a8',**DARK_W)),
 'neon':('dark','🟢 Neon','🟢 Неон',dict(bg='#0b0f14',card='#121a22',border='#1f3340',text='#d7f5ee',dim='#86b3a8',accent='#00e5a8',at='#04120d',ok='#3df08f',bad='#ff5c7a',hist='#3df08f',**DARK_W)),
 'lavender':('light','💜 Lavender','💜 Лаванда',dict(bg='#f5f0ff',card='#ffffff',border='#ddd0f5',text='#2e1f4a',dim='#6a5594',accent='#7c4dff',at='#ffffff',ok='#2e8b57',bad='#c0392b',hist='#3fa66b',**LIGHT_W)),
 'sky':('light','🌤️ Sky','🌤️ Небо',dict(bg='#eef6fd',card='#ffffff',border='#cfe2f3',text='#12304a',dim='#46688a',accent='#1478c9',at='#ffffff',ok='#2f8f5b',bad='#c0392b',hist='#3fa66b',**LIGHT_W)),
 'peach':('light','🍑 Peach','🍑 Персик',dict(bg='#fff3ea',card='#ffffff',border='#f5d5bf',text='#4a2a14',dim='#85593a',accent='#c0451a',at='#ffffff',ok='#3f8f55',bad='#b8342b',hist='#3fa66b',**LIGHT_W)),
 'graphite':('light','🪨 Graphite','🪨 Графит',dict(bg='#eceff1',card='#ffffff',border='#cfd8dc',text='#263238',dim='#55707f',accent='#00796b',at='#ffffff',ok='#2e7d4f',bad='#c62828',hist='#3fa66b',**LIGHT_W)),
 # --- BACKLOG 50.1г: первая «большая тема» (оформление целиком, не только цвета; см. CHAR ниже) ---
 'emerald':('dark','🛰️ Emerald Obsidian','🛰️ Изумрудный обсидиан',dict(bg='#0b0f12',card='#121a1f',border='#2a3b42',text='#d9e8e3',dim='#8fa8a0',accent='#10b981',at='#04110c',ok='#34d399',bad='#f87171',hist='#10b981',**DARK_W)),
 # --- BACKLOG 50.1б: вторая «большая тема» (синтвейв: неоновое свечение, сетка точек, мягкие углы) ---
 'moonlight':('dark','🌆 Moonlight Synth','🌆 Лунный синтвейв',dict(bg='#0d081e',card='#16102b',border='#3d2f6e',text='#ece6ff',dim='#a99dd6',accent='#ff007f',at='#0d081e',ok='#3df5a0',bad='#ff6b8a',hist='#3df5a0',wt='#4de8ff',wb='#2a7fff',wl='#00d2ff')),
 # --- BACKLOG 50.1е: третья «большая тема» (ретро-терминал: зелёный фосфор на чёрном, острые углы, моноширинный шрифт, scanlines) ---
 'phosphor':('dark','📟 Matrix Phosphor','📟 Зелёный фосфор',dict(bg='#000000',card='#0d0d0d',border='#3a6b4a',text='#b8f5c8',dim='#6fbf8a',accent='#00ff66',at='#000000',ok='#5dff9a',bad='#ff6b6b',hist='#00ff66',wt='#5fd8ff',wb='#2a9fd8',wl='#3fc4f0')),
 # --- BACKLOG 50.1в: четвёртая «большая тема» (кибер-Токио: мягкие тени, скругление 8px, лавандовая подсветка активного). Близнец цветовой tokyonight по краскам — отличается характером ---
 'nightfall':('dark','🌌 Tokyo Nightfall','🌌 Токийские сумерки',dict(bg='#1a1b26',card='#24283b',border='#414868',text='#c0caf5',dim='#9aa5ce',accent='#7aa2f7',at='#1a1b26',ok='#9ece6a',bad='#f7768e',hist='#9ece6a',**DARK_W)),
 # --- BACKLOG 50.1д: пятая «большая тема» (пастельный бархат: уютно, без свечения, крупные скругления). Сестра цветовой mocha («Орхидея») — персиковый акцент вместо лилового ---
 'velvet':('dark','🍑 Velvet Dusk','🍑 Бархатные сумерки',dict(bg='#1e1e2e',card='#252536',border='#4a4c63',text='#cdd6f4',dim='#a6adc8',accent='#fab387',at='#1e1e2e',ok='#a6e3a1',bad='#f38ba8',hist='#a6e3a1',**DARK_W)),
 # --- BACKLOG 50.1ж: шестая «большая тема» (арктический минимализм: плоско, матово, высокий контраст). «Большая» сестра цветовой nord: красный алерта осветлён (исходный #bf616a давал 2.46:1), граница заметнее ---
 'frost':('dark','🧊 Nord Frost','🧊 Арктический иней',dict(bg='#2e3440',card='#3b4252',border='#667391',text='#eceff4',dim='#b8c2d4',accent='#88c0d0',at='#2e3440',ok='#a3be8c',bad='#e8838d',hist='#a3be8c',**NORD_W)),
 # --- BACKLOG 57.7 (файл 1, тема 1): первая СВЕТЛАЯ «большая тема» — Paper Alpine / Nord Light (скандинавский минимализм: холодный молочный фон, белые матовые карточки, без теней) ---
 'alpine':('light','🏔️ Paper Alpine','🏔️ Альпийская бумага',dict(bg='#f8f9fc',card='#ffffff',border='#cfd6e4',text='#2e3440',dim='#5b6577',accent='#4c6f99',at='#ffffff',ok='#3b7d57',bad='#b4424d',hist='#4f9a6a',**LIGHT_W)),
 # --- BACKLOG 57.7 (файл 1, тема 2): Matcha Latte / Matcha & Cream — уютная органическая светлая (кремовый фон, чайно-зелёный акцент, карамельная вторая краска, пушистые тёплые тени) ---
 'matcha':('light','🍵 Matcha Latte','🍵 Матча-латте',dict(bg='#f4f4f0',card='#fffefb',border='#d9d6c8',text='#33382f',dim='#686d5e',accent='#4f7a5c',at='#ffffff',ok='#3f7a4f',bad='#b3402f',hist='#5f8a6c',**LIGHT_W)),
 # --- BACKLOG 57.7 (файл 1, тема 3): Cyberpunk Day / Day Runner — светлый киберпанк (серебристый фон с точками, белые карточки с тёмной рамкой, ультрамарин, жёсткие тени, моноширинные метки) ---
 'cyberday':('light','⚡ Cyberpunk Day','⚡ Неоновый день',dict(bg='#eef0f4',card='#ffffff',border='#2b2f3a',text='#111827',dim='#4b5563',accent='#2563eb',at='#ffffff',ok='#15803d',bad='#be185d',hist='#16a34a',**LIGHT_W)),
 # --- BACKLOG 57.7 (файл 1, тема 4): Vintage Paper / Чернильная бумага — редакционная светлая (слоновая кость, чернильно-синий, терракотовый; пунктирные линии, контурные кнопки, засечки) ---
 'vintage':('light','📜 Vintage Paper','📜 Чернильная бумага',dict(bg='#fbfbfa',card='#ecebe4',border='#a9a699',text='#1e293b',dim='#586070',accent='#1e293b',at='#fbfbfa',ok='#3f6b45',bad='#c2410c',hist='#3f6b45',wt='#3f6f9a',wb='#2c5a85',wl='#35648f')),
 # --- BACKLOG 57.7 (файл 1, тема 5): Obsidian Light / Executive Glass — бизнес-стекло (светло-серый градиент, полупрозрачные стеклянные карточки с размытием, индиго и графит) ---
 'glass':('light','🪟 Executive Glass','🪟 Бизнес-стекло',dict(bg='#f1f3f5',card='#ffffff',border='#c9ced8',text='#1f2933',dim='#566170',accent='#4f46e5',at='#ffffff',ok='#2f855a',bad='#c53030',hist='#4f46e5',**LIGHT_W)),
 # --- BACKLOG 57.7 (файл 2, тема 1): Летний луг / Summer Meadow — солнечный летний день на природе (молочный белый с зеленоватым подтоном, травяной акцент, округлые формы) ---
 'meadow':('light','🌾 Summer Meadow','🌾 Летний луг',dict(bg='#f2f7f4',card='#ffffff',border='#a8cdb0',text='#1b3a28',dim='#4f6a58',accent='#2e7d32',at='#ffffff',ok='#2e7d32',bad='#c0392b',hist='#43a047',**LIGHT_W)),
 # --- BACKLOG 55.3 (срез 1): Осенняя / Autumn Harvest — тёплый светлый осенний день (кремовый фон, ржаво-янтарный акцент, листовые пятна, мягкие тёплые тени) ---
 'autumn':('light','🍂 Autumn Harvest','🍂 Осенняя',dict(bg='#fbf3e8',card='#fffaf2',border='#dcc3a3',text='#3b2415',dim='#74553f',accent='#b0471a',at='#ffffff',ok='#4a7a2c',bad='#b3261e',hist='#6a8f3a',**LIGHT_W)),
 # --- BACKLOG 55.3 (срез 2): Сакура / Cherry Blossom — светлая нежно-розовая тема (молочно-розовый фон, малиновый акцент, лепестковые пятна, очень мягкие формы) ---
 'sakura':('light','🌸 Cherry Blossom','🌸 Сакура',dict(bg='#fdf1f4',card='#fffafb',border='#eac3cf',text='#3d1f2b',dim='#7a5563',accent='#b8325f',at='#ffffff',ok='#3f7d4e',bad='#b3261e',hist='#c0587c',**LIGHT_W)),
}
NEW = [k for k in P if k not in ('dark', 'monet', 'light', 'pink')]

# «Характер» больших тем (BACKLOG 50): переопределения токенов оформления и правила, действующие ТОЛЬКО под `html.theme-<ключ>`; остальные темы
# не затрагиваются. tw — для Tailwind-страниц (пилоты), root — для корневого style.css без Tailwind. Скругление у Tailwind-страниц меняется
# переменными `--radius-md/lg/xl/2xl` (их читают и утилиты `rounded-*`, и `.card`/`.modal`/кнопки), `rounded-full` (кольца, аватарки) остаётся круглым.
SERIF = 'Georgia, "Iowan Old Style", "Palatino Linotype", "Times New Roman", serif'
MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace'
CHAR = {
    # Sci-Fi HUD: строгие углы 2px, пунктирные границы карточек, моноширинные заголовки, Snappy-анимации.
    'emerald': dict(
        tw='''  --radius-md: 2px;
  --radius-lg: 2px;
  --radius-xl: 2px;
  --radius-2xl: 2px;
  --border-style: dashed;
  --font-heading: %s;
  --default-transition-duration: 0.1s;
  --default-transition-timing-function: cubic-bezier(0, 1, 0, 1);''' % MONO,
        root='''  --radius-card: 2px;
  --radius-modal: 2px;
  --radius-control: 2px;
  --border-style: dashed;
  --font-heading: %s;''' % MONO,
        rules=[
            (['.card', '.modal', '[style*="var(--bg-card)"]'], 'border-style: var(--border-style);'),
            (['h1', 'h2', 'h3', 'h4'], 'font-family: var(--font-heading); letter-spacing: 0.01em;'),
        ],
        reduced='  --default-transition-duration: 0s;',
    ),
    # Синтвейв: мягкие углы, неоновое свечение активного (кнопки с заливкой, отмеченные галочки), фоновая сетка точек, пружинные Smooth-анимации.
    # При `prefers-contrast: more` свечение и сетка выключаются (contrast).
    'moonlight': dict(
        tw='''  --radius-md: 8px;
  --radius-lg: 10px;
  --radius-xl: 12px;
  --radius-2xl: 16px;
  --shadow-active: 0 0 12px rgba(255, 0, 127, 0.55);
  --bg-pattern: radial-gradient(circle at 1px 1px, rgba(167, 139, 250, 0.28) 1px, transparent 0);
  --bg-pattern-size: 22px 22px;
  --default-transition-duration: 0.25s;
  --default-transition-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1);''',
        root='''  --radius-card: 12px;
  --radius-modal: 12px;
  --radius-control: 10px;
  --shadow-active: 0 0 12px rgba(255, 0, 127, 0.55);
  --bg-pattern: radial-gradient(circle at 1px 1px, rgba(167, 139, 250, 0.28) 1px, transparent 0);
  --bg-pattern-size: 22px 22px;''',
        rules=[
            (['body'], 'background-image: var(--bg-pattern); background-size: var(--bg-pattern-size);'),
            (["button:not(.secondary):not(.danger):not(:disabled)", "input[type='checkbox']:checked", "input[type='radio']:checked"], 'box-shadow: var(--shadow-active);'),
        ],
        reduced='  --default-transition-duration: 0s;',
        contrast='  --shadow-active: none;\n  --bg-pattern: none;',
    ),
    # Ретро-терминал: острые углы 0px, моноширинный шрифт ВО ВСЁМ интерфейсе, scanlines (статичный полупрозрачный слой поверх страницы,
    # не перехватывает нажатия; при `prefers-contrast: more` выключается), Snappy-анимации.
    'phosphor': dict(
        tw='''  --radius-md: 0px;
  --radius-lg: 0px;
  --radius-xl: 0px;
  --radius-2xl: 0px;
  --font-heading: %s;
  --scanlines: repeating-linear-gradient(0deg, rgba(0, 0, 0, 0.22) 0, rgba(0, 0, 0, 0.22) 1px, transparent 1px, transparent 3px);
  --default-transition-duration: 0.08s;
  --default-transition-timing-function: cubic-bezier(0, 1, 0, 1);''' % MONO,
        root='''  --radius-card: 0px;
  --radius-modal: 0px;
  --radius-control: 0px;
  --font-heading: %s;
  --scanlines: repeating-linear-gradient(0deg, rgba(0, 0, 0, 0.22) 0, rgba(0, 0, 0, 0.22) 1px, transparent 1px, transparent 3px);''' % MONO,
        rules=[
            (['body', 'button', 'input', 'select', 'textarea'], 'font-family: var(--font-heading);'),
            (['body::after'], "content: ''; position: fixed; inset: 0; z-index: 2147483000; pointer-events: none; background-image: var(--scanlines);"),
        ],
        reduced='  --default-transition-duration: 0s;',
        contrast='  --scanlines: none;',
    ),
    # Кибер-Токио: мягкие расплывчатые тени карточек и окон, среднее скругление 8px, аккуратная лавандовая подсветка активных пунктов
    # (нажатые кнопки, выбранные вкладки, включённые переключатели), гладкие анимации. При `prefers-contrast: more` тень убирается,
    # а лавандовое кольцо активного остаётся чёткой обводкой.
    'nightfall': dict(
        tw='''  --radius-md: 6px;
  --radius-lg: 8px;
  --radius-xl: 8px;
  --radius-2xl: 12px;
  --shadow-card: 0 8px 28px rgba(0, 0, 0, 0.38);
  --shadow-active: 0 0 0 1px #bb9af7, 0 6px 18px rgba(187, 154, 247, 0.22);
  --default-transition-duration: 0.2s;
  --default-transition-timing-function: cubic-bezier(0.25, 0.8, 0.25, 1);''',
        root='''  --radius-card: 8px;
  --radius-modal: 8px;
  --radius-control: 8px;
  --shadow-card: 0 8px 28px rgba(0, 0, 0, 0.38);
  --shadow-active: 0 0 0 1px #bb9af7, 0 6px 18px rgba(187, 154, 247, 0.22);''',
        rules=[
            (['.card', '.modal', '[style*="var(--bg-card)"]'], 'box-shadow: var(--shadow-card);'),
            (['[aria-pressed="true"]', '[aria-selected="true"]', '[aria-checked="true"]', '[aria-current="page"]'], 'box-shadow: var(--shadow-active);'),
        ],
        reduced='  --default-transition-duration: 0s;',
        contrast='  --shadow-card: none;\n  --shadow-active: 0 0 0 2px #bb9af7;',
    ),
    # Пастельный бархат: уютная матовая тема. НИКАКОГО свечения и теней (токены оставлены `none`), увеличенные скругления 12-16px,
    # плавные пружинные анимации. Отличие от остальных больших тем — именно «мягкость без эффектов».
    'velvet': dict(
        tw='''  --radius-md: 10px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-2xl: 20px;
  --shadow-card: none;
  --shadow-active: none;
  --default-transition-duration: 0.3s;
  --default-transition-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1);''',
        root='''  --radius-card: 16px;
  --radius-modal: 16px;
  --radius-control: 12px;
  --shadow-card: none;
  --shadow-active: none;''',
        reduced='  --default-transition-duration: 0s;',
    ),
    # Арктический минимализм: плоские карточки БЕЗ теней, малые скругления, едва заметная матовая зернистость фона (крошечный data-URI тайл
    # с feTurbulence — растеризуется один раз, не фильтр на весь экран; без `;` внутри, чтобы не ломать разбор токенов), гладкие анимации.
    # При `prefers-contrast: more` зернистость выключается.
    'frost': dict(
        tw='''  --radius-md: 4px;
  --radius-lg: 6px;
  --radius-xl: 8px;
  --radius-2xl: 10px;
  --shadow-card: none;
  --shadow-active: none;
  --bg-pattern: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='120' height='120' filter='url(%23n)' opacity='0.05'/%3E%3C/svg%3E");
  --bg-pattern-size: 120px 120px;
  --default-transition-duration: 0.18s;
  --default-transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);''',
        root='''  --radius-card: 8px;
  --radius-modal: 8px;
  --radius-control: 6px;
  --shadow-card: none;
  --shadow-active: none;
  --bg-pattern: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='120' height='120' filter='url(%23n)' opacity='0.05'/%3E%3C/svg%3E");
  --bg-pattern-size: 120px 120px;''',
        rules=[
            (['body'], 'background-image: var(--bg-pattern); background-size: var(--bg-pattern-size);'),
        ],
        reduced='  --default-transition-duration: 0s;',
        contrast='  --bg-pattern: none;',
    ),
    # Скандинавский минимализм (светлая): ПЛОСКО, без теней — глубина за счёт чистых контрастов и тонкого разделения плоскостей; малые скругления,
    # гладкие анимации. Правил оформления нет (концепция — «ничего лишнего»), только токены.
    'alpine': dict(
        tw='''  --radius-md: 4px;
  --radius-lg: 6px;
  --radius-xl: 8px;
  --radius-2xl: 10px;
  --shadow-card: none;
  --shadow-active: none;
  --default-transition-duration: 0.2s;
  --default-transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);''',
        root='''  --radius-card: 8px;
  --radius-modal: 8px;
  --radius-control: 6px;
  --shadow-card: none;
  --shadow-active: none;''',
        reduced='  --default-transition-duration: 0s;',
    ),
    # Уютная органическая светлая тема: крупные скругления, «пушистые» рассеянные тёплые тени карточек (как будто парят над бумагой), гладкие анимации.
    # По выбору «Простое оформление» (и при prefers-contrast: more) тень убирается.
    'matcha': dict(
        tw='''  --radius-md: 10px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-2xl: 20px;
  --shadow-card: 0 8px 28px rgba(110, 96, 60, 0.14);
  --default-transition-duration: 0.2s;
  --default-transition-timing-function: cubic-bezier(0.25, 0.8, 0.25, 1);''',
        root='''  --radius-card: 16px;
  --radius-modal: 16px;
  --radius-control: 12px;
  --shadow-card: 0 8px 28px rgba(110, 96, 60, 0.14);''',
        rules=[
            (['.card', '.modal', '[style*="var(--bg-card)"]'], 'box-shadow: var(--shadow-card);'),
        ],
        reduced='  --default-transition-duration: 0s;',
        contrast='  --shadow-card: none;',
    ),
    # Светлый киберпанк: ЖЁСТКИЕ тени со смещением без размытия (ретро-интерфейсы), тёмная контрастная рамка, острые геометричные углы 4px,
    # моноширинный шрифт в заголовках, метках и кнопках, микро-сетка точек на серебристом фоне, Snappy-анимации. «Простое оформление» и
    # prefers-contrast: more убирают только сетку (жёсткая тень здесь — сам стиль, а не эффект, и к тому же даёт контраст).
    'cyberday': dict(
        tw='''  --radius-md: 3px;
  --radius-lg: 4px;
  --radius-xl: 4px;
  --radius-2xl: 6px;
  --shadow-card: 3px 3px 0 #111111;
  --shadow-active: 2px 2px 0 #111111;
  --font-heading: %s;
  --bg-pattern: radial-gradient(circle at 1px 1px, rgba(17, 24, 39, 0.16) 1px, transparent 0);
  --bg-pattern-size: 14px 14px;
  --default-transition-duration: 0.1s;
  --default-transition-timing-function: cubic-bezier(0, 1, 0, 1);''' % MONO,
        root='''  --radius-card: 4px;
  --radius-modal: 4px;
  --radius-control: 4px;
  --shadow-card: 3px 3px 0 #111111;
  --shadow-active: 2px 2px 0 #111111;
  --font-heading: %s;
  --bg-pattern: radial-gradient(circle at 1px 1px, rgba(17, 24, 39, 0.16) 1px, transparent 0);
  --bg-pattern-size: 14px 14px;''' % MONO,
        rules=[
            (['body'], 'background-image: var(--bg-pattern); background-size: var(--bg-pattern-size);'),
            (['.card', '.modal', '[style*="var(--bg-card)"]'], 'box-shadow: var(--shadow-card);'),
            (["button:not(.secondary):not(.danger):not(:disabled)"], 'box-shadow: var(--shadow-active);'),
            (['h1', 'h2', 'h3', 'h4', 'label', 'button'], 'font-family: var(--font-heading);'),
        ],
        reduced='  --default-transition-duration: 0s;',
        contrast='  --bg-pattern: none;',
    ),
    # Редакционная «чернильная бумага»: тонкие ПУНКТИРНЫЕ линии границ, ОТСУТСТВИЕ заливных кнопок (строгие контурные элементы — кольцо внутри,
    # без изменения размеров), заголовки с засечками (классическая типографика), острые углы 2px, плоско, гладкие анимации. Эффектов нет —
    # «Простое оформление» этой темой не затрагивается.
    'vintage': dict(
        tw='''  --radius-md: 2px;
  --radius-lg: 2px;
  --radius-xl: 3px;
  --radius-2xl: 4px;
  --shadow-card: none;
  --shadow-active: none;
  --border-style: dashed;
  --font-heading: %s;
  --default-transition-duration: 0.2s;
  --default-transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);''' % SERIF,
        root='''  --radius-card: 3px;
  --radius-modal: 3px;
  --radius-control: 2px;
  --shadow-card: none;
  --shadow-active: none;
  --border-style: dashed;
  --font-heading: %s;''' % SERIF,
        rules=[
            (['.card', '.modal', '[style*="var(--bg-card)"]'], 'border-style: var(--border-style);'),
            (['h1', 'h2', 'h3', 'h4'], 'font-family: var(--font-heading);'),
            (["button:not(.secondary):not(.danger):not(:disabled):not(.gh-secach-head):not([style*='padding: 0px']):not([style*='var(--bg-card)'])"], 'background: transparent; color: var(--accent); box-shadow: inset 0 0 0 1px var(--accent);'),
        ],
        reduced='  --default-transition-duration: 0s;',
    ),
    # Бизнес-стекло: ПОЛУПРОЗРАЧНЫЕ карточки и окна с размытием фона (backdrop-filter: blur(12px)) поверх мягкого градиента из световых пятен, тени
    # средней жёсткости, микро-подъём кнопок при наведении. Правило стекла стоит под @supports — без поддержки браузер покажет обычные непрозрачные
    # карточки; прозрачность — `color-mix` с токеном --glass-alpha (80%), `!important` нужен, потому что у многих карточек фон задан инлайном.
    # «Простое оформление», prefers-contrast: more и prefers-reduced-transparency: reduce убирают стекло, световые пятна и (кроме последнего) тень.
    'glass': dict(
        tw='''  --radius-md: 8px;
  --radius-lg: 10px;
  --radius-xl: 14px;
  --radius-2xl: 18px;
  --shadow-card: 0 4px 16px rgba(31, 41, 51, 0.1);
  --blur-glass: blur(12px);
  --glass-alpha: 80%;
  --bg-pattern: radial-gradient(circle at 12% 8%, rgba(79, 70, 229, 0.14), transparent 42%), radial-gradient(circle at 88% 82%, rgba(14, 165, 233, 0.12), transparent 46%);
  --bg-pattern-size: auto;
  --default-transition-duration: 0.2s;
  --default-transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);''',
        root='''  --radius-card: 14px;
  --radius-modal: 14px;
  --radius-control: 10px;
  --shadow-card: 0 4px 16px rgba(31, 41, 51, 0.1);
  --blur-glass: blur(12px);
  --glass-alpha: 80%;
  --bg-pattern: radial-gradient(circle at 12% 8%, rgba(79, 70, 229, 0.14), transparent 42%), radial-gradient(circle at 88% 82%, rgba(14, 165, 233, 0.12), transparent 46%);
  --bg-pattern-size: auto;''',
        rules=[
            (['body'], 'background-image: var(--bg-pattern); background-size: var(--bg-pattern-size);'),
            (['.card', '.modal', '[style*="var(--bg-card)"]'], 'box-shadow: var(--shadow-card);'),
            # BACKLOG 61.5: липкая шапка (`.sticky`) тоже имеет inline-фон `var(--bg-card)`, но внутри неё лежат `position: fixed` слои (правая панель
            # `.gh-panel`, `.gh-pf-layer`): `backdrop-filter` делает шапку их контейнером, и панель получала высоту шапки (60 px). Шапку из стекла исключаем.
            (['.card', '.modal', '[style*="var(--bg-card)"]:not(.sticky)'],
             'background-color: color-mix(in srgb, var(--bg-card) var(--glass-alpha, 100%), transparent) !important; backdrop-filter: var(--blur-glass);',
             '@supports ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px)))'),
            (['button:not(:disabled)'], 'transition: transform var(--default-transition-duration, 0.2s) ease, box-shadow var(--default-transition-duration, 0.2s) ease;'),
            (['button:not(:disabled):hover'], 'transform: translateY(-1px);'),
        ],
        reduced='  --default-transition-duration: 0s;',
        contrast='  --blur-glass: none;\n  --bg-pattern: none;\n  --shadow-card: none;\n  --glass-alpha: 100%;',
        transparency='  --blur-glass: none;\n  --glass-alpha: 100%;',
    ),
    # Летний луг: округлые мягкие формы (12px), ЛЁГКИЕ зеленоватые тени, тёплое солнечное пятно в углу фона («тепло и простор»), гладкие анимации.
    # «Простое оформление» и prefers-contrast: more убирают солнечное пятно и тень.
    'meadow': dict(
        tw='''  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 12px;
  --radius-2xl: 16px;
  --shadow-card: 0 2px 10px rgba(46, 125, 50, 0.1);
  --bg-pattern: radial-gradient(circle at 100% 0%, rgba(251, 192, 45, 0.2), transparent 42%), radial-gradient(circle at 0% 100%, rgba(129, 199, 132, 0.18), transparent 40%);
  --bg-pattern-size: auto;
  --default-transition-duration: 0.2s;
  --default-transition-timing-function: cubic-bezier(0.25, 0.8, 0.25, 1);''',
        root='''  --radius-card: 12px;
  --radius-modal: 12px;
  --radius-control: 12px;
  --shadow-card: 0 2px 10px rgba(46, 125, 50, 0.1);
  --bg-pattern: radial-gradient(circle at 100% 0%, rgba(251, 192, 45, 0.2), transparent 42%), radial-gradient(circle at 0% 100%, rgba(129, 199, 132, 0.18), transparent 40%);
  --bg-pattern-size: auto;''',
        rules=[
            (['body'], 'background-image: var(--bg-pattern); background-size: var(--bg-pattern-size);'),
            (['.card', '.modal', '[style*="var(--bg-card)"]'], 'box-shadow: var(--shadow-card);'),
        ],
        reduced='  --default-transition-duration: 0s;',
        contrast='  --bg-pattern: none;\n  --shadow-card: none;',
    ),
    # Осенняя (55.3, срез 1): округлые формы (10px), тёплые янтарные тени, «листовые» пятна (янтарь и ржавчина) в углах фона; без частиц — лёгкие декоративные слои только из CSS.
    # «Простое оформление» и prefers-contrast: more убирают пятна и тень; prefers-reduced-motion — переходы.
    'autumn': dict(
        tw='''  --radius-md: 8px;
  --radius-lg: 10px;
  --radius-xl: 12px;
  --radius-2xl: 16px;
  --shadow-card: 0 2px 10px rgba(176, 71, 26, 0.12);
  --bg-pattern: radial-gradient(circle at 0% 0%, rgba(230, 145, 56, 0.22), transparent 40%), radial-gradient(circle at 100% 100%, rgba(176, 71, 26, 0.14), transparent 42%);
  --bg-pattern-size: auto;
  --default-transition-duration: 0.2s;
  --default-transition-timing-function: cubic-bezier(0.25, 0.8, 0.25, 1);''',
        root='''  --radius-card: 10px;
  --radius-modal: 12px;
  --radius-control: 10px;
  --shadow-card: 0 2px 10px rgba(176, 71, 26, 0.12);
  --bg-pattern: radial-gradient(circle at 0% 0%, rgba(230, 145, 56, 0.22), transparent 40%), radial-gradient(circle at 100% 100%, rgba(176, 71, 26, 0.14), transparent 42%);
  --bg-pattern-size: auto;''',
        rules=[
            (['body'], 'background-image: var(--bg-pattern); background-size: var(--bg-pattern-size);'),
            (['.card', '.modal', '[style*="var(--bg-card)"]'], 'box-shadow: var(--shadow-card);'),
        ],
        reduced='  --default-transition-duration: 0s;',
        contrast='  --bg-pattern: none;\n  --shadow-card: none;',
    ),
    # Сакура (55.3, срез 2): самые мягкие формы (12/14/16px), розовые тени, «лепестковые» пятна (розовое вверху справа, светло-коралловое внизу слева); без частиц — только CSS.
    # «Простое оформление» и prefers-contrast: more убирают пятна и тень; prefers-reduced-motion — переходы.
    'sakura': dict(
        tw='''  --radius-md: 10px;
  --radius-lg: 14px;
  --radius-xl: 16px;
  --radius-2xl: 20px;
  --shadow-card: 0 2px 12px rgba(184, 50, 95, 0.12);
  --bg-pattern: radial-gradient(circle at 100% 0%, rgba(244, 143, 177, 0.28), transparent 42%), radial-gradient(circle at 0% 100%, rgba(255, 183, 160, 0.22), transparent 42%);
  --bg-pattern-size: auto;
  --default-transition-duration: 0.22s;
  --default-transition-timing-function: cubic-bezier(0.25, 0.8, 0.25, 1);''',
        root='''  --radius-card: 14px;
  --radius-modal: 16px;
  --radius-control: 12px;
  --shadow-card: 0 2px 12px rgba(184, 50, 95, 0.12);
  --bg-pattern: radial-gradient(circle at 100% 0%, rgba(244, 143, 177, 0.28), transparent 42%), radial-gradient(circle at 0% 100%, rgba(255, 183, 160, 0.22), transparent 42%);
  --bg-pattern-size: auto;''',
        rules=[
            (['body'], 'background-image: var(--bg-pattern); background-size: var(--bg-pattern-size);'),
            (['.card', '.modal', '[style*="var(--bg-card)"]'], 'box-shadow: var(--shadow-card);'),
        ],
        reduced='  --default-transition-duration: 0s;',
        contrast='  --bg-pattern: none;\n  --shadow-card: none;',
    ),
}
assert all(k in P for k in CHAR)

# Анимация воды «записалось» у больших тем (BACKLOG 55.5, срез 1): вариант из реестра WATER_ANIMS (wave | drops | ripple) — действует, ЕСЛИ пользователь не выбрал
# вариант вручную в «Настройках» шапки (ручной выбор главнее). Словарь ОТДЕЛЬНО от CHAR; тема без записи = спокойная волна. Генератор apply_themes.py
# пишет из него `themeWater.ts` в web-header и web-dashboard. Подбор по характеру темы: HUD и терминал — «рябь» (расходящиеся круги, как скан),
# синтвейв — «капли» (пружинные), спокойная ночная — «волна».
THEME_WATER = {'emerald': 'ripple', 'moonlight': 'drops', 'phosphor': 'ripple', 'nightfall': 'wave', 'velvet': 'drops', 'frost': 'ripple', 'alpine': 'wave', 'matcha': 'drops', 'cyberday': 'ripple', 'vintage': 'wave', 'glass': 'wave', 'meadow': 'ripple', 'autumn': 'drops', 'sakura': 'ripple'}
assert all(k in CHAR for k in THEME_WATER) and all(v in ('wave', 'drops', 'ripple') for v in THEME_WATER.values())

# Заставка загрузки (лоадер страниц) у больших тем (BACKLOG 55.5, срез 2): вариант из реестра SPLASH_VARIANTS (classic | flame | ring | tongues) — действует,
# ЕСЛИ вариант не выбран вручную (ручной выбор и `?splash=` главнее). Тема без записи = «живое пламя». Генератор пишет `themeLoader.ts` и вставляет
# запасной вариант в скрипт выбора заставки во всех web-*/index.html (статичная заставка берёт его до загрузки бандла). Подбор по характеру: HUD —
# «кольцо» (скан), синтвейв — «три языка» (неоновое пламя), терминал — «классика» (простая), спокойная ночная — «живое пламя».
THEME_LOADER = {'emerald': 'ring', 'moonlight': 'tongues', 'phosphor': 'classic', 'nightfall': 'flame', 'velvet': 'flame', 'frost': 'ring', 'alpine': 'classic', 'matcha': 'flame', 'cyberday': 'tongues', 'vintage': 'classic', 'glass': 'ring', 'meadow': 'flame', 'autumn': 'flame', 'sakura': 'ring'}
assert all(k in CHAR for k in THEME_LOADER) and all(v in ('classic', 'flame', 'ring', 'tongues') for v in THEME_LOADER.values())

# Темы-награды (решение владельца 2026-10-06): тема → ключ достижения, НАГРАДОЙ за которое она открывается (4-я, самая трудная ступень
# лесенки в web-achievements/src/lib/rewards.ts; согласованность сверяет тест rewards.test.ts). Остальные темы (исходные четыре и
# «Высокий контраст» — доступность) открыты всегда. Ключ темы (mocha) остаётся прежним: он хранится у людей в localStorage; меняется только подпись.
UNLOCK = {'mint': 'skills_25', 'sepia': 'words_100', 'solarlight': 'goals_50', 'nord': 'learned_100', 'mocha': 'books_25', 'amoled': 'workouts_250'}
assert all(k in P for k in UNLOCK)


# ---------------------------------------------------------------------------------------------------------------------------
# Палитра диаграмм особенностей подхода по теме (BACKLOG 13:55). Токены темы --chart-1…--chart-8, --chart-none, --chart-other.
# Правила: первая особенность — акцент темы; остальные семь — оттенки разных тонов (синий, красный, янтарь, зелёный, фиолет, циан,
# розовый, пурпур) без тона, слишком близкого к акценту; светлота подбирается под тему, чтобы контраст с карточкой был ≥ 3:1;
# цвета различимы между собой (ΔE по CIE76: первые четыре особенности ≥ 25, любые две из восьми ≥ 14 — проверяет web-dashboard/src/themes.test.ts).
# ---------------------------------------------------------------------------------------------------------------------------
import colorsys as _cs
import math as _m

_HUES = [215, 5, 40, 150, 275, 185, 325]
_RESERVE = [300, 245, 125, 20, 60]


def _rgb(h):
    return [int(h[i:i + 2], 16) / 255 for i in (1, 3, 5)]


def _hex(r):
    return '#%02x%02x%02x' % tuple(round(max(0, min(1, v)) * 255) for v in r)


def _lum(h):
    c = [v / 12.92 if v <= 0.03928 else ((v + 0.055) / 1.055) ** 2.4 for v in _rgb(h)]
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]


def _cr(a, b):
    x, y = sorted((_lum(a), _lum(b)), reverse=True)
    return (x + 0.05) / (y + 0.05)


def _hue(h):
    return _cs.rgb_to_hls(*_rgb(h))[0] * 360


def _hd(a, b):
    d = abs(a - b) % 360
    return min(d, 360 - d)


def _fit(hex_color, kind, card, floor=3.2):
    """Сдвигает светлоту до контраста с карточкой >= floor, не меняя тон и насыщенность."""
    h, l, s = _cs.rgb_to_hls(*_rgb(hex_color))
    step = 0.02 if kind == 'dark' else -0.02
    for _ in range(45):
        c = _hex(_cs.hls_to_rgb(h, l, s))
        if _cr(c, card) >= floor:
            return c
        l = max(0.0, min(1.0, l + step))
    return _hex(_cs.hls_to_rgb(h, l, s))


# Сдвиг светлоты по тону: соседние по кругу оттенки (янтарь/лайм/зелёный, циан/синий) иначе сливаются на светлых темах.
_L_SHIFT = {85: 0.10, 40: -0.03, 185: 0.05, 150: -0.04, 125: 0.08, 60: 0.08}


def _tone(hue, kind, card):
    s, l = (0.78, 0.64) if kind == 'dark' else (0.72, 0.40)
    l += _L_SHIFT.get(hue, 0) * (1 if kind == 'dark' else 1.2)
    return _fit(_hex(_cs.hls_to_rgb(hue / 360, l, s)), kind, card)


def _mix(a, b, t):
    ra, rb = _rgb(a), _rgb(b)
    return _hex([ra[i] * (1 - t) + rb[i] * t for i in range(3)])


def chart_palette(key):
    """-> {'c': [8 hex], 'none': hex, 'other': hex} для темы key."""
    kind, _, _, v = P[key]
    card, acc = v['card'], v['accent']
    ah = _hue(acc)
    tones = []
    for gap in (28, 20, 12):  # сначала строгий зазор по тону, при нехватке цветов — мягче (всегда нужно ровно 7 + акцент)
        for h in _HUES + _RESERVE:
            if len(tones) < 7 and h not in tones and _hd(h, ah) >= gap and all(_hd(h, t) >= gap for t in tones):
                tones.append(h)
    cols = [_fit(acc, kind, card)] + [_tone(h, kind, card) for h in tones]
    # «без особенности» и «остальные» — нейтральные серые (не оттенки темы, чтобы не путались с цветными особенностями)
    none = _fit('#9aa0a6' if kind == 'dark' else '#6b7280', kind, card, 3.2)
    other = _fit(_mix(none, '#000000' if kind == 'dark' else '#ffffff', 0.4), kind, card, 3.0)
    return {'c': cols, 'none': none, 'other': other}
