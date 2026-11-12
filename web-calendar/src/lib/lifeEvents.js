const parse = (iso) => {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d);
};
// Номер дня челленджа: дата старта — день 1; раньше старта или без старта — нет номера
export function challengeDay(startDate, date) {
    if (!startDate)
        return null;
    const n = Math.round((parse(date).getTime() - parse(startDate).getTime()) / 86400000) + 1;
    return n >= 1 ? n : null;
}
export const emptyEvents = () => ({ workouts: 0, challenges: [], milestones: [] });
export const hasEvents = (e) => !!e && (e.workouts > 0 || e.challenges.length > 0 || e.milestones.length > 0);
export function groupLifeEvents(src) {
    const out = {};
    const at = (d) => (out[d] ||= emptyEvents());
    for (const w of src.workouts || [])
        if (w.date)
            at(w.date).workouts++;
    const inst = new Map((src.instances || []).map((i) => [i.id, i]));
    const seen = new Set(); // одна запись челленджа в день — один раз, сколько бы подходов ни было
    for (const e of src.challengeEntries || []) {
        const i = inst.get(e.challenge_id);
        if (!e.date || !i || seen.has(e.date + '|' + e.challenge_id))
            continue;
        seen.add(e.date + '|' + e.challenge_id);
        at(e.date).challenges.push({ id: i.id, title: i.title, day: challengeDay(i.start_date, e.date) });
    }
    for (const m of src.milestones || [])
        if (m.due_date)
            at(m.due_date).milestones.push({ id: m.id, name: m.name });
    return out;
}
