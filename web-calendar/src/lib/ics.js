const enc = new TextEncoder();
// Экранирование текстовых значений: обратная косая, точка с запятой, запятая и переводы строки.
export function escapeIcsText(s) {
    return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r\n|\r|\n/g, '\\n');
}
// Свёртка строк: не длиннее 75 октетов, продолжение начинается с пробела; многобайтный символ (кириллица, эмодзи) не режем посередине.
export function foldLine(line) {
    if (enc.encode(line).length <= 75)
        return line;
    const out = [];
    let cur = '';
    let curBytes = 0;
    let limit = 75;
    for (const ch of line) {
        const b = enc.encode(ch).length;
        if (curBytes + b > limit) {
            out.push(cur);
            cur = '';
            curBytes = 0;
            limit = 74; // со второй строки впереди пробел
        }
        cur += ch;
        curBytes += b;
    }
    if (cur)
        out.push(cur);
    return out.join('\r\n ');
}
const compact = (iso) => iso.replace(/-/g, '');
function nextDay(iso) {
    const [y, m, d] = iso.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d + 1));
    return dt.toISOString().slice(0, 10);
}
const stamp = (now) => now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const ISO = /^\d{4}-\d{2}-\d{2}$/;
export function buildIcs(items, now = new Date(), calName = 'Life Dashboard') {
    const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Life Dashboard//Calendar export//EN', 'CALSCALE:GREGORIAN', `X-WR-CALNAME:${escapeIcsText(calName)}`];
    for (const it of items) {
        if (!ISO.test(it.date) || !it.summary.trim())
            continue;
        lines.push('BEGIN:VEVENT', `UID:${it.uid}`, `DTSTAMP:${stamp(now)}`, `DTSTART;VALUE=DATE:${compact(it.date)}`, `DTEND;VALUE=DATE:${compact(nextDay(it.date))}`, `SUMMARY:${escapeIcsText(it.summary.trim())}`, 'TRANSP:TRANSPARENT', 'END:VEVENT');
    }
    lines.push('END:VCALENDAR');
    return lines.map(foldLine).join('\r\n') + '\r\n';
}
// Собирает события из того, что календарь уже загрузил для месяца: пункты плана по дням и сроки целей. Выполненное помечается «✓ ».
export function icsItemsFromMonth(planned, deadlines, deadlinePrefix) {
    const out = [];
    for (const date of Object.keys(planned).sort()) {
        planned[date].forEach((p, i) => out.push({ date, summary: (p.done ? '✓ ' : '') + p.text, uid: `plan-${date}-${i}@life-dashboard` }));
    }
    for (const date of Object.keys(deadlines).sort()) {
        for (const g of deadlines[date])
            out.push({ date, summary: (g.done ? '✓ ' : '') + deadlinePrefix + g.name, uid: `goal-${g.id}-${date}@life-dashboard` });
    }
    return out;
}
export const icsFileName = (year, month0) => `life-dashboard-${year}-${String(month0 + 1).padStart(2, '0')}.ics`;
