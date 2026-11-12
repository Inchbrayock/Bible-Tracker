import type { BibleDivision, CanonBook } from '../types/bible';

export interface DivisionMeta {
  id: BibleDivision;
  label: string;
  shortLabel: string;
  testament: 'OT' | 'NT';
  colorVar: string;
}

export const DIVISIONS: DivisionMeta[] = [
  {
    id: 'pentateuch',
    label: 'Law & Pentateuch',
    shortLabel: 'Law',
    testament: 'OT',
    colorVar: 'var(--div-pentateuch)',
  },
  {
    id: 'history',
    label: 'Historical Books',
    shortLabel: 'History',
    testament: 'OT',
    colorVar: 'var(--div-history)',
  },
  {
    id: 'wisdom',
    label: 'Wisdom & Poetry',
    shortLabel: 'Wisdom',
    testament: 'OT',
    colorVar: 'var(--div-wisdom)',
  },
  {
    id: 'major-prophets',
    label: 'Major Prophets',
    shortLabel: 'Major Prophets',
    testament: 'OT',
    colorVar: 'var(--div-major)',
  },
  {
    id: 'minor-prophets',
    label: 'Minor Prophets',
    shortLabel: 'Minor Prophets',
    testament: 'OT',
    colorVar: 'var(--div-minor)',
  },
  {
    id: 'gospels-acts',
    label: 'Gospels & Acts',
    shortLabel: 'Gospels & Acts',
    testament: 'NT',
    colorVar: 'var(--div-gospels)',
  },
  {
    id: 'pauline',
    label: 'Pauline Epistles',
    shortLabel: 'Pauline',
    testament: 'NT',
    colorVar: 'var(--div-pauline)',
  },
  {
    id: 'general-revelation',
    label: 'General Epistles & Revelation',
    shortLabel: 'General & Rev',
    testament: 'NT',
    colorVar: 'var(--div-general)',
  },
];

export const DIVISION_META_BY_ID: Record<BibleDivision, DivisionMeta> = Object.fromEntries(
  DIVISIONS.map((d) => [d.id, d])
) as Record<BibleDivision, DivisionMeta>;

