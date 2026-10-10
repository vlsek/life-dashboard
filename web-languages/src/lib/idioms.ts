// «Идиома дня» (BACKLOG 44.7, ответ владельца: своя вшитая подборка). Только народные пословицы и устойчивые выражения —
// общее достояние, без цитат современных авторов и без внешних источников. Перевод и пояснение — на русском и английском.
export interface Idiom {
  text: string
  ru: string // перевод/смысл по-русски
  en: string // то же по-английски
}

export const IDIOMS: Record<string, readonly Idiom[]> = {
  en: [
    { text: 'Break the ice', ru: 'Растопить лёд, начать разговор', en: 'To make people feel at ease at the start' },
    { text: 'A piece of cake', ru: 'Проще простого', en: 'Something very easy' },
    { text: 'Once in a blue moon', ru: 'Очень редко', en: 'Very rarely' },
    { text: 'Bite the bullet', ru: 'Стиснуть зубы и сделать неприятное', en: 'To face something unpleasant bravely' },
    { text: 'The ball is in your court', ru: 'Теперь ваш ход', en: 'It is your turn to act' },
    { text: 'Actions speak louder than words', ru: 'Дела говорят громче слов', en: 'What you do matters more than what you say' },
    { text: 'Better late than never', ru: 'Лучше поздно, чем никогда', en: 'Doing something late is better than not at all' },
    { text: "Don't count your chickens before they hatch", ru: 'Цыплят по осени считают', en: 'Do not rely on a result before it happens' },
    { text: 'When in Rome, do as the Romans do', ru: 'В чужой монастырь со своим уставом не ходят', en: 'Follow the customs of the place you are in' },
    { text: 'A blessing in disguise', ru: 'Нет худа без добра', en: 'Something bad that turns out to be good' },
    { text: 'Hit the nail on the head', ru: 'Попасть в точку', en: 'To say or do exactly the right thing' },
    { text: 'Under the weather', ru: 'Неважно себя чувствовать', en: 'Feeling slightly ill' },
  ],
  de: [
    { text: 'Übung macht den Meister', ru: 'Мастерство приходит с практикой', en: 'Practice makes perfect' },
    { text: 'Morgenstund hat Gold im Mund', ru: 'Кто рано встаёт, тому бог подаёт', en: 'The early bird catches the worm' },
    { text: 'Ich verstehe nur Bahnhof', ru: 'Ничего не понимаю', en: 'I understand nothing at all' },
    { text: 'Da steppt der Bär', ru: 'Там веселье кипит', en: 'The party is in full swing there' },
    { text: 'Ich drücke dir die Daumen', ru: 'Держу за тебя кулачки', en: 'I keep my fingers crossed for you' },
    { text: 'Das ist nicht mein Bier', ru: 'Это не моё дело', en: 'That is not my business' },
    { text: 'Ende gut, alles gut', ru: 'Всё хорошо, что хорошо кончается', en: 'All is well that ends well' },
    { text: 'Aller Anfang ist schwer', ru: 'Всякое начало трудно', en: 'Every beginning is hard' },
    { text: 'Wer rastet, der rostet', ru: 'Кто не двигается, тот ржавеет', en: 'He who rests, rusts' },
    { text: 'Es ist nicht alles Gold, was glänzt', ru: 'Не всё то золото, что блестит', en: 'All that glitters is not gold' },
  ],
  fr: [
    { text: "C'est la vie", ru: 'Такова жизнь', en: 'That is life' },
    { text: "Petit à petit, l'oiseau fait son nid", ru: 'Понемногу птица вьёт гнездо', en: 'Little by little, the bird builds its nest' },
    { text: 'Avoir le cafard', ru: 'Хандрить', en: 'To feel down' },
    { text: 'Coûter les yeux de la tête', ru: 'Стоить целое состояние', en: 'To cost a fortune' },
    { text: 'Poser un lapin', ru: 'Не прийти на встречу', en: 'To stand someone up' },
    { text: 'Chaque chose en son temps', ru: 'Всему своё время', en: 'Everything in its time' },
    { text: 'Tout est bien qui finit bien', ru: 'Всё хорошо, что хорошо кончается', en: 'All is well that ends well' },
    { text: 'Mettre son grain de sel', ru: 'Вставить своё слово не к месту', en: 'To butt in with your opinion' },
    { text: "L'habit ne fait pas le moine", ru: 'Внешность обманчива', en: 'Clothes do not make the man' },
    { text: 'Il pleut des cordes', ru: 'Льёт как из ведра', en: 'It is raining cats and dogs' },
  ],
  es: [
    { text: 'Más vale tarde que nunca', ru: 'Лучше поздно, чем никогда', en: 'Better late than never' },
    { text: 'A caballo regalado no se le mira el diente', ru: 'Дарёному коню в зубы не смотрят', en: "Don't look a gift horse in the mouth" },
    { text: 'Estar en las nubes', ru: 'Витать в облаках', en: 'To be daydreaming' },
    { text: 'Ser pan comido', ru: 'Проще простого', en: 'To be a piece of cake' },
    { text: 'Dar en el clavo', ru: 'Попасть в точку', en: 'To hit the nail on the head' },
    { text: 'No hay mal que por bien no venga', ru: 'Нет худа без добра', en: 'Every cloud has a silver lining' },
    { text: 'Quien mucho abarca, poco aprieta', ru: 'За двумя зайцами погонишься — ни одного не поймаешь', en: 'Do not take on more than you can handle' },
    { text: 'Echar una mano', ru: 'Помочь', en: 'To lend a hand' },
    { text: 'Al mal tiempo, buena cara', ru: 'В трудный час не унывай', en: 'Keep a brave face in hard times' },
    { text: 'Poco a poco se va lejos', ru: 'Тише едешь — дальше будешь', en: 'Slow and steady goes far' },
  ],
  it: [
    { text: 'Chi va piano va sano e va lontano', ru: 'Тише едешь — дальше будешь', en: 'Slow and steady wins the race' },
    { text: 'In bocca al lupo', ru: 'Ни пуха ни пера', en: 'Good luck (literally: into the wolf’s mouth)' },
    { text: 'Non avere peli sulla lingua', ru: 'Говорить прямо, без обиняков', en: 'To speak bluntly' },
    { text: 'Avere le mani in pasta', ru: 'Быть в курсе дел, приложить руку', en: 'To be involved in something' },
    { text: 'Meglio tardi che mai', ru: 'Лучше поздно, чем никогда', en: 'Better late than never' },
    { text: 'Dire pane al pane e vino al vino', ru: 'Называть вещи своими именами', en: 'To call a spade a spade' },
    { text: 'Piove sul bagnato', ru: 'Беда не приходит одна', en: 'It never rains but it pours' },
    { text: 'Costare un occhio della testa', ru: 'Стоить целое состояние', en: 'To cost an arm and a leg' },
    { text: 'Prendere due piccioni con una fava', ru: 'Убить двух зайцев одним ударом', en: 'To kill two birds with one stone' },
    { text: 'Chi dorme non piglia pesci', ru: 'Под лежачий камень вода не течёт', en: 'The sleeper catches no fish' },
  ],
  pt: [
    { text: 'Água mole em pedra dura, tanto bate até que fura', ru: 'Капля камень точит', en: 'Constant effort wears down any obstacle' },
    { text: 'Mais vale tarde do que nunca', ru: 'Лучше поздно, чем никогда', en: 'Better late than never' },
    { text: 'Quem não arrisca, não petisca', ru: 'Кто не рискует, тот не пьёт шампанского', en: 'Nothing ventured, nothing gained' },
    { text: 'Cada macaco no seu galho', ru: 'Каждому своё место', en: 'Everyone should stay in their own place' },
    { text: 'Engolir sapos', ru: 'Глотать обиды, терпеть неприятное', en: 'To put up with unpleasant things' },
    { text: 'Dar com a língua nos dentes', ru: 'Проболтаться', en: 'To let a secret slip' },
    { text: 'Estar com a pulga atrás da orelha', ru: 'Заподозрить неладное', en: 'To be suspicious' },
    { text: 'Ficar a ver navios', ru: 'Остаться ни с чем', en: 'To be left empty-handed' },
    { text: 'Quem tem boca vai a Roma', ru: 'Язык до Киева доведёт', en: 'If you ask, you will find the way' },
    { text: 'De grão em grão a galinha enche o papo', ru: 'По зёрнышку клюёт курочка', en: 'Little by little, it adds up' },
  ],
}

export function idiomLangs(): string[] {
  return Object.keys(IDIOMS)
}

export function hasIdioms(lang: string): boolean {
  return !!IDIOMS[lang]?.length
}

// День от начала эпохи по местной дате: идиома меняется раз в сутки, а не при каждой загрузке.
export function dayNumber(d: Date): number {
  return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000)
}

// Идиома дня + сдвиг («Другая» листает дальше по кругу).
export function idiomOfDay(lang: string, day: number, offset = 0): Idiom | null {
  const list = IDIOMS[lang]
  if (!list || !list.length) return null
  const i = (((day + offset) % list.length) + list.length) % list.length
  return list[i]
}

// Как идиома попадает в «мои слова»: слово — сама идиома, перевод — на язык интерфейса, пример — пояснение на втором языке.
export function idiomToWord(idiom: Idiom, uiLang: string): { word: string; translation: string; example: string | null } {
  const ru = uiLang !== 'en'
  return { word: idiom.text, translation: ru ? idiom.ru : idiom.en, example: ru ? idiom.en : idiom.ru }
}
