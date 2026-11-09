// Каталог основных упражнений зала по группам мышц (BACKLOG 69.21, этап 1 «данные»; запрос владельца 2026-11-02).
// Чистый модуль без импортов из пилотов (как shared/body-picker): строки данных — часть каталога, подписи интерфейса приходят из пилота.
//
// Зачем отдельно от EXERCISE_REFERENCE (shared/body-picker/muscles.ts): там — правила «название → мышцы» для карты (ключевые слова, порядок важен),
// здесь — ЧЕЛОВЕЧЕСКИЙ список «что делать в зале», разложенный по группам, с оборудованием и короткой подсказкой по технике. Упражнение в БД по-прежнему
// свободный текст: «Добавить из каталога» создаёт обычное упражнение с каноническим названием `ru`/`en`, и карта мышц, рекорды и история работают как у остальных.
// Поэтому КАЖДОЕ название обязано сопоставляться с картой мышц своей группой — это проверяет страж web-workouts/src/exerciseCatalog.test.ts.
import type { MuscleId } from '../body-picker/muscles'

export type Equipment = 'barbell' | 'dumbbell' | 'machine' | 'cable' | 'bodyweight'
export type Kind = 'compound' | 'isolation' // базовое (несколько суставов) / изолирующее (один сустав)

export interface CatalogExercise {
  id: string
  group: MuscleId // главная группа: в каком разделе каталога лежит
  secondary: MuscleId[] // что работает помогающим (без главной)
  equipment: Equipment
  kind: Kind
  ru: string
  en: string
  cueRu: string // одна короткая подсказка по технике (безлично или на «ты», без «вы»)
  cueEn: string
}

// Порядок разделов в каталоге: сверху вниз по телу, как удобно листать
export const GROUP_ORDER: MuscleId[] = ['chest', 'back', 'shoulders', 'biceps', 'triceps', 'forearms', 'abs', 'lower_back', 'glutes', 'quads', 'hamstrings', 'calves']

export const EQUIPMENT_ORDER: Equipment[] = ['barbell', 'dumbbell', 'machine', 'cable', 'bodyweight']
export const EQUIPMENT_NAMES: Record<Equipment, { ru: string; en: string }> = {
  barbell: { ru: 'Штанга', en: 'Barbell' },
  dumbbell: { ru: 'Гантели', en: 'Dumbbells' },
  machine: { ru: 'Тренажёр', en: 'Machine' },
  cable: { ru: 'Блок', en: 'Cable' },
  bodyweight: { ru: 'Свой вес', en: 'Bodyweight' },
}

const e = (id: string, group: MuscleId, secondary: MuscleId[], equipment: Equipment, kind: Kind, ru: string, en: string, cueRu: string, cueEn: string): CatalogExercise => ({ id, group, secondary, equipment, kind, ru, en, cueRu, cueEn })

