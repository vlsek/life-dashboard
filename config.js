// ==== НАСТРОЙ ЭТИ ДВЕ СТРОКИ ПОСЛЕ СОЗДАНИЯ ПРОЕКТА В SUPABASE ====
const SUPABASE_URL = "https://haxmgtflegsfpxieaydv.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_jvg_Y0JtOC66Edj1WbAgqg_n0LfjWAF";
// ===================================================================

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ---- PWA: установка приложения ----
let deferredInstallPrompt = null;
window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
});

function isStandaloneApp() {
    return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
}
function isIOSDevice() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}

function showInstallInstructionsModal() {
    const backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop";
    const modal = document.createElement("div");
    modal.className = "modal";
    modal.innerHTML = `<h3>${t("install_title")}</h3>`;

    const p = document.createElement("p");
    p.style.cssText = "margin-top:12px; line-height:1.6;";
    p.textContent = isIOSDevice() ? t("install_ios_steps") : t("install_generic_steps");
    modal.appendChild(p);

    const actions = document.createElement("div");
    actions.className = "modal-actions";
    const closeBtn = document.createElement("button");
    closeBtn.className = "secondary";
    closeBtn.textContent = t("close");
    closeBtn.onclick = () => backdrop.remove();
    actions.appendChild(closeBtn);
    modal.appendChild(actions);

    backdrop.appendChild(modal);
    backdrop.onclick = (e) => { if (e.target === backdrop) backdrop.remove(); };
    document.body.appendChild(backdrop);
}

async function handleInstallClick() {
    if (deferredInstallPrompt) {
        deferredInstallPrompt.prompt();
        await deferredInstallPrompt.userChoice;
        deferredInstallPrompt = null;
    } else {
        showInstallInstructionsModal();
    }
}

const SITE_VERSION = "0.50";

