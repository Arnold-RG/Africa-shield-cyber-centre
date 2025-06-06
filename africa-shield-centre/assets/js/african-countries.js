// African Countries Data with coordinates, analysts, and threat levels
const AFRICAN_COUNTRIES = {
    'algeria': {
        name: 'Algeria',
        flag: '🇩🇿',
        capital: 'Algiers',
        coordinates: [28.0339, 1.6596],
        region: 'North Africa',
        population: 44700000,
        analysts: ['A. Benali', 'S. Khelifi'],
        threatLevel: 'medium',
        activeThreats: 23,
        blockedAttacks: 156
    },
    'angola': {
        name: 'Angola',
        flag: '🇦🇴',
        capital: 'Luanda',
        coordinates: [-11.2027, 17.8739],
        region: 'Central Africa',
        population: 32866000,
        analysts: ['M. Santos', 'J. Neto'],
        threatLevel: 'low',
        activeThreats: 8,
        blockedAttacks: 45
    },
    'benin': {
        name: 'Benin',
        flag: '🇧🇯',
        capital: 'Porto-Novo',
        coordinates: [9.3077, 2.3158],
        region: 'West Africa',
        population: 12123000,
        analysts: ['K. Adjovi'],
        threatLevel: 'low',
        activeThreats: 5,
        blockedAttacks: 23
    },
    'botswana': {
        name: 'Botswana',
        flag: '🇧🇼',
        capital: 'Gaborone',
        coordinates: [-22.3285, 24.6849],
        region: 'Southern Africa',
        population: 2351000,
        analysts: ['T. Mogwe'],
        threatLevel: 'low',
        activeThreats: 3,
        blockedAttacks: 12
    },
    'burkina-faso': {
        name: 'Burkina Faso',
        flag: '🇧🇫',
        capital: 'Ouagadougou',
        coordinates: [12.2383, -1.5616],
        region: 'West Africa',
        population: 20903000,
        analysts: ['I. Ouedraogo'],
        threatLevel: 'medium',
        activeThreats: 15,
        blockedAttacks: 67
    },
    'burundi': {
        name: 'Burundi',
        flag: '🇧🇮',
        capital: 'Gitega',
        coordinates: [-3.3731, 29.9189],
        region: 'East Africa',
        population: 11890000,
        analysts: ['P. Nkurunziza'],
        threatLevel: 'medium',
        activeThreats: 12,
        blockedAttacks: 34
    },
    'cameroon': {
        name: 'Cameroon',
        flag: '🇨🇲',
        capital: 'Yaoundé',
        coordinates: [7.3697, 12.3547],
        region: 'Central Africa',
        population: 26545000,
        analysts: ['E. Mbeki', 'F. Nguema'],
        threatLevel: 'medium',
        activeThreats: 18,
        blockedAttacks: 89
    },
    'cape-verde': {
        name: 'Cape Verde',
        flag: '🇨🇻',
        capital: 'Praia',
        coordinates: [16.5388, -24.0132],
        region: 'West Africa',
        population: 555000,
        analysts: ['C. Silva'],
        threatLevel: 'low',
        activeThreats: 2,
        blockedAttacks: 8
    },
    'central-african-republic': {
        name: 'Central African Republic',
        flag: '🇨🇫',
        capital: 'Bangui',
        coordinates: [6.6111, 20.9394],
        region: 'Central Africa',
        population: 4829000,
        analysts: ['M. Bozize'],
        threatLevel: 'high',
        activeThreats: 28,
        blockedAttacks: 112
    },
    'chad': {
        name: 'Chad',
        flag: '🇹🇩',
        capital: 'N\'Djamena',
        coordinates: [15.4542, 18.7322],
        region: 'Central Africa',
        population: 16425000,
        analysts: ['A. Deby'],
        threatLevel: 'medium',
        activeThreats: 14,
        blockedAttacks: 56
    },
    'comoros': {
        name: 'Comoros',
        flag: '🇰🇲',
        capital: 'Moroni',
        coordinates: [-11.6455, 43.3333],
        region: 'East Africa',
        population: 869000,
        analysts: ['S. Azali'],
        threatLevel: 'low',
        activeThreats: 1,
        blockedAttacks: 4
    },
    'congo': {
        name: 'Republic of the Congo',
        flag: '🇨🇬',
        capital: 'Brazzaville',
        coordinates: [-4.2634, 15.2429],
        region: 'Central Africa',
        population: 5518000,
        analysts: ['D. Sassou'],
        threatLevel: 'medium',
        activeThreats: 9,
        blockedAttacks: 38
    },
    'drc': {
        name: 'Democratic Republic of the Congo',
        flag: '🇨🇩',
        capital: 'Kinshasa',
        coordinates: [-4.4419, 15.2663],
        region: 'Central Africa',
        population: 89561000,
        analysts: ['F. Tshisekedi', 'J. Kabila'],
        threatLevel: 'high',
        activeThreats: 45,
        blockedAttacks: 234
    },
    'djibouti': {
        name: 'Djibouti',
        flag: '🇩🇯',
        capital: 'Djibouti',
        coordinates: [11.8251, 42.5903],
        region: 'East Africa',
        population: 988000,
        analysts: ['I. Guelleh'],
        threatLevel: 'medium',
        activeThreats: 7,
        blockedAttacks: 29
    },
    'egypt': {
        name: 'Egypt',
        flag: '🇪🇬',
        capital: 'Cairo',
        coordinates: [26.0975, 31.2357],
        region: 'North Africa',
        population: 102334000,
        analysts: ['M. El-Sisi', 'A. Farouk', 'N. Hassan'],
        threatLevel: 'high',
        activeThreats: 67,
        blockedAttacks: 445
    },
    'equatorial-guinea': {
        name: 'Equatorial Guinea',
        flag: '🇬🇶',
        capital: 'Malabo',
        coordinates: [3.7504, 8.7371],
        region: 'Central Africa',
        population: 1403000,
        analysts: ['T. Obiang'],
        threatLevel: 'low',
        activeThreats: 4,
        blockedAttacks: 16
    },
    'eritrea': {
        name: 'Eritrea',
        flag: '🇪🇷',
        capital: 'Asmara',
        coordinates: [15.3229, 38.9251],
        region: 'East Africa',
        population: 3546000,
        analysts: ['I. Afwerki'],
        threatLevel: 'medium',
        activeThreats: 11,
        blockedAttacks: 47
    },
    'eswatini': {
        name: 'Eswatini',
        flag: '🇸🇿',
        capital: 'Mbabane',
        coordinates: [-26.5225, 31.4659],
        region: 'Southern Africa',
        population: 1160000,
        analysts: ['M. Dlamini'],
        threatLevel: 'low',
        activeThreats: 3,
        blockedAttacks: 11
    },
    'ethiopia': {
        name: 'Ethiopia',
        flag: '🇪🇹',
        capital: 'Addis Ababa',
        coordinates: [9.1450, 40.4897],
        region: 'East Africa',
        population: 115000000,
        analysts: ['A. Ahmed', 'H. Desalegn', 'M. Zenawi'],
        threatLevel: 'high',
        activeThreats: 52,
        blockedAttacks: 298
    },
    'gabon': {
        name: 'Gabon',
        flag: '🇬🇦',
        capital: 'Libreville',
        coordinates: [0.4162, 9.4673],
        region: 'Central Africa',
        population: 2225000,
        analysts: ['A. Bongo'],
        threatLevel: 'low',
        activeThreats: 6,
        blockedAttacks: 24
    },
    'gambia': {
        name: 'The Gambia',
        flag: '🇬🇲',
        capital: 'Banjul',
        coordinates: [13.4432, -15.3101],
        region: 'West Africa',
        population: 2417000,
        analysts: ['A. Barrow'],
        threatLevel: 'low',
        activeThreats: 4,
        blockedAttacks: 18
    },
    'ghana': {
        name: 'Ghana',
        flag: '🇬🇭',
        capital: 'Accra',
        coordinates: [7.9465, -1.0232],
        region: 'West Africa',
        population: 31073000,
        analysts: ['N. Akufo-Addo', 'K. Asante'],
        threatLevel: 'medium',
        activeThreats: 21,
        blockedAttacks: 134
    },
    'guinea': {
        name: 'Guinea',
        flag: '🇬🇳',
        capital: 'Conakry',
        coordinates: [9.6412, -13.5784],
        region: 'West Africa',
        population: 13133000,
        analysts: ['M. Doumbouya'],
        threatLevel: 'medium',
        activeThreats: 16,
        blockedAttacks: 73
    },
    'guinea-bissau': {
        name: 'Guinea-Bissau',
        flag: '🇬🇼',
        capital: 'Bissau',
        coordinates: [11.8037, -15.1804],
        region: 'West Africa',
        population: 1968000,
        analysts: ['U. Embalo'],
        threatLevel: 'low',
        activeThreats: 5,
        blockedAttacks: 21
    },
        'ivory-coast': {
        name: 'Côte d\'Ivoire',
        flag: '🇨🇮',
        capital: 'Yamoussoukro',
        coordinates: [7.5400, -5.5471],
        region: 'West Africa',
        population: 26378000,
        analysts: ['A. Ouattara', 'K. Bamba'],
        threatLevel: 'medium',
        activeThreats: 19,
        blockedAttacks: 95
    },
    'kenya': {
        name: 'Kenya',
        flag: '🇰🇪',
        capital: 'Nairobi',
        coordinates: [-0.0236, 37.9062],
        region: 'East Africa',
        population: 53771000,
        analysts: ['Dr. Sarah Mwangi', 'J. Kenyatta', 'R. Odinga'],
        threatLevel: 'high',
        activeThreats: 89,
        blockedAttacks: 567
    },
    'lesotho': {
        name: 'Lesotho',
        flag: '🇱🇸',
        capital: 'Maseru',
        coordinates: [-29.6100, 28.2336],
        region: 'Southern Africa',
        population: 2142000,
        analysts: ['M. Majoro'],
        threatLevel: 'low',
        activeThreats: 2,
        blockedAttacks: 9
    },
    'liberia': {
        name: 'Liberia',
        flag: '🇱🇷',
        capital: 'Monrovia',
        coordinates: [6.4281, -9.4295],
        region: 'West Africa',
        population: 5058000,
        analysts: ['G. Weah'],
        threatLevel: 'medium',
        activeThreats: 13,
        blockedAttacks: 58
    },
    'libya': {
        name: 'Libya',
        flag: '🇱🇾',
        capital: 'Tripoli',
        coordinates: [32.8872, 13.1913],
        region: 'North Africa',
        population: 6871000,
        analysts: ['A. Dbeibah', 'K. Haftar'],
        threatLevel: 'high',
        activeThreats: 34,
        blockedAttacks: 189
    },
    'madagascar': {
        name: 'Madagascar',
        flag: '🇲🇬',
        capital: 'Antananarivo',
        coordinates: [-18.8792, 47.5079],
        region: 'East Africa',
        population: 27691000,
        analysts: ['A. Rajoelina', 'H. Razafy'],
        threatLevel: 'medium',
        activeThreats: 17,
        blockedAttacks: 76
    },
    'malawi': {
        name: 'Malawi',
        flag: '🇲🇼',
        capital: 'Lilongwe',
        coordinates: [-13.2543, 34.3015],
        region: 'Southern Africa',
        population: 19130000,
        analysts: ['L. Chakwera'],
        threatLevel: 'low',
        activeThreats: 8,
        blockedAttacks: 32
    },
    'mali': {
        name: 'Mali',
        flag: '🇲🇱',
        capital: 'Bamako',
        coordinates: [17.5707, -3.9962],
        region: 'West Africa',
        population: 20251000,
        analysts: ['A. Goita'],
        threatLevel: 'high',
        activeThreats: 31,
        blockedAttacks: 145
    },
    'mauritania': {
        name: 'Mauritania',
        flag: '🇲🇷',
        capital: 'Nouakchott',
        coordinates: [21.0079, -10.9408],
        region: 'West Africa',
        population: 4650000,
        analysts: ['M. Ghazouani'],
        threatLevel: 'medium',
        activeThreats: 12,
        blockedAttacks: 54
    },
    'mauritius': {
        name: 'Mauritius',
        flag: '🇲🇺',
        capital: 'Port Louis',
        coordinates: [-20.2042, 57.5562],
        region: 'East Africa',
        population: 1271000,
        analysts: ['P. Jugnauth'],
        threatLevel: 'low',
        activeThreats: 4,
        blockedAttacks: 19
    },
    'morocco': {
        name: 'Morocco',
        flag: '🇲🇦',
        capital: 'Rabat',
        coordinates: [31.7917, -7.0926],
        region: 'North Africa',
        population: 36910000,
        analysts: ['S. Akhannouch', 'A. Benali', 'Y. El Otmani'],
        threatLevel: 'medium',
        activeThreats: 26,
        blockedAttacks: 178
    },
    'mozambique': {
        name: 'Mozambique',
        flag: '🇲🇿',
        capital: 'Maputo',
        coordinates: [-18.6657, 35.5296],
        region: 'Southern Africa',
        population: 31255000,
        analysts: ['F. Nyusi', 'C. Mondlane'],
        threatLevel: 'medium',
        activeThreats: 20,
        blockedAttacks: 87
    },
    'namibia': {
        name: 'Namibia',
        flag: '🇳🇦',
        capital: 'Windhoek',
        coordinates: [-22.9576, 18.4904],
        region: 'Southern Africa',
        population: 2541000,
        analysts: ['H. Geingob'],
        threatLevel: 'low',
        activeThreats: 6,
        blockedAttacks: 25
    },
    'niger': {
        name: 'Niger',
        flag: '🇳🇪',
        capital: 'Niamey',
        coordinates: [17.6078, 8.0817],
        region: 'West Africa',
        population: 24207000,
        analysts: ['A. Tchiani'],
        threatLevel: 'high',
        activeThreats: 29,
        blockedAttacks: 132
    },
    'nigeria': {
        name: 'Nigeria',
        flag: '🇳🇬',
        capital: 'Abuja',
        coordinates: [9.0765, 7.3986],
        region: 'West Africa',
        population: 218541000,
        analysts: ['B. Tinubu', 'A. Osinbajo', 'K. Emefiele', 'Y. Osinbajo'],
        threatLevel: 'critical',
        activeThreats: 156,
        blockedAttacks: 892
    },
    'rwanda': {
        name: 'Rwanda',
        flag: '🇷🇼',
        capital: 'Kigali',
        coordinates: [-1.9403, 29.8739],
        region: 'East Africa',
        population: 12952000,
        analysts: ['Marie Uwimana', 'P. Kagame', 'J. Ngirente'],
        threatLevel: 'medium',
        activeThreats: 24,
        blockedAttacks: 143
    },
    'sao-tome-and-principe': {
        name: 'São Tomé and Príncipe',
        flag: '🇸🇹',
        capital: 'São Tomé',
        coordinates: [0.1864, 6.6131],
        region: 'Central Africa',
        population: 219000,
        analysts: ['C. Vila Nova'],
        threatLevel: 'low',
        activeThreats: 1,
        blockedAttacks: 3
    },
    'senegal': {
        name: 'Senegal',
        flag: '🇸🇳',
        capital: 'Dakar',
        coordinates: [14.7167, -17.4677],
        region: 'West Africa',
        population: 16744000,
        analysts: ['M. Sall', 'A. Ba'],
        threatLevel: 'medium',
        activeThreats: 18,
        blockedAttacks: 94
    },
    'seychelles': {
        name: 'Seychelles',
        flag: '🇸🇨',
        capital: 'Victoria',
        coordinates: [-4.6796, 55.4920],
        region: 'East Africa',
        population: 98000,
        analysts: ['W. Ramkalawan'],
        threatLevel: 'low',
        activeThreats: 1,
        blockedAttacks: 5
    },
    'sierra-leone': {
        name: 'Sierra Leone',
        flag: '🇸🇱',
        capital: 'Freetown',
        coordinates: [8.4657, -11.7799],
        region: 'West Africa',
        population: 7976000,
        analysts: ['J. Bio'],
        threatLevel: 'medium',
        activeThreats: 11,
        blockedAttacks: 49
    },
    'somalia': {
        name: 'Somalia',
        flag: '🇸🇴',
        capital: 'Mogadishu',
        coordinates: [5.1521, 46.1996],
        region: 'East Africa',
        population: 15893000,
        analysts: ['H. Sheikh Mohamud', 'A. Hassan'],
        threatLevel: 'critical',
        activeThreats: 78,
        blockedAttacks: 456
    },
    'south-africa': {
        name: 'South Africa',
        flag: '🇿🇦',
        capital: 'Cape Town',
        coordinates: [-30.5595, 22.9375],
        region: 'Southern Africa',
        population: 59309000,
        analysts: ['C. Ramaphosa', 'P. Gordhan', 'N. Dlamini-Zuma'],
        threatLevel: 'high',
        activeThreats: 67,
        blockedAttacks: 423
    },
    'south-sudan': {
        name: 'South Sudan',
        flag: '🇸🇸',
        capital: 'Juba',
        coordinates: [4.8594, 31.5713],
        region: 'East Africa',
        population: 11194000,
        analysts: ['S. Kiir', 'R. Machar'],
        threatLevel: 'high',
        activeThreats: 35,
        blockedAttacks: 167
    },
    'sudan': {
        name: 'Sudan',
        flag: '🇸🇩',
        capital: 'Khartoum',
        coordinates: [15.5007, 32.5599],
        region: 'North Africa',
        population: 43849000,
        analysts: ['A. Burhan', 'H. Dagalo'],
        threatLevel: 'critical',
        activeThreats: 89,
        blockedAttacks: 534
    },
    'tanzania': {
        name: 'Tanzania',
        flag: '🇹🇿',
        capital: 'Dodoma',
        coordinates: [-6.3690, 34.8888],
        region: 'East Africa',
        population: 59734000,
        analysts: ['James Kilimo', 'S. Hassan', 'J. Magufuli'],
        threatLevel: 'medium',
        activeThreats: 32,
        blockedAttacks: 198
    },
    'togo': {
        name: 'Togo',
        flag: '🇹🇬',
        capital: 'Lomé',
        coordinates: [8.6195, 0.8248],
        region: 'West Africa',
        population: 8279000,
        analysts: ['F. Gnassingbé'],
        threatLevel: 'low',
        activeThreats: 7,
        blockedAttacks: 31
    },
    'tunisia': {
        name: 'Tunisia',
        flag: '🇹🇳',
        capital: 'Tunis',
        coordinates: [33.8869, 9.5375],
        region: 'North Africa',
        population: 11819000,
        analysts: ['K. Saied', 'N. Karoui'],
        threatLevel: 'medium',
        activeThreats: 22,
        blockedAttacks: 118
    },
    'uganda': {
        name: 'Uganda',
        flag: '🇺🇬',
        capital: 'Kampala',
        coordinates: [1.3733, 32.2903],
        region: 'East Africa',
        population: 45741000,
        analysts: ['David Okello', 'Y. Museveni', 'B. Kiggundu'],
        threatLevel: 'medium',
        activeThreats: 28,
        blockedAttacks: 165
    },
    'zambia': {
        name: 'Zambia',
        flag: '🇿🇲',
        capital: 'Lusaka',
        coordinates: [-13.1339, 27.8493],
        region: 'Southern Africa',
        population: 18384000,
        analysts: ['H. Hichilema', 'E. Lungu'],
        threatLevel: 'low',
        activeThreats: 9,
        blockedAttacks: 41
    },
    'zimbabwe': {
        name: 'Zimbabwe',
        flag: '🇿🇼',
        capital: 'Harare',
        coordinates: [-17.8252, 31.0335],
        region: 'Southern Africa',
        population: 14863000,
        analysts: ['E. Mnangagwa', 'N. Chamisa'],
        threatLevel: 'medium',
        activeThreats: 16,
        blockedAttacks: 73
    }
};

