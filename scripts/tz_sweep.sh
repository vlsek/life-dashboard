#!/bin/bash
# Прогон тестов пилотов в «крайних» часовых поясах (BACKLOG 73.5, агент 7): тест, зависящий от пояса, указывает на скрытую ошибку с датами
# (так нашлись: возраст цели в прогнозе «Целей» занижался на день; тест «Челленджей» ждал дату по UTC).
# Использование:  scripts/tz_sweep.sh [пилот ...]      (по умолчанию — все; пояса: TZS="Pacific/Kiritimati Pacific/Pago_Pago America/Los_Angeles")
# Результат — строки «пояс пилот : итог :: упавшие» в stdout. Долго (дашборд и тренировки по 4–5 минут на пояс) — запускайте в фоне.
cd "$(dirname "$0")/.." || exit 1
TZS=${TZS:-"Pacific/Kiritimati Pacific/Pago_Pago"}
PILOTS=${*:-"skills challenges milestones shop community achievements languages customization history calendar goals workouts dashboard"}
for tz in $TZS; do
  for p in $PILOTS; do
    [ -d "web-$p" ] || continue
    out=$(cd "web-$p" && TZ=$tz timeout 420 npx vitest run --config vitest.config.ts 2>&1 | sed 's/\x1b\[[0-9;]*m//g')
    sum=$(echo "$out" | grep -E '^ *Tests ' | tr -s ' ')
    fails=$(echo "$out" | grep -E '^ *×' | head -6 | cut -c1-140 | tr '\n' '|')
    echo "$tz $p :$sum :: $fails"
  done
done