// ==== История обновлений — короткая заметка на каждую версию, показывается по клику
// на номер версии в сайдбаре. Добавлять новую запись сверху на RU и EN при каждом бампе версии. ====
const CHANGELOG_RU = [
    { version: "0.50", date: "2026-09-24", changes: [
        "У целей появились дедлайн и сложность (лёгкая/средняя/сложная). Под названием цели показываются метки: сколько дней осталось до срока (жёлтая — 3 дня и меньше, красная — срок сегодня или просрочено) и сложность",
        "Цели внутри категории сортируются по ближайшему дедлайну, без срока — в конце",
        "Нужна миграция migrations/020_goal_deadline_difficulty.sql (выполнить один раз в Supabase → SQL Editor); без неё всё остальное работает как раньше",
    ]},
    { version: "0.49", date: "2026-09-24", changes: [
        "Приветственный тур для новых пользователей: 7 коротких шагов про дашборд, цели, навыки, тренировки, челленджи, магазин, сообщество и календарь. Показывается один раз сразу после онбординга",
        "Тур можно открыть снова в любой момент: в боковом меню появился пункт «Как пользоваться»",
    ]},
    { version: "0.48", date: "2026-09-24", changes: [
        "Воду можно вносить за прошлые дни: в окошке воды появился выбор даты. Кружок, стрик, графики и неделя обновляются сразу, без перезагрузки",
        "У каждого подхода теперь фиксируется время: проставляется само, когда вписываешь повторения, и его можно поправить руками (дашборд и раздел «Тренировки»)",
        "Раздел «О проекте» превратился в «О создателе»: короткая информация об авторе и ссылка на портфолио",
        "Монохромная иконка для тем Android пересобрана: силуэт теперь целиком внутри безопасной зоны, добавлен размер 192 и явный id приложения. Чтобы иконка подхватилась, приложение нужно удалить с экрана и добавить заново",
        "Мелочь: цель воды в окошке теперь сразу пересчитывает полосу, а при 100% полоса золотая",
    ]},
    { version: "0.47", date: "2026-09-24", changes: [
        "Кружок недели теперь можно вынести в шапку: в настройке прогресса (⚙️) новый вариант «Кружок недели в шапке». Он отличается от дневного пунктирной дорожкой и подписью «нед»",
        "Напоминание по выходным больше не подбирает случайную цель: просто показывает текущий процент и ссылку «Сделай что-то из целей, чтобы добить до 100%», ведущую в цели",
    ]},
    { version: "0.46", date: "2026-09-24", changes: [
        "Иконка выхода (дверь) убрана из шапки — выход снова только в боковом меню. Выход теперь ведёт на страницу входа, а не на визитку",
        "Кружок прогресса и стакан воды закреплены у правого края шапки в фиксированном порядке и больше не прыгают",
        "Стакан воды при 100% нормы становится золотым",
        "Огонёк стрика теперь сплошной, если стрик на сегодня уже засчитан (пунктир остаётся только как предупреждение)",
        "Шестерёнка у аватарки снова круглая, а не вытянутый овал",
        "Ссылка «Назад к портфолио» на странице входа оформлена как остальные элементы",
    ]},
    { version: "0.45", date: "2026-09-22", changes: [
        "Неделя теперь считается пн-вс, а не сб-пт",
        "Подсказка про незакрытую неделю убрана из постоянного кружка — вместо этого баннер-напоминание, который появляется только по субботам/воскресеньям, если неделя ещё не на 100%",
        "Иконка выхода (дверь) в правом углу шапки — теперь не обязательно лезть в боковое меню",
        "Клик по баллам (💰) в профиле уводит в магазин",
        "Иконка стрика — контурная/пунктирная SVG вместо заливного эмодзи; если сегодня ещё не засчитано — подсвечивается малиновым, а при клике прямым текстом предупреждает, что серия под угрозой. Плюс починили баг: стрик не обновлялся без перезагрузки страницы",
        "Новый виджет — вода в шапке: стакан заполняется по ходу дня, кнопки +200мл/+1л/+своё, дневная норма считается по весу автоматически или задаётся вручную",
    ]},
    { version: "0.44", date: "2026-09-22", changes: [
        "Иконка приложения: добавили monochrome-вариант — на Android с системной тёмной/цветной темой (Material You) иконка теперь встраивается в общий стиль, как у остальных приложений, а не остаётся всегда со своим фоном",
        "У прогресса дня теперь два режима отображения (настраивается через ⚙️): кольцом вокруг аватарки (как раньше) или отдельным заполняемым кружком с процентом в шапке страницы",
        "Добавили прогресс недели — отдельный кружок рядом с аватаркой, по той же логике, что и день, но за 7 дней. Неделя считается с субботы по пятницу. Если неделя не закрыта — рядом подсказка с незавершённой целью, которую можно доделать",
    ]},
    { version: "0.43", date: "2026-09-22", changes: [
        "Отметка пункта плана / звёздочки / метрики за сегодня больше не перерисовывает всю карточку «Профиль» — обновляется только само кольцо прогресса дня, без исчезновения и появления всего блока",
    ]},
    { version: "0.42", date: "2026-09-21", changes: [
        "Починили размножение блока профиля при быстрых подряд изменениях (например, несколько раз подряд жмёшь звёздочку) — теперь параллельные вызовы обновления схлопываются в один, вместо того чтобы плодить копии друг под другом",
        "Бонусное кольцо теперь рисуется поверх основного тем же радиусом (не отдельным маленьким кольцом внутри), цвет — малиновый вместо зелёного",
        "В «Запланировано на сегодня» добавили подсказку прямо на странице про то, что делает звёздочка ⭐ — раньше это можно было узнать только из всплывающей подсказки при наведении",
    ]},
    { version: "0.41", date: "2026-09-21", changes: [
        "«Запланировано на сегодня» больше не пересобирает весь список при отметке пункта или звёздочки — меняется только конкретная строка, без дёрганья всего блока",
    ]},
    { version: "0.40", date: "2026-09-21", changes: [
        "Починили бонусные ⭐-пункты — раньше они считались только если план на сегодня включён в базовые 100% настроек диаграммы дня, из-за чего при сценарии «трекер целей» (только метрики) бонус вообще не срабатывал и было не перевыполнить 100%. Теперь бонус считается всегда, независимо от этой настройки",
    ]},
    { version: "0.39", date: "2026-09-21", changes: [
        "Лого: вернул плоские цвета вместо градиента, поправил — иконка была смещена от центра, теперь по центру и лучше заполняет форму",
        "Кольцо прогресса дня теперь обновляется сразу, без перезагрузки страницы — при сохранении метрики или отметке пункта плана",
        "Под аватаркой появился процент дня текстом, шестерёнка настройки стала аккуратнее (эмодзи по центру)",
        "У пунктов «Запланировано на сегодня» — звёздочка ⭐ «доп. пункт»: не входит в базовые 100%, а при выполнении добавляет +20% сверху отдельным кольцом другого цвета — так можно перевыполнить день",
        "У каждого графика теперь свой период (кнопка 🗓️ рядом с графиком) — можно оставить общий из «Настроить графики» или задать свой только для этого графика",
    ]},
    { version: "0.38", date: "2026-09-20", changes: [
        "Починили баг с NaN% в диаграмме дня — в коде осталось два определения одной функции, побеждала старая, отсюда и NaN, и невидимая шестерёнка настроек",
        "Диаграмма дня переехала с отдельного блока прямо на кольцо вокруг аватарки — при 100% полная рамка вокруг фото, при 50% половина и т.д. Шестерёнка настройки — маленький значок в углу кольца",
    ]},
    { version: "0.37", date: "2026-09-20", changes: [
        "Выпадающие списки (select и особенность подхода) переделаны на позиционирование относительно экрана, а не блока — раньше в тесных местах не хватало места ни вверху, ни внизу и список было не проскроллить с телефона. Теперь высота списка всегда подгоняется под реально доступное место и скроллится нормально",
    ]},
    { version: "0.36", date: "2026-09-20", changes: [
        "Форма огонька в лого стала стройнее — убрал «шарообразность» снизу, теперь больше похоже на живое пламя",
        "Диаграмма дня переехала в блок «Профиль» (была в «Запланировано на сегодня») — теперь складывается и из дневных метрик, и из плана на день, можно настроить через ⚙️ рядом с ней (в т.ч. вообще скрыть)",
        "В онбординге новый первый вопрос — «Как планируешь использовать?» (трекер целей / ежедневник / и то и другое). Для «ежедневника» форма сразу прячет фитнес-поля (рост/вес/цель/метрики) — они не нужны, если человеку нужен просто список дел",
    ]},
    { version: "0.35", date: "2026-09-20", changes: [
        "Новый логотип — тот же огонёк, но с градиентом и объёмом вместо плоской заливки (иконка, favicon, PWA — везде обновилось)",
        "В тренировках теперь можно добавить свою категорию с любым названием — кроме пресетов Верх/Низ/Фулбади/Кастом появился пункт «➕ Добавить свою категорию…»",
        "На дашборде в блоке «Запланировано на сегодня» — круглая диаграмма: сколько % из запланированного на сегодня уже сделано",
    ]},
    { version: "0.34", date: "2026-09-19", changes: [
        "Категория упражнения в тренировках стала выбором из фиксированных вариантов: Верх / Низ / Фулбади / Кастом (плюс «без категории») — вместо свободного текста, чтобы группы не расходились из-за опечаток и регистра",
        "Порядок групп в тренировках теперь фиксированный (Верх → Низ → Фулбади → Кастом → старые категории → без категории), а не по порядку добавления",
        "Все select-поля в модалках (не только «Тип» метрики) теперь используют свою выпадашку вместо нативного пикера",
    ]},
    { version: "0.33", date: "2026-09-19", changes: [
        "Починили обрезанный и некликабельный список «особенность подхода» у последней строки в таблице — теперь список сам открывается вверх, если снизу не хватает места внутри прокручиваемой таблицы",
    ]},
    { version: "0.32", date: "2026-09-19", changes: [
        "У поля «особенность подхода» появилась стрелка ▾ справа — по клику сразу показывает полный список запомненных вариантов, не дожидаясь ввода текста",
    ]},
    { version: "0.31", date: "2026-09-19", changes: [
        "Сократили строку профиля, чтобы влезала в одну строку: «💰 Баланс: 120» → «💰 120», у изменений тела в скобках убрали «с начала» — просто «(+1.0кг)», возраст теперь «29 лет» с правильным склонением вместо «Возраст: 29»",
    ]},
    { version: "0.30", date: "2026-09-19", changes: [
        "Страница «Аккаунт» — убрали лишнее ограничение ширины блоков, теперь как на остальных страницах",
        "Глазик показать/скрыть пароль — вместо эмодзи обычная SVG-иконка, как везде",
        "Починили сломанный CSS: чекбоксы (видимость профиля в сообществе, отметки в плане календаря) больше не растягиваются на полблока",
        "Тренировки: упражнения теперь группируются по категории (то самое поле «Категория» при создании упражнения — можно писать «Верх», «Низ», «Фулбади» и т.п.), каждая группа сворачивается независимо",
    ]},
    { version: "0.29", date: "2026-09-18", changes: [
        "Вход через Google на странице логина (кнопка под формой) — работает после настройки Google-провайдера в Supabase, см. README",
        "Привязка Google к уже существующему аккаунту — в «Аккаунте», если регистрировался по почте, а теперь хочет заодно входить через Google",
        "Глазик показать/скрыть пароль — на входе, регистрации и смене пароля в аккаунте",
        "Графики без данных больше не показываются пустыми — секция сама сворачивается, если данных нет вообще, и разворачивается, как только они появляются (если раздел не трогали руками)",
        "Домик в быстрой навигации заменили на лого (тот самый огонёк)",
        "Кнопка быстрой навигации — простой текст >>> вместо спецсимволов",
        "Выпадающий список «Тип» в форме метрики (включая «Подходы») переделан со стандартного select на свой рендер — на случай если системный пикер плохо ведёт себя в установленном PWA",
        "«О проекте» переехал в самый низ бокового меню, ссылки внутри модалок стали нормального акцентного цвета вместо стандартного синего",
    ]},
    { version: "0.28", date: "2026-09-18", changes: [
        "В сайдбаре появился пункт «📲 Установить приложение» — на Android/desktop Chrome сразу открывает системный диалог установки, на iPhone/iPad и остальных браузерах показывает понятную инструкцию (нативного диалога на iOS не бывает вообще — это ограничение самого iOS)",
        "Добавили iOS-мета-теги, чтобы установленное на iPhone приложение открывалось в полноэкранном режиме и с нормальной иконкой",
    ]},
    { version: "0.27", date: "2026-09-18", changes: [
        "Дашборд теперь PWA — можно установить на Android как приложение («Установить» / «На главный экран» в Chrome): своя иконка, запуск в полноэкранном режиме без адресной строки, цвет статус-бара подстраивается под выбранную тему",
    ]},
    { version: "0.26", date: "2026-09-18", changes: [
        "Убрали ссылку «← Портфолио» из сайдбара (раз проекты разделены — смысла в ней больше нет), вместо неё — «О проекте»: ссылка на визитку + контакт для обратной связи",
    ]},
    { version: "0.25", date: "2026-09-18", changes: [
        "Починили деплой: без index.html в корне Cloudflare Workers не мог найти статику и падал со сборкой. Вернули index.html — теперь это лёгкая заглушка с мгновенным редиректом на /login.html",
    ]},
    { version: "0.24", date: "2026-09-18", changes: [
        "Подключили реальный URL визитки вместо заглушки, добавили редирект с корня сайта на страницу входа",
    ]},
    { version: "0.23", date: "2026-09-18", changes: [
        "Визитка вынесена в отдельный репозиторий и будет жить на отдельном деплое — из этого репо убраны index.html/portfolio.css, ссылки на визитку временно указывают на заглушку до подключения реального URL",
    ]},
    { version: "0.22", date: "2026-09-17", changes: [
        "Выпадающий список «особенность подхода» в метрике-раскладушке (например «Отжимания») переделан со стандартного нативного datalist на свою выпадашку — теперь у каждого варианта есть ✕, чтобы сразу удалить случайно/неверно введённое значение, не заходя в настройки метрики",
    ]},
    { version: "0.21", date: "2026-09-17", changes: [
        "Убрал перенос строк у быстрой навигации — при раскрытии все иконки остаются в одной строке рядом с кнопкой »»»",
    ]},
    { version: "0.20", date: "2026-09-17", changes: [
        "Быстрая навигация снова скрыта за кнопкой »»», но теперь по нажатию раскрываются сразу все иконки (новой строкой), без частичного показа и скролла",
    ]},
    { version: "0.19", date: "2026-09-17", changes: [
        "Верхняя навигация больше не сворачивается — все иконки разделов сразу видны, переносятся на вторую строку при нехватке места вместо скролла",
        "Почистили README в репозитории и убрали служебный файл для переноса контекста между чатами",
    ]},
    { version: "0.18", date: "2026-09-17", changes: [
        "Кнопка быстрой навигации теперь «»»» вместо многоточия",
        "Полный проход по переводу сайта: переключатель темы, сообщения входа/регистрации, единица веса по умолчанию в тренировках — теперь на двух языках",
        "История обновлений в сайдбаре тоже переведена на английский",
    ]},
    { version: "0.17", date: "2026-09-17", changes: [
        "Верхняя навигация переделана: в строке остался только домик, остальные разделы — в выезжающей вправо панели по кнопке »»»",
    ]},
    { version: "0.16", date: "2026-09-17", changes: [
        "Иконка ⚙️ вместо кнопки «Настроить дашборд» — просто рядом с заголовком, без фона",
        "Смена email в разделе «Аккаунт»",
        "Быстрая навигация эмодзи-иконками в верхней строке (🏠 — на главную, крупнее остальных)",
        "История обновлений по клику на номер версии в сайдбаре",
    ]},
];
const CHANGELOG_EN = [
    { version: "0.50", date: "2026-09-24", changes: [
        "Goals now have a deadline and a difficulty (easy/medium/hard). Chips under the goal name show how many days are left (amber at 3 days or less, red when due today or overdue) and the difficulty",
        "Goals inside a category are sorted by the nearest deadline; goals without one go last",
        "Requires migration migrations/020_goal_deadline_difficulty.sql (run once in Supabase → SQL Editor); everything else keeps working without it",
    ]},
    { version: "0.49", date: "2026-09-24", changes: [
        "Welcome tour for new users: 7 short steps covering the dashboard, goals, skills, workouts, challenges, shop, community and calendar. Shown once right after onboarding",
        "The tour can be reopened any time: the side menu has a new \"How it works\" item",
    ]},
    { version: "0.48", date: "2026-09-24", changes: [
        "Water can be logged for past days: the water dialog has a date picker. The circle, streak, charts and week update instantly, no reload needed",
        "Every set now records its time: it is filled in automatically when you enter the reps and can be edited by hand (dashboard and the Workouts page)",
        "The \"About\" section became \"About the creator\": short info about the author and a link to the portfolio",
        "The monochrome icon for Android themes was rebuilt: the silhouette now sits fully inside the safe zone, a 192 size and an explicit app id were added. To pick it up, remove the app from the home screen and add it again",
        "Small thing: changing the water goal in the dialog now recalculates the bar right away, and the bar turns gold at 100%",
    ]},
    { version: "0.47", date: "2026-09-24", changes: [
        "The week circle can now live in the header: the progress settings (⚙️) have a new \"Week circle in the header\" option. It differs from the day circle by a dashed track and a \"wk\" label",
        "The weekend reminder no longer picks a random goal: it just shows the current percentage and a link \"Do something from your goals to reach 100%\" that leads to the goals page",
    ]},
    { version: "0.46", date: "2026-09-24", changes: [
        "Logout icon (door) removed from the header — logout lives in the side menu again. Logging out now leads to the login page instead of the portfolio",
        "The progress circle and the water glass are pinned to the right edge of the header in a fixed order and no longer jump around",
        "The water glass turns gold at 100% of the daily goal",
        "The streak flame is solid once today's streak is counted (dashed only stays as an at-risk warning)",
        "The gear next to the avatar is round again instead of a stretched oval",
        "The \"Back to portfolio\" link on the login page is properly styled",
    ]},
    { version: "0.45", date: "2026-09-22", changes: [
        "Week now runs Monday-Sunday instead of Saturday-Friday",
        "The unfinished-week hint moved out of the permanent circle — now a reminder banner that only shows up on Saturday/Sunday if the week isn't at 100% yet",
        "Logout icon (open door) in the top-right corner of the header — no need to dig into the side menu just for that",
        "Clicking the points (💰) in the profile takes you to the shop",
        "Streak icon is now an outline/dashed SVG instead of a solid emoji; turns crimson if today isn't counted yet, and clicking it spells out that the streak is at risk. Also fixed a bug where the streak wouldn't update without a page reload",
        "New widget — water tracker in the header: a glass that fills up through the day, +200ml/+1L/+custom buttons, daily goal calculated from weight automatically or set manually",
    ]},
    { version: "0.44", date: "2026-09-22", changes: [
        "App icon: added a monochrome variant — on Android with a system dark/themed look (Material You), the icon now blends in like other apps instead of always keeping its own background",
        "Day progress now has two display modes (via ⚙️): a ring around the avatar (as before) or a separate filling circle with the percentage in the page header",
        "Added week progress — a separate circle next to the avatar, same logic as the day one but over 7 days. The week runs Saturday through Friday. If the week isn't finished, a hint next to it suggests an unfinished goal to wrap up",
    ]},
    { version: "0.43", date: "2026-09-22", changes: [
        "Checking a plan item / toggling its star / saving today's metric no longer redraws the whole Profile card — only the day-progress ring itself updates, without the block vanishing and reappearing",
    ]},
    { version: "0.42", date: "2026-09-21", changes: [
        "Fixed the profile block duplicating itself on rapid successive changes (e.g. toggling the star several times quickly) — overlapping refresh calls now collapse into one instead of stacking up copies",
        "The bonus ring now draws on top of the base ring at the same radius (not a separate smaller inner ring), colored crimson instead of green",
        "Added an on-page hint in \"Planned for today\" explaining what the ⭐ star does — previously that was only discoverable via a hover tooltip",
    ]},
    { version: "0.41", date: "2026-09-21", changes: [
        "\"Planned for today\" no longer rebuilds the whole list when checking an item or toggling its star — only that one row updates, no more jarring whole-block redraw",
    ]},
    { version: "0.40", date: "2026-09-21", changes: [
        "Fixed ⭐ bonus items — they only counted before if \"Planned for today\" was included in the base 100% of the day-progress settings, so with the \"goal tracker\" onboarding path (metrics only) the bonus never triggered and 100% couldn't be exceeded. Bonus now counts always, regardless of that setting",
    ]},
    { version: "0.39", date: "2026-09-21", changes: [
        "Logo: reverted to flat colors instead of the gradient, and fixed it being off-center — now centered and fills the icon shape better",
        "Day-progress ring now updates instantly, no page reload needed — right when a metric is saved or a plan item is checked off",
        "Added a percentage number as text under the avatar; the settings gear badge is cleaner now (emoji properly centered)",
        "\"Planned for today\" items now have a ⭐ \"bonus item\" star — it doesn't count toward the base 100%, but adds +20% on top when completed, shown as a second ring in a different color — a way to go past 100%",
        "Each chart now has its own period (🗓️ button next to it) — use the shared one from \"Configure charts\" or set a custom range just for that chart",
    ]},
    { version: "0.38", date: "2026-09-20", changes: [
        "Fixed the NaN% bug in the day-progress chart — the code had two definitions of the same function, the old one was winning, hence the NaN and the invisible settings gear",
        "Day-progress chart moved from its own block onto a ring around the avatar — 100% draws a full ring around the photo, 50% half, and so on. The settings gear is a small icon on the ring's corner now",
    ]},
    { version: "0.37", date: "2026-09-20", changes: [
        "Dropdown lists (select and set-variation) now position relative to the screen instead of their block — in tight spots there used to be no room above or below and the list couldn't be scrolled on phone. Its height now always fits the actually available space and scrolls properly",
    ]},
    { version: "0.36", date: "2026-09-20", changes: [
        "Flame logo shape is leaner now — removed the \"balloon\" look at the bottom, reads more like an actual flame",
        "Day-progress chart moved into the Profile block (was in \"Planned for today\") — now draws from both daily metrics and today's plan, configurable via ⚙️ next to it (including hiding it entirely)",
        "New first onboarding question — \"How do you plan to use this?\" (goal tracker / daily planner / both). Choosing \"planner\" hides the fitness fields (height/weight/goal/metrics) right away since they're not needed for a plain to-do list",
    ]},
    { version: "0.35", date: "2026-09-20", changes: [
        "New logo — same flame, now with a gradient and depth instead of a flat fill (icon, favicon, PWA — updated everywhere)",
        "Workouts now support adding your own category with any name — besides the Upper/Lower/Full body/Custom presets there's a \"➕ Add my own category…\" option",
        "Dashboard's \"Planned for today\" block now has a circular chart showing what % of today's plan is already done",
    ]},
    { version: "0.34", date: "2026-09-19", changes: [
        "Exercise category in workouts is now a fixed set of choices: Upper / Lower / Full body / Custom (plus \"no category\") — instead of free text, so groups don't split apart over typos or capitalization",
        "Workout category groups now sort in a fixed order (Upper → Lower → Full body → Custom → legacy categories → uncategorized) instead of insertion order",
        "Every select field in modals (not just the metric \"Type\") now uses the custom dropdown instead of the native picker",
    ]},
    { version: "0.33", date: "2026-09-19", changes: [
        "Fixed the clipped, unclickable \"set variation\" dropdown on the last row of the table — it now opens upward on its own when there's not enough room below inside the scrollable table",
    ]},
    { version: "0.32", date: "2026-09-19", changes: [
        "The \"set variation\" field now has a ▾ arrow on the right — click it to see the full list of saved variations right away, without typing first",
    ]},
    { version: "0.31", date: "2026-09-19", changes: [
        "Shortened the profile row to fit on one line: \"💰 Balance: 120\" → \"💰 120\", dropped \"since start\" from the body-metric deltas — just \"(+1.0kg)\" now, age now reads \"29 years\" instead of \"Age: 29\"",
    ]},
    { version: "0.30", date: "2026-09-19", changes: [
        "Account page — removed the leftover narrow width cap on its cards, now matches every other page",
        "Password show/hide toggle — a proper SVG icon instead of an emoji, matching the usual pattern",
        "Fixed broken CSS: checkboxes (community profile visibility, calendar plan items) no longer stretch to half the block's width",
        "Workouts: exercises now group by category (the existing \"Category\" field on each exercise — write \"Upper\", \"Lower\", \"Full body\" or whatever fits), each group collapses independently",
    ]},
    { version: "0.29", date: "2026-09-18", changes: [
        "Sign in with Google on the login page (button below the form) — works once the Google provider is configured in Supabase, see README",
        "Link Google to an existing account — in Account, for anyone who signed up by email and now wants to also sign in with Google",
        "Eye icon to show/hide the password — on login, sign-up, and the account password change",
        "Charts with no data no longer render empty — the section auto-collapses when there's nothing to show and auto-expands once data appears (as long as the section hasn't been toggled by hand)",
        "Replaced the home icon in quick nav with the actual logo (the flame)",
        "Quick-nav toggle button is now plain text >>> instead of special characters",
        "The \"Type\" dropdown in the metric form (including \"Sets\") now uses a custom-built dropdown instead of a native select — in case the system picker misbehaves inside an installed PWA",
        "\"About\" moved to the very bottom of the sidebar menu; links inside modals now use the site's accent color instead of default blue",
    ]},
    { version: "0.28", date: "2026-09-18", changes: [
        "Added a \"📲 Install app\" item to the sidebar — on Android/desktop Chrome it opens the native install dialog right away; on iPhone/iPad and other browsers it shows clear step-by-step instructions instead (iOS has no native install prompt at all — that's an iOS limitation, not this app's)",
        "Added iOS web-app meta tags so the app opens full-screen with a proper icon once added to the Home Screen on iPhone",
    ]},
    { version: "0.27", date: "2026-09-18", changes: [
        "The dashboard is now a PWA — installable on Android as an app (\"Install\" / \"Add to Home Screen\" in Chrome): its own icon, full-screen launch with no address bar, status-bar color matches whichever theme is selected",
    ]},
    { version: "0.26", date: "2026-09-18", changes: [
        "Removed the \"← Portfolio\" sidebar link (no longer relevant now the projects are split) — replaced with \"About\": a link to the portfolio plus a feedback contact",
    ]},
    { version: "0.25", date: "2026-09-18", changes: [
        "Fixed the deploy: without an index.html at the root, Cloudflare Workers couldn't find any static files and the build failed. Brought index.html back as a lightweight stub that instantly redirects to /login.html",
    ]},
    { version: "0.24", date: "2026-09-18", changes: [
        "Wired in the real portfolio URL instead of the placeholder, added a redirect from the site root to the login page",
    ]},
    { version: "0.23", date: "2026-09-18", changes: [
        "The portfolio has been split into its own repo and will live on its own deployment — index.html/portfolio.css removed from this repo, portfolio links temporarily point to a placeholder until the real URL is wired in",
    ]},
    { version: "0.22", date: "2026-09-17", changes: [
        "The \"set variation\" dropdown in the sets-metric card (e.g. \"Push-ups\") is now a custom combobox instead of the native datalist — each suggestion has a ✕ to remove a mistyped entry right there, without going into metric settings",
    ]},
    { version: "0.21", date: "2026-09-17", changes: [
        "Removed line-wrapping from the quick nav — expanded icons now stay on one row next to the »»» button",
    ]},
    { version: "0.20", date: "2026-09-17", changes: [
        "Quick nav is hidden behind the »»» button again, but now opens to show all icons at once on a new line — no partial view, no scrolling",
    ]},
    { version: "0.19", date: "2026-09-17", changes: [
        "Top navigation no longer collapses — all section icons are visible right away, wrapping to a second line instead of scrolling when space is tight",
        "Cleaned up the repo README and removed the internal chat-handoff file",
    ]},
    { version: "0.18", date: "2026-09-17", changes: [
        "Quick-nav toggle button is now \"»»»\" instead of an ellipsis",
        "Full pass on site translation: theme switcher, login/signup messages, default weight unit in workouts — now bilingual",
        "The sidebar's update history is now translated into English too",
    ]},
    { version: "0.17", date: "2026-09-17", changes: [
        "Top navigation redesigned: only the home icon stays in the bar, the other sections slide out in a panel via the »»» button",
    ]},
    { version: "0.16", date: "2026-09-17", changes: [
        "⚙️ icon instead of the \"Customize dashboard\" button — sits plainly next to the title, no background",
        "Email change added to the Account section",
        "Quick emoji navigation in the top bar (🏠 — home, larger than the rest)",
        "Update history available by clicking the version number in the sidebar",
    ]},
];
const CHANGELOG = getLang() === "en" ? CHANGELOG_EN : CHANGELOG_RU;

