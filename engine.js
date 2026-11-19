// Motor del juego: sin DOM, para poder probarlo y calibrarlo con node.
// Solo usa datos reales del jugador: partidos y goles de liga con el club,
// y partidos con su seleccion mayor.
(function (root) {
  'use strict';

  // Fut 7 en 2-3-1. El orden de este arreglo es el de la alineacion.
  var SLOTS = ['POR', 'DEF', 'DEF', 'MED', 'MED', 'MED', 'DEL'];
  var PARTIDOS = 38;

  // El gol por partido de un delantero pesa mas que el de un defensa;
  // al portero no se le pide gol.
  var W_GOL = { POR: 0, DEF: 1, MED: 2, DEL: 3 };
  // Peso de cada categoria en la fuerza total.
  var CATW = { atk: 0.40, sel: 0.35, tra: 0.25 };
  var CATS = ['atk', 'sel', 'tra'];

  // Perillas de calibracion (ver calibrar.js).
  var CFG = {
    piso: 0.10,      // percentil de alineaciones al azar que gana 0 partidos
    techo: 0.90,     // fraccion de la fuerza maxima teorica que da 38-0-0
    curva: 1.4,      // >1: cada victoria extra cuesta mas fuerza
    goles: 1.4,      // goles esperados por equipo en un duelo parejo
    ventaja: 1.6,    // cuanto inclina el marcador la diferencia de fuerza
    topes: [         // una categoria floja limita el record
      { bajo: 35, max: 24 },
      { bajo: 50, max: 31 }
    ]
  };

  // Convierte la base (LIGAS + CLUBS) en la lista de club-decada de una liga.
  function combosDeLiga(liga, clubs) {
    var out = [];
    liga.clubs.forEach(function (cid) {
      var c = clubs[cid];
      Object.keys(c.d).forEach(function (d) {
        out.push({
          cid: cid, club: c.n, colores: c.c, dec: +d,
          players: c.d[d].map(function (j) {
            var m = j[3], g = j[4], caps = j[5];
            return {
              id: j[0], name: j[1], pos: j[2].split(','), m: m, g: g, caps: caps, y0: j[6], y1: j[7],
              cid: cid, club: c.n, colores: c.c, dec: +d,
              // Indicadores 0-1 derivados de los datos reales. La raiz evita que
              // 150 partidos de seleccion valgan el triple que 50.
              // Los 40 partidos extra restan peso a rachas cortas: 20 goles en 30
              // partidos no valen lo mismo que 200 en 300.
              gpp: g / (m + 40),
              sel: Math.min(1, Math.sqrt(caps / 120)),
              tra: Math.min(1, Math.sqrt(m / 400))
            };
          })
        });
      });
    });
    return out;
  }

  function raw(lineup) {
    var s = 0, w = 0, sel = 0, tra = 0, n = 0;
    lineup.forEach(function (p, i) {
      if (!p) { return; }
      var ww = W_GOL[SLOTS[i]];
      s += ww * p.gpp; w += ww;
      sel += p.sel; tra += p.tra; n++;
    });
    return { atk: w ? s / w : 0, sel: n ? sel / n : 0, tra: n ? tra / n : 0 };
  }

  // Mejor alineacion posible segun una funcion de aporte (voraz, sin repetir jugador).
  function best(all, score) {
    var used = {}, lineup = [];
    [6, 3, 4, 5, 1, 2, 0].forEach(function (i) {
      var t = SLOTS[i], top = null, topS = -1;
      all.forEach(function (p) {
        if (used[p.id] || p.pos.indexOf(t) < 0) { return; }
        var s = score(p, t);
        if (s > topS) { topS = s; top = p; }
      });
      if (top) { used[top.id] = 1; lineup[i] = top; }
    });
    return lineup;
  }

  function build(combos) {
    var all = [];
    combos.forEach(function (c) { all = all.concat(c.players); });

    // Maximo teorico de cada categoria dentro de esta liga: lleva todo a indice 0-100,
    // asi cada liga se mide contra su propio techo.
    var maxRaw = {
      atk: raw(best(all, function (p, t) { return W_GOL[t] * p.gpp; })).atk,
      sel: raw(best(all, function (p) { return p.sel; })).sel,
      tra: raw(best(all, function (p) { return p.tra; })).tra
    };
    var sumW = SLOTS.reduce(function (s, t) { return s + W_GOL[t]; }, 0);

    // Cuanto aporta un jugador a la fuerza total si ocupa el puesto t.
    function aporte(p, t) {
      return 100 * (CATW.atk * W_GOL[t] * p.gpp / (sumW * maxRaw.atk) +
        CATW.sel * p.sel / (SLOTS.length * maxRaw.sel) +
        CATW.tra * p.tra / (SLOTS.length * maxRaw.tra));
    }
    function indices(lineup) {
      var r = raw(lineup), idx = {};
      CATS.forEach(function (k) { idx[k] = 100 * r[k] / maxRaw[k]; });
      return idx;
    }
    function fuerza(idx) {
      return CATS.reduce(function (s, k) { return s + CATW[k] * idx[k]; }, 0);
    }
    var ideal = best(all, aporte);
    var sMax = fuerza(indices(ideal));

    // Piso de la liga: fuerza de una alineacion armada al azar (semilla fija,
    // para que el mismo siete de siempre el mismo record). Asi cada liga tiene
    // su propia escala aunque sus datos sean mas pobres.
    var sPiso = (function () {
      var seed = 7, rnd = function () { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
      var fs = [];
      for (var n = 0; n < 400; n++) {
        var lineup = [], used = {};
        for (var i = 0; i < SLOTS.length; i++) {
          for (var k = 0; k < 60 && !lineup[i]; k++) {
            var p = all[Math.floor(rnd() * all.length)];
            if (!used[p.id] && p.pos.indexOf(SLOTS[i]) >= 0) { lineup[i] = p; used[p.id] = 1; }
          }
        }
        fs.push(fuerza(indices(lineup)));
      }
      fs.sort(function (a, b) { return a - b; });
      return fs[Math.floor(CFG.piso * (fs.length - 1))];
    })();

    function proyectar(lineup) {
      var idx = indices(lineup), s = fuerza(idx);
      var x = (s - sPiso) / (CFG.techo * sMax - sPiso);
      x = Math.max(0, Math.min(1, x));
      var wins = Math.floor(PARTIDOS * (1 - Math.pow(1 - x, CFG.curva)) + 1e-9);

      var tope = null;
      CATS.forEach(function (k) {
        CFG.topes.forEach(function (t) {
          if (idx[k] < t.bajo && wins > t.max && (!tope || t.max < tope.max)) { tope = { cat: k, max: t.max }; }
        });
      });
      if (tope) { wins = tope.max; }

      var resto = PARTIDOS - wins;
      // Un equipo flojo pierde mas de lo que empata; uno fuerte casi no pierde.
      var empates = Math.round(resto * 0.45 * (0.5 + x));
      return { idx: idx, fuerza: s, g: wins, e: empates, p: resto - empates, tope: tope, nivel: nivel(wins) };
    }

    // Siete del campeon de un anio: los jugadores de ese club cuya etapa cubre
    // el anio; si no alcanzan para los siete puestos, se completa con el plantel
    // de esa decada. Devuelve null si ni asi se llena.
    function rival(cid, anio) {
      var dec = Math.floor(anio / 10) * 10, vistos = {}, exactos = [], decada = [];
      combos.forEach(function (c) {
        if (c.cid !== cid) { return; }
        c.players.forEach(function (p) {
          if (vistos[p.id]) { return; }
          if (p.y0 <= anio && p.y1 >= anio) { vistos[p.id] = 1; exactos.push(p); }
          else if (c.dec === dec) { decada.push(p); }
        });
      });
      var l = best(exactos, aporte);
      if (l.filter(Boolean).length < SLOTS.length) { l = best(exactos.concat(decada.filter(function (p) { return !vistos[p.id]; })), aporte); }
      return l.filter(Boolean).length === SLOTS.length ? l : null;
    }

    // Partido unico entre dos sietes. Los goles esperados salen de la diferencia
    // de fuerza; la semilla hace que el mismo cruce de siempre el mismo marcador.
    function duelo(a, b, semilla) {
      var rnd = azar(semilla);
      var d = (fuerza(indices(a)) - fuerza(indices(b))) / (CFG.techo * sMax - sPiso);
      var ga = poisson(CFG.goles * Math.exp(CFG.ventaja * d), rnd);
      var gb = poisson(CFG.goles * Math.exp(-CFG.ventaja * d), rnd);
      var pen = null;
      if (ga === gb) {
        var gana = rnd() < Math.max(0.2, Math.min(0.8, 0.5 + 0.6 * d)), menos = 2 + Math.floor(rnd() * 3);
        pen = gana ? [menos + 1, menos] : [menos, menos + 1];
      }
      return { ga: ga, gb: gb, pen: pen, gana: pen ? pen[0] > pen[1] : ga > gb };
    }

    // Modo copa: una eliminatoria de cuatro rondas contra campeones sorteados
    // (del mas flojo al mas fuerte) y la vitrina: el duelo contra cada campeon.
    function copa(lineup, lista) {
      var firma = lineup.map(function (p) { return p.id; }).join('');
      var rivales = [];
      lista.forEach(function (c) {
        var l = rival(c[1], c[0]);
        if (l) { rivales.push({ anio: c[0], cid: c[1], club: l[0].club, colores: l[0].colores, siete: l, f: fuerza(indices(l)) }); }
      });
      var vitrina = rivales.map(function (r) {
        var m = duelo(lineup, r.siete, firma + r.anio);
        return { anio: r.anio, club: r.club, ga: m.ga, gb: m.gb, pen: m.pen, gana: m.gana };
      });
      var rnd = azar(firma + 'sorteo'), bolsa = rivales.slice(), cuatro = [];
      while (cuatro.length < 4 && bolsa.length) { cuatro.push(bolsa.splice(Math.floor(rnd() * bolsa.length), 1)[0]); }
      cuatro.sort(function (x, y) { return x.f - y.f; });
      var vivo = true, llego = 'Campeón';
      var rondas = cuatro.map(function (r, i) {
        var o = { fase: FASES[i], anio: r.anio, club: r.club, colores: r.colores, siete: r.siete, jugado: vivo };
        if (vivo) {
          var m = duelo(lineup, r.siete, firma + r.anio + 'copa');
          o.ga = m.ga; o.gb = m.gb; o.pen = m.pen; o.gana = m.gana;
          if (!m.gana) { vivo = false; llego = FASES[i]; }
        }
        return o;
      });
      return { rondas: rondas, campeon: vivo, llego: llego, vitrina: vitrina, titulos: vitrina.filter(function (v) { return v.gana; }).length };
    }

    return { combos: combos, proyectar: proyectar, aporte: aporte, sMax: sMax, sPiso: sPiso, ideal: ideal, rival: rival, duelo: duelo, copa: copa };
  }

  var FASES = ['Octavos', 'Cuartos', 'Semifinal', 'Final'];

  // Generador con semilla a partir de un texto.
  function azar(texto) {
    var h = 2166136261;
    for (var i = 0; i < texto.length; i++) { h = Math.imul(h ^ texto.charCodeAt(i), 16777619); }
    return function () {
      h += 0x6D2B79F5; var t = h;
      t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function poisson(lam, rnd) {
    var L = Math.exp(-lam), k = 0, p = 1;
    do { k++; p *= rnd(); } while (p > L);
    return k - 1;
  }

  function nivel(w) {
    if (w >= PARTIDOS) { return 'Invicto perfecto'; }
    if (w >= 32) { return 'Histórico'; }
    if (w >= 26) { return 'Campeón'; }
    if (w >= 20) { return 'Zona de copas'; }
    if (w >= 10) { return 'Media tabla'; }
    return 'Descenso';
  }

  var api = { SLOTS: SLOTS, PARTIDOS: PARTIDOS, CFG: CFG, CATS: CATS, build: build, combosDeLiga: combosDeLiga };
  if (typeof module !== 'undefined') { module.exports = api; } else { root.Engine = api; }
})(this);
