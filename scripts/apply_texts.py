#!/usr/bin/env python3
"""Единый источник общих текстов интерфейса (тур, подсказки воды и т. п.) для всех пилотов.

Строки из `docs/TEXT_SHORTENING.md` (BACKLOG 935/49.5, одобрено владельцем 2026-10-17) живут здесь. Скрипт переписывает значения ключей
во всех словарях `web-*/src/lib/i18n.ts`, где они есть: в файле ключ встречается ровно два раза — сначала EN, потом RU. Это нужно, потому
что одни и те же тексты копируются в несколько пилотов (тур — в 15, подсказки воды — в Дашборд и шапку); править их руками в каждом месте
нельзя — копии разойдутся. Идемпотентен: повторный запуск пишет «изменено файлов: 0». Тест `web-dashboard/src/sharedTexts.test.ts`
проверяет это (и значит, что тексты не правили руками мимо генератора), длину, парность RU/EN, заполнители и «ты».

Формат значения в словарях сохраняется (в одну строку или на следующей, как переносит prettier). Одинарные кавычки, \\n для переноса.
Корневой i18n.js (словарь старых legacy/*.html) не трогаем: живые страницы берут тексты из словарей пилотов.

Запуск:  python3 scripts/apply_texts.py          (записывает)
         python3 scripts/apply_texts.py --check  (только проверка, код выхода 1, если что-то разошлось)

Новые строки добавляйте в SHORT (ключ → {'ru': …, 'en': …}); ключ должен быть в словарях ровно по два раза (EN, RU).
"""
import glob
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

TEXTS = {
    'ru': {
        1: 'Это твой личный дашборд: привычки, цели, навыки, тренировки и прогресс в одном месте.\n\nТур — 7 коротких шагов; открыть его снова можно в меню («Как пользоваться»).',
        2: 'Каждый день отмечай метрики и добавляй пункты в «Запланировано на сегодня». Кружок — выполнение дня, огонёк — серия, баллы копятся за сделанное. ⚙️ у блоков — что показывать.',
        3: 'Цели — в разделе «Цели»: разбивай большую на этапы и добавляй в план на сегодня — она пойдёт в счёт дня и недели.',
        4: '🥋 Навыки — что осваиваешь, с прогрессом и книгами.\n🏋️ Тренировки — упражнения и подходы, готовые программы.\n🌐 Языки — словарь: добавляй слова, отмечай выученные.',
        5: '🏁 Челленджи — готовые из каталога или свои.\n🛍️ Магазин — трать баллы на то, что «разрешаешь себе купить».\n🏆 Сообщество — друзья и лидерборд; другие видят только то, что ты разрешил.',
        6: 'Нажми на день в календаре — запиши план или заметку, они попадут в итог этого дня.\n\n🚩 Вехи — регулярные дела с датой (замена масла): отметь, когда сделал, и раздел подскажет, когда пора снова.',
        7: '☰ — меню (язык, тема, аккаунт, установка). »»» — быстрые ссылки на разделы. 💧 — трекер воды, в том числе за прошлые дни.\n\nВот и всё — приятного пользования!',
    },
    'en': {
        1: 'This is your personal dashboard: habits, goals, skills, workouts and progress in one place.\n\nThe tour is 7 short steps; you can reopen it any time from the menu ("How it works").',
        2: 'Every day, tick off your metrics and add items to "Planned for today". The circle shows how much of the day is done, the flame is your streak, and points add up for what you finish. The ⚙️ icons by blocks control what is shown.',
        3: "Goals live in the Goals section: split a big one into stages and add it to today's plan — it then counts toward your day and week.",
        4: "🥋 Skills — what you are mastering, with progress and books.\n🏋️ Workouts — exercises and sets, ready-made programs.\n🌐 Languages — a vocabulary: add words, mark the ones you've learned.",
        5: '🏁 Challenges — ready-made ones from the catalog, or your own.\n🛍️ Shop — spend points on things you "allow yourself to buy".\n🏆 Community — friends and a leaderboard; others only see what you allow.',
        6: "Tap a day in the calendar — write a plan or a note, and it goes into that day's summary.\n\n🚩 Milestones — recurring things with a date (an oil change): mark when you did it, and the page tells you when it's due again.",
        7: '☰ — the menu (language, theme, account, install). »»» — quick links to sections. 💧 — the water tracker, including past days.\n\nThat\'s it — enjoy!',
    },
}


