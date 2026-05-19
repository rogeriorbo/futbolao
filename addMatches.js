import fs from 'fs';
import path from 'path';

const newMatches = `
  // Início do mata-mata (fase de 32-avos)
  { id: 'm73', teamA: '2º Grupo A', teamB: '2º Grupo B', teamACode: 'un', teamBCode: 'un', teamAShort: '2º A', teamBShort: '2º B', date: '2026-06-28T16:00:00Z', status: 'scheduled', stage: '32-avos', round: 4, stadium: 'SoFi Stadium', location: 'Los Angeles, EUA' },
  { id: 'm74', teamA: '1º Grupo E', teamB: '3º A/B/C/D/F', teamACode: 'un', teamBCode: 'un', teamAShort: '1º E', teamBShort: '3º', date: '2026-06-29T16:00:00Z', status: 'scheduled', stage: '32-avos', round: 4, stadium: 'Gillette Stadium', location: 'Boston, EUA' },
  { id: 'm75', teamA: '1º Grupo F', teamB: '2º Grupo C', teamACode: 'un', teamBCode: 'un', teamAShort: '1º F', teamBShort: '2º C', date: '2026-06-29T20:00:00Z', status: 'scheduled', stage: '32-avos', round: 4, stadium: 'Estadio BBVA', location: 'Monterrey, México' },
  { id: 'm76', teamA: '1º Grupo C', teamB: '2º Grupo F', teamACode: 'un', teamBCode: 'un', teamAShort: '1º C', teamBShort: '2º F', date: '2026-06-29T23:00:00Z', status: 'scheduled', stage: '32-avos', round: 4, stadium: 'NRG Stadium', location: 'Houston, EUA' },
  
  { id: 'm77', teamA: '1º Grupo I', teamB: '3º C/D/F/G/H', teamACode: 'un', teamBCode: 'un', teamAShort: '1º I', teamBShort: '3º', date: '2026-06-30T16:00:00Z', status: 'scheduled', stage: '32-avos', round: 4, stadium: 'MetLife Stadium', location: 'Nova York/Nova Jersey, EUA' },
  { id: 'm78', teamA: '2º Grupo E', teamB: '2º Grupo I', teamACode: 'un', teamBCode: 'un', teamAShort: '2º E', teamBShort: '2º I', date: '2026-06-30T20:00:00Z', status: 'scheduled', stage: '32-avos', round: 4, stadium: 'AT&T Stadium', location: 'Dallas, EUA' },
  { id: 'm79', teamA: '1º Grupo A', teamB: '3º C/E/F/H/I', teamACode: 'un', teamBCode: 'un', teamAShort: '1º A', teamBShort: '3º', date: '2026-06-30T23:00:00Z', status: 'scheduled', stage: '32-avos', round: 4, stadium: 'Estadio Azteca', location: 'Cidade do México, México' },
  
  { id: 'm80', teamA: '1º Grupo L', teamB: '3º E/H/I/J/K', teamACode: 'un', teamBCode: 'un', teamAShort: '1º L', teamBShort: '3º', date: '2026-07-01T16:00:00Z', status: ' scheduled', stage: '32-avos', round: 4, stadium: 'Mercedes-Benz Stadium', location: 'Atlanta, EUA' },
  { id: 'm81', teamA: '1º Grupo D', teamB: '3º B/E/F/I/J', teamACode: 'un', teamBCode: 'un', teamAShort: '1º D', teamBShort: '3º', date: '2026-07-01T20:00:00Z', status: 'scheduled', stage: '32-avos', round: 4, stadium: 'Levi\\'s Stadium', location: 'Santa Clara, EUA' },
  { id: 'm82', teamA: '1º Grupo G', teamB: '3º A/E/H/I/J', teamACode: 'un', teamBCode: 'un', teamAShort: '1º G', teamBShort: '3º', date: '2026-07-01T23:00:00Z', status: 'scheduled', stage: '32-avos', round: 4, stadium: 'Lumen Field', location: 'Seattle, EUA' },
  
  { id: 'm83', teamA: '2º Grupo K', teamB: '2º Grupo L', teamACode: 'un', teamBCode: 'un', teamAShort: '2º K', teamBShort: '2º L', date: '2026-07-02T16:00:00Z', status: 'scheduled', stage: '32-avos', round: 4, stadium: 'BMO Field', location: 'Toronto, Canadá' },
  { id: 'm84', teamA: '1º Grupo H', teamB: '2º Grupo J', teamACode: 'un', teamBCode: 'un', teamAShort: '1º H', teamBShort: '2º J', date: '2026-07-02T20:00:00Z', status: 'scheduled', stage: '32-avos', round: 4, stadium: 'SoFi Stadium', location: 'Los Angeles, EUA' },
  { id: 'm85', teamA: '1º Grupo B', teamB: '3º E/F/G/I/J', teamACode: 'un', teamBCode: 'un', teamAShort: '1º B', teamBShort: '3º', date: '2026-07-02T23:00:00Z', status: 'scheduled', stage: '32-avos', round: 4, stadium: 'BC Place', location: 'Vancouver, Canadá' },
  
  { id: 'm86', teamA: '1º Grupo J', teamB: '2º Grupo H', teamACode: 'un', teamBCode: 'un', teamAShort: '1º J', teamBShort: '2º H', date: '2026-07-03T16:00:00Z', status: 'scheduled', stage: '32-avos', round: 4, stadium: 'Hard Rock Stadium', location: 'Miami, EUA' },
  { id: 'm87', teamA: '1º Grupo K', teamB: '3º D/E/I/J/L', teamACode: 'un', teamBCode: 'un', teamAShort: '1º K', teamBShort: '3º', date: '2026-07-03T20:00:00Z', status: 'scheduled', stage: '32-avos', round: 4, stadium: 'Arrowhead Stadium', location: 'Kansas City, EUA' },
  { id: 'm88', teamA: '2º Grupo D', teamB: '2º Grupo G', teamACode: 'un', teamBCode: 'un', teamAShort: '2º D', teamBShort: '2º G', date: '2026-07-03T23:00:00Z', status: 'scheduled', stage: '32-avos', round: 4, stadium: 'AT&T Stadium', location: 'Dallas, EUA' },

  // Oitavas de final
  { id: 'm89', teamA: 'Venc. 74', teamB: 'Venc. 77', teamACode: 'un', teamBCode: 'un', teamAShort: 'V74', teamBShort: 'V77', date: '2026-07-04T16:00:00Z', status: 'scheduled', stage: 'Oitavas', round: 5, stadium: 'Lincoln Financial Field', location: 'Filadélfia, EUA' },
  { id: 'm90', teamA: 'Venc. 73', teamB: 'Venc. 75', teamACode: 'un', teamBCode: 'un', teamAShort: 'V73', teamBShort: 'V75', date: '2026-07-04T20:00:00Z', status: 'scheduled', stage: 'Oitavas', round: 5, stadium: 'NRG Stadium', location: 'Houston, EUA' },
  { id: 'm91', teamA: 'Venc. 76', teamB: 'Venc. 78', teamACode: 'un', teamBCode: 'un', teamAShort: 'V76', teamBShort: 'V78', date: '2026-07-05T16:00:00Z', status: 'scheduled', stage: 'Oitavas', round: 5, stadium: 'MetLife Stadium', location: 'Nova York/Nova Jersey, EUA' },
  { id: 'm92', teamA: 'Venc. 79', teamB: 'Venc. 80', teamACode: 'un', teamBCode: 'un', teamAShort: 'V79', teamBShort: 'V80', date: '2026-07-05T20:00:00Z', status: 'scheduled', stage: 'Oitavas', round: 5, stadium: 'Estadio Azteca', location: 'Cidade do México, México' },
  { id: 'm93', teamA: 'Venc. 83', teamB: 'Venc. 84', teamACode: 'un', teamBCode: 'un', teamAShort: 'V83', teamBShort: 'V84', date: '2026-07-06T16:00:00Z', status: 'scheduled', stage: 'Oitavas', round: 5, stadium: 'AT&T Stadium', location: 'Dallas, EUA' },
  { id: 'm94', teamA: 'Venc. 81', teamB: 'Venc. 82', teamACode: 'un', teamBCode: 'un', teamAShort: 'V81', teamBShort: 'V82', date: '2026-07-06T20:00:00Z', status: 'scheduled', stage: 'Oitavas', round: 5, stadium: 'Lumen Field', location: 'Seattle, EUA' },
  { id: 'm95', teamA: 'Venc. 86', teamB: 'Venc. 88', teamACode: 'un', teamBCode: 'un', teamAShort: 'V86', teamBShort: 'V88', date: '2026-07-07T16:00:00Z', status: 'scheduled', stage: 'Oitavas', round: 5, stadium: 'Mercedes-Benz Stadium', location: 'Atlanta, EUA' },
  { id: 'm96', teamA: 'Venc. 85', teamB: 'Venc. 87', teamACode: 'un', teamBCode: 'un', teamAShort: 'V85', teamBShort: 'V87', date: '2026-07-07T20:00:00Z', status: 'scheduled', stage: 'Oitavas', round: 5, stadium: 'BC Place', location: 'Vancouver, Canadá' },

  // Quartas de final
  { id: 'm97', teamA: 'Venc. 89', teamB: 'Venc. 90', teamACode: 'un', teamBCode: 'un', teamAShort: 'V89', teamBShort: 'V90', date: '2026-07-09T20:00:00Z', status: 'scheduled', stage: 'Quartas', round: 6, stadium: 'Gillette Stadium', location: 'Boston, EUA' },
  { id: 'm98', teamA: 'Venc. 93', teamB: 'Venc. 94', teamACode: 'un', teamBCode: 'un', teamAShort: 'V93', teamBShort: 'V94', date: '2026-07-10T20:00:00Z', status: 'scheduled', stage: 'Quartas', round: 6, stadium: 'SoFi Stadium', location: 'Los Angeles, EUA' },
  { id: 'm99', teamA: 'Venc. 91', teamB: 'Venc. 92', teamACode: 'un', teamBCode: 'un', teamAShort: 'V91', teamBShort: 'V92', date: '2026-07-11T20:00:00Z', status: 'scheduled', stage: 'Quartas', round: 6, stadium: 'Hard Rock Stadium', location: 'Miami, EUA' },
  { id: 'm100', teamA: 'Venc. 95', teamB: 'Venc. 96', teamACode: 'un', teamBCode: 'un', teamAShort: 'V95', teamBShort: 'V96', date: '2026-07-11T23:00:00Z', status: 'scheduled', stage: 'Quartas', round: 6, stadium: 'Arrowhead Stadium', location: 'Kansas City, EUA' },

  // Semifinais
  { id: 'm101', teamA: 'Venc. 97', teamB: 'Venc. 98', teamACode: 'un', teamBCode: 'un', teamAShort: 'V97', teamBShort: 'V98', date: '2026-07-14T20:00:00Z', status: 'scheduled', stage: 'Semifinal', round: 7, stadium: 'AT&T Stadium', location: 'Dallas, EUA' },
  { id: 'm102', teamA: 'Venc. 99', teamB: 'Venc. 100', teamACode: 'un', teamBCode: 'un', teamAShort: 'V99', teamBShort: 'V100', date: '2026-07-15T20:00:00Z', status: 'scheduled', stage: 'Semifinal', round: 7, stadium: 'Mercedes-Benz Stadium', location: 'Atlanta, EUA' },

  // Disputa do terceiro lugar
  { id: 'm103', teamA: 'Perd. 101', teamB: 'Perd. 102', teamACode: 'un', teamBCode: 'un', teamAShort: 'P101', teamBShort: 'P102', date: '2026-07-18T20:00:00Z', status: 'scheduled', stage: 'Terceiro Lugar', round: 8, stadium: 'Hard Rock Stadium', location: 'Miami, EUA' },

  // Final
  { id: 'm104', teamA: 'Venc. 101', teamB: 'Venc. 102', teamACode: 'un', teamBCode: 'un', teamAShort: 'V101', teamBShort: 'V102', date: '2026-07-19T20:00:00Z', status: 'scheduled', stage: 'Final', round: 9, stadium: 'MetLife Stadium', location: 'Nova York/Nova Jersey, EUA' }
`;

const filePath = path.join(process.cwd(), 'src/data/matches.ts');
let content = fs.readFileSync(filePath, 'utf-8');
content = content.replace('];\\n\\n', newMatches + '\\n];\\n\\n');

// Also update it exactly at the end of the array before "];"
if (!content.includes('m104')) {
    content = content.replace(/\\n\\];\\s*$/, newMatches + '\\n];\\n');
}

fs.writeFileSync(filePath, content);