export const CATALOG: CatalogExercise[] = [
  // ───────── Грудь
  e('bench_press_barbell', 'chest', ['triceps', 'shoulders'], 'barbell', 'compound', 'Жим штанги лёжа', 'Barbell bench press', 'Лопатки сведены, гриф опускается к середине груди, стопы упираются в пол.', 'Shoulder blades pinched, bar to mid-chest, feet planted on the floor.'),
  e('bench_press_dumbbell', 'chest', ['triceps', 'shoulders'], 'dumbbell', 'compound', 'Жим гантелей лёжа', 'Dumbbell bench press', 'Гантели опускаются на уровень груди, локти примерно под 45° к корпусу.', 'Lower the dumbbells to chest level, elbows about 45° from the torso.'),
  e('incline_press_barbell', 'chest', ['shoulders', 'triceps'], 'barbell', 'compound', 'Жим штанги на наклонной скамье', 'Incline barbell press', 'Скамья 30–45°, гриф опускается к верху груди, не к шее.', 'Bench at 30–45°, bar goes to the upper chest, not the neck.'),
  e('incline_press_dumbbell', 'chest', ['shoulders', 'triceps'], 'dumbbell', 'compound', 'Жим гантелей на наклонной скамье', 'Incline dumbbell press', 'Гантели идут вверх по лёгкой дуге, в верхней точке не бьются друг о друга.', 'Press up in a slight arc, do not clank the dumbbells together at the top.'),
  e('chest_press_machine', 'chest', ['triceps', 'shoulders'], 'machine', 'compound', 'Жим лёжа в тренажёре', 'Machine chest press', 'Сиденье по росту: рукоятки на уровне середины груди, лопатки прижаты к спинке.', 'Set the seat so the handles are at mid-chest, shoulder blades against the pad.'),
  e('dumbbell_fly', 'chest', ['shoulders'], 'dumbbell', 'isolation', 'Разводка гантелей лёжа', 'Dumbbell fly', 'Локти чуть согнуты и не меняют угол, гантели опускаются до растяжения груди.', 'Keep a slight, fixed elbow bend and lower until the chest stretches.'),
  e('cable_crossover', 'chest', ['shoulders'], 'cable', 'isolation', 'Сведение рук в кроссовере', 'Cable crossover', 'Руки сводятся дугой перед грудью, корпус неподвижен.', 'Bring the hands together in an arc in front of the chest, torso still.'),
  e('pushup', 'chest', ['triceps', 'shoulders'], 'bodyweight', 'compound', 'Отжимания от пола', 'Push-ups', 'Тело прямое от головы до пяток, грудь опускается почти до пола.', 'Body straight from head to heels, lower the chest almost to the floor.'),
  e('dips_chest', 'chest', ['triceps', 'shoulders'], 'bodyweight', 'compound', 'Отжимания на брусьях', 'Dips', 'Корпус слегка наклонён вперёд — больше работает грудь, прямо — трицепс.', 'Lean the torso slightly forward to bias the chest; stay upright for the triceps.'),

  // ───────── Спина
  e('pullup', 'back', ['biceps', 'forearms'], 'bodyweight', 'compound', 'Подтягивания широким хватом', 'Wide-grip pull-ups', 'Тянуть локти вниз к рёбрам, не раскачиваться, подбородок выше перекладины.', 'Pull the elbows down toward the ribs, no swinging, chin above the bar.'),
  e('chinup', 'back', ['biceps', 'forearms'], 'bodyweight', 'compound', 'Подтягивания обратным хватом', 'Chin-ups', 'Хват на ширине плеч ладонями к себе, полностью выпрямлять руки внизу.', 'Shoulder-width underhand grip, fully straighten the arms at the bottom.'),
  e('lat_pulldown', 'back', ['biceps'], 'cable', 'compound', 'Тяга верхнего блока к груди', 'Lat pulldown', 'Рукоятка идёт к верху груди, лопатки опускаются вниз и сводятся.', 'Bring the bar to the upper chest, pull the shoulder blades down and together.'),
  e('barbell_row', 'back', ['biceps', 'lower_back'], 'barbell', 'compound', 'Тяга штанги в наклоне', 'Barbell row', 'Спина прямая, корпус наклонён, гриф тянется к низу живота.', 'Flat back, hinge forward, pull the bar toward the lower belly.'),
  e('dumbbell_row', 'back', ['biceps'], 'dumbbell', 'compound', 'Тяга гантели одной рукой', 'One-arm dumbbell row', 'Опора рукой и коленом на скамью, локоть идёт вдоль корпуса к тазу.', 'Support with a hand and knee on the bench, drive the elbow along the torso toward the hip.'),
  e('seated_cable_row', 'back', ['biceps'], 'cable', 'compound', 'Тяга нижнего блока сидя', 'Seated cable row', 'Корпус неподвижен, в конце движения лопатки сведены.', 'Keep the torso still, squeeze the shoulder blades together at the end.'),
  e('t_bar_row', 'back', ['biceps', 'lower_back'], 'barbell', 'compound', 'Тяга Т-грифа', 'T-bar row', 'Спина ровная, тянуть к груди, не округлять поясницу.', 'Flat back, pull toward the chest, do not round the lower back.'),
  e('dumbbell_shrug', 'back', ['forearms'], 'dumbbell', 'isolation', 'Шраги с гантелями', 'Dumbbell shrugs', 'Плечи поднимаются прямо вверх к ушам, без кручения плечами.', 'Lift the shoulders straight up toward the ears, no rolling.'),

  // ───────── Плечи
  e('overhead_press_barbell', 'shoulders', ['triceps'], 'barbell', 'compound', 'Жим штанги стоя', 'Standing overhead press', 'Корпус и ягодицы напряжены, гриф идёт вверх рядом с лицом, без прогиба в пояснице.', 'Brace the torso and glutes, press the bar past the face, no lower-back arch.'),
  e('overhead_press_dumbbell', 'shoulders', ['triceps'], 'dumbbell', 'compound', 'Жим гантелей сидя', 'Seated dumbbell press', 'Спина прижата к спинке, гантели вверх до выпрямления рук.', 'Back against the pad, press the dumbbells up until the arms are straight.'),
  e('arnold_press', 'shoulders', ['triceps'], 'dumbbell', 'compound', 'Жим Арнольда', 'Arnold shoulder press', 'Ладони к себе внизу, при жиме разворачиваются вперёд.', 'Palms face you at the bottom and rotate forward as you press.'),
  e('lateral_raise', 'shoulders', [], 'dumbbell', 'isolation', 'Махи гантелями в стороны', 'Dumbbell lateral raise', 'Руки чуть согнуты, подъём до уровня плеч, локти выше кистей.', 'Arms slightly bent, lift to shoulder height with elbows above the wrists.'),
  e('front_raise', 'shoulders', [], 'dumbbell', 'isolation', 'Махи гантелями перед собой', 'Dumbbell front raise', 'Подъём до уровня плеч без раскачки корпусом.', 'Raise to shoulder height without swinging the torso.'),
  e('rear_delt_fly', 'shoulders', ['back'], 'dumbbell', 'isolation', 'Махи гантелями в наклоне', 'Bent-over lateral raise', 'Корпус наклонён, руки разводятся в стороны, лопатки сведены.', 'Hinge forward, open the arms to the sides, shoulder blades pinched.'),
  e('face_pull', 'shoulders', ['back'], 'cable', 'isolation', 'Тяга к лицу на блоке', 'Cable face pull', 'Канат тянется к лицу, локти высоко и в стороны.', 'Pull the rope toward the face, elbows high and wide.'),

  // ───────── Бицепс
  e('barbell_curl', 'biceps', ['forearms'], 'barbell', 'isolation', 'Подъём штанги на бицепс', 'Barbell curl', 'Локти прижаты к корпусу, без раскачки спиной.', 'Elbows pinned to the sides, no swinging with the back.'),
  e('dumbbell_curl', 'biceps', ['forearms'], 'dumbbell', 'isolation', 'Сгибания рук с гантелями', 'Dumbbell curl', 'Поочерёдно или вместе, кисть слегка разворачивается наружу вверху.', 'Alternate or together, turn the wrist slightly outward at the top.'),
  e('hammer_curl', 'biceps', ['forearms'], 'dumbbell', 'isolation', 'Молотки с гантелями', 'Hammer curl', 'Нейтральный хват (ладони друг к другу), локти неподвижны.', 'Neutral grip (palms facing each other), elbows still.'),
  e('preacher_curl', 'biceps', [], 'barbell', 'isolation', 'Сгибания рук на скамье Скотта', 'Preacher curl', 'Плечи лежат на подушке, внизу руки не выпрямлять до конца.', 'Upper arms rest on the pad; do not fully lock out at the bottom.'),
  e('concentration_curl', 'biceps', [], 'dumbbell', 'isolation', 'Концентрированные сгибания на бицепс', 'Concentration curl', 'Локоть упирается во внутреннюю сторону бедра, движение медленное.', 'Brace the elbow on the inner thigh, move slowly.'),
  e('cable_curl', 'biceps', ['forearms'], 'cable', 'isolation', 'Сгибания рук на нижнем блоке', 'Cable curl', 'Постоянное натяжение троса, локти у корпуса.', 'Keep constant tension on the cable, elbows at the sides.'),

  // ───────── Трицепс
  e('close_grip_bench', 'triceps', ['chest', 'shoulders'], 'barbell', 'compound', 'Жим лёжа узким хватом', 'Close-grip bench press', 'Хват чуть уже плеч, локти идут вдоль корпуса.', 'Grip slightly narrower than the shoulders, elbows travel along the torso.'),
  e('french_press', 'triceps', [], 'barbell', 'isolation', 'Французский жим с EZ-штангой', 'EZ-bar skull crusher', 'Плечи неподвижны, сгибаются только локти, штанга опускается ко лбу или за голову.', 'Upper arms stay still, only the elbows bend, lower the bar toward the forehead or behind the head.'),
  e('triceps_pushdown', 'triceps', [], 'cable', 'isolation', 'Разгибания на трицепс на блоке', 'Triceps pushdown', 'Локти прижаты, в нижней точке руки выпрямлены полностью.', 'Elbows pinned, fully straighten the arms at the bottom.'),
  e('overhead_triceps', 'triceps', [], 'dumbbell', 'isolation', 'Разгибание на трицепс из-за головы', 'Overhead triceps extension', 'Локти смотрят вверх и не разводятся, гантель опускается за голову.', 'Elbows point up and stay close, lower the dumbbell behind the head.'),
  e('bench_dips', 'triceps', ['chest', 'shoulders'], 'bodyweight', 'compound', 'Обратные отжимания от скамьи', 'Bench dips', 'Спина близко к скамье, локти назад, а не в стороны.', 'Keep the back close to the bench, elbows go back, not out.'),

  // ───────── Предплечья
  e('wrist_curl', 'forearms', [], 'barbell', 'isolation', 'Сгибания запястий со штангой', 'Barbell wrist curl', 'Предплечья лежат на скамье или бедрах, двигаются только кисти.', 'Forearms rest on a bench or thighs, only the wrists move.'),
  e('reverse_wrist_curl', 'forearms', [], 'dumbbell', 'isolation', 'Разгибания запястий с гантелью', 'Reverse wrist curl', 'Ладонь вниз, лёгкий вес, движение только в запястье.', 'Palm down, light weight, move only at the wrist.'),
  e('farmers_walk', 'forearms', ['back', 'abs'], 'dumbbell', 'compound', 'Ходьба фермера', "Farmer's walk", 'Тяжёлые гантели по бокам, корпус прямой, шаги короткие.', 'Heavy dumbbells at the sides, torso upright, short steps.'),
  e('reverse_curl', 'forearms', ['biceps'], 'barbell', 'isolation', 'Обратные сгибания рук со штангой', 'Reverse curl', 'Хват сверху, локти прижаты, вес небольшой.', 'Overhand grip, elbows pinned, keep the weight moderate.'),

  // ───────── Пресс
  e('crunch', 'abs', [], 'bodyweight', 'isolation', 'Скручивания', 'Crunches', 'Поясница прижата, поднимаются плечи, а не шея.', 'Lower back stays down, lift the shoulders, not the neck.'),
  e('hanging_leg_raise', 'abs', ['forearms'], 'bodyweight', 'compound', 'Подъём ног в висе', 'Hanging leg raise', 'Без раскачки, ноги поднимаются за счёт пресса, таз подкручивается вверх.', 'No swinging, lift the legs with the abs, curl the pelvis up.'),
  e('hanging_knee_raise', 'abs', ['forearms'], 'bodyweight', 'compound', 'Подъём коленей в висе', 'Hanging knee raise', 'Колени тянутся к груди, медленный возврат.', 'Drive the knees toward the chest, return slowly.'),
  e('plank', 'abs', ['shoulders'], 'bodyweight', 'isolation', 'Планка', 'Plank', 'Тело в одну линию, таз не проваливается и не поднимается.', 'Body in one line, hips neither sag nor rise.'),
  e('cable_crunch', 'abs', [], 'cable', 'isolation', 'Скручивания на блоке', 'Cable crunch', 'На коленях, сгибается корпус, а не руки тянут вниз.', 'Kneeling, bend the torso; do not just pull with the arms.'),
  e('bicycle_crunch', 'abs', [], 'bodyweight', 'isolation', 'Велосипед (скручивания)', 'Bicycle crunch', 'Локоть тянется к противоположному колену, спина не отрывается.', 'Elbow toward the opposite knee, keep the lower back down.'),
  e('russian_twist', 'abs', [], 'bodyweight', 'isolation', 'Русские скручивания', 'Russian twist', 'Корпус откинут назад, поворот делается корпусом, а не руками.', 'Lean back, rotate the torso rather than just the arms.'),
  e('ab_wheel', 'abs', ['shoulders'], 'bodyweight', 'compound', 'Ролик для пресса', 'Ab wheel rollout', 'Таз подкручен, спину не прогибать, выезжать только на подконтрольную длину.', 'Pelvis tucked, do not arch the back, roll out only as far as you control.'),

  // ───────── Поясница
  e('back_extension', 'lower_back', ['glutes', 'hamstrings'], 'bodyweight', 'isolation', 'Гиперэкстензия', 'Back extension', 'Подъём до прямой линии с корпусом, без переразгибания в конце.', 'Rise to a straight line with the body, no hyperextension at the top.'),
  e('deadlift', 'lower_back', ['hamstrings', 'glutes', 'back'], 'barbell', 'compound', 'Становая тяга', 'Deadlift', 'Гриф у голеней, спина ровная, толчок ногами и разгибание таза.', 'Bar over the shins, flat back, push with the legs and extend the hips.'),

  // ───────── Ягодицы
  e('glute_bridge', 'glutes', ['hamstrings'], 'bodyweight', 'isolation', 'Ягодичный мостик', 'Glute bridge', 'Таз поднимается за счёт ягодиц, вверху пауза и сжатие.', 'Lift the hips with the glutes, pause and squeeze at the top.'),
  e('hip_thrust', 'glutes', ['hamstrings'], 'barbell', 'compound', 'Ягодичный мостик со штангой (hip thrust)', 'Barbell hip thrust', 'Лопатки на скамье, подбородок прижат, вверху корпус параллелен полу.', 'Shoulder blades on the bench, chin tucked, torso parallel to the floor at the top.'),
  e('cable_glute_kickback', 'glutes', ['hamstrings'], 'cable', 'isolation', 'Ягодичное отведение ноги на блоке', 'Cable glute kickback', 'Корпус неподвижен, нога уходит назад без прогиба в пояснице.', 'Torso still, send the leg back without arching the lower back.'),
  e('reverse_lunge', 'glutes', ['quads', 'hamstrings'], 'dumbbell', 'compound', 'Выпады назад с гантелями', 'Reverse lunge', 'Шаг назад, вес на передней ноге, колено не заваливается внутрь.', 'Step back, load the front leg, knee does not cave inward.'),
  e('glute_machine', 'glutes', [], 'machine', 'isolation', 'Ягодичный тренажёр (отведение)', 'Glute kickback machine', 'Движение плавное, в конце сжатие ягодиц на секунду.', 'Move smoothly and squeeze the glutes for a second at the end.'),

  // ───────── Квадрицепсы
  e('back_squat', 'quads', ['glutes', 'lower_back'], 'barbell', 'compound', 'Приседания со штангой', 'Barbell back squat', 'Колени идут по линии носков, спина ровная, глубина — не выше параллели бедра.', 'Knees track over the toes, flat back, depth at least to parallel.'),
  e('front_squat', 'quads', ['glutes', 'abs'], 'barbell', 'compound', 'Фронтальные приседания', 'Front squat', 'Локти высоко, штанга лежит на передней части плеч, корпус вертикальный.', 'Elbows high, bar rests on the front of the shoulders, torso upright.'),
  e('leg_press', 'quads', ['glutes', 'hamstrings'], 'machine', 'compound', 'Жим ногами', 'Leg press', 'Поясница прижата к спинке, колени не сводятся и не блокируются вверху.', 'Lower back against the pad, knees do not cave in or lock out at the top.'),
  e('leg_extension', 'quads', [], 'machine', 'isolation', 'Разгибания ног в тренажёре', 'Leg extension', 'Плавно, в верхней точке пауза, вниз — под контролем.', 'Smoothly, pause at the top, lower under control.'),
  e('dumbbell_lunge', 'quads', ['glutes', 'hamstrings'], 'dumbbell', 'compound', 'Выпады с гантелями', 'Dumbbell lunges', 'Шаг вперёд, колено передней ноги над стопой, корпус вертикальный.', 'Step forward, front knee over the foot, torso upright.'),
  e('bulgarian_split_squat', 'quads', ['glutes'], 'dumbbell', 'compound', 'Болгарские сплит-приседания', 'Bulgarian split squat', 'Задняя нога на скамье, основной вес на передней, опускаться вертикально.', 'Rear foot on the bench, most weight on the front leg, descend straight down.'),
  e('hack_squat', 'quads', ['glutes'], 'machine', 'compound', 'Гакк-приседания в тренажёре', 'Hack squat', 'Спина прижата, стопы ставятся ниже или выше — смещает акцент.', 'Back against the pad; foot position higher or lower shifts the emphasis.'),
  e('goblet_squat', 'quads', ['glutes', 'abs'], 'dumbbell', 'compound', 'Кубковые приседания (гоблет)', 'Goblet squat', 'Гантель у груди, локти внутри колен, корпус вертикальный.', 'Hold the dumbbell at the chest, elbows inside the knees, torso upright.'),

  // ───────── Бицепс бедра
  e('romanian_deadlift', 'hamstrings', ['glutes', 'lower_back'], 'barbell', 'compound', 'Румынская тяга', 'Romanian deadlift', 'Колени слегка согнуты, таз уходит назад, штанга скользит вдоль ног.', 'Slight knee bend, push the hips back, slide the bar down the legs.'),
  e('lying_leg_curl', 'hamstrings', ['calves'], 'machine', 'isolation', 'Сгибания ног лёжа', 'Lying leg curl', 'Таз прижат к скамье, движение без рывка.', 'Hips pressed into the bench, no jerking.'),
  e('seated_leg_curl', 'hamstrings', ['calves'], 'machine', 'isolation', 'Сгибания ног сидя', 'Seated leg curl', 'Валик у нижней части голени, плавный возврат.', 'Pad low on the shin, return smoothly.'),
  e('stiff_leg_deadlift', 'hamstrings', ['glutes', 'lower_back'], 'barbell', 'compound', 'Становая тяга на прямых ногах', 'Stiff-leg deadlift', 'Ноги почти прямые, опускать до растяжения задней поверхности бедра, спина ровная.', 'Legs nearly straight, lower until the hamstrings stretch, back flat.'),
  e('standing_leg_curl', 'hamstrings', ['calves'], 'machine', 'isolation', 'Сгибания ног стоя в тренажёре', 'Standing leg curl', 'Корпус неподвижен, работает одна нога за раз.', 'Torso still, one leg at a time.'),

  // ───────── Икры
  e('standing_calf_raise', 'calves', [], 'machine', 'isolation', 'Подъёмы на носки стоя', 'Standing calf raise', 'Полная амплитуда: внизу растяжение, вверху пауза.', 'Full range: stretch at the bottom, pause at the top.'),
  e('seated_calf_raise', 'calves', [], 'machine', 'isolation', 'Подъёмы на носки сидя', 'Seated calf raise', 'Колени согнуты под 90°, нагружается камбаловидная мышца.', 'Knees bent to 90°, which loads the soleus.'),
  e('calf_raise_machine', 'calves', [], 'machine', 'isolation', 'Подъёмы на носки в тренажёре', 'Machine calf raise', 'Без отскока внизу, движение медленное.', 'No bouncing at the bottom, move slowly.'),
]

export const catalogByGroup = (group: MuscleId): CatalogExercise[] => CATALOG.filter((x) => x.group === group)
export const catalogById = (id: string): CatalogExercise | undefined => CATALOG.find((x) => x.id === id)
// Все упражнения, где мышца задействована (главная или вторичная): для «что тренирует эта мышца»
export const catalogForMuscle = (m: MuscleId): CatalogExercise[] => CATALOG.filter((x) => x.group === m || x.secondary.includes(m))
export const catalogByEquipment = (eq: Equipment): CatalogExercise[] => CATALOG.filter((x) => x.equipment === eq)