// Возвращает текущую сессию или null
async function getSession() {
    const { data } = await sb.auth.getSession();
    return data.session;
}

// Для защищённых страниц (дашборд/цели/навыки/магазин):
// если не залогинен — уводит на login.html
async function requireAuth() {
    const session = await getSession();
    if (!session) {
        window.location.href = "login.html";
        return null;
    }
    return session.user;
}

async function logout() {
    await sb.auth.signOut();
    window.location.href = "login.html";
}

// Текущее время "ЧЧ:ММ" — для отметки времени подхода
function nowHHMM() {
    const d = new Date();
    return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
}

function fmtDate(d) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

// DD.MM — для подписей на графиках, из строки "YYYY-MM-DD"
function fmtChartLabel(isoDateStr) {
    const parts = isoDateStr.split("-");
    return `${parts[2]}.${parts[1]}`;
}

// DD.MM.YYYY — для отображения дат (выполнено/куплено и т.д.)
function fmtRu(isoDateStr) {
    if (!isoDateStr) return "";
    const parts = isoDateStr.split("-");
    return `${parts[2]}.${parts[1]}.${parts[0]}`;
}

function todayStr() {
    return fmtDate(new Date());
}

// ---- Баллы ----

// Числовое значение метрики независимо от формата хранения — обычное число, или сумма
// reps по всем подходам (для типа "sets"). Совпадает по смыслу с SQL-функцией
// metric_numeric_value() в migrations/018 — держать логику одинаковой на клиенте и сервере.
function metricNumericValue(metric, value) {
    if (value == null) return null;
    if (metric.type === "sets" && Array.isArray(value)) {
        return value.reduce((sum, s) => sum + (s?.reps || 0), 0);
    }
    return typeof value === "number" ? value : null;
}

