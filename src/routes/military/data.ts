/**
 * data.ts — U.S. Overseas Persistent Military Bases
 *
 * SOURCES:
 * [1] Persistent bases & named installations:
 *     CRS Report R48123, "U.S. Overseas Basing: Background and Issues for Congress"
 *     July 10, 2024 — Appendix A (country summaries) & Appendix B (Table B-1, 128 sites)
 *     https://www.congress.gov/crs-product/R48123
 *     Persistent = continuously used by DOD for ≥15 years with US operational control.
 *     CRS identified 68 persistent bases across 27 countries.
 *
 * [2] Active-duty personnel (permanently assigned):
 *     Defense Manpower Data Center (DMDC),
 *     "Military and Civilian Personnel by Service/Agency by State/Country"
 *     As of March 31, 2026
 *     https://dwp.dmdc.osd.mil/dwp/app/dod-data-reports/workforce-reports
 *     NOTE: DMDC counts permanently assigned only. Rotational forces excluded.
 *     Kuwait (540 DMDC → ~13,500 operational), Qatar (179 → ~10,000),
 *     Djibouti (20 → ~4,000) differ substantially due to rotational sourcing.
 *
 * [3] Base coordinates: derived from BSR FY2024 city data + open-source
 *     geographic records of named installations.
 */

export interface Base {
  id: string;
  name: string;
  lat: number;
  lng: number;
  component: 'Army' | 'Navy' | 'Air Force' | 'Marine Corps' | 'Multi';
  city: string;
}

export interface CountryEntry {
  id: string;
  country: string;
  flagCode: string;          // ISO 3166-1 alpha-2 lowercase
  lat: number;               // country centroid — arc endpoint + polygon trigger
  lng: number;
  color: string;
  troops: number;            // DMDC March 2026, permanently assigned [2]
  persistentBases: number;   // CRS R48123 count [1]
  since: number;             // year of earliest persistent base establishment
  region: 'Indo-Pacific' | 'Europe' | 'Middle East' | 'Africa' | 'Americas';
  bases: Base[];             // precise base locations for Level 2 detail view [1][3]
}

export const ORIGIN = { lat: 38.89, lng: -77.03 }; // Washington DC

// ─────────────────────────────────────────────────────────────────────────────
//  INDO-PACIFIC  (24 persistent bases — CRS R48123)
// ─────────────────────────────────────────────────────────────────────────────

const JAPAN: CountryEntry = {
  id: 'japan', country: 'Japan', flagCode: 'jp',
  lat: 36.2, lng: 138.3, color: '#bc002d',
  troops: 54891, persistentBases: 13, since: 1945,
  region: 'Indo-Pacific',
  bases: [
    { id: 'camp-zama',     name: 'Camp Zama',                      lat: 35.535,  lng: 139.390, component: 'Army',         city: 'Sagamihara' },
    { id: 'yokosuka',      name: 'US Fleet Activities Yokosuka',   lat: 35.278,  lng: 139.667, component: 'Navy',         city: 'Yokosuka' },
    { id: 'sasebo',        name: 'US Fleet Activities Sasebo',     lat: 33.162,  lng: 129.719, component: 'Navy',         city: 'Sasebo' },
    { id: 'atsugi',        name: 'Naval Air Facility Atsugi',      lat: 35.455,  lng: 139.449, component: 'Navy',         city: 'Atsugi' },
    { id: 'iwakuni',       name: 'MCAS Iwakuni',                   lat: 34.144,  lng: 132.236, component: 'Marine Corps', city: 'Iwakuni' },
    { id: 'yokota',        name: 'Yokota Air Base',                lat: 35.749,  lng: 139.349, component: 'Air Force',    city: 'Fussa, Tokyo' },
    { id: 'misawa',        name: 'Misawa Air Base',                lat: 40.703,  lng: 141.368, component: 'Air Force',    city: 'Misawa' },
    { id: 'kure',          name: 'Kure Pier 6',                    lat: 34.224,  lng: 132.568, component: 'Army',         city: 'Kure' },
    { id: 'torii',         name: 'USAG Okinawa (Torii Station)',   lat: 26.442,  lng: 127.803, component: 'Army',         city: 'Yomitan, Okinawa' },
    { id: 'white-beach',   name: 'US Fleet Activities Okinawa',    lat: 26.270,  lng: 127.983, component: 'Navy',         city: 'White Beach, Okinawa' },
    { id: 'camp-foster',   name: 'MCB Camp Butler (Camp Foster)',  lat: 26.307,  lng: 127.785, component: 'Marine Corps', city: 'Chatan, Okinawa' },
    { id: 'futenma',       name: 'MCAS Futenma',                   lat: 26.271,  lng: 127.762, component: 'Marine Corps', city: 'Ginowan, Okinawa' },
    { id: 'kadena',        name: 'Kadena Air Base',                lat: 26.352,  lng: 127.768, component: 'Air Force',    city: 'Kadena, Okinawa' },
  ],
};

