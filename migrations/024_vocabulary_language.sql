-- 024_vocabulary_language.sql
--
-- Раздел "Языки" (бывший "English"): слова можно вести на любом языке, а не только английском.
-- Колонка lang хранит код языка слова (ISO 639-1: 'en', 'de', 'fr', 'es', ...). Все существующие
-- слова получают 'en' — они и были английскими, ничего не теряется.

alter table vocabulary add column if not exists lang text default 'en';
update vocabulary set lang = 'en' where lang is null;