function isMetricDone(metric, value) {
    if (value === null || value === undefined) return false;
    if (metric.type === "boolean") return value === true;
    if (metric.type === "multiselect") return Array.isArray(value) && value.length > 0;
    if (metric.type === "number" || metric.type === "sets") {
        const numeric = metricNumericValue(metric, value);
        if (numeric == null) return false;
        const goal = metric.goal_value ?? 0;
        if (metric.goal_direction === "at_most") return numeric > 0 && numeric < goal;
        return numeric >= goal;
    }
    return false;
}

async function calcDailyPoints(userId, dateStr, metrics) {
    const { data: values } = await sb.from("daily_values").select("*").eq("user_id", userId).eq("date", dateStr);
    const byMetric = {};
    (values || []).forEach(v => byMetric[v.metric_id] = v.value);
    let points = 0;
    for (const m of metrics) {
        if (isMetricDone(m, byMetric[m.id])) points++;
    }
    return points;
}

async function calcTotalPoints(userId) {
    const { data: metrics } = await sb.from("metrics").select("*").eq("user_id", userId).eq("active", true);
    const { data: allValues } = await sb.from("daily_values").select("*").eq("user_id", userId);

    const byDay = {};
    (allValues || []).forEach(v => {
        byDay[v.date] = byDay[v.date] || {};
        byDay[v.date][v.metric_id] = v.value;
    });

    let dailyPoints = 0;
    for (const dateStr of Object.keys(byDay)) {
        for (const m of (metrics || [])) {
            if (isMetricDone(m, byDay[dateStr][m.id])) dailyPoints++;
        }
    }

    const { data: goals } = await sb.from("goals").select("*").eq("user_id", userId).eq("done", true);
    const goalPoints = (goals || []).reduce((sum, g) => sum + (g.points ?? 5), 0);

    const { data: skills } = await sb.from("skills").select("*").eq("user_id", userId).eq("mastered", true);
    const skillPoints = (skills || []).reduce((sum, s) => sum + (s.points ?? 10), 0);

    const { data: books } = await sb.from("books").select("*").eq("user_id", userId).eq("status", "done");
    const bookPoints = (books || []).reduce((sum, b) => sum + (b.points ?? 10), 0);

    return dailyPoints + goalPoints + skillPoints + bookPoints;
}

async function calcBalance(userId) {
    const total = await calcTotalPoints(userId);
    const { data: items } = await sb.from("shop_items").select("*").eq("user_id", userId).eq("redeemed", true);
    const spent = (items || []).reduce((sum, i) => sum + (i.cost ?? 0), 0);
    return { total, spent, balance: total - spent };
}

// ---- Навигация ----

function makeAvatarEl(url, size = 32) {
    if (url) {
        const img = document.createElement("img");
        img.src = url;
        img.style.cssText = `width:${size}px; height:${size}px; border-radius:50%; object-fit:cover; border:1px solid var(--border);`;
        return img;
    }
    const div = document.createElement("div");
    div.textContent = "👤";
    div.style.cssText = `width:${size}px; height:${size}px; border-radius:50%; background:var(--bg); border:1px solid var(--border); display:flex; align-items:center; justify-content:center; font-size:${size * 0.55}px;`;
    return div;
}

