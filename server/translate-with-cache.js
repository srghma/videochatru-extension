import translator from "open-google-translator";
import { open } from "sqlite";
import sqlite3 from "sqlite3";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const scriptDir = __dirname;
const dbFileName = "my-translate-files-cache.sqlite";
const dbFilePath = path.join(scriptDir, dbFileName);
// const dbFilePath = path.join(process.env.XDG_CACHE_HOME || `${process.env.HOME}/.cache`, dbFileName);

let db;

export async function openDB() {
  db = await open({
    filename: dbFilePath,
    driver: sqlite3.Database,
  });

  await db.exec(`CREATE TABLE IF NOT EXISTS translations (
    language_from TEXT NOT NULL,
    language_to TEXT NOT NULL,
    original TEXT NOT NULL,
    translation TEXT NOT NULL,
    PRIMARY KEY (language_from, language_to, original)
  )`);
}

// input { from: "en", to: "km", strings: ["im in db", "im not in db"] }
// returns [{ original: "im in db", text_translation: "..." }]
export async function db__getArrayOfTranslations({
  languageFrom,
  languageTo,
  strArray,
}) {
  if (!strArray.length) return [];

  const placeholders = Array(strArray.length).fill("?").join(",");
  const params = [languageFrom, languageTo, ...strArray];

  const rows = await db.all(
    `SELECT original, translation
     FROM translations
     WHERE language_from = ?
     AND language_to = ?
     AND original IN (${placeholders})`,
    params,
  );

  return rows.map(({ original, translation }) => ({
    original,
    translation,
  }));
}

export async function db__upsertArrayOfTranslations({
  languageFrom,
  languageTo,
  translations,
}) {
  if (!translations.length) return;

  const values = translations.map(() => `(?, ?, ?, ?)`).join(",");

  const params = translations.flatMap(({ original, translation }) => [
    languageFrom,
    languageTo,
    original,
    translation,
  ]);

  await db.run(
    `INSERT OR REPLACE INTO translations (language_from, language_to, original, translation) VALUES ${values}`,
    params,
  );
}

export async function translateSrt({ strDataArray, languageFrom, languageTo }) {
  const srtDataText__nonEmpty = strDataArray
    .map(({ text }) => text.trim())
    .filter((x) => x);

  const translationsFromDB = await getTranslationsFromDbIfExist({
    languageFrom,
    languageTo,
    strArray: srtDataText__nonEmpty,
  });

  const listOfWordsToTranslate = srtDataText__nonEmpty.filter(
    (text) => !translationsFromDB.find((t) => t.original === text),
  );

  if (
    listOfWordsToTranslate.length + translationsFromDB.length !==
    srtDataText__nonEmpty.length
  ) {
    throw new Error(
      `not all words are translated,
      listOfWordsToTranslate.length (${listOfWordsToTranslate.length}) + translationsFromDB.length (${translationsFromDB.length})
      === ${listOfWordsToTranslate.length + translationsFromDB.length}
      !== srtDataText__nonEmpty.length (${srtDataText__nonEmpty.length})`,
    );
  }

  let fetchedTranslations = [];

  if (listOfWordsToTranslate.length > 0) {
    console.log(
      `requesting google translations ${listOfWordsToTranslate.length}`,
    );
    fetchedTranslations = await translator.TranslateLanguageData({
      listOfWordsToTranslate,
      languageFrom,
      languageTo,
    });
  }

  const invalidTranslations = fetchedTranslations.filter(
    (x) => !x.translation.trim(),
  );

  if (invalidTranslations.length > 0) {
    throw new Error(
      `no translation for ${invalidTranslations.map((x) => x.original)}`,
    );
  }

  db__upsertArrayOfTranslations({
    translations: fetchedTranslations,
    languageFrom,
    languageTo,
  });

  console.log({ fetchedTranslations, translationsFromDB });

  const translations = [...fetchedTranslations, ...translationsFromDB];

  fs.writeFileSync(
    path.join(scriptDir, `rofi-audio--${languageTo}.txt`),
    strDataArray
      .map(({ text }) => {
        if (!text.trim()) return text;
        const found = translations.find((t) => t.original === text);
        return found ? found.translation : text;
      })
      .join("\n"),
  );

  const output = strDataArray.map((strData) => {
    const { text } = strData;
    if (!text.trim()) {
      return { ...strData, translation: text };
    }
    const found = translations.find((t) => t.original === text);
    return { ...strData, translation: found ? found.translation : text };
  });
  return output;
}
