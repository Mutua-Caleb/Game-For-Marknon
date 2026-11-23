/**
 * French Atelier — British Year 6 & Year 7 French Immersion Data
 * Includes La Francophonie Atlas stops, gender-coded vocabulary,
 * audio-first drills, and tactile word-tile sentence builders.
 */

export const FRANCOPHONIE_STOPS = [
  {
    id: 'paris',
    city: 'Paris',
    country: 'France',
    theme: 'Au Café & Polite Essentials',
    mapX: 49,
    mapY: 31,
    fact: 'Paris has over 30,000 boulangeries and cafés — polite forms like "je voudrais" and "s’il vous plaît" are essential everywhere.'
  },
  {
    id: 'montreal',
    city: 'Montréal',
    country: 'Québec, Canada',
    theme: 'School & Daily Routine',
    mapX: 25,
    mapY: 32,
    fact: 'Montréal is the largest French-speaking city in North America and famous for its underground winter walkways.'
  },
  {
    id: 'dakar',
    city: 'Dakar',
    country: 'Sénégal',
    theme: 'Family, Food & Descriptions',
    mapX: 43,
    mapY: 56,
    fact: 'Dakar sits on Africa’s westernmost peninsula and blends vibrant West African culture with everyday French.'
  },
  {
    id: 'geneve',
    city: 'Genève',
    country: 'Suisse',
    theme: 'Time, Travel & Town',
    mapX: 52,
    mapY: 34,
    fact: 'In Switzerland and Belgium, 70 is "septante" and 90 is "nonante" — though British exams teach "soixante-dix" and "quatre-vingt-dix"!'
  },
  {
    id: 'bruxelles',
    city: 'Bruxelles',
    country: 'Belgique',
    theme: 'Hobbies & Opinions',
    mapX: 50,
    mapY: 28,
    fact: 'Brussels is the capital of European diplomacy and the birthplace of Tintin comic books (les bandes dessinées).'
  },
  {
    id: 'marrakech',
    city: 'Marrakech',
    country: 'Maroc',
    theme: 'Power Verbs (être, avoir, aller, faire)',
    mapX: 46,
    mapY: 44,
    fact: 'French is widely spoken across Morocco’s markets, universities, and arts festivals alongside Arabic and Amazigh.'
  }
]

export const FRENCH_VOCAB_DECK = [
  // Paris — Au Café
  {
    id: 'fr_c1',
    stopId: 'paris',
    french: 'le petit-déjeuner',
    english: 'breakfast',
    gender: 'm',
    phonetic: 'luh puh-tee day-zhuh-nay',
    exampleFr: 'Je prends le petit-déjeuner à sept heures.',
    exampleEn: 'I have breakfast at seven o’clock.',
    memoryHook: 'Literally "the little un-fasting" (déjeuner = lunch).'
  },
  {
    id: 'fr_c2',
    stopId: 'paris',
    french: 'la boulangerie',
    english: 'the bakery',
    gender: 'f',
    phonetic: 'lah boo-lahn-zhuh-ree',
    exampleFr: 'Nous allons à la boulangerie ce matin.',
    exampleEn: 'We are going to the bakery this morning.',
    memoryHook: 'Shop endings in -erie are almost always feminine (la).'
  },
  {
    id: 'fr_c3',
    stopId: 'paris',
    french: 'l’addition',
    english: 'the bill (at a café)',
    gender: 'f',
    phonetic: 'lah-dee-syohn',
    exampleFr: 'L’addition, s’il vous plaît.',
    exampleEn: 'The bill, please.',
    memoryHook: 'Words ending in -tion are consistently feminine in French!'
  },
  // Montréal — School
  {
    id: 'fr_s1',
    stopId: 'montreal',
    french: 'la bibliothèque',
    english: 'the library',
    gender: 'f',
    phonetic: 'lah bee-blee-oh-tek',
    exampleFr: 'Je lis un roman à la bibliothèque.',
    exampleEn: 'I am reading a novel at the library.',
    memoryHook: 'False friend alert: "la librairie" is bookshop, "la bibliothèque" is library.'
  },
  {
    id: 'fr_s2',
    stopId: 'montreal',
    french: 'les devoirs',
    english: 'homework',
    gender: 'p',
    phonetic: 'lay duh-vwahr',
    exampleFr: 'Je fais toujours mes devoirs avant le dîner.',
    exampleEn: 'I always do my homework before dinner.',
    memoryHook: 'Always plural in French ("les devoirs" — duties/tasks).'
  },
  {
    id: 'fr_s3',
    stopId: 'montreal',
    french: 'le collège',
    english: 'secondary school (ages 11–15)',
    gender: 'm',
    phonetic: 'luh koh-lezh',
    exampleFr: 'Mon collège commence à huit heures et demie.',
    exampleEn: 'My secondary school starts at half past eight.',
    memoryHook: 'In France, "le collège" is Year 7–10, not university!'
  },
  // Dakar — Family & Descriptions
  {
    id: 'fr_d1',
    stopId: 'dakar',
    french: 'la maison',
    english: 'the house',
    gender: 'f',
    phonetic: 'lah meh-zohn',
    exampleFr: 'Notre maison a un grand jardin.',
    exampleEn: 'Our house has a big garden.',
    memoryHook: 'Think of English "mansion" — feminine (la maison).'
  },
  {
    id: 'fr_d2',
    stopId: 'dakar',
    french: 'le frère',
    english: 'the brother',
    gender: 'm',
    phonetic: 'luh frehr',
    exampleFr: 'Mon frère est très sportif et drôle.',
    exampleEn: 'My brother is very sporty and funny.',
    memoryHook: 'Links to English "fraternal" (brotherly).'
  },
  {
    id: 'fr_d3',
    stopId: 'dakar',
    french: 'la nourriture',
    english: 'food',
    gender: 'f',
    phonetic: 'lah noo-ree-toor',
    exampleFr: 'La nourriture sénégalaise est délicieuse.',
    exampleEn: 'Senegalese food is delicious.',
    memoryHook: 'Links to English "nourish" — feminine (la).'
  },
  // Genève — Time & Town
  {
    id: 'fr_g1',
    stopId: 'geneve',
    french: 'la gare',
    english: 'the train station',
    gender: 'f',
    phonetic: 'lah gahr',
    exampleFr: 'Le train part de la gare à midi.',
    exampleEn: 'The train leaves the station at midday.',
    memoryHook: 'Think of "Gare du Nord" in Paris — feminine (la gare).'
  },
  {
    id: 'fr_g2',
    stopId: 'geneve',
    french: 'le temps',
    english: 'time / the weather',
    gender: 'm',
    phonetic: 'luh tahn',
    exampleFr: 'Quel temps fait-il aujourd’hui ?',
    exampleEn: 'What is the weather like today?',
    memoryHook: 'Same word for both time and weather — masculine (le).'
  },
  // Bruxelles — Hobbies & Opinions
  {
    id: 'fr_b1',
    stopId: 'bruxelles',
    french: 'la lecture',
    english: 'reading',
    gender: 'f',
    phonetic: 'lah lek-toor',
    exampleFr: 'J’aime beaucoup la lecture parce que c’est relaxant.',
    exampleEn: 'I really like reading because it is relaxing.',
    memoryHook: 'Careful! "La lecture" means reading, NOT a university lecture.'
  },
  {
    id: 'fr_b2',
    stopId: 'bruxelles',
    french: 'le dessin',
    english: 'drawing / art',
    gender: 'm',
    phonetic: 'luh deh-sahn',
    exampleFr: 'Je préfère le dessin à la natation.',
    exampleEn: 'I prefer drawing to swimming.',
    memoryHook: 'Links to English "design" — masculine (le dessin).'
  },
  // Marrakech — Power Verbs
  {
    id: 'fr_m1',
    stopId: 'marrakech',
    french: 'nous allons',
    english: 'we go / we are going (aller)',
    gender: null,
    phonetic: 'noo zah-lohn',
    exampleFr: 'Nous allons au marché ensemble.',
    exampleEn: 'We are going to the market together.',
    memoryHook: 'Notice the smooth liaison sound: "noo-Z-allons".'
  },
  {
    id: 'fr_m2',
    stopId: 'marrakech',
    french: 'ils font',
    english: 'they do / they make (faire)',
    gender: null,
    phonetic: 'eel fohn',
    exampleFr: 'Ils font du vélo dans le parc.',
    exampleEn: 'They go cycling in the park.',
    memoryHook: 'Present tense of faire: je fais, tu fais, il fait, nous faisons, vous faites, ils font.'
  },
  {
    id: 'fr_m3',
    stopId: 'marrakech',
    french: 'j’ai',
    english: 'I have (avoir)',
    gender: null,
    phonetic: 'zhay',
    exampleFr: 'J’ai douze ans et j’ai un chien.',
    exampleEn: 'I am twelve years old and I have a dog.',
    memoryHook: 'Remember: French uses avoir (to have) for age, hunger, and thirst!'
  }
]