// Regional threat intelligence centers
const REGIONAL_CENTERS = {
    'north-africa': {
        name: 'North Africa Cyber Command',
        headquarters: 'Cairo, Egypt',
        countries: ['algeria', 'egypt', 'libya', 'morocco', 'sudan', 'tunisia'],
        leadAnalyst: 'Dr. Ahmed Hassan',
        specialization: 'State-sponsored threats, Critical infrastructure protection'
    },
    'west-africa': {
        name: 'West Africa Cyber Shield',
        headquarters: 'Lagos, Nigeria',
        countries: ['benin', 'burkina-faso', 'cape-verde', 'ivory-coast', 'gambia', 'ghana', 'guinea', 'guinea-bissau', 'liberia', 'mali', 'mauritania', 'niger', 'nigeria', 'senegal', 'sierra-leone', 'togo'],
        leadAnalyst: 'Prof. Adebayo Ogundimu',
        specialization: 'Financial crimes, Mobile banking security'
    },
    'central-africa': {
        name: 'Central Africa Security Hub',
        headquarters: 'Kinshasa, DRC',
                countries: ['angola', 'cameroon', 'central-african-republic', 'chad', 'congo', 'drc', 'equatorial-guinea', 'gabon', 'sao-tome-and-principe'],
        leadAnalyst: 'Dr. Marie Ngozi',
        specialization: 'Resource sector threats, Cross-border cybercrime'
    },
    'east-africa': {
        name: 'East Africa Cyber Defense Alliance',
        headquarters: 'Nairobi, Kenya',
        countries: ['burundi', 'comoros', 'djibouti', 'eritrea', 'ethiopia', 'kenya', 'madagascar', 'mauritius', 'rwanda', 'seychelles', 'somalia', 'south-sudan', 'tanzania', 'uganda'],
        leadAnalyst: 'Dr. Sarah Mwangi',
        specialization: 'Mobile money security, Telecommunications threats'
    },
    'southern-africa': {
        name: 'Southern Africa Cyber Consortium',
        headquarters: 'Johannesburg, South Africa',
        countries: ['botswana', 'eswatini', 'lesotho', 'malawi', 'mozambique', 'namibia', 'south-africa', 'zambia', 'zimbabwe'],
        leadAnalyst: 'Dr. Thabo Mthembu',
        specialization: 'Mining sector security, Industrial control systems'
    }
};

// Threat level colors and priorities
const THREAT_LEVELS = {
    'low': {
        color: '#28a745',
        priority: 1,
        description: 'Minimal threat activity'
    },
    'medium': {
        color: '#ffc107',
        priority: 2,
        description: 'Moderate threat activity'
    },
    'high': {
        color: '#fd7e14',
        priority: 3,
        description: 'Elevated threat activity'
    },
    'critical': {
        color: '#dc3545',
        priority: 4,
        description: 'Severe threat activity'
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        AFRICAN_COUNTRIES,
        REGIONAL_CENTERS,
        THREAT_LEVELS
    };
}

