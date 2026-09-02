// Algerian wilaya (province) lookup. Each entry lists the wilaya number and
// common name variants — English, French, and Arabic — that leads' free-text
// city field is likely to be saved as. Used to sort leads by wilaya order so
// clicking "City" in the leads table groups Algiers (16) together and orders
// the pipeline north-south / west-east the way sales reps think about it.
//
// The list is complete (58 wilayas as of the 2019 + 2021 splits). If you add
// non-Algerian leads (or wilayas we haven't seen typed a certain way), those
// records simply fall to the end of the sort, ordered alphabetically as a
// tiebreaker.

type WilayaEntry = { number: number; names: string[] };

// Names are normalized (lowercased, whitespace-collapsed) before matching, so
// keep them lowercase here. Include common alt-spellings — "Wilaya X" numeric
// prefixes ("16 algiers", "16-alger") also work via the number-prefix parser.
const WILAYAS: WilayaEntry[] = [
  { number: 1,  names: ["adrar", "أدرار"] },
  { number: 2,  names: ["chlef", "الشلف"] },
  { number: 3,  names: ["laghouat", "الأغواط"] },
  { number: 4,  names: ["oum el bouaghi", "oum el-bouaghi", "أم البواقي"] },
  { number: 5,  names: ["batna", "باتنة"] },
  { number: 6,  names: ["bejaia", "béjaïa", "bejaïa", "بجاية"] },
  { number: 7,  names: ["biskra", "بسكرة"] },
  { number: 8,  names: ["bechar", "béchar", "بشار"] },
  { number: 9,  names: ["blida", "البليدة"] },
  { number: 10, names: ["bouira", "البويرة"] },
  { number: 11, names: ["tamanrasset", "تمنراست"] },
  { number: 12, names: ["tebessa", "tébessa", "تبسة"] },
  { number: 13, names: ["tlemcen", "تلمسان"] },
  { number: 14, names: ["tiaret", "تيارت"] },
  { number: 15, names: ["tizi ouzou", "tizi-ouzou", "تيزي وزو"] },
  { number: 16, names: ["algiers", "alger", "algier", "الجزائر", "el djazair", "el djazaïr"] },
  { number: 17, names: ["djelfa", "الجلفة"] },
  { number: 18, names: ["jijel", "جيجل"] },
  { number: 19, names: ["setif", "sétif", "سطيف"] },
  { number: 20, names: ["saida", "saïda", "سعيدة"] },
  { number: 21, names: ["skikda", "سكيكدة"] },
  { number: 22, names: ["sidi bel abbes", "sidi bel-abbès", "sidi bel abbès", "سيدي بلعباس"] },
  { number: 23, names: ["annaba", "عنابة"] },
  { number: 24, names: ["guelma", "قالمة"] },
  { number: 25, names: ["constantine", "قسنطينة"] },
  { number: 26, names: ["medea", "médéa", "المدية"] },
  { number: 27, names: ["mostaganem", "مستغانم"] },
  { number: 28, names: ["msila", "m'sila", "المسيلة"] },
  { number: 29, names: ["mascara", "معسكر"] },
  { number: 30, names: ["ouargla", "ورقلة"] },
  { number: 31, names: ["oran", "وهران"] },
  { number: 32, names: ["el bayadh", "البيض"] },
  { number: 33, names: ["illizi", "إليزي"] },
  { number: 34, names: ["bordj bou arreridj", "bordj bou-arréridj", "برج بوعريريج"] },
  { number: 35, names: ["boumerdes", "boumerdès", "بومرداس"] },
  { number: 36, names: ["el tarf", "الطارف"] },
  { number: 37, names: ["tindouf", "تندوف"] },
  { number: 38, names: ["tissemsilt", "تيسمسيلت"] },
  { number: 39, names: ["el oued", "الوادي"] },
  { number: 40, names: ["khenchela", "خنشلة"] },
  { number: 41, names: ["souk ahras", "سوق أهراس"] },
  { number: 42, names: ["tipaza", "tipasa", "تيبازة"] },
  { number: 43, names: ["mila", "ميلة"] },
  { number: 44, names: ["ain defla", "aïn defla", "عين الدفلى"] },
  { number: 45, names: ["naama", "naâma", "النعامة"] },
  { number: 46, names: ["ain temouchent", "aïn témouchent", "عين تموشنت"] },
  { number: 47, names: ["ghardaia", "ghardaïa", "غرداية"] },
  { number: 48, names: ["relizane", "غليزان"] },
  { number: 49, names: ["timimoun", "تيميمون"] },
  { number: 50, names: ["bordj badji mokhtar", "برج باجي مختار"] },
  { number: 51, names: ["ouled djellal", "أولاد جلال"] },
  { number: 52, names: ["beni abbes", "béni abbès", "بني عباس"] },
  { number: 53, names: ["in salah", "عين صالح"] },
  { number: 54, names: ["in guezzam", "عين قزام"] },
  { number: 55, names: ["touggourt", "تقرت"] },
  { number: 56, names: ["djanet", "جانت"] },
  { number: 57, names: ["el meghaier", "el m'ghair", "المغير"] },
  { number: 58, names: ["el meniaa", "el ménia", "المنيعة"] },
];

// Flat name → number map, built once at module load.
const NAME_TO_WILAYA: Map<string, number> = (() => {
  const m = new Map<string, number>();
  for (const w of WILAYAS) {
    for (const n of w.names) m.set(n, w.number);
  }
  return m;
})();

function normalize(city: string): string {
  return city
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[.,()\-–—]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Best-effort mapping from a free-text city string to its Algerian wilaya
 * number. Falls back through several strategies:
 *   1. Leading digits ("16 algiers", "16-algiers")
 *   2. Exact normalized match against known wilaya name variants
 *   3. Substring match — the input contains a wilaya name
 * Returns `null` when nothing matches (typically foreign leads).
 */
export function cityToWilayaNumber(city: string | null | undefined): number | null {
  if (!city) return null;
  const norm = normalize(city);
  if (!norm) return null;

  const numeric = norm.match(/^(\d{1,2})\b/);
  if (numeric) {
    const n = Number(numeric[1]);
    if (n >= 1 && n <= 58) return n;
  }

  const exact = NAME_TO_WILAYA.get(norm);
  if (exact) return exact;

  for (const [name, num] of NAME_TO_WILAYA) {
    if (norm.includes(name)) return num;
  }

  return null;
}
