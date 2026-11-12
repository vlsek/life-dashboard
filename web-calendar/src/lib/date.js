// Портировано из config.js — те же сигнатуры и поведение, чтобы проценты дня/недели
// на этой странице совпадали с остальным сайтом.
export function fmtDate(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}
export function todayStr() {
    return fmtDate(new Date());
}
export function parseIso(iso) {
    return new Date(iso + 'T00:00:00');
}
export function addDaysIso(iso, n) {
    const d = parseIso(iso);
    d.setDate(d.getDate() + n);
    return fmtDate(d);
}
export function weekdayOf(dateStr) {
    return parseIso(dateStr).getDay();
}
export function mondayOf(iso) {
    const d = parseIso(iso);
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return fmtDate(d);
}