export const BIBLE_BOOKS: CanonBook[] = [
  // Old Testament — Pentateuch (5 books, 187 chapters)
  { id: 'genesis', order: 1, name: 'Genesis', shortName: 'Gen', testament: 'OT', division: 'pentateuch', chapterCount: 50, theme: 'Creation, covenant promise, and the patriarchs' },
  { id: 'exodus', order: 2, name: 'Exodus', shortName: 'Exod', testament: 'OT', division: 'pentateuch', chapterCount: 40, theme: 'Deliverance from Egypt, Sinai, and the tabernacle' },
  { id: 'leviticus', order: 3, name: 'Leviticus', shortName: 'Lev', testament: 'OT', division: 'pentateuch', chapterCount: 27, theme: 'Holiness, sacrifice, and dwelling with a holy God' },
  { id: 'numbers', order: 4, name: 'Numbers', shortName: 'Num', testament: 'OT', division: 'pentateuch', chapterCount: 36, theme: 'Wilderness wanderings and faithful perseverance' },
  { id: 'deuteronomy', order: 5, name: 'Deuteronomy', shortName: 'Deut', testament: 'OT', division: 'pentateuch', chapterCount: 34, theme: 'Covenant renewal on the plains of Moab' },

  // Old Testament — Historical Books (12 books, 249 chapters)
  { id: 'joshua', order: 6, name: 'Joshua', shortName: 'Josh', testament: 'OT', division: 'history', chapterCount: 24, theme: 'Entering and inheriting the promised land' },
  { id: 'judges', order: 7, name: 'Judges', shortName: 'Judg', testament: 'OT', division: 'history', chapterCount: 21, theme: 'Cycles of rebellion, distress, and imperfect deliverers' },
  { id: 'ruth', order: 8, name: 'Ruth', shortName: 'Ruth', testament: 'OT', division: 'history', chapterCount: 4, theme: 'Steadfast loyalty and kinsman redemption' },
  { id: '1-samuel', order: 9, name: '1 Samuel', shortName: '1 Sam', testament: 'OT', division: 'history', chapterCount: 31, theme: 'From Samuel and Saul to the rise of David' },
  { id: '2-samuel', order: 10, name: '2 Samuel', shortName: '2 Sam', testament: 'OT', division: 'history', chapterCount: 24, theme: 'David’s reign, covenant promise, and costly grace' },
  { id: '1-kings', order: 11, name: '1 Kings', shortName: '1 Kgs', testament: 'OT', division: 'history', chapterCount: 22, theme: 'Solomon’s temple, divided kingdoms, and Elijah' },
  { id: '2-kings', order: 12, name: '2 Kings', shortName: '2 Kgs', testament: 'OT', division: 'history', chapterCount: 25, theme: 'Elisha, prophetic warnings, and exile' },
  { id: '1-chronicles', order: 13, name: '1 Chronicles', shortName: '1 Chr', testament: 'OT', division: 'history', chapterCount: 29, theme: 'Genealogy of grace and worship around David’s throne' },
  { id: '2-chronicles', order: 14, name: '2 Chronicles', shortName: '2 Chr', testament: 'OT', division: 'history', chapterCount: 36, theme: 'Temple worship, reform kings, and hope of restoration' },
  { id: 'ezra', order: 15, name: 'Ezra', shortName: 'Ezra', testament: 'OT', division: 'history', chapterCount: 10, theme: 'Return from exile and rebuilding the temple' },
  { id: 'nehemiah', order: 16, name: 'Nehemiah', shortName: 'Neh', testament: 'OT', division: 'history', chapterCount: 13, theme: 'Rebuilding Jerusalem’s walls and renewing covenant life' },
  { id: 'esther', order: 17, name: 'Esther', shortName: 'Esth', testament: 'OT', division: 'history', chapterCount: 10, theme: 'Unseen providence protecting a scattered people' },

  // Old Testament — Wisdom & Poetry (5 books, 243 chapters)
  { id: 'job', order: 18, name: 'Job', shortName: 'Job', testament: 'OT', division: 'wisdom', chapterCount: 42, theme: 'Suffering, mystery, and encountering the Creator' },
  { id: 'psalms', order: 19, name: 'Psalms', shortName: 'Ps', testament: 'OT', division: 'wisdom', chapterCount: 150, theme: 'Lament, praise, trust, and Israel’s prayer book' },
  { id: 'proverbs', order: 20, name: 'Proverbs', shortName: 'Prov', testament: 'OT', division: 'wisdom', chapterCount: 31, theme: 'Walking wisely in the fear of the Lord' },
  { id: 'ecclesiastes', order: 21, name: 'Ecclesiastes', shortName: 'Eccl', testament: 'OT', division: 'wisdom', chapterCount: 12, theme: 'Fleeting vapor, honest questions, and reverent joy' },
  { id: 'song-of-solomon', order: 22, name: 'Song of Solomon', shortName: 'Song', testament: 'OT', division: 'wisdom', chapterCount: 8, theme: 'Delight, longing, and covenant love' },

  // Old Testament — Major Prophets (5 books, 183 chapters)
  { id: 'isaiah', order: 23, name: 'Isaiah', shortName: 'Isa', testament: 'OT', division: 'major-prophets', chapterCount: 66, theme: 'The Holy One of Israel, the Suffering Servant, and new creation' },
  { id: 'jeremiah', order: 24, name: 'Jeremiah', shortName: 'Jer', testament: 'OT', division: 'major-prophets', chapterCount: 52, theme: 'Tearful warnings and the promise of a new covenant' },
  { id: 'lamentations', order: 25, name: 'Lamentations', shortName: 'Lam', testament: 'OT', division: 'major-prophets', chapterCount: 5, theme: 'Grief over Jerusalem anchored in steadfast mercies' },
  { id: 'ezekiel', order: 26, name: 'Ezekiel', shortName: 'Ezek', testament: 'OT', division: 'major-prophets', chapterCount: 48, theme: 'Glory departing, dry bones living, and a restored temple' },
  { id: 'daniel', order: 27, name: 'Daniel', shortName: 'Dan', testament: 'OT', division: 'major-prophets', chapterCount: 12, theme: 'Faithfulness in exile and an everlasting kingdom' },

  // Old Testament — Minor Prophets (12 books, 67 chapters)
  { id: 'hosea', order: 28, name: 'Hosea', shortName: 'Hos', testament: 'OT', division: 'minor-prophets', chapterCount: 14, theme: 'Relentless, redeeming love for an unfaithful bride' },
  { id: 'joel', order: 29, name: 'Joel', shortName: 'Joel', testament: 'OT', division: 'minor-prophets', chapterCount: 3, theme: 'Day of the Lord and the outpouring of the Spirit' },
  { id: 'amos', order: 30, name: 'Amos', shortName: 'Amos', testament: 'OT', division: 'minor-prophets', chapterCount: 9, theme: 'Justice rolling down like waters' },
  { id: 'obadiah', order: 31, name: 'Obadiah', shortName: 'Obad', testament: 'OT', division: 'minor-prophets', chapterCount: 1, theme: 'Pride humbled and the Lord’s sovereign rule' },
  { id: 'jonah', order: 32, name: 'Jonah', shortName: 'Jonah', testament: 'OT', division: 'minor-prophets', chapterCount: 4, theme: 'Compassion wider than our borders' },
  { id: 'micah', order: 33, name: 'Micah', shortName: 'Mic', testament: 'OT', division: 'minor-prophets', chapterCount: 7, theme: 'Do justice, love mercy, walk humbly, look to Bethlehem' },
  { id: 'nahum', order: 34, name: 'Nahum', shortName: 'Nah', testament: 'OT', division: 'minor-prophets', chapterCount: 3, theme: 'A refuge for the oppressed against empires of cruelty' },
  { id: 'habakkuk', order: 35, name: 'Habakkuk', shortName: 'Hab', testament: 'OT', division: 'minor-prophets', chapterCount: 3, theme: 'Wrestling in prayer until faith sings' },
  { id: 'zephaniah', order: 36, name: 'Zephaniah', shortName: 'Zeph', testament: 'OT', division: 'minor-prophets', chapterCount: 3, theme: 'Purifying judgment and God rejoicing over his people' },
  { id: 'haggai', order: 37, name: 'Haggai', shortName: 'Hag', testament: 'OT', division: 'minor-prophets', chapterCount: 2, theme: 'Putting first things first in rebuilding God’s house' },
  { id: 'zechariah', order: 38, name: 'Zechariah', shortName: 'Zech', testament: 'OT', division: 'minor-prophets', chapterCount: 14, theme: 'Visions of restoration and the humble coming King' },
  { id: 'malachi', order: 39, name: 'Malachi', shortName: 'Mal', testament: 'OT', division: 'minor-prophets', chapterCount: 4, theme: 'Wholehearted devotion awaiting the Sun of Righteousness' },

  // New Testament — Gospels & Acts (5 books, 117 chapters)
  { id: 'matthew', order: 40, name: 'Matthew', shortName: 'Matt', testament: 'NT', division: 'gospels-acts', chapterCount: 28, theme: 'Jesus the Messiah, King and fulfillment of Scripture' },
  { id: 'mark', order: 41, name: 'Mark', shortName: 'Mark', testament: 'NT', division: 'gospels-acts', chapterCount: 16, theme: 'Urgent portrait of the Servant Son of God' },
  { id: 'luke', order: 42, name: 'Luke', shortName: 'Luke', testament: 'NT', division: 'gospels-acts', chapterCount: 24, theme: 'Good news of great joy for the outsider and the lost' },
  { id: 'john', order: 43, name: 'John', shortName: 'John', testament: 'NT', division: 'gospels-acts', chapterCount: 21, theme: 'The Word made flesh, seven signs, and eternal life' },
  { id: 'acts', order: 44, name: 'Acts', shortName: 'Acts', testament: 'NT', division: 'gospels-acts', chapterCount: 28, theme: 'The risen Jesus building his church by the Spirit' },

  // New Testament — Pauline Epistles (13 books, 87 chapters)
  { id: 'romans', order: 45, name: 'Romans', shortName: 'Rom', testament: 'NT', division: 'pauline', chapterCount: 16, theme: 'The righteousness of God revealed by faith' },
  { id: '1-corinthians', order: 46, name: '1 Corinthians', shortName: '1 Cor', testament: 'NT', division: 'pauline', chapterCount: 16, theme: 'Cross-shaped unity, holiness, love, and resurrection' },
  { id: '2-corinthians', order: 47, name: '2 Corinthians', shortName: '2 Cor', testament: 'NT', division: 'pauline', chapterCount: 13, theme: 'Treasure in jars of clay and strength in weakness' },
  { id: 'galatians', order: 48, name: 'Galatians', shortName: 'Gal', testament: 'NT', division: 'pauline', chapterCount: 6, theme: 'Freedom in Christ and walking by the Spirit' },
  { id: 'ephesians', order: 49, name: 'Ephesians', shortName: 'Eph', testament: 'NT', division: 'pauline', chapterCount: 6, theme: 'Unsearchable riches in Christ and a united household' },
  { id: 'philippians', order: 50, name: 'Philippians', shortName: 'Phil', testament: 'NT', division: 'pauline', chapterCount: 4, theme: 'Partnership in the gospel and unshakable joy' },
  { id: 'colossians', order: 51, name: 'Colossians', shortName: 'Col', testament: 'NT', division: 'pauline', chapterCount: 4, theme: 'The supremacy and sufficiency of Christ in all things' },
  { id: '1-thessalonians', order: 52, name: '1 Thessalonians', shortName: '1 Thess', testament: 'NT', division: 'pauline', chapterCount: 5, theme: 'Faith, love, and hopeful watchfulness' },
  { id: '2-thessalonians', order: 53, name: '2 Thessalonians', shortName: '2 Thess', testament: 'NT', division: 'pauline', chapterCount: 3, theme: 'Steadfast endurance until the Lord’s return' },
  { id: '1-timothy', order: 54, name: '1 Timothy', shortName: '1 Tim', testament: 'NT', division: 'pauline', chapterCount: 6, theme: 'Sound doctrine and caring for God’s household' },
  { id: '2-timothy', order: 55, name: '2 Timothy', shortName: '2 Tim', testament: 'NT', division: 'pauline', chapterCount: 4, theme: 'Guarding the gospel deposit and finishing the race' },
  { id: 'titus', order: 56, name: 'Titus', shortName: 'Titus', testament: 'NT', division: 'pauline', chapterCount: 3, theme: 'Grace that trains us for good works' },
  { id: 'philemon', order: 57, name: 'Philemon', shortName: 'Phlm', testament: 'NT', division: 'pauline', chapterCount: 1, theme: 'Reconciliation and brotherhood transformed by the gospel' },

  // New Testament — General Epistles & Revelation (9 books, 56 chapters)
  { id: 'hebrews', order: 58, name: 'Hebrews', shortName: 'Heb', testament: 'NT', division: 'general-revelation', chapterCount: 13, theme: 'Jesus our great High Priest and better covenant' },
  { id: 'james', order: 59, name: 'James', shortName: 'Jas', testament: 'NT', division: 'general-revelation', chapterCount: 5, theme: 'Living faith expressed in wisdom, speech, and mercy' },
  { id: '1-peter', order: 60, name: '1 Peter', shortName: '1 Pet', testament: 'NT', division: 'general-revelation', chapterCount: 5, theme: 'Living hope for exiles walking through trial' },
  { id: '2-peter', order: 61, name: '2 Peter', shortName: '2 Pet', testament: 'NT', division: 'general-revelation', chapterCount: 3, theme: 'Growing in grace and holding fast to the apostolic word' },
  { id: '1-john', order: 62, name: '1 John', shortName: '1 John', testament: 'NT', division: 'general-revelation', chapterCount: 5, theme: 'Walking in light, truth, and the love of God' },
  { id: '2-john', order: 63, name: '2 John', shortName: '2 John', testament: 'NT', division: 'general-revelation', chapterCount: 1, theme: 'Walking in truth and love with discernment' },
  { id: '3-john', order: 64, name: '3 John', shortName: '3 John', testament: 'NT', division: 'general-revelation', chapterCount: 1, theme: 'Generous hospitality for gospel workers' },
  { id: 'jude', order: 65, name: 'Jude', shortName: 'Jude', testament: 'NT', division: 'general-revelation', chapterCount: 1, theme: 'Contending for the faith kept by a faithful Savior' },
  { id: 'revelation', order: 66, name: 'Revelation', shortName: 'Rev', testament: 'NT', division: 'general-revelation', chapterCount: 22, theme: 'The Lamb on the throne and all things made new' },
];

export const BOOKS_BY_ID: Record<string, CanonBook> = Object.fromEntries(
  BIBLE_BOOKS.map((book) => [book.id, book])
);

export const TOTAL_CANON_CHAPTERS = BIBLE_BOOKS.reduce(
  (sum, book) => sum + book.chapterCount,
  0
);

export const OT_TOTAL_CHAPTERS = BIBLE_BOOKS.filter(
  (b) => b.testament === 'OT'
).reduce((sum, b) => sum + b.chapterCount, 0);

export const NT_TOTAL_CHAPTERS = BIBLE_BOOKS.filter(
  (b) => b.testament === 'NT'
).reduce((sum, b) => sum + b.chapterCount, 0);
