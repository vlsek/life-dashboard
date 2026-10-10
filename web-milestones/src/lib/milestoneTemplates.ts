// Каталог шаблонов вех (BACKLOG 44.9): готовые «что и как часто обслуживать». Данные в репозитории, не в базе.
// Здоровье — ОБЩИЕ ОРИЕНТИРЫ, не врачебные рекомендации (в интерфейсе стоит пометка «уточните у врача»); цифры взяты из общеизвестных
// официальных ориентиров и осторожно округлены, пол и возраст пока не учитываются (нужны данные профиля — отдельный срез).
import type { IntervalUnit, MilestoneFormInput } from './types'

export type TemplateCategoryId = 'health' | 'car' | 'home' | 'documents'

export interface MilestoneTemplate {
  id: string
  category: TemplateCategoryId
  ru: { name: string; note: string }
  en: { name: string; note: string }
  value: number
  unit: IntervalUnit
  km?: number // интервал пробега, если есть
}

export const TEMPLATE_CATEGORY_ORDER: readonly TemplateCategoryId[] = ['health', 'car', 'home', 'documents']

export const TEMPLATE_CATEGORY_LABEL: Record<TemplateCategoryId, { ru: string; en: string }> = {
  health: { ru: 'Здоровье', en: 'Health' },
  car: { ru: 'Машина', en: 'Car' },
  home: { ru: 'Дом', en: 'Home' },
  documents: { ru: 'Документы', en: 'Documents' },
}

export const MILESTONE_TEMPLATES: readonly MilestoneTemplate[] = [
  { id: 'health_checkup', category: 'health', value: 12, unit: 'month', ru: { name: 'Общий осмотр у терапевта', note: 'Ориентир, уточните у врача. В РФ диспансеризация — раз в 3 года с 18 до 39 лет и ежегодно с 40.' }, en: { name: 'General check-up', note: 'A rough guide — ask your doctor. Many programmes suggest roughly once a year for adults.' } },
  { id: 'health_dentist', category: 'health', value: 6, unit: 'month', ru: { name: 'Стоматолог: осмотр и чистка', note: 'Ориентир, уточните у врача: обычно раз в 6–12 месяцев.' }, en: { name: 'Dentist: check-up and cleaning', note: 'A rough guide — ask your dentist: usually every 6–12 months.' } },
  { id: 'health_eyes', category: 'health', value: 24, unit: 'month', ru: { name: 'Проверка зрения у офтальмолога', note: 'Ориентир, уточните у врача: взрослым без жалоб — раз в 1–2 года.' }, en: { name: 'Eye exam', note: 'A rough guide — ask your doctor: every 1–2 years for adults without complaints.' } },
  { id: 'health_blood', category: 'health', value: 12, unit: 'month', ru: { name: 'Общий анализ крови', note: 'Ориентир, уточните у врача: обычно раз в год.' }, en: { name: 'Blood test (complete blood count)', note: 'A rough guide — ask your doctor: usually once a year.' } },
  { id: 'health_flu', category: 'health', value: 12, unit: 'month', ru: { name: 'Прививка от гриппа', note: 'Ориентир, уточните у врача: ежегодно, перед сезоном.' }, en: { name: 'Flu shot', note: 'A rough guide — ask your doctor: every year, before the season.' } },
  { id: 'car_service', category: 'car', value: 12, unit: 'month', km: 10000, ru: { name: 'Плановое ТО', note: 'Интервал по регламенту вашего автомобиля — проверьте в сервисной книжке.' }, en: { name: 'Scheduled service', note: "Use the interval from your car's service book." } },
  { id: 'car_oil', category: 'car', value: 12, unit: 'month', km: 10000, ru: { name: 'Замена масла и масляного фильтра', note: 'Обычно 10–15 тыс. км или раз в год — уточните по регламенту.' }, en: { name: 'Oil and oil filter change', note: 'Usually 10–15 thousand km or yearly — check your service book.' } },
  { id: 'car_insurance', category: 'car', value: 12, unit: 'month', ru: { name: 'Страховка (ОСАГО/КАСКО)', note: 'Укажите дату последнего оформления — срок посчитается сам.' }, en: { name: 'Car insurance', note: 'Set the last renewal date and the due date is calculated.' } },
  { id: 'car_inspection', category: 'car', value: 12, unit: 'month', ru: { name: 'Технический осмотр', note: 'Периодичность зависит от возраста автомобиля и страны — уточните.' }, en: { name: 'Roadworthiness inspection', note: 'The interval depends on the age of the car and your country.' } },
  { id: 'car_tires', category: 'car', value: 6, unit: 'month', ru: { name: 'Сезонная замена шин', note: 'Весной и осенью.' }, en: { name: 'Seasonal tire change', note: 'Spring and autumn.' } },
  { id: 'car_brake_fluid', category: 'car', value: 24, unit: 'month', ru: { name: 'Замена тормозной жидкости', note: 'Обычно раз в 2 года — уточните по регламенту.' }, en: { name: 'Brake fluid change', note: 'Usually every 2 years — check your service book.' } },
  { id: 'home_meters', category: 'home', value: 1, unit: 'month', ru: { name: 'Передать показания счётчиков', note: '' }, en: { name: 'Submit utility meter readings', note: '' } },
  { id: 'home_smoke', category: 'home', value: 6, unit: 'month', ru: { name: 'Проверить датчики дыма и сменить батарейки', note: '' }, en: { name: 'Test smoke detectors and replace batteries', note: '' } },
  { id: 'home_water_filter', category: 'home', value: 6, unit: 'month', ru: { name: 'Заменить картридж фильтра для воды', note: 'Срок смотрите в инструкции к фильтру.' }, en: { name: 'Replace the water filter cartridge', note: "See the filter's manual for the exact term." } },
  { id: 'home_hood', category: 'home', value: 3, unit: 'month', ru: { name: 'Почистить вытяжку и фильтры', note: '' }, en: { name: 'Clean the range hood and filters', note: '' } },
  { id: 'docs_check', category: 'documents', value: 12, unit: 'month', ru: { name: 'Проверить сроки паспорта, прав и страховок', note: 'Заранее, чтобы успеть заменить.' }, en: { name: 'Check passport, licence and insurance expiry dates', note: 'Early enough to renew in time.' } },
  { id: 'docs_backup', category: 'documents', value: 3, unit: 'month', ru: { name: 'Резервная копия важных файлов и документов', note: '' }, en: { name: 'Back up important files and documents', note: '' } },
]

export function templatesByCategory(): [TemplateCategoryId, MilestoneTemplate[]][] {
  return TEMPLATE_CATEGORY_ORDER.map((c) => [c, MILESTONE_TEMPLATES.filter((t) => t.category === c)])
}

// Заготовка для формы: название, группа, интервал (срок посчитается после «последний раз»), заметка.
export function templateDraft(tpl: MilestoneTemplate, lang: string): Partial<MilestoneFormInput> {
  const l = lang === 'en' ? 'en' : 'ru'
  return {
    name: tpl[l].name,
    category: TEMPLATE_CATEGORY_LABEL[tpl.category][l],
    interval_value: tpl.value,
    interval_unit: tpl.unit,
    interval_km: tpl.km ?? 0,
    note: tpl[l].note,
  }
}
