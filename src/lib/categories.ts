export type Category = "news" | "sport" | "kids" | "music" | "movies" | "religion" | "general";

export const CATEGORY_LABELS: Record<Category, string> = {
  news: "Infos",
  sport: "Sport",
  kids: "Jeunesse",
  music: "Musique",
  movies: "Films et séries",
  religion: "Religion",
  general: "Généralistes",
};

// Le catalogue ne fournit pas de genre : on le déduit du nom, dans cet ordre de priorité.
const RULES: [Category, RegExp][] = [
  ["kids", /\b(kids?|junior|enfants?|jeunesse|cartoons?|toons|baby|niños|infantil|kika|gulli|tiji|ketnet|okoo|nick\w*|disney)\b/i],
  ["sport", /(sport|deportes|esporte|tennis|calcio|\b(football|futbol|soccer|golf|racing|motors?|nba|nfl|ufc|wwe|olympics?|fight|bein)\b)/i],
  ["news", /\b(news|info|infos|nachrichten|noticias|notícias|notizie|uutiset|nyheter|nieuws|vesti|haber|novosti|actualités?|cnn|euronews|tagesschau|lci|bfm\w*|france ?24|cgtn|al ?jazeera|dw|i24|parliament|parlement|senat|assemblée|24 ?horas|24 ?h)\b/i],
  ["music", /(music|musique|musica|música|\b(mtv|hits|vh1|clubbing|dance|rock|jazz|mezzo|fm|radio)\b)/i],
  ["movies", /\b(movies?|cinema|ciné\w*|film\w*|kino|séries?|series|novelas?|drama)\b/i],
  ["religion", /\b(church|gospel|god|christ\w*|bible|catholic|catholique|islam\w*|quran|coran|ewtn|kto|daystar|tbn|sunnah|makkah|madinah|evangel\w*|shalom)\b/i],
];

export function categorize(name: string): Category {
  for (const [category, pattern] of RULES) {
    if (pattern.test(name)) return category;
  }
  return "general";
}