async function requireOnboarded(userId) {
    const { data: profile } = await sb.from("profiles").select("onboarded").eq("user_id", userId).maybeSingle();
    if (!profile?.onboarded) { window.location.href = "onboarding.html"; return false; }
    return true;
}

function showToast(message, type = "success") {
    document.querySelectorAll(".toast").forEach(el => el.remove());
    const toast = document.createElement("div");
    toast.className = "toast toast-" + type;
    toast.textContent = message;
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add("toast-show"));
    setTimeout(() => {
        toast.classList.remove("toast-show");
        setTimeout(() => toast.remove(), 300);
    }, 2200);
}

function showToast(message, type = "success") {
    let container = document.getElementById("toast-container");
    if (!container) {
        container = document.createElement("div");
        container.id = "toast-container";
        container.className = "toast-container";
        document.body.appendChild(container);
    }
    const toast = document.createElement("div");
    toast.className = "toast toast-" + type;
    toast.textContent = message;
    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add("show"));
    setTimeout(() => {
        toast.classList.remove("show");
        setTimeout(() => toast.remove(), 300);
    }, 2200);
}

// Готовит точки для графика: заполняет пропущенные дни (null), и если точек много —
// укрупняет (берёт представительное значение из "корзины" дней), чтобы график не превращался
// в нечитаемую кашу на длинных периодах.
function prepareChartSeries(rawPoints, maxPoints = 24) {
    if (!rawPoints || rawPoints.length === 0) return [];
    const sorted = [...rawPoints].sort((a, b) => a.date.localeCompare(b.date));
    if (sorted.length === 1) return sorted;

    const dayMs = 86400000;
    const first = new Date(sorted[0].date + "T00:00:00");
    const last = new Date(sorted[sorted.length - 1].date + "T00:00:00");
    const totalDays = Math.round((last - first) / dayMs) + 1;

    const byDate = {};
    sorted.forEach(p => byDate[p.date] = p.y);

    let full = [];
    for (let i = 0; i < totalDays; i++) {
        const d = new Date(first.getTime() + i * dayMs);
        const key = fmtDate(d);
        full.push({ date: key, y: key in byDate ? byDate[key] : null });
    }

    if (full.length <= maxPoints) return full;

    // укрупняем: делим на корзины по несколько дней, берём последнее известное значение в корзине
    const bucketSize = Math.ceil(full.length / maxPoints);
    const bucketed = [];
    for (let i = 0; i < full.length; i += bucketSize) {
        const chunk = full.slice(i, i + bucketSize);
        const withValue = chunk.filter(p => p.y != null);
        const y = withValue.length ? withValue[withValue.length - 1].y : null;
        bucketed.push({ date: chunk[chunk.length - 1].date, y, bucketDays: chunk.length });
    }
    return bucketed;
}

function svgLineChart(points, opts = {}) {
    const w = opts.width || 620, h = opts.height || 160, pad = 34;
    const withValues = points.filter(p => p.y != null);
    if (withValues.length < 2) return null;

    const values = withValues.map(p => p.y);
    if (opts.goalValue != null) values.push(opts.goalValue); // расширяем диапазон, чтобы линия-ориентир была видна на графике
    let min = Math.min(...values), max = Math.max(...values);
    if (min === max) { min -= 1; max += 1; }
    const range = max - min;
    const stepX = (w - pad * 2) / (points.length - 1);

    const coords = points.map((p, i) => ({
        x: pad + i * stepX,
        y: p.y != null ? h - pad - ((p.y - min) / range) * (h - pad * 2) : null,
        label: p.date ? fmtChartLabel(p.date) : p.x,
        value: p.y
    }));

    let svg = `<svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}">`;
    const color = opts.color || "var(--accent)";

    // Линия-ориентир (например, норма калорий/цель по весу) — рисуем первой, под графиком
    if (opts.goalValue != null) {
        const gy = h - pad - ((opts.goalValue - min) / range) * (h - pad * 2);
        svg += `<line x1="${pad}" y1="${gy.toFixed(1)}" x2="${(w - pad).toFixed(1)}" y2="${gy.toFixed(1)}" stroke="var(--text-dim)" stroke-width="1.5" stroke-dasharray="5,4" opacity="0.85" />`;
        const goalText = opts.goalLabel || `${opts.goalValue}${opts.unit || ''}`;
        const goalTextY = gy < pad + 10 ? gy + 12 : gy - 5;
        svg += `<text x="${(w - pad).toFixed(1)}" y="${goalTextY.toFixed(1)}" font-size="10" fill="var(--text-dim)" text-anchor="end">${goalText}</text>`;
    }

    let lastReal = null, gapBetween = false;
    for (let i = 0; i < coords.length; i++) {
        const c = coords[i];
        if (c.y == null) { if (lastReal) gapBetween = true; continue; }
        if (lastReal) {
            const dash = gapBetween ? ` stroke-dasharray="5,4"` : "";
            svg += `<line x1="${lastReal.x.toFixed(1)}" y1="${lastReal.y.toFixed(1)}" x2="${c.x.toFixed(1)}" y2="${c.y.toFixed(1)}" stroke="${color}" stroke-width="2.5"${dash} opacity="${gapBetween ? 0.55 : 1}" />`;
        }
        lastReal = c;
        gapBetween = false;
    }

    const labelEvery = Math.max(1, Math.ceil(coords.filter(c => c.y != null).length / 12));
    let shown = 0;
    for (const c of coords) {
        if (c.y == null) continue;
        svg += `<circle cx="${c.x.toFixed(1)}" cy="${c.y.toFixed(1)}" r="4" fill="${color}" />`;
        if (shown % labelEvery === 0) {
            svg += `<text x="${c.x.toFixed(1)}" y="${(c.y - 10).toFixed(1)}" font-size="11" fill="var(--text)" text-anchor="middle">${c.value}${opts.unit || ''}</text>`;
            svg += `<text x="${c.x.toFixed(1)}" y="${h - 8}" font-size="10" fill="var(--text-dim)" text-anchor="middle">${c.label}</text>`;
        }
        shown++;
    }
    svg += `</svg>`;
    return svg;
}

function renderChartBlock(container, title, points, opts) {
    if (title) {
        const h4 = document.createElement("h4");
        h4.textContent = title;
        h4.style.marginBottom = "6px";
        container.appendChild(h4);
    }
    const prepared = prepareChartSeries(points);
    const svg = svgLineChart(prepared, opts);
    if (svg) {
        const wrap = document.createElement("div");
        wrap.innerHTML = svg;
        container.appendChild(wrap);
        const withValues = prepared.filter(p => p.y != null);
        if (withValues.length < prepared.length) {
            const hint = document.createElement("p");
            hint.className = "dim";
            hint.style.cssText = "font-size:0.75em; margin:2px 0 0;";
            hint.textContent = t("chart_dashed_hint");
            container.appendChild(hint);
        }
    } else {
        const withValues = points.filter(p => p.y != null);
        const last = withValues.length ? `${t("chart_last_value")} ${withValues[withValues.length - 1].y}${opts.unit || ''}` : t("chart_no_data");
        const p = document.createElement("p");
        p.className = "dim";
        p.textContent = `${t("chart_not_enough_data")} ${last}`;
        container.appendChild(p);
    }
}

// возвращает [from, to] в формате "YYYY-MM-DD" (локальные даты) для периода
// customFrom/customTo — используются только когда rangeKey === "custom" (свой период)
function periodBounds(rangeKey, customFrom, customTo) {
    const today = new Date();
    const dow = (today.getDay() + 6) % 7; // 0 = понедельник
    const startOfWeek = new Date(today); startOfWeek.setDate(today.getDate() - dow);
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    if (rangeKey === "days10") {
        const start = new Date(today); start.setDate(today.getDate() - 9); // 10 дней включая сегодня
        return [fmtDate(start), fmtDate(today)];
    }
    if (rangeKey === "week") return [fmtDate(startOfWeek), fmtDate(today)];
    if (rangeKey === "last_week") {
        const startLastWeek = new Date(startOfWeek); startLastWeek.setDate(startOfWeek.getDate() - 7);
        const endLastWeek = new Date(startOfWeek); endLastWeek.setDate(startOfWeek.getDate() - 1);
        return [fmtDate(startLastWeek), fmtDate(endLastWeek)];
    }
    if (rangeKey === "month") return [fmtDate(startOfMonth), fmtDate(today)];
    if (rangeKey === "custom") return [customFrom || null, customTo || null];
    return [null, null]; // "all" — без ограничения
}

// Период графика запоминается в localStorage между сессиями (по умолчанию — последние 10 дней,
// чтобы графики с большой историей не выглядели нечитаемо густыми при каждом заходе).
function loadPeriodState(storageKey, fallback) {
    try {
        const raw = localStorage.getItem(storageKey);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && parsed.range) return parsed;
        }
    } catch (e) { /* повреждённые данные в localStorage — просто используем дефолт */ }
    return fallback;
}
function savePeriodState(storageKey, state) {
    try { localStorage.setItem(storageKey, JSON.stringify({ range: state.range, from: state.from, to: state.to })); } catch (e) { /* localStorage недоступен — не критично */ }
}
// Оборачивает onChange/onApply, вызываемый из renderPeriodPicker/openPeriodModal, так чтобы
// каждое изменение периода сразу сохранялось — используется во всех местах с выбором периода.
function wrapPeriodPersist(storageKey, state, cb) {
    return () => { savePeriodState(storageKey, state); cb(); };
}

