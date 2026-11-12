import { t } from './i18n';
export function errorKind(err) {
    const e = (err && typeof err === 'object' ? err : { message: err });
    const msg = String(e?.message ?? '').toLowerCase();
    const code = String(e?.code ?? '');
    const status = Number(e?.status);
    const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
    if (offline || /failed to fetch|networkerror|network request failed|load failed|fetch failed|timeout|timed out/.test(msg))
        return 'network';
    if (code === '42501' || status === 401 || status === 403 || /row-level security|permission denied|jwt|not authorized|not allowed/.test(msg))
        return 'forbidden';
    if (code === '23503' || /foreign key|still referenced|violates foreign/.test(msg))
        return 'in_use';
    if (code === '23514' || code === '22P02' || code === '23502' || code === '22003' || /invalid input|check constraint|null value in column|out of range/.test(msg))
        return 'validation';
    return 'generic';
}
// action — что пытались сделать: от него зависит общий текст для «прочих» ошибок («не получилось сохранить / удалить / загрузить / загрузить файл»).
export function friendlyError(err, action = 'save', log = true) {
    if (log)
        console.error('[calendar]', err);
    const kind = errorKind(err);
    if (kind !== 'generic')
        return t(('err_' + kind));
    return t(('err_generic_' + action));
}