# Подсказки и пояснения (BACKLOG 935, заход 4; заходы 2–3 — агент 5 правил свои строки напрямую в словарях и сюда не включены).
# RU — по списку из docs/TEXT_SHORTENING.md; EN — зеркально. Отступления от списка:
# — п. 21 (hist_intro) не трогаем: после слияния Календаря и Истории он уже короче предложенного (62 знака);
# — п. 26/28 (onb_migration_hint_001[b]): friendlyError уже говорит «Не получилось сохранить. Попробуй ещё раз.» и пишет ошибку в консоль,
#   поэтому вместо дублирующей фразы из списка — нейтральное дополнение; техническая подсказка про миграцию ушла в console.warn (блок B);
# — п. 24: сохранён значок 📌 в «Цели на сегодня» (так называется блок на Дашборде).
SHORT = {
    'workouts_templates_hint': {
        'ru': 'Проверенные схемы тренировок под разные цели. Выбери, посмотри упражнения и добавь в свой список одной кнопкой — повторения и вес вносишь сам по ходу.',
        'en': 'Proven training splits for different goals. Pick one, review the exercises and add it to your list in one click — you log your own reps and weight as you go.',
    },
    'workouts_warmup_text': {
        'ru': 'Пара минут лёгкого кардио, суставная разминка и облегчённый первый подход снижают риск травмы. Растяжку — после тренировки.',
        'en': 'A couple of minutes of light cardio, joint mobility and a lighter first set lower the risk of injury. Stretch after the workout.',
    },
    'workouts_ml_intro': {
        'ru': 'Подходы вводятся один раз — здесь. Метрика дня заполнится сама, баллы, серии и цели считаются как обычно.',
        'en': 'Sets are entered once, here. The daily metric fills in by itself; points, streaks and goals are counted as usual.',
    },
    'workouts_ml_note': {
        'ru': 'Подходы, внесённые в метрику сегодня, переносятся в тренировку — ничего не теряется. Прошлые дни не меняются.',
        'en': 'Sets already entered in the metric today move into the workout — nothing is lost. Past days stay as they were.',
    },
    'workouts_field_bilateral_hint': {
        'ru': 'Добавляет переключатель Л/П к подходу (стороны чередуются) и делит рекорды по сторонам.',
        'en': 'Adds a Left/Right toggle to each set (sides alternate) and splits records by side.',
    },
    'cal_hint': {
        'ru': 'План на день попадёт в «📌 Цели на сегодня» на Дашборде. Здесь только свои пункты — цели из «Целей» не добавляются.',
        'en': 'Your plan for the day shows up in "📌 Today\'s goals" on the dashboard. Only your own items here — goals from Goals are not added.',
    },
    'ch_source_hint': {
        'ru': 'Дни без ручной записи берут значение метрики или упражнения; ручная запись за день важнее.',
        'en': 'Days without a manual entry take the value of the metric or exercise; a manual entry for a day wins.',
    },
    'onb_migration_hint_001b': {
        'ru': 'Если повторится — зайди чуть позже.',
        'en': 'If it keeps happening, come back a little later.',
    },
    'onb_migration_hint_001': {
        'ru': 'Если повторится — зайди чуть позже.',
        'en': 'If it keeps happening, come back a little later.',
    },
    'install_generic_steps': {
        'ru': 'Открой меню браузера (⋮ справа вверху) → «Установить приложение» или «Добавить на главный экран».',
        'en': 'Open your browser menu (⋮ top right) → "Install app" or "Add to Home screen".',
    },
    'shop_idea_full': {
        'ru': 'Валюта — баллы, которые ты зарабатываешь сам: отмечаешь привычки, тренируешься, закрываешь цели. Добавь то, что хочешь себе позволить, накопи и купи — без чувства вины. Украшения сайта — в «Кастомизации».',
        'en': 'The currency is points you earn yourself: checking off habits, working out, closing goals. Add what you want to allow yourself, save up and buy it — guilt-free. Site decorations are in Customization.',
    },
}

# ключ → {'ru','en'}: тур + подсказки
BY_KEY = {f'tour_{n}_text': {'ru': TEXTS['ru'][n], 'en': TEXTS['en'][n]} for n in range(1, 8)}
BY_KEY.update(SHORT)


def js_literal(s: str) -> str:
    """Одинарные кавычки, как в словарях пилотов; перевод строки — \\n; апостроф и обратный слэш экранируются."""
    s = s.replace('\\', '\\\\').replace("'", "\\'").replace('\n', '\\n')
    return "'" + s + "'"


# Значение может стоять на той же строке, что и ключ, или (длинные строки, как их переносит prettier) на следующей, с отступом.
STR = r"""(?:'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*")"""


def key_re(key: str):
    return re.compile(
        r'^(?P<indent>[ \t]*)(?P<key>' + re.escape(key) + r'):(?P<sep>[ \t]*\n[ \t]*|[ \t]+)(?P<val>' + STR + r')(?P<comma>,?)',
        re.M,
    )


KEY_RES = {k: key_re(k) for k in BY_KEY}


def process(path: str, write: bool) -> bool:
    src = open(path, encoding='utf-8').read()
    out = src
    for key, texts in BY_KEY.items():
        count = len(KEY_RES[key].findall(out))
        if count == 0:
            continue
        if count != 2:
            raise SystemExit(f'{os.path.relpath(path, ROOT)}: ключ {key} встречается {count} раз(а), ожидалось 2 (EN, RU)')
        seen = [0]

        def repl(m, texts=texts, seen=seen):
            lang = 'en' if seen[0] == 0 else 'ru'
            seen[0] += 1
            return f"{m.group('indent')}{m.group('key')}:{m.group('sep')}{js_literal(texts[lang])}{m.group('comma')}"

        out = KEY_RES[key].sub(repl, out)
    if out != src and write:
        open(path, 'w', encoding='utf-8', newline='').write(out)
    return out != src


def main():
    write = '--check' not in sys.argv
    changed = []
    for path in sorted(glob.glob(os.path.join(ROOT, 'web-*', 'src', 'lib', 'i18n.ts'))):
        if process(path, write):
            changed.append(os.path.relpath(path, ROOT))
    print(f'изменено файлов: {len(changed)}')
    for c in changed:
        print('  ' + c)
    if not write and changed:
        sys.exit(1)


if __name__ == '__main__':
    main()
