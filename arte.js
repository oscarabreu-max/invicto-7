// Arte de las cartas en pixel (lienzo de 28 x 28).
// Cada carta se arma con una pose y una cabeza. Las cartas con rasgos propios
// (tabla RASGOS) llevan piel, peinado, barba y su pose iconica; el resto sale
// en silueta con una pose segun su puesto, hasta que se le dibujen rasgos.
var Arte = (function () {
  'use strict';
  var PIEL = ['#f3cfb0', '#e2b184', '#c98f5e', '#96623b', '#5e3b24'];
  var TINTE = ['#17130f', '#5a3a22', '#d9b24a', '#b5532a', '#cfcfcf', '#8a6a3c'];
  var SOMBRA = '#10161c';

  function mezcla(a, b, t) {
    var x = parseInt(a.slice(1), 16), y = parseInt(b.slice(1), 16), o = '#';
    [16, 8, 0].forEach(function (s) {
      var v = Math.round(((x >> s) & 255) * (1 - t) + ((y >> s) & 255) * t);
      o += (v < 16 ? '0' : '') + v.toString(16);
    });
    return o;
  }
  function clara(c) {
    var x = parseInt(c.slice(1), 16);
    return 0.3 * ((x >> 16) & 255) + 0.59 * ((x >> 8) & 255) + 0.11 * (x & 255) > 150;
  }

  // ---------- Cabeza (8 x 7, mas pelo que sobresale) ----------
  // h pelo, r pelo al ras, s piel, e ojo, m boca, c cinta.
  var CARA = ['.hhhhhh.', 'hhhhhhhh', 'hssssssh', 'ssessess', 'ssssssss', 'sssmmsss', '.ssssss.'];
  function lados(x0, y0, y1) { var o = []; for (var y = y0; y <= y1; y++) { o.push([x0, y], [7 - x0, y]); } return o; }
  function fila(y, x0, x1) { var o = []; for (var x = x0; x <= x1; x++) { o.push([x, y]); } return o; }
  var PELOS = {
    corto: {},
    fleco: { f: { 2: 'hhhhhssh' } },
    rapado: { f: { 0: '.rrrrrr.', 1: 'rrrrrrrr', 2: 'rssssssr' } },
    calvo: { f: { 0: '.ssssss.', 1: 'ssssssss', 2: 'ssssssss' } },
    medio: { f: { 2: 'hhsssshh', 3: 'hsessesh', 4: 'hssssssh' }, x: lados(-1, 1, 5) },
    largo: { f: { 2: 'hhsssshh', 3: 'hsessesh', 4: 'hssssssh' }, x: lados(-1, 0, 8).concat(lados(0, 7, 8)) },
    cresta: { f: { 0: '..hhhh..', 1: 'rrhhhhrr', 2: 'rssssssr' }, x: fila(-1, 3, 4) },
    copete: { f: { 0: 'hhhhhhh.' }, x: fila(-1, 1, 5) },
    rizos: { f: { 2: 'hhsssshh' }, x: fila(-1, 1, 6).concat(lados(-1, 0, 2)) },
    coleta: { x: [[8, 1], [9, 1], [8, 2], [9, 2], [9, 3]] },
    casco: { f: { 2: 'hhhhhhhh' }, x: lados(-1, 2, 3), color: '#15181c' }
  };
  var BARBAS = {
    barba: { 4: 'h......h', 5: 'hhhmmhhh', 6: '.hhhhhh.' },
    sombra: { 5: 'rrrmmrrr', 6: '.rrrrrr.' },
    candado: { 5: '..hmmh..', 6: '...hh...' },
    bigote: { 5: '..hhhh..' }
  };

  function cabeza(t, px, ox, oy) {
    var filas = CARA.slice(), P = PELOS[t.pelo] || {}, B = BARBAS[t.barba], y, x;
    Object.keys(P.f || {}).forEach(function (k) { filas[k] = P.f[k]; });
    if (B) {
      Object.keys(B).forEach(function (k) {
        var s = '';
        for (x = 0; x < 8; x++) { s += B[k][x] === '.' ? filas[k][x] : B[k][x]; }
        filas[k] = s;
      });
    }
    if (t.cinta || t.acc === 'cinta') { filas[1] = 'cccccccc'; }
    if (t.acc === 'lentes') { filas[3] = 'slllllls'; }
    if (t.acc === 'gorra') { filas[0] = '.gggggg.'; filas[1] = 'gggggggg'; }
    if (t.acc === 'corona') { filas[0] = 'oooooooo'; }
    var extra = t.acc === 'gorra' ? [[8, 1, 'g'], [9, 1, 'g']] : t.acc === 'corona' ? [[0, -1, 'o'], [3, -1, 'o'], [4, -1, 'o'], [7, -1, 'o']] : [];
    var piel = PIEL[t.piel], pelo = P.color || TINTE[t.tinte];
    var col = { h: pelo, r: mezcla(piel, pelo, 0.45), s: piel, e: '#14110f', m: mezcla(piel, '#6b1f1f', 0.5), c: '#f4f1e6', l: '#14110f', g: '#d8382f', o: '#ffd23f' };
    (t.acc === 'gorra' || t.acc === 'corona' ? [] : P.x || []).forEach(function (q) { px(ox + q[0], oy + q[1], t.sil ? SOMBRA : pelo); });
    for (y = 0; y < 7; y++) {
      for (x = 0; x < 8; x++) {
        if (filas[y][x] !== '.') { px(ox + x, oy + y, t.sil ? SOMBRA : col[filas[y][x]]); }
      }
    }
    extra.forEach(function (q) { px(ox + q[0], oy + q[1], col[q[2]]); });
  }

  // ---------- Poses ----------
  // Cada trazo: [parte, x1, y1, x2, y2, ancho, alto]. Se pinta un bloque de
  // ancho x alto en cada punto de la linea. Partes: T torso (con el patron del
  // club), J manga, S piel, G mano o guante, P short, C calceta, B botin,
  // H cabeza (x, y), O balon (x, y). El orden es el de pintado.
  var TRONCO = [['S', 13, 10, 13, 10, 2, 1], ['T', 11, 11, 11, 18, 6, 1], ['P', 11, 19, 11, 21, 6, 1]];
  var PIERNAS = [['S', 11, 22, 11, 22, 2, 1], ['C', 11, 23, 11, 25, 2, 1], ['B', 10, 26, 10, 26, 3, 1],
    ['S', 15, 22, 15, 22, 2, 1], ['C', 15, 23, 15, 25, 2, 1], ['B', 15, 26, 15, 26, 3, 1]];
  var BRAZOS = [['J', 9, 11, 9, 13, 2, 1], ['S', 9, 14, 9, 16, 2, 1], ['G', 9, 17, 9, 18, 2, 1],
    ['J', 17, 11, 17, 13, 2, 1], ['S', 17, 14, 17, 16, 2, 1], ['G', 17, 17, 17, 18, 2, 1]];
  var H = [['H', 10, 3]];
  var POSES = {
    balon: [].concat(H, TRONCO, PIERNAS, BRAZOS, [['O', 19, 23]]),
    brazos: [].concat(H, TRONCO, PIERNAS, [
      ['J', 9, 11, 8, 9, 2, 2], ['S', 7, 8, 6, 5, 2, 2], ['G', 6, 3, 6, 3, 2, 2],
      ['J', 17, 11, 18, 9, 2, 2], ['S', 19, 8, 20, 5, 2, 2], ['G', 20, 3, 20, 3, 2, 2]]),
    cielo: [].concat(H, TRONCO, PIERNAS, [
      ['J', 9, 11, 8, 9, 2, 2], ['S', 8, 8, 8, 4, 2, 1], ['S', 8, 1, 8, 3, 1, 1],
      ['J', 17, 11, 18, 9, 2, 2], ['S', 18, 8, 18, 4, 2, 1], ['S', 19, 1, 19, 3, 1, 1]]),
    siu: [].concat(H, TRONCO, [
      ['S', 10, 22, 9, 23, 2, 2], ['C', 8, 24, 7, 25, 2, 2], ['B', 5, 27, 5, 27, 4, 1],
      ['S', 16, 22, 17, 23, 2, 2], ['C', 18, 24, 19, 25, 2, 2], ['B', 19, 27, 19, 27, 4, 1],
      ['J', 9, 11, 7, 13, 2, 2], ['S', 6, 14, 4, 17, 2, 2],
      ['J', 17, 11, 19, 13, 2, 2], ['S', 20, 14, 22, 17, 2, 2]]),
    abierto: [].concat(H, TRONCO, PIERNAS, [
      ['J', 9, 11, 7, 11, 2, 2], ['S', 5, 11, 2, 11, 2, 2],
      ['J', 17, 11, 19, 11, 2, 2], ['S', 21, 11, 24, 11, 2, 2]]),
    cruzados: [].concat(H, TRONCO, PIERNAS, [
      ['J', 9, 11, 9, 14, 2, 1], ['J', 17, 11, 17, 14, 2, 1], ['S', 10, 14, 16, 14, 2, 2]]),
    remate: [].concat(H, TRONCO, [
      ['S', 11, 22, 11, 22, 2, 1], ['C', 11, 23, 11, 25, 2, 1], ['B', 10, 26, 10, 26, 3, 1],
      ['S', 15, 22, 17, 22, 2, 2], ['C', 19, 22, 22, 21, 2, 2], ['B', 23, 20, 24, 20, 2, 2], ['O', 24, 15],
      ['J', 9, 11, 7, 10, 2, 2], ['S', 6, 9, 4, 7, 2, 2],
      ['J', 17, 11, 18, 13, 2, 2], ['S', 19, 14, 20, 16, 2, 2]]),
    corre: [].concat(H, TRONCO, [
      ['S', 10, 22, 9, 23, 2, 2], ['C', 7, 24, 5, 24, 2, 2], ['B', 3, 23, 3, 23, 2, 3],
      ['S', 16, 22, 17, 23, 2, 2], ['C', 18, 24, 18, 25, 2, 2], ['B', 18, 27, 18, 27, 4, 1], ['O', 23, 24],
      ['J', 9, 11, 7, 12, 2, 2], ['S', 6, 13, 5, 15, 2, 2],
      ['J', 17, 11, 18, 13, 2, 2], ['S', 19, 13, 21, 12, 2, 2]]),
    guantes: [].concat(H, TRONCO, PIERNAS, [
      ['J', 9, 11, 9, 13, 2, 1], ['G', 10, 14, 10, 16, 2, 1],
      ['J', 17, 11, 17, 13, 2, 1], ['G', 16, 14, 16, 16, 2, 1], ['O', 12, 13]]),
    barrida: [
      ['J', 8, 16, 7, 18, 2, 2], ['S', 6, 19, 5, 21, 2, 2], ['G', 4, 22, 4, 22, 2, 2],
      ['T', 10, 14, 13, 17, 4, 4], ['P', 15, 19, 17, 20, 3, 3],
      ['S', 19, 18, 21, 17, 2, 2], ['C', 22, 17, 24, 18, 2, 2], ['B', 26, 17, 26, 17, 2, 2],
      ['S', 20, 21, 21, 21, 2, 2], ['C', 22, 21, 24, 21, 2, 2], ['B', 26, 20, 26, 20, 2, 3],
      ['H', 4, 8], ['J', 13, 13, 14, 12, 2, 2], ['S', 15, 11, 17, 9, 2, 2], ['O', 22, 23]],
    atajada: [
      ['B', 0, 17, 0, 17, 2, 2], ['C', 2, 17, 4, 16, 2, 2], ['S', 5, 16, 6, 15, 2, 2],
      ['B', 0, 21, 0, 21, 2, 2], ['C', 2, 21, 4, 20, 2, 2], ['S', 5, 19, 6, 18, 2, 2],
      ['P', 7, 14, 8, 13, 1, 5], ['T', 9, 13, 14, 11, 1, 5], ['H', 15, 8],
      ['J', 14, 9, 15, 7, 2, 2], ['S', 17, 6, 20, 4, 2, 2], ['G', 21, 2, 22, 2, 2, 3], ['G', 23, 6, 23, 6, 2, 2], ['O', 24, 0]],
    // En el aire, de espaldas al suelo: cabeza abajo a la izquierda, cadera
    // arriba y la pierna que remata pasando por encima de la cabeza.
    chilena: [
      ['S', 7, 21, 6, 24, 2, 1], ['J', 11, 18, 12, 20, 2, 2], ['S', 13, 22, 14, 24, 2, 2],
      ['S', 19, 6, 21, 7, 2, 2], ['C', 22, 9, 22, 12, 2, 2], ['B', 22, 14, 22, 14, 3, 2],
      ['T', 9, 14, 14, 9, 4, 4], ['P', 16, 7, 17, 6, 3, 3], ['H', 2, 14],
      ['S', 15, 5, 13, 3, 2, 2], ['C', 11, 2, 8, 1, 2, 2], ['B', 5, 0, 6, 0, 2, 2], ['O', 0, 1]]
  };
  var POR_PUESTO = {
    POR: ['atajada', 'guantes'],
    DEF: ['barrida', 'balon', 'corre', 'brazos', 'barrida'],
    MED: ['corre', 'balon', 'remate', 'abierto'],
    DEL: ['remate', 'brazos', 'corre', 'abierto', 'chilena']
  };

  // ---------- Rasgos por jugador ----------
  // id: [piel 0-4, peinado, tinte 0-5, barba, pose, cinta]
  // Tintes: 0 negro, 1 castano, 2 rubio, 3 pelirrojo, 4 cano, 5 castano claro.
  var RASGOS = {
    Q11584: [1, 'fleco', 1, '', 'atajada'],            // Casillas
    Q215963: [1, 'corto', 0, '', 'guantes'],           // Zubizarreta
    Q295797: [0, 'corto', 2, 'sombra', 'atajada'],     // K. Schmeichel
    Q68060: [1, 'medio', 0, 'sombra', 'guantes'],      // Buffon
    Q107365: [0, 'corto', 2, '', 'guantes'],           // Neuer
    Q1907: [1, 'corto', 1, 'sombra', 'atajada'],       // Lloris
    Q215522: [2, 'rizos', 0, '', 'atajada', 1],        // Ochoa
    Q200785: [2, 'calvo', 0, 'barba', 'guantes'],      // Howard
    Q215812: [0, 'corto', 1, '', 'atajada'],           // Given
    Q483137: [0, 'casco', 0, '', 'guantes'],           // Cech
    Q483309: [1, 'medio', 1, 'sombra', 'brazos', 1],   // Sergio Ramos
    Q483027: [1, 'medio', 1, '', 'barrida'],           // Maldini
    Q52876: [1, 'corto', 0, '', 'corre'],              // Zanetti
    Q80306: [1, 'rapado', 0, 'sombra', 'barrida'],     // Chiellini
    Q429039: [3, 'calvo', 0, '', 'remate'],            // Roberto Carlos
    Q208050: [1, 'rapado', 0, 'barba', 'brazos'],      // Bonucci
    Q192840: [0, 'corto', 2, '', 'balon'],             // Hyypia
    Q13865408: [0, 'corto', 5, 'sombra', 'corre'],     // Kimmich
    Q17507: [0, 'corto', 1, 'barba', 'brazos'],        // Pique
    Q36386: [1, 'medio', 1, '', 'remate'],             // Matthaus
    Q43682: [0, 'corto', 1, '', 'corre'],              // Lahm
    Q17158: [1, 'largo', 1, '', 'barrida'],            // Puyol
    Q39230: [3, 'corto', 0, 'sombra', 'balon'],        // Marquinhos
    Q219657: [0, 'corto', 2, '', 'remate'],            // F. de Boer
    Q485697: [2, 'calvo', 0, '', 'barrida'],           // Pepe
    Q615: [1, 'fleco', 1, '', 'cielo'],                // Messi
    Q11571: [1, 'copete', 0, '', 'siu'],               // Cristiano
    Q1354960: [2, 'rizos', 0, 'barba', 'abierto'],     // Salah
    Q266613: [0, 'rapado', 1, '', 'chilena'],          // Rooney
    Q43666: [0, 'corto', 1, '', 'brazos'],             // Muller
    Q41533: [0, 'corto', 1, '', 'cielo'],              // Lampard
    Q201825: [1, 'cresta', 0, '', 'corre'],            // Hamsik
    Q459830: [0, 'corto', 1, '', 'remate'],            // Gerrard
    Q209650: [0, 'medio', 1, '', 'balon'],             // Litmanen
    Q11954: [0, 'corto', 5, 'sombra', 'brazos'],       // Mertens
    Q142794: [2, 'cresta', 2, '', 'balon'],            // Neymar
    Q209942: [4, 'corto', 0, 'sombra', 'corre'],       // Mane
    Q214204: [1, 'corto', 1, 'sombra', 'balon'],       // Hazard
    Q17500: [1, 'corto', 0, 'sombra', 'balon'],        // Xavi
    Q250553: [2, 'medio', 0, '', 'corre'],             // Aguinaga
    Q357984: [0, 'corto', 3, '', 'remate'],            // De Bruyne
    Q21621995: [3, 'rapado', 0, '', 'cruzados'],       // Mbappe
    Q969725: [0, 'corto', 5, 'sombra', 'remate'],      // Kane
    Q46896: [1, 'coleta', 0, 'candado', 'chilena'],    // Ibrahimovic
    Q179334: [2, 'largo', 0, '', 'brazos'],            // Larsson
    Q377971: [2, 'corto', 0, '', 'remate'],            // Cardozo
    Q26517: [1, 'corto', 0, 'sombra', 'brazos'],       // Luis Suarez
    Q45901: [3, 'rapado', 0, '', 'corre'],             // Henry
    Q956498: [1, 'rizos', 0, '', 'brazos'],            // Hermosillo
    Q119562: [1, 'corto', 0, '', 'abierto'],           // Aguero
    Q167790: [1, 'largo', 0, 'sombra', 'remate', 1],   // Cavani
    Q361418: [1, 'corto', 0, 'bigote', 'remate'],      // Fernando Gomes
    Q1255625: [4, 'rapado', 0, '', 'brazos'],          // Eto'o
    Q439914: [2, 'corto', 0, '', 'remate']             // Paredes
  };

  // Resto de la serie, en corto: "piel peinado tinte [barba] [!cinta] [:pose]".
  // Peinados: c corto, f fleco, r al ras, k calvo, m melena, l largo, x cresta,
  // p copete, z rizos, o coleta. Barbas: s sombra, b barba, g candado, m bigote.
  // Sin pose, la carta usa una segun su puesto. Los que no estan aqui siguen en silueta.
  var CORTO = {
    // Porteros
    Q311711: '0m1', Q180661: '1c0', Q182314: '0c2', Q436650: '0c0m', Q2058682: '0c1', Q131261: '0c2', Q313161: '1c0', Q482955: '0c1',
    Q73360: '0c1s', Q13014035: '0c5', Q166844: '4c0m', Q295887: '1c0', Q371002: '0c1', Q354327: '2m0', Q244799: '0z0', Q213002: '0c1s',
    Q214498: '0o0m', Q713627: '0c2s', Q350644: '1c0', Q436987: '2c0', Q216312: '2c0', Q241378: '0k0', Q553903: '0c2', Q18237361: '1c1b',
    Q205773: '0c2', Q319257: '0z1', Q182459: '2c0', Q293437: '2z0', Q530450: '2c0s', Q969423: '2c0', Q187184: '0c2', Q465817: '1c0m',
    Q140319: '1m0', Q443423: '1c0m', Q191139: '0k0', Q460521: '4r0', Q217095: '1c0', Q211120: '0c2', Q188997: '0c1', Q713648: '2l0!',
    Q294302: '1c0', Q150268: '0c1s', Q23908113: '1c0s', Q294980: '1c0s', Q20830808: '1c0s', Q356814: '0r1', Q3275904: '1c1b', Q614334: '0c1',
    Q954475: '1k0', Q188544: '4r0', Q667596: '0c2', Q295891: '0c2', Q182685: '0c1', Q3571952: '2c0s', Q1924: '4r0s', Q270311: '0c2',
    Q237494: '3l0m', Q203749: '1c0', Q444295: '0c1m',
    // Defensas
    Q214903: '1c0s', Q31981: '3c0', Q172720: '2r0', Q205499: '1c0', Q348857: '0c1', Q313170: '0c1', Q147589: '4r0', Q208689: '2l0',
    Q192491: '0c1b', Q311227: '1z0', Q189984: '1c0', Q235159: '1c0m', Q2562953: '4r0', Q214886: '1c0', Q509374: '3l0', Q316717: '0c1',
    Q449624: '2c0', Q161571: '1r0', Q83456: '0c1', Q356418: '0c2', Q15915040: '0c1s', Q187159: '1c0s', Q181921: '0c1', Q133903: '2o0s',
    Q189827: '0c3', Q316724: '0c1', Q13634114: '1c0s', Q137899: '2c0', Q299608: '1c1', Q44073: '1c0', Q128912: '0c2', Q192913: '0k0',
    Q133556: '3r0', Q210453: '3c0', Q182063: '1c0b', Q110053: '0c0s', Q891694: '1c0', Q343093: '0c2', Q353013: '3c0', Q3192187: '4r0s',
    Q286448: '0c0', Q297721: '3c0', Q189535: '1m0', Q184277: '4r0', Q178683: '3c0', Q366577: '0z1', Q208586: '0c1', Q132026: '0c0',
    Q180326: '4k0', Q147896: '4r0', Q483417: '3r0', Q299391: '0c1', Q461587: '1m0', Q361953: '1c0', Q201381: '3k0', Q93555: '0c1',
    Q193625: '4k0', Q308925: '0c0', Q182907: '1c0', Q241502: '0c1', Q186330: '2c0', Q1164700: '0c1b', Q231348: '3r0', Q59108: '3r0',
    Q128840: '0c2', Q1916: '4r0', Q213828: '1c0', Q29495: '0c1', Q313158: '2c0s', Q380200: '3c0', Q579681: '2c0', Q68064: '1c0',
    Q215358: '0c1', Q38136: '3z0', Q185093: '1c1', Q327285: '0c2', Q2025900: '0c1', Q15802: '1c0', Q284015: '2c0', Q673691: '0c2',
    Q315839: '1z0m', Q2499879: '4r0',
    // Medios
    Q43729: '0r0', Q168497: '1c1b', Q161069: '1c0', Q483837: '0m2!', Q44298: '0c2', Q17163: '0m1', Q43913: '0k0', Q713895: '0c1s',
    Q102331: '2z0b!', Q49704: '1c0', Q10520: '0f2:remate', Q46347: '4r0', Q47526: '1m5', Q15521306: '1c0s', Q20110: '1m5', Q316222: '2c0',
    Q251683: '1c0', Q294951: '0c2', Q709415: '1c0', Q296583: '0z1', Q161054: '0c1s', Q346751: '1c0', Q210083: '1c0', Q166263: '0c0',
    Q309672: '1z1', Q4979316: '1c0s', Q43926: '1m1', Q1894: '3x2', Q7197034: '0c1', Q8338725: '2c0s', Q472401: '2z0m', Q187238: '1r0',
    Q17515: '2z0:balon', Q131234: '0c2', Q531814: '1m0:cielo', Q312157: '3r0', Q516921: '4r0', Q184586: '0c1', Q730518: '2l0!', Q1918: '0r1',
    Q10536: '3c0', Q956482: '2c0', Q558689: '1c0', Q113156: '1c0g', Q294214: '0z2', Q483145: '1c0', Q296965: '1c0', Q45613: '0c3',
    Q203665: '2c0', Q11958: '0c1', Q273715: '0c1', Q115453: '0c2', Q155919: '0z1', Q163974: '0c1', Q514427: '0c1', Q484909: '4r0',
    Q58441: '3c0', Q169098: '3z0m', Q171295: '0m2', Q378005: '2c0', Q1387961: '2c0:chilena', Q581551: '2c0', Q763465: '1c0s', Q542031: '1c0',
    Q10524: '0z0', Q313780: '1c0', Q46679: '4r0', Q192640: '0c1', Q314376: '1m0', Q1835: '1k0:remate', Q3845710: '0c1s', Q151025: '0c2',
    Q10547335: '0c1s', Q2268949: '2c0', Q482851: '2c0', Q18044401: '4r0', Q39444: '3l0!:balon', Q725460: '2c0', Q2060182: '1z1', Q311046: '3c0',
    Q19364: '1c0', Q213427: '0c1', Q152377: '0p2', Q276091: '1c0s',
    // Delanteros
    Q312334: '1c0', Q1912: '2r0b', Q543368: '1c0', Q487155: '2z0:chilena', Q483629: '0c1:remate', Q41244: '0c2', Q178649: '3c0', Q28967995: '0o2',
    Q152871: '0c2', Q83006: '1c0g', Q483583: '0c1:brazos', Q455462: '0c2', Q11576: '1c0', Q26069: '0c1', Q207644: '2c0', Q219354: '0c0m',
    Q44977: '3x0', Q439722: '1c0', Q204059: '0r0', Q624: '1c0', Q128829: '0c1', Q21484126: '1c0', Q183967: '0r0', Q42731: '0m2',
    Q261534: '0m2!', Q313438: '0c1', Q2339: '0c0', Q441769: '2c0', Q153786: '0c1', Q13494: '0c0:remate', Q1357496: '1c1', Q313316: '4r0s',
    Q310519: '0c1', Q184612: '0c1', Q204825: '3c0', Q185389: '0c2', Q362712: '0c1', Q483846: '1c0', Q742644: '4z0', Q48892: '4l0',
    Q138172: '1l0!', Q45626: '0c0', Q213437: '1c0', Q152492: '1m0', Q470729: '0c0', Q188696: '1c0s', Q187198: '0c1', Q45766: '1c0',
    Q342707: '4r0', Q1911: '0p1b', Q193568: '1m0', Q17070837: '1c0b', Q314719: '2r0', Q313911: '0c2', Q47778: '1c0', Q1940: '0r0b',
    Q189686: '3r0', Q180649: '1l0', Q32763: '1c0', Q187125: '0c0', Q311362: '0c0', Q312772: '1c0b', Q218165: '1c0', Q449873: '0k0',
    Q317863: '0c2', Q311520: '0z1', Q346945: '1c0', Q41235: '0z2', Q214513: '0z0:remate', Q214233: '3r0', Q109397: '2c0', Q192963: '3r0'
  };
  var PEINADO = { c: 'corto', f: 'fleco', r: 'rapado', k: 'calvo', m: 'medio', l: 'largo', x: 'cresta', p: 'copete', z: 'rizos', o: 'coleta' };
  var BARBA = { s: 'sombra', b: 'barba', g: 'candado', m: 'bigote' };
  Object.keys(CORTO).forEach(function (id) {
    var m = /^(\d)([a-z])(\d)([sbgm]?)(!?)(?::(\w+))?$/.exec(CORTO[id]);
    if (m && !RASGOS[id]) { RASGOS[id] = [+m[1], PEINADO[m[2]], +m[3], BARBA[m[4]] || '', m[6] || '', m[5] ? 1 : 0]; }
  });

  function semilla(id) { var h = 0; for (var i = 0; i < id.length; i++) { h = (h * 31 + id.charCodeAt(i)) >>> 0; } return h; }

  var BALONES = { clasico: ['#f7f7f2', '#23272e'], retro: ['#a8703a', '#4a2c10'], naranja: ['#ff8a1f', '#3a1c00'],
    neon: ['#d6ff3f', '#1c2a00'], dorado: ['#ffd23f', '#8a6500'] };
  var TACHOS = { negro: '#0b0d10', blanco: '#f4f1e6', rojo: '#d8382f', azul: '#2f6fe0', neon: '#c8f04a', dorado: '#ffd23f' };
  // a cuerpo, n ojo, y pico, p detalle.
  var MASCOTAS = {
    perro: { c: { a: '#b07a45', n: '#14110f', p: '#5a3a22' }, f: ['....pa.', 'a...ana', 'aaaaaa.', '.aaaa..', '.a..a..'] },
    gato: { c: { a: '#9aa0a8', n: '#14110f', p: '#f4f1e6' }, f: ['a...a.a', 'a...ana', '.aaaaa.', '.aaaa..', '.p..p..'] },
    perico: { c: { a: '#3fbf5a', n: '#14110f', y: '#ffd23f', p: '#d8382f' }, f: ['..pp...', '.anay..', '.aaaa..', '..aaa..', '..y.y..'] },
    ajolote: { c: { a: '#f7a8c4', n: '#14110f', p: '#d8558a' }, f: ['p.aaa.p', '.anana.', 'p.aaa.p', '..aaaa.', '..a..a.'] }
  };

  // c: {id, pos, col:[c1,c2,patron], r: rareza 0-3}
  function dibujar(c) {
    var R = RASGOS[c.id], h = semilla(c.id);
    var t = R ? { piel: R[0], pelo: R[1], tinte: R[2], barba: R[3], cinta: R[5] } : { piel: 0, pelo: 'corto', tinte: 0, sil: true };
    var lista = POR_PUESTO[c.pos] || POR_PUESTO.MED;
    return figura({ t: t, pose: R && R[4] ? R[4] : lista[h % lista.length], col: c.col, pos: c.pos, r: c.r, h: h }, 'pxc');
  }

  // o: {t: rasgos, pose, col, pos, r, h, botin, balon, mascota}
  function figura(o0, clase) {
    var t = o0.t, h = o0.h || 1, c = { pos: o0.pos, r: o0.r === undefined ? 3 : o0.r };
    var pose = POSES[o0.pose] || POSES.balon, bal = BALONES[o0.balon] || BALONES.clasico;
    var c1 = o0.col[0], c2 = o0.col[1], pat = o0.col[2];
    var piel = t.sil ? SOMBRA : PIEL[t.piel];
    var color = { J: pat === 'sleeves' ? c2 : c1, S: piel, G: c.pos === 'POR' ? '#f4f1e6' : piel,
      P: clara(c1) ? '#1b1f2a' : '#f4f1e6', C: c1, B: TACHOS[o0.botin] || TACHOS.negro };
    var g = {}, orden = [];
    function px(x, y, col) { var k = x + ',' + y; if (!(k in g)) { orden.push(k); } g[k] = col; }

    // Destellos de fondo para las rarezas altas (siempre los mismos por carta).
    if (c.r <= 1) {
      for (var n = 0; n < (c.r === 0 ? 14 : 8); n++) { h = (h * 1103515245 + 12345) >>> 0; px(h % 28, (h >> 8) % 20, 'rgba(255,255,255,.75)'); }
    }
    var M = MASCOTAS[o0.mascota];
    if (M) {
      M.f.forEach(function (f, j) { for (var i = 0; i < 7; i++) { if (f[i] !== '.') { px(i - 1, 20 + j, M.c[f[i]]); } } });
    }
    // El monito siempre lleva su balon: si la pose no trae uno, va a un lado.
    if (o0.balon && !pose.some(function (o) { return o[0] === 'O'; })) { pose = pose.concat([['O', 24, 22]]); }
    pose.forEach(function (o) {
      if (o[0] === 'H') { cabeza(t, px, o[1], o[2]); return; }
      if (o[0] === 'O') {
        ['.ww.', 'wwnw', 'wnww', '.ww.'].forEach(function (f, j) {
          for (var i = 0; i < 4; i++) { if (f[i] !== '.') { px(o[1] + i, o[2] + j, f[i] === 'w' ? bal[0] : bal[1]); } }
        });
        return;
      }
      var x = o[1], y = o[2], dx = Math.abs(o[3] - x), dy = Math.abs(o[4] - y), sx = x < o[3] ? 1 : -1, sy = y < o[4] ? 1 : -1;
      var err = dx - dy, u = 0, w = o[5], hh = o[6], largo = Math.max(dx, dy) + 1, i, j;
      for (;;) {
        for (i = 0; i < w; i++) {
          for (j = 0; j < hh; j++) {
            var col = color[o[0]];
            if (o[0] === 'T') {
              // v: a lo ancho del torso; u: a lo largo.
              var v = w > hh ? i : hh > w ? j : i, ancho = Math.max(w, hh);
              var dos = pat === 'stripes' ? v % 2 === 1 : pat === 'hoops' ? (u + (w === hh ? j : 0)) % 2 === 1 :
                pat === 'halves' ? v >= ancho / 2 : pat === 'band' ? Math.abs(v - (ancho - 1) / 2) < 1 :
                pat === 'hband' ? Math.abs(u - largo / 2 + 1) < 1.5 : pat === 'sash' ? Math.abs(v - u * ancho / largo) < 1.2 : false;
              col = dos ? c2 : c1;
            }
            px(x + i, y + j, col);
          }
        }
        if (x === o[3] && y === o[4]) { break; }
        var e2 = 2 * err;
        if (e2 > -dy) { err -= dy; x += sx; }
        if (e2 < dx) { err += dx; y += sy; }
        u++;
      }
    });
    var out = '';
    orden.forEach(function (k) {
      var p = k.split(',');
      out += '<rect x="' + p[0] + '" y="' + p[1] + '" width="1.03" height="1.03" fill="' + g[k] + '"/>';
    });
    return '<svg class="' + clase + '" viewBox="-1 0 30 28" shape-rendering="crispEdges" aria-hidden="true">' +
      '<rect x="-1" y="25" width="30" height="3" fill="rgba(0,0,0,.22)"/>' + out + '</svg>';
  }

  return { dibujar: dibujar, figura: figura, conRasgos: function (id) { return !!RASGOS[id]; }, nRasgos: Object.keys(RASGOS).length,
    POSES: POSES, PELOS: PELOS, BARBAS: BARBAS, PIEL: PIEL, TINTE: TINTE, BALONES: BALONES, TACHOS: TACHOS, MASCOTAS: MASCOTAS };
})();
