type Language = {
  code: string;
  name_native: string;
  greeting: string;
  [key: `name_${string}`]: string;
};

export type LanguageCode = string & { readonly __brand: 'LanguageCode' };

export const languages: Language[] = [
  {
    code: 'aa',
    name_en: 'Afar',
    name_ja: 'アファル語',
    name_native: 'Afaraf',
    greeting: 'Nagaadah!',
  },
  {
    code: 'ab',
    name_en: 'Abkhazian',
    name_ja: 'アブハズ語',
    name_native: 'Аҧсуа бызшәа',
    greeting: 'Бзиа убеит!',
  },
  {
    code: 'ae',
    name_en: 'Avestan',
    name_ja: 'アヴェスター語',
    name_native: 'Avestā',
    greeting: 'Nəmō!',
  },
  {
    code: 'af',
    name_en: 'Afrikaans',
    name_ja: 'アフリカーンス語',
    name_native: 'Afrikaans',
    greeting: 'Hallo!',
  },
  {
    code: 'ak',
    name_en: 'Akan',
    name_ja: 'アカン語',
    name_native: 'Akan',
    greeting: 'Ɛte sɛn?',
  },
  {
    code: 'am',
    name_en: 'Amharic',
    name_ja: 'アムハラ語',
    name_native: 'አማርኛ',
    greeting: 'ሰላም!',
  },
  {
    code: 'an',
    name_en: 'Aragonese',
    name_ja: 'アラゴン語',
    name_native: 'Aragonés',
    greeting: 'Buenas!',
  },
  {
    code: 'ar',
    name_en: 'Arabic',
    name_ja: 'アラビア語',
    name_native: 'العربية',
    greeting: 'مرحبا!',
  },
  {
    code: 'as',
    name_en: 'Assamese',
    name_ja: 'アッサム語',
    name_native: 'অসমীয়া',
    greeting: 'নমস্কাৰ!',
  },
  {
    code: 'av',
    name_en: 'Avaric',
    name_ja: 'アヴァル語',
    name_native: 'Магӏарул мацӏ',
    greeting: 'Ассаламу алайкум!',
  },
  {
    code: 'ay',
    name_en: 'Aymara',
    name_ja: 'アイマラ語',
    name_native: 'Aymar aru',
    greeting: 'Kamisaraki!',
  },
  {
    code: 'az',
    name_en: 'Azerbaijani',
    name_ja: 'アゼルバイジャン語',
    name_native: 'Azərbaycan',
    greeting: 'Salam!',
  },
  {
    code: 'ba',
    name_en: 'Bashkir',
    name_ja: 'バシキール語',
    name_native: 'Башҡорт теле',
    greeting: 'Сәләм!',
  },
  {
    code: 'be',
    name_en: 'Belarusian',
    name_ja: 'ベラルーシ語',
    name_native: 'Беларуская',
    greeting: 'Прывітанне!',
  },
  {
    code: 'bg',
    name_en: 'Bulgarian',
    name_ja: 'ブルガリア語',
    name_native: 'Български',
    greeting: 'Здравей!',
  },
  {
    code: 'bh',
    name_en: 'Bihari',
    name_ja: 'ビハール語',
    name_native: 'बिहारी',
    greeting: 'प्रणाम!',
  },
  {
    code: 'bi',
    name_en: 'Bislama',
    name_ja: 'ビスラマ語',
    name_native: 'Bislama',
    greeting: 'Halo!',
  },
  {
    code: 'bm',
    name_en: 'Bambara',
    name_ja: 'バンバラ語',
    name_native: 'Bamanakan',
    greeting: 'I ni ce!',
  },
  {
    code: 'bn',
    name_en: 'Bengali',
    name_ja: 'ベンガル語',
    name_native: 'বাংলা',
    greeting: 'নমস্কার!',
  },
  {
    code: 'bo',
    name_en: 'Tibetan',
    name_ja: 'チベット語',
    name_native: 'བོད་སྐད་',
    greeting: 'བཀྲ་ཤིས་བདེ་ལེགས།',
  },
  {
    code: 'br',
    name_en: 'Breton',
    name_ja: 'ブルトン語',
    name_native: 'Brezhoneg',
    greeting: 'Demat!',
  },
  {
    code: 'bs',
    name_en: 'Bosnian',
    name_ja: 'ボスニア語',
    name_native: 'Bosanski',
    greeting: 'Zdravo!',
  },
  {
    code: 'ca',
    name_en: 'Catalan',
    name_ja: 'カタルーニャ語',
    name_native: 'Català',
    greeting: 'Hola!',
  },
  {
    code: 'ce',
    name_en: 'Chechen',
    name_ja: 'チェチェン語',
    name_native: 'Нохчийн',
    greeting: 'Маршалла!',
  },
  {
    code: 'ch',
    name_en: 'Chamorro',
    name_ja: 'チャモロ語',
    name_native: 'Chamoru',
    greeting: 'Håfa adai!',
  },
  {
    code: 'co',
    name_en: 'Corsican',
    name_ja: 'コルシカ語',
    name_native: 'Corsu',
    greeting: 'Bonghjornu!',
  },
  {
    code: 'cr',
    name_en: 'Cree',
    name_ja: 'クリー語',
    name_native: 'ᓀᐦᐃᔭᐍᐏᐣ',
    greeting: 'ᑕᓂᓯ!',
  },
  {
    code: 'cs',
    name_en: 'Czech',
    name_ja: 'チェコ語',
    name_native: 'Čeština',
    greeting: 'Ahoj!',
  },
  {
    code: 'cu',
    name_en: 'Old Church Slavonic',
    name_ja: '古代教会スラヴ語',
    name_native: 'Словѣньскъ',
    greeting: 'Здравъ!',
  },
  {
    code: 'cv',
    name_en: 'Chuvash',
    name_ja: 'チュヴァシ語',
    name_native: 'Чӑваш',
    greeting: 'Салам!',
  },
  {
    code: 'cy',
    name_en: 'Welsh',
    name_ja: 'ウェールズ語',
    name_native: 'Cymraeg',
    greeting: 'Helo!',
  },
  {
    code: 'da',
    name_en: 'Danish',
    name_ja: 'デンマーク語',
    name_native: 'Dansk',
    greeting: 'Hej!',
  },
  {
    code: 'de',
    name_en: 'German',
    name_ja: 'ドイツ語',
    name_native: 'Deutsch',
    greeting: 'Hallo!',
  },
  {
    code: 'dv',
    name_en: 'Divehi',
    name_ja: 'ディベヒ語',
    name_native: 'ދިވެހި',
    greeting: 'ސަލާމް!',
  },
  {
    code: 'dz',
    name_en: 'Dzongkha',
    name_ja: 'ゾンカ語',
    name_native: 'རྫོང་ཁ',
    greeting: 'སྐུ་གཟུགས་བཟང་པོ།',
  },
  {
    code: 'ee',
    name_en: 'Ewe',
    name_ja: 'エウェ語',
    name_native: 'Eʋegbe',
    greeting: 'Woezɔ!',
  },
  {
    code: 'el',
    name_en: 'Greek',
    name_ja: 'ギリシャ語',
    name_native: 'Ελληνικά',
    greeting: 'Γεια σου!',
  },
  {
    code: 'en',
    name_en: 'English',
    name_ja: '英語',
    name_native: 'English',
    greeting: 'Hello!',
  },
  {
    code: 'eo',
    name_en: 'Esperanto',
    name_ja: 'エスペラント',
    name_native: 'Esperanto',
    greeting: 'Saluton!',
  },
  {
    code: 'es',
    name_en: 'Spanish',
    name_ja: 'スペイン語',
    name_native: 'Español',
    greeting: '¡Hola!',
  },
  {
    code: 'et',
    name_en: 'Estonian',
    name_ja: 'エストニア語',
    name_native: 'Eesti',
    greeting: 'Tere!',
  },
  {
    code: 'eu',
    name_en: 'Basque',
    name_ja: 'バスク語',
    name_native: 'Euskara',
    greeting: 'Kaixo!',
  },
  {
    code: 'fa',
    name_en: 'Persian',
    name_ja: 'ペルシア語',
    name_native: 'فارسی',
    greeting: 'سلام!',
  },
  {
    code: 'ff',
    name_en: 'Fula',
    name_ja: 'フラ語',
    name_native: 'Fulfulde',
    greeting: 'Hono mbaɗaa?',
  },
  {
    code: 'fi',
    name_en: 'Finnish',
    name_ja: 'フィンランド語',
    name_native: 'Suomi',
    greeting: 'Moi!',
  },
  {
    code: 'fj',
    name_en: 'Fijian',
    name_ja: 'フィジー語',
    name_native: 'Vosa Vakaviti',
    greeting: 'Bula!',
  },
  {
    code: 'fo',
    name_en: 'Faroese',
    name_ja: 'フェロー語',
    name_native: 'Føroyskt',
    greeting: 'Halló!',
  },
  {
    code: 'fr',
    name_en: 'French',
    name_ja: 'フランス語',
    name_native: 'Français',
    greeting: 'Bonjour !',
  },
  {
    code: 'fy',
    name_en: 'Frisian',
    name_ja: 'フリジア語',
    name_native: 'Frysk',
    greeting: 'Hoi!',
  },
  {
    code: 'ga',
    name_en: 'Irish',
    name_ja: 'アイルランド語',
    name_native: 'Gaeilge',
    greeting: 'Dia dhuit!',
  },
  {
    code: 'gd',
    name_en: 'Gaelic (Scottish)',
    name_ja: 'スコットランド・ゲール語',
    name_native: 'Gàidhlig',
    greeting: 'Halò!',
  },
  {
    code: 'gl',
    name_en: 'Galician',
    name_ja: 'ガリシア語',
    name_native: 'Galego',
    greeting: 'Ola!',
  },
  {
    code: 'gn',
    name_en: 'Guarani',
    name_ja: 'グアラニー語',
    name_native: "Avañe'ẽ",
    greeting: 'Maitei!',
  },
  {
    code: 'gu',
    name_en: 'Gujarati',
    name_ja: 'グジャラート語',
    name_native: 'ગુજરાતી',
    greeting: 'નમસ્તે!',
  },
  {
    code: 'gv',
    name_en: 'Manx',
    name_ja: 'マン島語',
    name_native: 'Gaelg',
    greeting: "Kys t'ou?",
  },
  {
    code: 'ha',
    name_en: 'Hausa',
    name_ja: 'ハウサ語',
    name_native: 'Hausa',
    greeting: 'Sannu!',
  },
  {
    code: 'he',
    name_en: 'Hebrew',
    name_ja: 'ヘブライ語',
    name_native: 'עברית',
    greeting: 'שלום!',
  },
  {
    code: 'hi',
    name_en: 'Hindi',
    name_ja: 'ヒンディー語',
    name_native: 'हिन्दी',
    greeting: 'नमस्ते!',
  },
  {
    code: 'ho',
    name_en: 'Hiri Motu',
    name_ja: 'ヒリモトゥ語',
    name_native: 'Hiri Motu',
    greeting: 'Oi namo?',
  },
  {
    code: 'hr',
    name_en: 'Croatian',
    name_ja: 'クロアチア語',
    name_native: 'Hrvatski',
    greeting: 'Bok!',
  },
  {
    code: 'ht',
    name_en: 'Haitian',
    name_ja: 'ハイチ語',
    name_native: 'Kreyòl ayisyen',
    greeting: 'Bonjou!',
  },
  {
    code: 'hu',
    name_en: 'Hungarian',
    name_ja: 'ハンガリー語',
    name_native: 'Magyar',
    greeting: 'Szia!',
  },
  {
    code: 'hy',
    name_en: 'Armenian',
    name_ja: 'アルメニア語',
    name_native: 'Հայերեն',
    greeting: 'Բարեւ!',
  },
  {
    code: 'hz',
    name_en: 'Herero',
    name_ja: 'ヘレロ語',
    name_native: 'Otjiherero',
    greeting: 'Perivi!',
  },
  {
    code: 'ia',
    name_en: 'Interlingua',
    name_ja: 'インターリングア',
    name_native: 'Interlingua',
    greeting: 'Salute!',
  },
  {
    code: 'id',
    name_en: 'Indonesian',
    name_ja: 'インドネシア語',
    name_native: 'Bahasa Indonesia',
    greeting: 'Halo!',
  },
  {
    code: 'ie',
    name_en: 'Interlingue',
    name_ja: 'インターリング',
    name_native: 'Interlingue',
    greeting: 'Bon die!',
  },
  {
    code: 'ig',
    name_en: 'Igbo',
    name_ja: 'イボ語',
    name_native: 'Igbo',
    greeting: 'Ndeewo!',
  },
  {
    code: 'ii',
    name_en: 'Sichuan Yi',
    name_ja: '四川彝語',
    name_native: 'ꆈꌠꉙ',
    greeting: 'ꆏꉾ！',
  },
  {
    code: 'ik',
    name_en: 'Inupiaq',
    name_ja: 'イヌピアック語',
    name_native: 'Iñupiaq',
    greeting: 'Haluu!',
  },
  {
    code: 'io',
    name_en: 'Ido',
    name_ja: 'イド語',
    name_native: 'Ido',
    greeting: 'Saluto!',
  },
  {
    code: 'is',
    name_en: 'Icelandic',
    name_ja: 'アイスランド語',
    name_native: 'Íslenska',
    greeting: 'Halló!',
  },
  {
    code: 'it',
    name_en: 'Italian',
    name_ja: 'イタリア語',
    name_native: 'Italiano',
    greeting: 'Ciao!',
  },
  {
    code: 'iu',
    name_en: 'Inuktitut',
    name_ja: 'イヌクティトゥット語',
    name_native: 'ᐃᓄᒃᑎᑐᑦ',
    greeting: 'ᐊᐃ!',
  },
  {
    code: 'ja',
    name_en: 'Japanese',
    name_ja: '日本語',
    name_native: '日本語',
    greeting: 'こんにちは！',
  },
  {
    code: 'jv',
    name_en: 'Javanese',
    name_ja: 'ジャワ語',
    name_native: 'Jawa',
    greeting: 'Halo!',
  },
  {
    code: 'ka',
    name_en: 'Georgian',
    name_ja: 'グルジア語',
    name_native: 'Ქართული',
    greeting: 'გამარჯობა!',
  },
  {
    code: 'kg',
    name_en: 'Kongo',
    name_ja: 'コンゴ語',
    name_native: 'Kikongo',
    greeting: 'Mbote!',
  },
  {
    code: 'ki',
    name_en: 'Kikuyu',
    name_ja: 'キクユ語',
    name_native: 'Gikuyu',
    greeting: 'Wĩ mwega!',
  },
  {
    code: 'kj',
    name_en: 'Kuanyama',
    name_ja: 'クワニャマ語',
    name_native: 'Kuanyama',
    greeting: 'Ongaipi?',
  },
  {
    code: 'kk',
    name_en: 'Kazakh',
    name_ja: 'カザフ語',
    name_native: 'Қазақ тілі',
    greeting: 'Сәлем!',
  },
  {
    code: 'kl',
    name_en: 'Kalaallisut',
    name_ja: 'グリーンランド語',
    name_native: 'Kalaallisut',
    greeting: 'Aluu!',
  },
  {
    code: 'km',
    name_en: 'Khmer',
    name_ja: 'クメール語',
    name_native: 'ខ្មែរ',
    greeting: 'សួស្តី!',
  },
  {
    code: 'kn',
    name_en: 'Kannada',
    name_ja: 'カンナダ語',
    name_native: 'ಕನ್ನಡ',
    greeting: 'ನಮಸ್ಕಾರ!',
  },
  {
    code: 'ko',
    name_en: 'Korean',
    name_ja: '韓国語/朝鮮語',
    name_native: '한국어',
    greeting: '안녕하세요!',
  },
  {
    code: 'kr',
    name_en: 'Kanuri',
    name_ja: 'カヌリ語',
    name_native: 'Kanuri',
    greeting: 'Barka!',
  },
  {
    code: 'ks',
    name_en: 'Kashmiri',
    name_ja: 'カシミール語',
    name_native: 'کٲشُر',
    greeting: 'آداب!',
  },
  {
    code: 'ku',
    name_en: 'Kurdish',
    name_ja: 'クルド語',
    name_native: 'Kurdî',
    greeting: 'Silav!',
  },
  {
    code: 'kv',
    name_en: 'Komi',
    name_ja: 'コミ語',
    name_native: 'Коми кыв',
    greeting: 'Бур лун!',
  },
  {
    code: 'kw',
    name_en: 'Cornish',
    name_ja: 'コーンウォール語',
    name_native: 'Kernewek',
    greeting: 'Dydh da!',
  },
  {
    code: 'ky',
    name_en: 'Kirghiz',
    name_ja: 'キルギス語',
    name_native: 'Кыргызча',
    greeting: 'Салам!',
  },
  {
    code: 'la',
    name_en: 'Latin',
    name_ja: 'ラテン語',
    name_native: 'Latina',
    greeting: 'Salve!',
  },
  {
    code: 'lb',
    name_en: 'Luxembourgish',
    name_ja: 'ルクセンブルク語',
    name_native: 'Lëtzebuergesch',
    greeting: 'Moien!',
  },
  {
    code: 'lg',
    name_en: 'Ganda',
    name_ja: 'ガンダ語',
    name_native: 'Luganda',
    greeting: 'Oli otya!',
  },
  {
    code: 'li',
    name_en: 'Limburgish',
    name_ja: 'リンブルフ語',
    name_native: 'Limburgs',
    greeting: 'Hoi!',
  },
  {
    code: 'ln',
    name_en: 'Lingala',
    name_ja: 'リンガラ語',
    name_native: 'Lingála',
    greeting: 'Mbote!',
  },
  {
    code: 'lo',
    name_en: 'Lao',
    name_ja: 'ラオ語',
    name_native: 'ລາວ',
    greeting: 'ສະບາຍດີ!',
  },
  {
    code: 'lt',
    name_en: 'Lithuanian',
    name_ja: 'リトアニア語',
    name_native: 'Lietuvių',
    greeting: 'Labas!',
  },
  {
    code: 'lu',
    name_en: 'Luba-Katanga',
    name_ja: 'ルバ・カタンガ語',
    name_native: 'Tshiluba',
    greeting: 'Moyo!',
  },
  {
    code: 'lv',
    name_en: 'Latvian',
    name_ja: 'ラトビア語',
    name_native: 'Latviešu',
    greeting: 'Sveiki!',
  },
  {
    code: 'mg',
    name_en: 'Malagasy',
    name_ja: 'マダガスカル語',
    name_native: 'Malagasy',
    greeting: 'Salama!',
  },
  {
    code: 'mh',
    name_en: 'Marshallese',
    name_ja: 'マーシャル語',
    name_native: 'Kajin M̧ajeļ',
    greeting: 'Iokwe!',
  },
  {
    code: 'mi',
    name_en: 'Maori',
    name_ja: 'マオリ語',
    name_native: 'Māori',
    greeting: 'Kia ora!',
  },
  {
    code: 'mk',
    name_en: 'Macedonian',
    name_ja: 'マケドニア語',
    name_native: 'Македонски',
    greeting: 'Здраво!',
  },
  {
    code: 'ml',
    name_en: 'Malayalam',
    name_ja: 'マラヤーラム語',
    name_native: 'മലയാളം',
    greeting: 'നമസ്കാരം!',
  },
  {
    code: 'mn',
    name_en: 'Mongolian',
    name_ja: 'モンゴル語',
    name_native: 'Монгол',
    greeting: 'Сайн уу!',
  },
  {
    code: 'mr',
    name_en: 'Marathi',
    name_ja: 'マラーティー語',
    name_native: 'मराठी',
    greeting: 'नमस्कार!',
  },
  {
    code: 'ms',
    name_en: 'Malay',
    name_ja: 'マレー語',
    name_native: 'Bahasa Melayu',
    greeting: 'Helo!',
  },
  {
    code: 'mt',
    name_en: 'Maltese',
    name_ja: 'マルタ語',
    name_native: 'Malti',
    greeting: 'Bonġu!',
  },
  {
    code: 'my',
    name_en: 'Burmese',
    name_ja: 'ビルマ語',
    name_native: 'မြန်မာဘာသာ',
    greeting: 'မင်္ဂလာပါ!',
  },
  {
    code: 'na',
    name_en: 'Nauru',
    name_ja: 'ナウル語',
    name_native: 'Dorerin Naoero',
    greeting: 'Ekamawir omo!',
  },
  {
    code: 'nb',
    name_en: 'Norwegian Bokmål',
    name_ja: 'ノルウェー語ブークモール',
    name_native: 'Norsk bokmål',
    greeting: 'Hei!',
  },
  {
    code: 'nd',
    name_en: 'Ndebele, North',
    name_ja: '北ンデベレ語',
    name_native: 'IsiNdebele',
    greeting: 'Salibonani!',
  },
  {
    code: 'ne',
    name_en: 'Nepali',
    name_ja: 'ネパール語',
    name_native: 'नेपाली',
    greeting: 'नमस्ते!',
  },
  {
    code: 'ng',
    name_en: 'Ndonga',
    name_ja: 'ンドンガ語',
    name_native: 'Oshindonga',
    greeting: 'Ongiini?',
  },
  {
    code: 'nl',
    name_en: 'Dutch',
    name_ja: 'オランダ語',
    name_native: 'Nederlands',
    greeting: 'Hallo!',
  },
  {
    code: 'nn',
    name_en: 'Norwegian Nynorsk',
    name_ja: 'ノルウェー語ニーノシュク',
    name_native: 'Norsk nynorsk',
    greeting: 'Hei!',
  },
  {
    code: 'no',
    name_en: 'Norwegian',
    name_ja: 'ノルウェー語',
    name_native: 'Norsk',
    greeting: 'Hei!',
  },
  {
    code: 'nr',
    name_en: 'Ndebele, South',
    name_ja: '南ンデベレ語',
    name_native: 'IsiNdebele seSewula',
    greeting: 'Lotjhani!',
  },
  {
    code: 'nv',
    name_en: 'Navajo',
    name_ja: 'ナバホ語',
    name_native: 'Diné bizaad',
    greeting: "Yá'át'ééh!",
  },
  {
    code: 'ny',
    name_en: 'Chichewa',
    name_ja: 'チェワ語',
    name_native: 'Chichewa',
    greeting: 'Moni!',
  },
  {
    code: 'oc',
    name_en: 'Occitan',
    name_ja: 'オック語',
    name_native: 'Occitan',
    greeting: 'Bonjorn!',
  },
  {
    code: 'oj',
    name_en: 'Ojibwa',
    name_ja: 'オジブウェー語',
    name_native: 'ᐊᓂᔑᓈᐯᒧᐎᓐ',
    greeting: 'Boozhoo!',
  },
  {
    code: 'om',
    name_en: 'Oromo',
    name_ja: 'オロモ語',
    name_native: 'Oromoo',
    greeting: 'Akkam!',
  },
  {
    code: 'or',
    name_en: 'Oriya',
    name_ja: 'オリヤー語',
    name_native: 'ଓଡ଼ିଆ',
    greeting: 'ନମସ୍କାର!',
  },
  {
    code: 'os',
    name_en: 'Ossetian',
    name_ja: 'オセチア語',
    name_native: 'Ирон',
    greeting: 'Дӕ бон хорз!',
  },
  {
    code: 'pa',
    name_en: 'Panjabi',
    name_ja: 'パンジャブ語',
    name_native: 'ਪੰਜਾਬੀ',
    greeting: 'ਸਤ ਸ੍ਰੀ ਅਕਾਲ!',
  },
  {
    code: 'pi',
    name_en: 'Pali',
    name_ja: 'パーリ語',
    name_native: 'पालि',
    greeting: 'सोत्थि होतु!',
  },
  {
    code: 'pl',
    name_en: 'Polish',
    name_ja: 'ポーランド語',
    name_native: 'Polski',
    greeting: 'Cześć!',
  },
  {
    code: 'ps',
    name_en: 'Pushto',
    name_ja: 'パシュトー語',
    name_native: 'پښتو',
    greeting: 'سلام!',
  },
  {
    code: 'pt',
    name_en: 'Portuguese',
    name_ja: 'ポルトガル語',
    name_native: 'Português',
    greeting: 'Olá!',
  },
  {
    code: 'qu',
    name_en: 'Quechua',
    name_ja: 'ケチュア語',
    name_native: 'Runasimi',
    greeting: 'Allillanchu!',
  },
  {
    code: 'rm',
    name_en: 'Romansh',
    name_ja: 'ロマンシュ語',
    name_native: 'Rumantsch',
    greeting: 'Bun di!',
  },
  {
    code: 'rn',
    name_en: 'Rundi',
    name_ja: 'ルンディ語',
    name_native: 'Ikirundi',
    greeting: 'Amahoro!',
  },
  {
    code: 'ro',
    name_en: 'Romanian',
    name_ja: 'ルーマニア語',
    name_native: 'Română',
    greeting: 'Salut!',
  },
  {
    code: 'ru',
    name_en: 'Russian',
    name_ja: 'ロシア語',
    name_native: 'Русский',
    greeting: 'Привет!',
  },
  {
    code: 'rw',
    name_en: 'Kinyarwanda',
    name_ja: 'ルワンダ語',
    name_native: 'Ikinyarwanda',
    greeting: 'Muraho!',
  },
  {
    code: 'sa',
    name_en: 'Sanskrit',
    name_ja: 'サンスクリット',
    name_native: 'संस्कृतम्',
    greeting: 'नमो नमः!',
  },
  {
    code: 'sc',
    name_en: 'Sardinian',
    name_ja: 'サルデーニャ語',
    name_native: 'Sardu',
    greeting: 'Salude!',
  },
  {
    code: 'sd',
    name_en: 'Sindhi',
    name_ja: 'シンド語',
    name_native: 'سنڌي',
    greeting: 'سلام!',
  },
  {
    code: 'se',
    name_en: 'Northern Sami',
    name_ja: '北サーミ語',
    name_native: 'Davvisámegiella',
    greeting: 'Bures!',
  },
  {
    code: 'sg',
    name_en: 'Sango',
    name_ja: 'サンゴ語',
    name_native: 'Sängö',
    greeting: 'Balao!',
  },
  {
    code: 'si',
    name_en: 'Sinhala',
    name_ja: 'シンハラ語',
    name_native: 'සිංහල',
    greeting: 'ආයුබෝවන්!',
  },
  {
    code: 'sk',
    name_en: 'Slovak',
    name_ja: 'スロバキア語',
    name_native: 'Slovenčina',
    greeting: 'Ahoj!',
  },
  {
    code: 'sl',
    name_en: 'Slovenian',
    name_ja: 'スロベニア語',
    name_native: 'Slovenščina',
    greeting: 'Živjo!',
  },
  {
    code: 'sm',
    name_en: 'Samoan',
    name_ja: 'サモア語',
    name_native: 'Gagana Samoa',
    greeting: 'Talofa!',
  },
  {
    code: 'sn',
    name_en: 'Shona',
    name_ja: 'ショナ語',
    name_native: 'ChiShona',
    greeting: 'Mhoro!',
  },
  {
    code: 'so',
    name_en: 'Somali',
    name_ja: 'ソマリ語',
    name_native: 'Soomaali',
    greeting: 'Salaan!',
  },
  {
    code: 'sq',
    name_en: 'Albanian',
    name_ja: 'アルバニア語',
    name_native: 'Shqip',
    greeting: 'Përshëndetje!',
  },
  {
    code: 'sr',
    name_en: 'Serbian',
    name_ja: 'セルビア語',
    name_native: 'Српски',
    greeting: 'Здраво!',
  },
  {
    code: 'ss',
    name_en: 'Swati',
    name_ja: 'スワティ語',
    name_native: 'SiSwati',
    greeting: 'Sawubona!',
  },
  {
    code: 'st',
    name_en: 'Sotho, Southern',
    name_ja: '南ソト語',
    name_native: 'Sesotho',
    greeting: 'Lumela!',
  },
  {
    code: 'su',
    name_en: 'Sundanese',
    name_ja: 'スンダ語',
    name_native: 'Basa Sunda',
    greeting: 'Sampurasun!',
  },
  {
    code: 'sv',
    name_en: 'Swedish',
    name_ja: 'スウェーデン語',
    name_native: 'Svenska',
    greeting: 'Hej!',
  },
  {
    code: 'sw',
    name_en: 'Swahili',
    name_ja: 'スワヒリ語',
    name_native: 'Kiswahili',
    greeting: 'Habari!',
  },
  {
    code: 'ta',
    name_en: 'Tamil',
    name_ja: 'タミル語',
    name_native: 'தமிழ்',
    greeting: 'வணக்கம்!',
  },
  {
    code: 'te',
    name_en: 'Telugu',
    name_ja: 'テルグ語',
    name_native: 'తెలుగు',
    greeting: 'నమస్కారం!',
  },
  {
    code: 'tg',
    name_en: 'Tajik',
    name_ja: 'タジク語',
    name_native: 'Тоҷикӣ',
    greeting: 'Салом!',
  },
  {
    code: 'th',
    name_en: 'Thai',
    name_ja: 'タイ語',
    name_native: 'ไทย',
    greeting: 'สวัสดี!',
  },
  {
    code: 'ti',
    name_en: 'Tigrinya',
    name_ja: 'ティグリニャ語',
    name_native: 'ትግርኛ',
    greeting: 'ሰላም!',
  },
  {
    code: 'tk',
    name_en: 'Turkmen',
    name_ja: 'トルクメン語',
    name_native: 'Türkmen dili',
    greeting: 'Salam!',
  },
  {
    code: 'tl',
    name_en: 'Tagalog',
    name_ja: 'タガログ語',
    name_native: 'Tagalog',
    greeting: 'Kamusta!',
  },
  {
    code: 'tn',
    name_en: 'Tswana',
    name_ja: 'ツワナ語',
    name_native: 'Setswana',
    greeting: 'Dumela!',
  },
  {
    code: 'to',
    name_en: 'Tonga (Tonga Islands)',
    name_ja: 'トンガ語',
    name_native: 'Lea fakatonga',
    greeting: 'Mālō e lelei!',
  },
  {
    code: 'tr',
    name_en: 'Turkish',
    name_ja: 'トルコ語',
    name_native: 'Türkçe',
    greeting: 'Merhaba!',
  },
  {
    code: 'ts',
    name_en: 'Tsonga',
    name_ja: 'ツォンガ語',
    name_native: 'Xitsonga',
    greeting: 'Avuxeni!',
  },
  {
    code: 'tt',
    name_en: 'Tatar',
    name_ja: 'タタール語',
    name_native: 'Татар',
    greeting: 'Исәнмесез!',
  },
  {
    code: 'tw',
    name_en: 'Twi',
    name_ja: 'トウィ語',
    name_native: 'Twi',
    greeting: 'Ɛte sɛn?',
  },
  {
    code: 'ty',
    name_en: 'Tahitian',
    name_ja: 'タヒチ語',
    name_native: 'Reo Tahiti',
    greeting: 'Ia ora na!',
  },
  {
    code: 'ug',
    name_en: 'Uighur',
    name_ja: 'ウイグル語',
    name_native: 'ئۇيغۇرچە',
    greeting: 'ياخشىمۇسىز!',
  },
  {
    code: 'uk',
    name_en: 'Ukrainian',
    name_ja: 'ウクライナ語',
    name_native: 'Українська',
    greeting: 'Привіт!',
  },
  {
    code: 'ur',
    name_en: 'Urdu',
    name_ja: 'ウルドゥー語',
    name_native: 'اردو',
    greeting: 'السلام علیکم!',
  },
  {
    code: 'uz',
    name_en: 'Uzbek',
    name_ja: 'ウズベク語',
    name_native: 'O‘zbek',
    greeting: 'Salom!',
  },
  {
    code: 've',
    name_en: 'Venda',
    name_ja: 'ヴェンダ語',
    name_native: 'Tshivenḓa',
    greeting: 'Ndaa!',
  },
  {
    code: 'vi',
    name_en: 'Vietnamese',
    name_ja: 'ベトナム語',
    name_native: 'Tiếng Việt',
    greeting: 'Xin chào!',
  },
  {
    code: 'vo',
    name_en: 'Volapük',
    name_ja: 'ヴォラピュク語',
    name_native: 'Volapük',
    greeting: 'Glidis!',
  },
  {
    code: 'wa',
    name_en: 'Walloon',
    name_ja: 'ワロン語',
    name_native: 'Walon',
    greeting: 'Bondjou!',
  },
  {
    code: 'wo',
    name_en: 'Wolof',
    name_ja: 'ウォロフ語',
    name_native: 'Wolof',
    greeting: 'Nanga def!',
  },
  {
    code: 'xh',
    name_en: 'Xhosa',
    name_ja: 'コサ語',
    name_native: 'IsiXhosa',
    greeting: 'Molo!',
  },
  {
    code: 'yi',
    name_en: 'Yiddish',
    name_ja: 'イディッシュ語',
    name_native: 'ייִדיש',
    greeting: 'העלא!',
  },
  {
    code: 'yo',
    name_en: 'Yoruba',
    name_ja: 'ヨルバ語',
    name_native: 'Yorùbá',
    greeting: 'Báwo!',
  },
  {
    code: 'za',
    name_en: 'Zhuang',
    name_ja: 'チワン語',
    name_native: 'Vahcuengh',
    greeting: 'Mwngz ndei!',
  },
  {
    code: 'zh',
    name_en: 'Chinese',
    name_ja: '中国語',
    name_native: '中文',
    greeting: '你好！',
  },
  {
    code: 'zu',
    name_en: 'Zulu',
    name_ja: 'ズールー語',
    name_native: 'IsiZulu',
    greeting: 'Sawubona!',
  },
];