// рендерит панель выбора периода (пресеты + свой период с датами) и вызывает onChange(rangeKey, from, to)
// state — объект {range, from, to}, который вызывающий код хранит у себя и мутирует сюда же
function renderPeriodPicker(container, state, onChange) {
    const wrap = document.createElement("div");
    wrap.style.cssText = "display:flex; gap:6px; flex-wrap:wrap; align-items:center;";

    const presets = [["days10", t("period_10_days")], ["week", t("period_week")], ["last_week", t("period_last_week")], ["month", t("period_month")], ["all", t("period_all")]];
    presets.forEach(([key, label]) => {
        const btn = document.createElement("button");
        btn.className = state.range === key ? "" : "secondary";
        btn.textContent = label;
        btn.onclick = () => { state.range = key; onChange(); };
        wrap.appendChild(btn);
    });

    // "Свой период" — не инлайновые поля дат (они сжимались в кашу на телефоне),
    // а модалка, как и все остальные формы в приложении. Заодно кнопка сама
    // показывает уже выбранный диапазон, если он есть.
    const customBtn = document.createElement("button");
    customBtn.className = state.range === "custom" ? "" : "secondary";
    customBtn.textContent = (state.range === "custom" && state.from)
        ? `📅 ${fmtRu(state.from)} – ${state.to ? fmtRu(state.to) : "…"}`
        : t("period_custom");
    customBtn.onclick = () => openCustomPeriodModal(state, onChange);
    wrap.appendChild(customBtn);

    container.appendChild(wrap);
}

// Модалка выбора периода целиком (пресеты + свой диапазон) — для мест, где период
// не встроен в более крупную форму настройки (см. также openChartsConfigModal в
// dashboard.js, где период встроен прямо в модалку настройки графиков).
function openPeriodModal(title, state, onApply) {
    const backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop";
    const modal = document.createElement("div");
    modal.className = "modal";
    modal.innerHTML = `<h3>${title}</h3>`;

    let local = { ...state };
    const pickerRow = document.createElement("div");
    function renderRow() {
        pickerRow.innerHTML = "";
        renderPeriodPicker(pickerRow, local, renderRow);
    }
    renderRow();
    modal.appendChild(pickerRow);

    const actions = document.createElement("div");
    actions.className = "modal-actions";
    const cancelBtn = document.createElement("button");
    cancelBtn.className = "secondary";
    cancelBtn.textContent = t("cancel");
    cancelBtn.onclick = () => backdrop.remove();
    const okBtn = document.createElement("button");
    okBtn.textContent = t("save");
    okBtn.onclick = () => {
        Object.assign(state, local);
        backdrop.remove();
        onApply();
    };
    actions.appendChild(cancelBtn);
    actions.appendChild(okBtn);
    modal.appendChild(actions);

    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);
}

function openCustomPeriodModal(state, onChange) {
    const backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop";
    const modal = document.createElement("div");
    modal.className = "modal";
    modal.innerHTML = `<h3>${t("period_custom")}</h3>`;

    const fromLabel = document.createElement("label");
    fromLabel.style.cssText = "display:block; margin-bottom:14px;";
    fromLabel.textContent = t("period_from");
    const fromInput = document.createElement("input");
    fromInput.type = "date";
    fromInput.style.cssText = "width:100%; margin-top:4px;";
    fromInput.value = state.from || "";
    fromInput.max = todayStr();
    fromLabel.appendChild(fromInput);
    modal.appendChild(fromLabel);

    const toLabel = document.createElement("label");
    toLabel.style.cssText = "display:block; margin-bottom:14px;";
    toLabel.textContent = t("period_to");
    const toInput = document.createElement("input");
    toInput.type = "date";
    toInput.style.cssText = "width:100%; margin-top:4px;";
    toInput.value = state.to || "";
    toInput.max = todayStr();
    toLabel.appendChild(toInput);
    modal.appendChild(toLabel);

    const actions = document.createElement("div");
    actions.className = "modal-actions";
    const cancelBtn = document.createElement("button");
    cancelBtn.className = "secondary";
    cancelBtn.textContent = t("cancel");
    cancelBtn.onclick = () => backdrop.remove();
    const okBtn = document.createElement("button");
    okBtn.textContent = t("period_apply");
    okBtn.onclick = () => {
        state.range = "custom";
        state.from = fromInput.value || null;
        state.to = toInput.value || null;
        backdrop.remove();
        onChange();
    };
    actions.appendChild(cancelBtn);
    actions.appendChild(okBtn);
    modal.appendChild(actions);

    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);
    fromInput.focus();
}

function wrapTable(table) {
    const wrap = document.createElement("div");
    wrap.className = "table-scroll";
    wrap.appendChild(table);
    return wrap;
}

function renderNav(active, userEmail) {
    document.querySelectorAll(".topbar, .sidebar, .sidebar-backdrop").forEach(el => el.remove());

    const pages = [
        { href: "dashboard.html", key: "dashboard", i18n: "nav_dashboard", icon: "🏠", home: true },
        { href: "goals.html", key: "goals", i18n: "nav_goals", icon: "🎯" },
        { href: "skills.html", key: "skills", i18n: "nav_skills", icon: "🥋" },
        { href: "workouts.html", key: "workouts", i18n: "nav_workouts", icon: "🏋️" },
        { href: "challenges.html", key: "challenges", i18n: "nav_challenges", icon: "🏁" },
        { href: "english.html", key: "english", i18n: "nav_english", icon: "🇬🇧" },
        { href: "calendar.html", key: "calendar", i18n: "nav_calendar", icon: "🗓️" },
        { href: "shop.html", key: "shop", i18n: "nav_shop", icon: "🛍️" },
        { href: "community.html", key: "community", i18n: "nav_community", icon: "🏆" },
    ];

    // ---- Тонкая верхняя полоса: гамбургер + быстрая эмодзи-навигация ----
    const topbar = document.createElement("div");
    topbar.className = "topbar";

    const hamburger = document.createElement("button");
    hamburger.className = "hamburger-btn";
    hamburger.setAttribute("aria-label", t("nav_open_menu"));
    hamburger.innerHTML = "☰";
    topbar.appendChild(hamburger);

    const homePage = pages.find(p => p.home);
    const homeIconLink = document.createElement("a");
    homeIconLink.href = homePage.href;
    homeIconLink.title = t(homePage.i18n);
    homeIconLink.className = "quick-nav-icon home" + (homePage.key === active ? " active" : "");
    const homeLogo = document.createElement("img");
    homeLogo.src = "/favicon.svg";
    homeLogo.alt = t(homePage.i18n);
    homeLogo.className = "quick-nav-logo";
    homeIconLink.appendChild(homeLogo);
    topbar.appendChild(homeIconLink);

    const moreToggle = document.createElement("button");
    moreToggle.className = "quick-nav-toggle";
    moreToggle.textContent = ">>>";
    moreToggle.setAttribute("aria-label", t("nav_more"));
    topbar.appendChild(moreToggle);

    const quickNav = document.createElement("div");
    quickNav.className = "quick-nav";
    for (const p of pages) {
        if (p.home) continue;
        const a = document.createElement("a");
        a.href = p.href;
        a.textContent = p.icon;
        a.title = t(p.i18n);
        a.className = "quick-nav-icon" + (p.key === active ? " active" : "");
        quickNav.appendChild(a);
    }
    topbar.appendChild(quickNav);

    moreToggle.onclick = (e) => {
        e.stopPropagation();
        const isOpen = quickNav.classList.toggle("open");
        moreToggle.classList.toggle("open", isOpen);
    };
    document.addEventListener("click", (e) => {
        if (quickNav.classList.contains("open") && !quickNav.contains(e.target) && e.target !== moreToggle) {
            quickNav.classList.remove("open");
            moreToggle.classList.remove("open");
        }
    });

    // Правый край шапки: сюда встают бейджи (кружок прогресса, стакан воды) в фиксированном
    // порядке — чтобы они не прыгали друг относительно друга при перерисовке.
    const topbarRight = document.createElement("div");
    topbarRight.className = "topbar-right";
    topbarRight.id = "topbar-right";
    topbar.appendChild(topbarRight);

    document.body.prepend(topbar);

    // ---- Выезжающий сайдбар со всем содержимым бывшей шапки ----
    const backdrop = document.createElement("div");
    backdrop.className = "sidebar-backdrop";

    const sidebar = document.createElement("nav");
    sidebar.className = "sidebar";

    for (const p of pages) {
        const a = document.createElement("a");
        a.href = p.href;
        a.textContent = t(p.i18n);
        if (p.key === active) a.className = "active";
        sidebar.appendChild(a);
    }

    if (userEmail) {
        const accountLink = document.createElement("a");
        accountLink.href = "account.html";
        accountLink.textContent = "👤 " + t("nav_account_title");
        accountLink.className = active === "account" ? "active" : "";
        sidebar.appendChild(accountLink);
    }

    const divider = document.createElement("div");
    divider.className = "sidebar-divider";
    sidebar.appendChild(divider);

    const langRow = document.createElement("div");
    langRow.className = "sidebar-row";
    renderLangSwitcher(langRow);
    langRow.querySelectorAll(".lang-btn").forEach(btn => {
        const original = btn.onclick;
        btn.onclick = () => { original(); };
    });
    sidebar.appendChild(langRow);

    const themeRow = document.createElement("div");
    themeRow.className = "sidebar-row";
    renderThemeSwitcher(themeRow);
    sidebar.appendChild(themeRow);

    if (userEmail) {
        const logoutBtn = document.createElement("button");
        logoutBtn.textContent = `${t("logout")} (${userEmail})`;
        logoutBtn.className = "user-switch";
        logoutBtn.onclick = logout;
        sidebar.appendChild(logoutBtn);
    }

    if (!isStandaloneApp()) {
        const installLink = document.createElement("a");
        installLink.href = "#";
        installLink.textContent = "📲 " + t("nav_install_app");
        installLink.className = "dim-link";
        installLink.onclick = (e) => { e.preventDefault(); handleInstallClick(); };
        sidebar.appendChild(installLink);
    }

    const tourLink = document.createElement("a");
    tourLink.href = "#";
    tourLink.textContent = "❓ " + t("nav_tour");
    tourLink.className = "dim-link";
    tourLink.onclick = (e) => { e.preventDefault(); showWelcomeTour(); };
    sidebar.appendChild(tourLink);

    const aboutLink = document.createElement("a");
    aboutLink.href = "#";
    aboutLink.textContent = "ℹ️ " + t("nav_about");
    aboutLink.className = "dim-link";
    aboutLink.onclick = (e) => { e.preventDefault(); showAboutModal(); };
    sidebar.appendChild(aboutLink);

    const version = document.createElement("button");
    version.className = "sidebar-version";
    version.textContent = "v" + SITE_VERSION;
    version.onclick = showChangelogModal;
    sidebar.appendChild(version);

    document.body.appendChild(backdrop);
    document.body.appendChild(sidebar);

    function openSidebar() { sidebar.classList.add("open"); backdrop.classList.add("open"); }
    function closeSidebar() { sidebar.classList.remove("open"); backdrop.classList.remove("open"); }
    hamburger.onclick = openSidebar;
    backdrop.onclick = closeSidebar;
    sidebar.querySelectorAll("a").forEach(a => a.addEventListener("click", closeSidebar));
}

