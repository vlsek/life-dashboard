export interface VocabWord {
  id: string
  user_id: string
  word: string
  translation: string | null
  example: string | null
  // Появилось в миграции 024; у записей со старых версий базы может отсутствовать —
  // тогда считаем язык английским (см. langFields() в useVocab.ts).
  lang: string | null
  learned: boolean
  created_at: string
}

export interface WordFormInput {
  word: string
  translation: string | null
  example: string | null
  lang: string
  translateTo: string
}