type LanguageOption = { label: string; value: string };

const getLocalizedName = (item: Language, locale: string): string => {
  const nameKey = `name_${locale}` as `name_${string}`;
  return item[nameKey] ?? item.name_en;
};

export const languageOptions = (locale: string): LanguageOption[] => {
  return languages
    .map((lang) => ({
      label: getLocalizedName(lang, locale),
      value: lang.code,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
};

export const getLanguageName = (code: string, locale: string): string => {
  const lang = languages.find((l) => l.code === code);
  return lang ? getLocalizedName(lang, locale) : code;
};

export const getNativeLanguageName = (code: string): string => {
  const lang = languages.find((l) => l.code === code);
  return lang?.name_native ?? lang?.name_en ?? code;
};

export const getLanguageGreeting = (code: string): string =>
  languages.find((l) => l.code === code)?.greeting ?? '';

export const isValidLanguageCode = (code: string): code is LanguageCode => {
  return (
    typeof code === 'string' &&
    code.length === 2 &&
    /^[a-z]{2}$/.test(code) &&
    languages.some((lang) => lang.code === code)
  );
};

export enum Proficiency {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
  NATIVE_LEVEL = 'native-level',
}

type ProficiencyLevel = {
  value: Proficiency;
  name_en: string;
  name_ja: string;
};

const proficiencyLevels: ProficiencyLevel[] = [
  { value: Proficiency.BEGINNER, name_en: 'Beginner', name_ja: '初級' },
  {
    value: Proficiency.INTERMEDIATE,
    name_en: 'Intermediate',
    name_ja: '中級',
  },
  { value: Proficiency.ADVANCED, name_en: 'Advanced', name_ja: '上級' },
  {
    value: Proficiency.NATIVE_LEVEL,
    name_en: 'Native-level',
    name_ja: 'ネイティブレベル',
  },
];

export const proficiencyOptions = (locale: string): LanguageOption[] => {
  const nameKey = `name_${locale}` as 'name_en' | 'name_ja';
  const fallbackKey = 'name_en';

  return proficiencyLevels.map((level) => ({
    label: level[nameKey] ?? level[fallbackKey],
    value: level.value,
  }));
};

export const getAllProficiencyValues = (): Proficiency[] => {
  return Object.values(Proficiency);
};

export const isValidProficiency = (value: string): value is Proficiency => {
  return Object.values(Proficiency).includes(value as Proficiency);
};

export const getProficiencyTranslationKey = (
  proficiency: Proficiency | string,
): string => {
  const proficiencyMap: Record<Proficiency, string> = {
    [Proficiency.BEGINNER]: 'proficiencyOptionBeginner',
    [Proficiency.INTERMEDIATE]: 'proficiencyOptionIntermediate',
    [Proficiency.ADVANCED]: 'proficiencyOptionAdvanced',
    [Proficiency.NATIVE_LEVEL]: 'proficiencyOptionNativeLevel',
  };

  if (isValidProficiency(proficiency)) {
    return proficiencyMap[proficiency];
  }

  return 'proficiencyOptionBeginner';
};

export const capitalizeLanguageCode = (code: string): string => {
  return code.toUpperCase();
};

export const availabilityValues = [
  'weeknights',
  'weekends',
  'weekday_mornings',
  'flexible',
] as const;

export type Availability = (typeof availabilityValues)[number];

export const isValidAvailability = (value: string): value is Availability =>
  (availabilityValues as readonly string[]).includes(value);

export type IANATimezone = string & { readonly __brand: 'IANATimezone' };

export const isValidIANATimezone = (
  timezone: string,
): timezone is IANATimezone => {
  if (!timezone || typeof timezone !== 'string') return false;

  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
};

const TIMEZONE_ABBREVIATION_FALLBACK: Record<string, string> = {
  'Asia/Tokyo': 'JST',
  'Asia/Shanghai': 'CST',
  'Asia/Hong_Kong': 'HKT',
  'Asia/Singapore': 'SGT',
  'Asia/Seoul': 'KST',
  'Asia/Kolkata': 'IST',
  'Asia/Dubai': 'GST',
  'Asia/Bangkok': 'ICT',
  'Asia/Jakarta': 'WIB',
  'Asia/Manila': 'PHT',
  'Asia/Kuala_Lumpur': 'MYT',
  'Asia/Taipei': 'TST',
  'Asia/Dhaka': 'BDT',
  'Asia/Karachi': 'PKT',
  'Asia/Riyadh': 'AST',
  'Asia/Baghdad': 'AST',
  'Asia/Jerusalem': 'IST',
  'Europe/Moscow': 'MSK',
  'Europe/Istanbul': 'TRT',
  'America/Mexico_City': 'CST',
  'America/Sao_Paulo': 'BRT',
  'America/Argentina/Buenos_Aires': 'ART',
  'America/Lima': 'PET',
  'America/Bogota': 'COT',
  'America/Santiago': 'CLT',
  'America/Caracas': 'VET',
  'America/Montevideo': 'UYT',
  'Africa/Cairo': 'EET',
  'Africa/Johannesburg': 'SAST',
  'Africa/Lagos': 'WAT',
  'Africa/Nairobi': 'EAT',
  'Australia/Sydney': 'AEDT',
  'Australia/Melbourne': 'AEDT',
  'Australia/Brisbane': 'AEST',
  'Australia/Perth': 'AWST',
  'Pacific/Auckland': 'NZDT',
  'Pacific/Honolulu': 'HST',
};

export const formatTimezone = (timezone: IANATimezone | string): string => {
  if (!timezone || typeof timezone !== 'string') return '';

  if (timezone.startsWith('GMT')) {
    return timezone;
  }

  try {
    const now = new Date();

    let cleanedOffset = '';

    try {
      const offsetFormatter = new Intl.DateTimeFormat('en', {
        timeZone: timezone,
        timeZoneName: 'longOffset',
      });
      const offsetParts = offsetFormatter.formatToParts(now);
      const offsetString =
        offsetParts.find((part) => part.type === 'timeZoneName')?.value || '';

      if (offsetString) {
        cleanedOffset = offsetString.replace(':00', '');
      }
    } catch {}

    const tzFormatter = new Intl.DateTimeFormat('en', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZoneName: 'short',
    });

    const tzParts = tzFormatter.formatToParts(now);

    if (!cleanedOffset || cleanedOffset === timezone) {
      const utcFormatter = new Intl.DateTimeFormat('en', {
        timeZone: 'UTC',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });

      const utcParts = utcFormatter.formatToParts(now);

      const utcHour = parseInt(
        utcParts.find((p) => p.type === 'hour')?.value || '0',
        10,
      );
      const tzHour = parseInt(
        tzParts.find((p) => p.type === 'hour')?.value || '0',
        10,
      );

      const utcMinute = parseInt(
        utcParts.find((p) => p.type === 'minute')?.value || '0',
        10,
      );
      const tzMinute = parseInt(
        tzParts.find((p) => p.type === 'minute')?.value || '0',
        10,
      );

      let offsetMinutes = tzHour * 60 + tzMinute - (utcHour * 60 + utcMinute);

      if (offsetMinutes > 12 * 60) offsetMinutes -= 24 * 60;
      if (offsetMinutes < -12 * 60) offsetMinutes += 24 * 60;

      const offsetHours = Math.floor(offsetMinutes / 60);
      const remainingMinutes = offsetMinutes % 60;

      const offsetSign = offsetHours >= 0 ? '+' : '';
      if (remainingMinutes === 0) {
        cleanedOffset = `GMT${offsetSign}${offsetHours}`;
      } else {
        cleanedOffset = `GMT${offsetSign}${Math.abs(offsetHours)}:${Math.abs(remainingMinutes)}`;
      }
    }

    let abbreviation = tzParts.find(
      (part) => part.type === 'timeZoneName',
    )?.value;

    if (
      !abbreviation ||
      abbreviation.startsWith('GMT') ||
      abbreviation.length < 2 ||
      !/^[a-zA-Z]+$/.test(abbreviation)
    ) {
      abbreviation = TIMEZONE_ABBREVIATION_FALLBACK[timezone];
    }

    if (
      abbreviation &&
      !abbreviation.startsWith('GMT') &&
      abbreviation.length >= 2 &&
      abbreviation.length <= 5 &&
      /^[a-zA-Z]+$/.test(abbreviation)
    ) {
      return `${cleanedOffset} (${abbreviation})`;
    }

    return cleanedOffset;
  } catch {
    return timezone;
  }
};

export type TimeFormat = '12hr' | '24hr';

export const formatCurrentTime = (
  timezone: IANATimezone | string,
  format: TimeFormat = '24hr',
  locale = 'en',
): string => {
  if (!timezone || typeof timezone !== 'string') return '';

  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat(locale, {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: format === '12hr' ? 'h12' : 'h23',
    });

    return formatter.format(now);
  } catch {
    return '';
  }
};