const SOUTH_KOREA: CountryEntry = {
  id: 'south-korea', country: 'South Korea', flagCode: 'kr',
  lat: 36.5, lng: 127.9, color: '#003478',
  troops: 23372, persistentBases: 7, since: 1953,
  region: 'Indo-Pacific',
  bases: [
    { id: 'humphreys',  name: 'Camp Humphreys',             lat: 36.971,  lng: 126.938, component: 'Army',      city: 'Pyeongtaek' },
    { id: 'daegu',      name: 'US Army Garrison Daegu',     lat: 35.871,  lng: 128.599, component: 'Army',      city: 'Daegu' },
    { id: 'yongsan',    name: 'US Army Garrison Yongsan',   lat: 37.533,  lng: 126.978, component: 'Army',      city: 'Seoul' },
    { id: 'chinhae',    name: 'Fleet Activities Chinhae',   lat: 35.148,  lng: 128.683, component: 'Navy',      city: 'Jinhae' },
    { id: 'osan',       name: 'Osan Air Base',              lat: 37.089,  lng: 127.030, component: 'Air Force', city: 'Osan' },
    { id: 'kunsan',     name: 'Kunsan Air Base',            lat: 35.904,  lng: 126.616, component: 'Air Force', city: 'Gunsan' },
    { id: 'cp-tango',   name: 'Command Post Tango',         lat: 37.387,  lng: 127.121, component: 'Army',      city: 'Seongnam' },
  ],
};

const MARSHALL_ISLANDS: CountryEntry = {
  id: 'marshall-islands', country: 'Marshall Islands', flagCode: 'mh',
  lat: 8.72, lng: 167.73, color: '#003893',
  troops: 14, persistentBases: 1, since: 1964,
  region: 'Indo-Pacific',
  bases: [
    { id: 'kwajalein', name: 'USAG Kwajalein Atoll', lat: 8.719, lng: 167.732, component: 'Army', city: 'Kwajalein Atoll' },
  ],
};

const SINGAPORE: CountryEntry = {
  id: 'singapore', country: 'Singapore', flagCode: 'sg',
  lat: 1.35, lng: 103.82, color: '#ef3340',
  troops: 274, persistentBases: 1, since: 1990,
  region: 'Indo-Pacific',
  bases: [
    { id: 'singapore-navy', name: 'Navy Region Center Singapore', lat: 1.297, lng: 103.840, component: 'Navy', city: 'Singapore' },
  ],
};

const AUSTRALIA: CountryEntry = {
  id: 'australia', country: 'Australia', flagCode: 'au',
  lat: -25.0, lng: 133.0, color: '#00008b',
  troops: 306, persistentBases: 1, since: 1967,
  region: 'Indo-Pacific',
  bases: [
    { id: 'harold-holt', name: 'NCS Harold E. Holt', lat: -21.817, lng: 114.161, component: 'Navy', city: 'Exmouth, Western Australia' },
  ],
};