// ---- Приветственный тур для новых пользователей ----
// Показывается один раз сразу после онбординга (флаг tour_pending в localStorage ставит
// onboarding.js), а потом всегда доступен из бокового меню («Как пользоваться»).
const TOUR_STEPS = [
    { icon: "👋", key: "tour_1" },
    { icon: "🏠", key: "tour_2" },
    { icon: "🎯", key: "tour_3" },
    { icon: "🥋", key: "tour_4" },
    { icon: "🏆", key: "tour_5" },
    { icon: "🗓️", key: "tour_6" },
    { icon: "🧭", key: "tour_7" },
];

function showWelcomeTour() {
    if (document.getElementById("welcome-tour")) return;
    const backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop";
    backdrop.id = "welcome-tour";
    const modal = document.createElement("div");
    modal.className = "modal";

    let step = 0;
    const iconEl = document.createElement("div");
    iconEl.style.cssText = "font-size:2.2em; text-align:center; margin-top:4px;";
    const titleEl = document.createElement("h3");
    titleEl.style.cssText = "text-align:center; margin:8px 0;";
    const textEl = document.createElement("p");
    textEl.style.cssText = "font-size:0.95em; line-height:1.6; white-space:pre-line;";
    const dotsEl = document.createElement("div");
    dotsEl.style.cssText = "display:flex; justify-content:center; gap:6px; margin:14px 0 4px;";

    const actions = document.createElement("div");
    actions.className = "modal-actions";
    const skipBtn = document.createElement("button");
    skipBtn.className = "secondary";
    const backBtn = document.createElement("button");
    backBtn.className = "secondary";
    backBtn.textContent = t("tour_back");
    const nextBtn = document.createElement("button");

    const close = () => backdrop.remove();
    skipBtn.onclick = close;
    backBtn.onclick = () => { if (step > 0) { step--; render(); } };
    nextBtn.onclick = () => { if (step < TOUR_STEPS.length - 1) { step++; render(); } else close(); };

    function render() {
        const s = TOUR_STEPS[step];
        iconEl.textContent = s.icon;
        titleEl.textContent = t(s.key + "_title");
        textEl.textContent = t(s.key + "_text");
        dotsEl.innerHTML = "";
        TOUR_STEPS.forEach((_, i) => {
            const d = document.createElement("span");
            d.style.cssText = "width:8px; height:8px; border-radius:50%; background:" + (i === step ? "var(--accent)" : "var(--border)") + ";";
            dotsEl.appendChild(d);
        });
        const last = step === TOUR_STEPS.length - 1;
        nextBtn.textContent = last ? t("tour_done") : t("tour_next");
        skipBtn.textContent = t("tour_skip");
        skipBtn.style.display = last ? "none" : "";
        backBtn.style.display = step === 0 ? "none" : "";
    }

    modal.appendChild(iconEl);
    modal.appendChild(titleEl);
    modal.appendChild(textEl);
    modal.appendChild(dotsEl);
    actions.appendChild(skipBtn);
    actions.appendChild(backBtn);
    actions.appendChild(nextBtn);
    modal.appendChild(actions);
    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);
    render();
}

// ---- Модалка "О создателе" — кто сделал проект, ссылка на портфолио + обратная связь ----
function showAboutModal() {
    const backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop";
    const modal = document.createElement("div");
    modal.className = "modal";
    modal.innerHTML = `<h3>${t("about_title")}</h3>`;

    // Блок «О создателе» (вместо прежней одиночной ссылки на портфолио)
    const creatorH = document.createElement("h4");
    creatorH.style.cssText = "margin:14px 0 6px;";
    creatorH.textContent = t("about_creator_title");
    modal.appendChild(creatorH);
    const creatorP = document.createElement("p");
    creatorP.style.cssText = "font-size:0.92em; line-height:1.55;";
    creatorP.textContent = t("about_creator_text");
    modal.appendChild(creatorP);
    const portfolioP = document.createElement("p");
    portfolioP.style.cssText = "margin-top:8px; font-size:0.92em;";
    const portfolioLink = document.createElement("a");
    portfolioLink.href = "https://portfolio.orneryhero.workers.dev/";
    portfolioLink.target = "_blank";
    portfolioLink.rel = "noopener";
    portfolioLink.textContent = t("about_portfolio_link");
    portfolioP.appendChild(portfolioLink);
    modal.appendChild(portfolioP);

    const feedbackP = document.createElement("p");
    feedbackP.className = "dim";
    feedbackP.style.cssText = "font-size:0.9em; margin-top:16px; line-height:1.6;";
    feedbackP.innerHTML = t("about_feedback_intro") +
        `<br>Telegram: <a href="https://t.me/vsekorolev" target="_blank" rel="noopener">@vsekorolev</a>`;
    modal.appendChild(feedbackP);

    const actions = document.createElement("div");
    actions.className = "modal-actions";
    const closeBtn = document.createElement("button");
    closeBtn.className = "secondary";
    closeBtn.textContent = t("close");
    closeBtn.onclick = () => backdrop.remove();
    actions.appendChild(closeBtn);
    modal.appendChild(actions);

    backdrop.appendChild(modal);
    backdrop.onclick = (e) => { if (e.target === backdrop) backdrop.remove(); };
    document.body.appendChild(backdrop);
}

// ---- Модалка "Что нового" — по клику на версию в сайдбаре ----
function showChangelogModal() {
    const backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop";
    const modal = document.createElement("div");
    modal.className = "modal";
    modal.innerHTML = `<h3>${t("changelog_title")}</h3>`;

    if (CHANGELOG.length === 0) {
        const p = document.createElement("p");
        p.className = "dim";
        p.textContent = t("changelog_empty");
        modal.appendChild(p);
    }
    for (const entry of CHANGELOG) {
        const h4 = document.createElement("h4");
        h4.style.cssText = "margin-top:16px; margin-bottom:6px;";
        h4.textContent = "v" + entry.version + (entry.date ? " — " + entry.date : "");
        modal.appendChild(h4);
        const ul = document.createElement("ul");
        ul.style.cssText = "margin:0; padding-left:20px; font-size:0.9em; color:var(--text-dim);";
        for (const c of entry.changes) {
            const li = document.createElement("li");
            li.textContent = c;
            ul.appendChild(li);
        }
        modal.appendChild(ul);
    }

    const actions = document.createElement("div");
    actions.className = "modal-actions";
    const closeBtn = document.createElement("button");
    closeBtn.className = "secondary";
    closeBtn.textContent = t("close");
    closeBtn.onclick = () => backdrop.remove();
    actions.appendChild(closeBtn);
    modal.appendChild(actions);

    backdrop.appendChild(modal);
    backdrop.onclick = (e) => { if (e.target === backdrop) backdrop.remove(); };
    document.body.appendChild(backdrop);
}