export const FRENCH_SENTENCE_BUILDERS = [
  {
    id: 'fs_01',
    topic: 'Polite Ordering',
    english: 'I would like a croissant, please.',
    answerTokens: ['Je', 'voudrais', 'un', 'croissant,', 's’il', 'vous', 'plaît.'],
    distractors: ['une', 'suis'],
    grammarNote: '"Je voudrais" is the polite conditional ("I would like"), and "croissant" is masculine (un).'
  },
  {
    id: 'fs_02',
    topic: 'Negatives (ne...pas)',
    english: 'I do not like spinach.',
    answerTokens: ['Je', 'n’aime', 'pas', 'les', 'épinards.'],
    distractors: ['ne', 'le'],
    grammarNote: 'Wrap "ne...pas" around the verb; "ne" shortens to "n’" before a vowel (aime).'
  },
  {
    id: 'fs_03',
    topic: 'Adjective Agreement & Order',
    english: 'We live in a big white house.',
    answerTokens: ['Nous', 'habitons', 'dans', 'une', 'grande', 'maison', 'blanche.'],
    distractors: ['un', 'grand', 'blanc'],
    grammarNote: 'Size adjectives like "grande" go BEFORE the noun; colour adjectives like "blanche" go AFTER — and both add -e for feminine "maison"!'
  },
  {
    id: 'fs_04',
    topic: 'Present Tense (aller)',
    english: 'We are going to the library today.',
    answerTokens: ['Nous', 'allons', 'à', 'la', 'bibliothèque', 'aujourd’hui.'],
    distractors: ['le', 'vont'],
    grammarNote: '"Nous allons" = we go; "bibliothèque" is feminine singular, so "to the" is "à la".'
  },
  {
    id: 'fs_05',
    topic: 'Opinions & Reasons',
    english: 'I love French because it is interesting.',
    answerTokens: ['J’adore', 'le', 'français', 'parce', 'que', 'c’est', 'intéressant.'],
    distractors: ['la', 'mais'],
    grammarNote: 'Using "parce que c’est..." (because it is...) earns top marks in Year 7 British French writing & speaking!'
  },
  {
    id: 'fs_06',
    topic: 'Age & avoir',
    english: 'My sister is eleven years old.',
    answerTokens: ['Ma', 'sœur', 'a', 'onze', 'ans.'],
    distractors: ['est', 'Mon'],
    grammarNote: 'Use "ma" for feminine "sœur" and "a" (from avoir) — never "est" — when stating someone’s age.'
  }
]