const DIEGO_GARCIA: CountryEntry = {
  id: 'diego-garcia', country: 'Diego Garcia (UK)', flagCode: 'io',
  lat: -7.31, lng: 72.41, color: '#012169',
  troops: 251, persistentBases: 1, since: 1971,
  region: 'Indo-Pacific',
  bases: [
    { id: 'diego-garcia-nsf', name: 'Naval Support Facility Diego Garcia', lat: -7.313, lng: 72.412, component: 'Navy', city: 'Diego Garcia, BIOT' },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
//  EUROPE  (31 persistent bases — CRS R48123)
// ─────────────────────────────────────────────────────────────────────────────

const GERMANY: CountryEntry = {
  id: 'germany', country: 'Germany', flagCode: 'de',
  lat: 51.2, lng: 10.5, color: '#ffcc00',
  troops: 37009, persistentBases: 7, since: 1945,
  region: 'Europe',
  bases: [
    { id: 'ramstein',    name: 'Ramstein Air Base',        lat: 49.437, lng: 7.600,  component: 'Air Force', city: 'Kaiserslautern, RP' },
    { id: 'spangdahlem', name: 'Spangdahlem Air Base',     lat: 50.126, lng: 6.693,  component: 'Air Force', city: 'Eifel, RP' },
    { id: 'geilenkirchen', name: 'Geilenkirchen Air Base', lat: 51.050, lng: 6.043,  component: 'Air Force', city: 'Geilenkirchen, NRW' },
    { id: 'wiesbaden',   name: 'USAG Wiesbaden',           lat: 50.052, lng: 8.235,  component: 'Army',      city: 'Wiesbaden, Hesse' },
    { id: 'stuttgart',   name: 'USAG Stuttgart',           lat: 48.738, lng: 9.182,  component: 'Army',      city: 'Stuttgart, BW' },
    { id: 'bavaria',     name: 'USAG Bavaria',             lat: 49.704, lng: 11.942, component: 'Army',      city: 'Grafenwöhr, Bavaria' },
    { id: 'ansbach',     name: 'USAG Ansbach',             lat: 49.307, lng: 10.588, component: 'Army',      city: 'Ansbach, Bavaria' },
  ],
};

const ITALY: CountryEntry = {
  id: 'italy', country: 'Italy', flagCode: 'it',
  lat: 42.5, lng: 12.6, color: '#009246',
  troops: 12783, persistentBases: 7, since: 1945,
  region: 'Europe',
  bases: [
    { id: 'aviano',   name: 'Aviano Air Base',          lat: 46.032, lng: 12.596, component: 'Air Force',    city: 'Aviano, Friuli' },
    { id: 'sigonella',name: 'NAS Sigonella',            lat: 37.402, lng: 14.922, component: 'Navy',         city: 'Sigonella, Sicily' },
    { id: 'naples',   name: 'NSA Naples',               lat: 40.813, lng: 14.194, component: 'Navy',         city: 'Naples' },
    { id: 'gaeta',    name: 'NSA Naples Det. Gaeta',    lat: 41.213, lng: 13.572, component: 'Navy',         city: 'Gaeta' },
    { id: 'vicenza',  name: 'USAG Vicenza (Camp Ederle)',lat: 45.549, lng: 11.534, component: 'Army',         city: 'Vicenza' },
    { id: 'darby',    name: 'Camp Darby',               lat: 43.678, lng: 10.336, component: 'Army',         city: 'Tirrenia, Tuscany' },
    { id: 'ghedi',    name: 'Ghedi Air Base',           lat: 45.433, lng: 10.267, component: 'Air Force',    city: 'Brescia, Lombardy' },
  ],
};

const UK: CountryEntry = {
  id: 'uk', country: 'United Kingdom', flagCode: 'gb',
  lat: 54.0, lng: -2.5, color: '#012169',
  troops: 10158, persistentBases: 5, since: 1942,
  region: 'Europe',
  bases: [
    { id: 'lakenheath',  name: 'RAF Lakenheath',          lat: 52.410, lng: 0.560,  component: 'Air Force', city: 'Suffolk' },
    { id: 'mildenhall',  name: 'RAF Mildenhall',          lat: 52.362, lng: 0.484,  component: 'Air Force', city: 'Suffolk' },
    { id: 'alconbury',   name: 'RAF Alconbury/Molesworth',lat: 52.363, lng: -0.148, component: 'Air Force', city: 'Cambridgeshire' },
    { id: 'croughton',   name: 'RAF Croughton',           lat: 52.060, lng: -1.192, component: 'Air Force', city: 'Northamptonshire' },
    { id: 'menwith',     name: 'RAF Menwith Hill',        lat: 53.988, lng: -1.687, component: 'Army',      city: 'North Yorkshire' },
  ],
};

const SPAIN: CountryEntry = {
  id: 'spain', country: 'Spain', flagCode: 'es',
  lat: 40.0, lng: -4.0, color: '#f1bf00',
  troops: 3835, persistentBases: 2, since: 1953,
  region: 'Europe',
  bases: [
    { id: 'rota',  name: 'Naval Station Rota', lat: 36.645, lng: -6.349, component: 'Navy',      city: 'Rota, Cádiz' },
    { id: 'moron', name: 'Morón Air Base',     lat: 37.175, lng: -5.616, component: 'Air Force', city: 'Morón de la Frontera, Seville' },
  ],
};

const BELGIUM: CountryEntry = {
  id: 'belgium', country: 'Belgium', flagCode: 'be',
  lat: 50.6, lng: 4.5, color: '#fdda24',
  troops: 1104, persistentBases: 2, since: 1945,
  region: 'Europe',
  bases: [
    { id: 'usag-benelux',  name: 'USAG Benelux (Chièvres)', lat: 50.573, lng: 3.831, component: 'Army',      city: 'Chièvres / Mons' },
    { id: 'kleine-brogel', name: 'Kleine Brogel Air Base',  lat: 51.169, lng: 5.469, component: 'Air Force', city: 'Kleine-Brogel' },
  ],
};

const TURKEY: CountryEntry = {
  id: 'turkey', country: 'Turkey', flagCode: 'tr',
  lat: 39.0, lng: 35.0, color: '#e30a17',
  troops: 1675, persistentBases: 2, since: 1954,
  region: 'Europe',
  bases: [
    { id: 'incirlik', name: 'Incirlik Air Base', lat: 37.002, lng: 35.426, component: 'Air Force', city: 'Adana' },
    { id: 'izmir',    name: 'Izmir Air Station',  lat: 38.517, lng: 27.010, component: 'Army',      city: 'İzmir' },
  ],
};

const GREECE: CountryEntry = {
  id: 'greece', country: 'Greece', flagCode: 'gr',
  lat: 39.0, lng: 22.0, color: '#0d5eaf',
  troops: 448, persistentBases: 1, since: 1953,
  region: 'Europe',
  bases: [
    { id: 'souda-bay', name: 'NSA Souda Bay', lat: 35.531, lng: 24.075, component: 'Navy', city: 'Souda Bay, Crete' },
  ],
};

const PORTUGAL: CountryEntry = {
  id: 'portugal', country: 'Portugal', flagCode: 'pt',
  lat: 38.8, lng: -27.1, color: '#006600',
  troops: 247, persistentBases: 1, since: 1951,
  region: 'Europe',
  bases: [
    { id: 'lajes', name: 'Lajes Field', lat: 38.762, lng: -27.098, component: 'Air Force', city: 'Terceira, Azores' },
  ],
};

const GREENLAND: CountryEntry = {
  id: 'greenland', country: 'Greenland (Denmark)', flagCode: 'gl',
  lat: 76.5, lng: -68.7, color: '#d00c33',
  troops: 131, persistentBases: 1, since: 1951,
  region: 'Europe',
  bases: [
    { id: 'pituffik', name: 'Pituffik Space Base', lat: 76.531, lng: -68.703, component: 'Air Force', city: 'Pituffik, Greenland' },
  ],
};

const ICELAND: CountryEntry = {
  id: 'iceland', country: 'Iceland', flagCode: 'is',
  lat: 64.0, lng: -22.6, color: '#003897',
  troops: 1, persistentBases: 1, since: 1951,
  region: 'Europe',
  bases: [
    { id: 'keflavik', name: 'NAS Keflavik', lat: 63.985, lng: -22.606, component: 'Navy', city: 'Keflavik' },
  ],
};

const NORWAY: CountryEntry = {
  id: 'norway', country: 'Norway', flagCode: 'no',
  lat: 58.9, lng: 5.7, color: '#ef2b2d',
  troops: 89, persistentBases: 1, since: 2017,
  region: 'Europe',
  bases: [
    { id: 'jwc-norway', name: 'Joint Warfare Center', lat: 58.970, lng: 5.720, component: 'Multi', city: 'Stavanger' },
  ],
};

const KOSOVO: CountryEntry = {
  id: 'kosovo', country: 'Kosovo', flagCode: 'xk',
  lat: 42.6, lng: 21.0, color: '#244aa5',
  troops: 12, persistentBases: 1, since: 1999,
  region: 'Europe',
  bases: [
    { id: 'bondsteel', name: 'Camp Bondsteel', lat: 42.357, lng: 21.398, component: 'Army', city: 'Ferizaj / Uroševac' },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
//  MIDDLE EAST  (8 persistent bases — CRS R48123)
// ─────────────────────────────────────────────────────────────────────────────

const KUWAIT: CountryEntry = {
  id: 'kuwait', country: 'Kuwait', flagCode: 'kw',
  lat: 29.4, lng: 47.7, color: '#007a3d',
  // DMDC: 540 permanently assigned; ~13,500 operational (State Dept July 2021)
  troops: 540, persistentBases: 5, since: 1991,
  region: 'Middle East',
  bases: [
    { id: 'arifjan',    name: 'Camp Arifjan',     lat: 29.204, lng: 47.956, component: 'Army',      city: 'Al Ahmadi Governorate' },
    { id: 'buehring',   name: 'Camp Buehring',    lat: 29.477, lng: 47.484, component: 'Army',      city: 'Northwest Kuwait' },
    { id: 'al-jaber',   name: 'Al Jaber Air Base',lat: 29.335, lng: 47.796, component: 'Air Force', city: 'Al Ahmadi' },
    { id: 'al-mubarak', name: 'Al Mubarak AB',    lat: 29.326, lng: 48.069, component: 'Air Force', city: 'Kuwait City area' },
    { id: 'ali-salem',  name: 'Ali Al Salem AB',  lat: 29.458, lng: 47.521, component: 'Air Force', city: 'Al Jahra' },
  ],
};

const QATAR: CountryEntry = {
  id: 'qatar', country: 'Qatar', flagCode: 'qa',
  lat: 25.4, lng: 51.2, color: '#8d1b3d',
  // DMDC: 179 permanently assigned; ~8,000–10,000 operational (IISS / Media)
  troops: 179, persistentBases: 1, since: 1996,
  region: 'Middle East',
  bases: [
    { id: 'al-udeid', name: 'Al Udeid Air Base', lat: 25.117, lng: 51.315, component: 'Air Force', city: 'Al Rayyan, Qatar' },
  ],
};

const BAHRAIN: CountryEntry = {
  id: 'bahrain', country: 'Bahrain', flagCode: 'bh',
  lat: 26.2, lng: 50.6, color: '#ce1126',
  // DMDC: 3,151 permanently assigned; ~9,000 operational (DOD)
  troops: 3151, persistentBases: 1, since: 1971,
  region: 'Middle East',
  bases: [
    { id: 'nsa-bahrain', name: 'NSA Bahrain (5th Fleet HQ)', lat: 26.213, lng: 50.588, component: 'Navy', city: 'Manama' },
  ],
};

const UAE: CountryEntry = {
  id: 'uae', country: 'United Arab Emirates', flagCode: 'ae',
  lat: 24.2, lng: 54.5, color: '#00732f',
  troops: 130, persistentBases: 1, since: 1991,
  region: 'Middle East',
  bases: [
    { id: 'al-dhafra', name: 'Al Dhafra Air Base', lat: 24.242, lng: 54.548, component: 'Air Force', city: 'Abu Dhabi' },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
//  AFRICA  (2 persistent bases — CRS R48123)
// ─────────────────────────────────────────────────────────────────────────────

const DJIBOUTI: CountryEntry = {
  id: 'djibouti', country: 'Djibouti', flagCode: 'dj',
  lat: 11.8, lng: 42.8, color: '#209560',
  // DMDC: 20 permanently assigned; ~4,000 operational (Navy)
  troops: 20, persistentBases: 1, since: 2002,
  region: 'Africa',
  bases: [
    { id: 'lemonnier', name: 'Camp Lemonnier', lat: 11.534, lng: 43.146, component: 'Navy', city: 'Djibouti City' },
  ],
};

const ASCENSION_ISLAND: CountryEntry = {
  id: 'ascension-island', country: 'Ascension Island (UK)', flagCode: 'sh',
  lat: -7.97, lng: -14.39, color: '#012169',
  troops: 3, persistentBases: 1, since: 1956,
  region: 'Africa',
  bases: [
    { id: 'ascension-ab', name: 'Ascension Island Auxiliary Airfield', lat: -7.970, lng: -14.394, component: 'Air Force', city: 'Georgetown, Ascension Island' },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
//  AMERICAS  (3 persistent bases — CRS R48123)
// ─────────────────────────────────────────────────────────────────────────────

const BAHAMAS: CountryEntry = {
  id: 'bahamas', country: 'Bahamas', flagCode: 'bs',
  lat: 24.7, lng: -77.8, color: '#00778b',
  troops: 66, persistentBases: 1, since: 1950,
  region: 'Americas',
  bases: [
    { id: 'autec', name: 'Atlantic Undersea Test & Evaluation Center (AUTEC)', lat: 24.723, lng: -77.800, component: 'Navy', city: 'Andros Island' },
  ],
};

const CUBA: CountryEntry = {
  id: 'cuba', country: 'Cuba', flagCode: 'cu',
  lat: 19.9, lng: -75.1, color: '#002a8f',
  troops: 563, persistentBases: 1, since: 1903,
  region: 'Americas',
  bases: [
    { id: 'gtmo', name: 'Naval Station Guantánamo Bay', lat: 19.908, lng: -75.107, component: 'Navy', city: 'Guantánamo Bay' },
  ],
};

const HONDURAS: CountryEntry = {
  id: 'honduras', country: 'Honduras', flagCode: 'hn',
  lat: 14.4, lng: -87.6, color: '#0073cf',
  troops: 333, persistentBases: 1, since: 1981,
  region: 'Americas',
  bases: [
    { id: 'soto-cano', name: 'Soto Cano Air Base', lat: 14.382, lng: -87.621, component: 'Army', city: 'Comayagua' },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
//  MASTER EXPORT
// ─────────────────────────────────────────────────────────────────────────────

export const ENTRIES: CountryEntry[] = [
  // Indo-Pacific
  JAPAN,
  SOUTH_KOREA,
  MARSHALL_ISLANDS,
  SINGAPORE,
  AUSTRALIA,
  DIEGO_GARCIA,

  // Europe
  GERMANY,
  ITALY,
  UK,
  SPAIN,
  BELGIUM,
  TURKEY,
  GREECE,
  PORTUGAL,
  GREENLAND,
  ICELAND,
  NORWAY,
  KOSOVO,

  // Middle East
  KUWAIT,
  QATAR,
  BAHRAIN,
  UAE,

  // Africa
  DJIBOUTI,
  ASCENSION_ISLAND,

  // Americas
  BAHAMAS,
  CUBA,
  HONDURAS,
];

// ─────────────────────────────────────────────────────────────────────────────
//  DERIVED TOTALS  (for headline stat bars)
// ─────────────────────────────────────────────────────────────────────────────

export const TOTAL_TROOPS         = ENTRIES.reduce((s, e) => s + e.troops, 0);
export const TOTAL_BASES          = ENTRIES.reduce((s, e) => s + e.persistentBases, 0);
export const TOTAL_COUNTRIES      = ENTRIES.length;

/**
 * NOTE ON TROOP FIGURES:
 * All troop counts are DMDC "permanently assigned" (March 31, 2026).
 * Rotational and TDY forces are excluded. Operational presence in the
 * Middle East in particular is substantially higher:
 *   Kuwait:   540 DMDC → ~13,500 operational
 *   Qatar:    179 DMDC → ~10,000 operational
 *   Bahrain:  3,151 DMDC → ~9,000 operational
 *   Djibouti: 20 DMDC → ~4,000 operational
 */