// ---- Глазик "показать/скрыть пароль" — оборачивает существующий input ----
const EYE_ICON_OPEN = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
const EYE_ICON_OFF = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a18.5 18.5 0 0 1 5.06-5.94M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';

function attachPasswordToggle(input) {
    const wrap = document.createElement("div");
    wrap.className = "password-field";
    input.parentNode.insertBefore(wrap, input);
    wrap.appendChild(input);

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "password-toggle";
    toggle.innerHTML = EYE_ICON_OPEN;
    toggle.setAttribute("aria-label", t("password_toggle_show"));
    toggle.onclick = () => {
        const willShow = input.type === "password";
        input.type = willShow ? "text" : "password";
        toggle.innerHTML = willShow ? EYE_ICON_OFF : EYE_ICON_OPEN;
        toggle.setAttribute("aria-label", willShow ? t("password_toggle_hide") : t("password_toggle_show"));
    };
    wrap.appendChild(toggle);
    return wrap;
}

// ---- Позиционирование плавающих списков (кастомный select, комбобокс вариантов и т.п.)
// относительно ЭКРАНА (position: fixed), а не родителя — так список никогда не обрезается
// оverflow-контейнерами (таблицы с горизонтальным скроллом, тесные модалки и т.п.) и высота
// всегда подгоняется под реально доступное место, так что скроллить есть где и его видно.
function positionFloatingPanel(anchor, panel) {
    const rect = anchor.getBoundingClientRect();
    const margin = 8;
    const spaceBelow = window.innerHeight - rect.bottom - margin;
    const spaceAbove = rect.top - margin;
    const preferredMax = 280;

    panel.style.left = Math.max(margin, rect.left) + "px";
    panel.style.width = Math.min(rect.width, window.innerWidth - margin * 2) + "px";

    if (spaceBelow >= 100 || spaceBelow >= spaceAbove) {
        panel.style.top = (rect.bottom + 4) + "px";
        panel.style.bottom = "auto";
        panel.style.maxHeight = Math.max(80, Math.min(preferredMax, spaceBelow)) + "px";
    } else {
        panel.style.bottom = (window.innerHeight - rect.top + 4) + "px";
        panel.style.top = "auto";
        panel.style.maxHeight = Math.max(80, Math.min(preferredMax, spaceAbove)) + "px";
    }
}

// ---- Обёртка нативного <select> собственной выпадашкой — на случай если системный пикер
// плохо ведёт себя в установленном PWA. Сам select прячем, но не убираем: он остаётся
// источником истины (.value/.onchange продолжают работать как раньше, весь остальной код
// вокруг select менять не нужно) — просто синхронизируем его со своей видимой кнопкой-списком.
function enhanceSelectWithCustomDropdown(select) {
    const wrap = document.createElement("div");
    wrap.className = "custom-select";
    select.parentNode.insertBefore(wrap, select);
    select.style.display = "none";
    wrap.appendChild(select);

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "custom-select-btn";
    wrap.appendChild(btn);

    const dropdown = document.createElement("div");
    dropdown.className = "custom-select-dropdown";
    document.body.appendChild(dropdown);

    function currentLabel() {
        const opt = select.options[select.selectedIndex];
        return opt ? opt.textContent : "";
    }
    function renderBtn() {
        btn.textContent = currentLabel();
    }
    function renderOptions() {
        dropdown.innerHTML = "";
        Array.from(select.options).forEach(opt => {
            const item = document.createElement("div");
            item.className = "custom-select-option" + (opt.value === select.value ? " selected" : "");
            item.textContent = opt.textContent;
            item.onmousedown = (e) => {
                e.preventDefault();
                select.value = opt.value;
                select.dispatchEvent(new Event("change"));
                renderBtn();
                dropdown.classList.remove("open");
            };
            dropdown.appendChild(item);
        });
    }
    btn.onclick = (e) => {
        e.stopPropagation();
        renderOptions();
        const willOpen = !dropdown.classList.contains("open");
        if (willOpen) positionFloatingPanel(btn, dropdown);
        dropdown.classList.toggle("open");
    };
    document.addEventListener("click", () => dropdown.classList.remove("open"));

    renderBtn();
    return wrap;
}

// ---- Модальные окна (переиспользуются везде) ----

// fields: [{key, label, type: 'text'|'number'|'select'|'date', options?, value}]
function openModal(title, fields, onSubmit) {
    const backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop";
    const modal = document.createElement("div");
    modal.className = "modal";
    modal.innerHTML = `<h3>${title}</h3>`;

    const inputs = {};
    for (const f of fields) {
        const label = document.createElement("label");
        label.textContent = f.label;
        let input;
        if (f.type === "select") {
            input = document.createElement("select");
            for (const opt of f.options) {
                const o = document.createElement("option");
                o.value = opt.value;
                o.textContent = opt.label;
                input.appendChild(o);
            }
            input.value = f.value ?? f.options[0]?.value;
        } else {
            input = document.createElement("input");
            input.type = f.type || "text";
            input.value = f.value ?? "";
            if (f.min !== undefined) input.min = f.min;
            if (f.max !== undefined) input.max = f.max;
        }
        label.appendChild(input);
        modal.appendChild(label);
        inputs[f.key] = input;
        if (f.type === "select") enhanceSelectWithCustomDropdown(input);
    }

    const actions = document.createElement("div");
    actions.className = "modal-actions";
    const cancelBtn = document.createElement("button");
    cancelBtn.className = "secondary";
    cancelBtn.textContent = t("cancel");
    cancelBtn.onclick = () => backdrop.remove();
    const okBtn = document.createElement("button");
    okBtn.textContent = t("save");
    okBtn.onclick = async () => {
        const result = {};
        for (const f of fields) {
            const v = inputs[f.key].value;
            result[f.key] = f.type === "number" ? (parseFloat(v) || 0) : v;
        }
        backdrop.remove();
        await onSubmit(result);
    };
    actions.appendChild(cancelBtn);
    actions.appendChild(okBtn);
    modal.appendChild(actions);
    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);
    inputs[fields[0]?.key]?.focus();
}

// ==== Свайп с центра экрана вправо — открывает боковое меню (сайдбар) на телефоне ====
// Работает на любой странице (config.js подключён везде), не завязан на renderNav —
// ищет .sidebar/.sidebar-backdrop заново при каждом срабатывании, так что переживает
// пересоздание сайдбара через renderNav() без переустановки слушателей.
(function setupSidebarSwipe() {
    let startX = null, startY = null, tracking = false, mode = null; // mode: "open" | "close"
    const SWIPE_THRESHOLD = 70;   // px — минимальная длина свайпа по горизонтали, чтобы сработало
    const MAX_VERTICAL_DRIFT = 60; // px — если увели палец вертикально больше этого — это скролл, не свайп
    const CENTER_ZONE_MIN = 0.15, CENTER_ZONE_MAX = 0.85; // для открытия — начало свайпа должно быть в центре экрана

    document.addEventListener("touchstart", (e) => {
        const sidebar = document.querySelector(".sidebar");
        const isOpen = sidebar?.classList.contains("open");
        const touch = e.touches[0];

        if (isOpen) {
            // сайдбар уже открыт — свайп влево в любом месте закрывает
            mode = "close";
            startX = touch.clientX;
            startY = touch.clientY;
            tracking = true;
            return;
        }

        if (e.target.closest(".table-scroll, .calendar-grid")) { tracking = false; return; } // не мешаем горизонтальному скроллу таблиц/календаря
        const w = window.innerWidth;
        if (touch.clientX < w * CENTER_ZONE_MIN || touch.clientX > w * CENTER_ZONE_MAX) { tracking = false; return; }
        mode = "open";
        startX = touch.clientX;
        startY = touch.clientY;
        tracking = true;
    }, { passive: true });

    document.addEventListener("touchmove", (e) => {
        if (!tracking) return;
        const touch = e.touches[0];
        const dx = touch.clientX - startX;
        const dy = Math.abs(touch.clientY - startY);
        if (dy > MAX_VERTICAL_DRIFT) { tracking = false; return; } // похоже на вертикальный скролл страницы

        const sidebar = document.querySelector(".sidebar");
        const backdrop = document.querySelector(".sidebar-backdrop");
        if (mode === "open" && dx > SWIPE_THRESHOLD) {
            if (sidebar && backdrop) { sidebar.classList.add("open"); backdrop.classList.add("open"); }
            tracking = false;
        } else if (mode === "close" && dx < -SWIPE_THRESHOLD) {
            if (sidebar && backdrop) { sidebar.classList.remove("open"); backdrop.classList.remove("open"); }
            tracking = false;
        }
    }, { passive: true });

    document.addEventListener("touchend", () => { tracking = false; });
})();
