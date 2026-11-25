// Perfil del jugador: monedas, monito en pixel, sobres y album de cartas.
// Todo vive en el navegador (localStorage); no hay servidor ni dinero real.
var Perfil = (function () {
  'use strict';
  var CLAVE = 'invicto7';
  var $ = function (id) { return document.getElementById(id); };
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  // ---------- Estado guardado ----------
  var D = { nombre: '', monedas: 150, trofeos: 0, cartas: {}, items: {}, partidas: 0, festejo: 'saludo',
    cfg: { musica: true, fx: true, volM: 0.5, volF: 0.7, vibra: true, quieto: false },
    av: { piel: 1, tinte: 0, pelo: 'corto', acc: '', jersey: 'verde' } };
  try {
    var g = JSON.parse(localStorage.getItem(CLAVE) || 'null');
    if (g) { Object.keys(g).forEach(function (k) { D[k] = g[k]; }); }
  } catch (err) { /* sin almacenamiento: se juega igual, sin guardar */ }
  function guardar() { try { localStorage.setItem(CLAVE, JSON.stringify(D)); } catch (err) { /* idem */ } }

  // ---------- Monito ----------
  // Lo dibuja Arte, igual que a las cartas. Cada opcion: [clave, nombre, precio].
  var CATALOGO = [
    ['pelo', 'Peinado', [['corto', 'Corto', 0], ['fleco', 'Fleco', 0], ['rapado', 'Al ras', 0], ['calvo', 'Calvo', 0], ['medio', 'Melena', 100],
      ['largo', 'Largo', 150], ['rizos', 'Rizos', 200], ['copete', 'Copete', 200], ['coleta', 'Coleta', 250], ['cresta', 'Cresta', 300]]],
    ['barba', 'Barba', [['', 'Sin barba', 0], ['sombra', 'De tres días', 50], ['bigote', 'Bigote', 100], ['candado', 'Candado', 100], ['barba', 'Barba', 150]]],
    ['acc', 'Accesorio', [['', 'Ninguno', 0], ['cinta', 'Cinta', 150], ['lentes', 'Lentes', 250], ['gorra', 'Gorra', 300], ['corona', 'Corona', 1500]]],
    ['botin', 'Tachos', [['negro', 'Negros', 0], ['blanco', 'Blancos', 100], ['rojo', 'Rojos', 150], ['azul', 'Azules', 150], ['neon', 'Neón', 250], ['dorado', 'Dorados', 600]]],
    ['balon', 'Balón', [['clasico', 'Clásico', 0], ['retro', 'De cuero', 150], ['naranja', 'Naranja', 200], ['neon', 'Neón', 250], ['dorado', 'Dorado', 800]]],
    ['mascota', 'Mascota', [['', 'Sin mascota', 0], ['perro', 'Perro', 400], ['gato', 'Gato', 400], ['perico', 'Perico', 500], ['ajolote', 'Ajolote', 700]]],
    ['pose', 'Pose y festejo', [['balon', 'De pie', 0], ['brazos', 'Brazos arriba', 0], ['corre', 'Corriendo', 150], ['remate', 'Remate', 200],
      ['abierto', 'Brazos abiertos', 250], ['cielo', 'Al cielo', 300], ['cruzados', 'Brazos cruzados', 400], ['siu', 'El grito', 500], ['chilena', 'Chilena', 800]]]
  ];
  var PRECIO = {}, VALIDO = {};
  CATALOGO.forEach(function (c) {
    VALIDO[c[0]] = {};
    c[2].forEach(function (o) { PRECIO[c[0] + ':' + o[0]] = o[2]; VALIDO[c[0]][o[0]] = 1; });
  });

  // Camisetas: cuatro lisas gratis y cuatro versiones por club, hechas con sus
  // colores (no son replicas de una camiseta historica concreta).
  var BASICOS = { verde: ['#1f6b43', '#f2efe4', 'solid'], rojo: ['#c62828', '#f2efe4', 'solid'],
    azul: ['#1e4fa3', '#f2efe4', 'solid'], negro: ['#1b1f2a', '#c8f04a', 'solid'] };
  var VARIANTES = [['l', 'Local', 200], ['v', 'Visita', 200], ['r', 'Retro', 350], ['n', 'Edición negra', 500]];
  var RETRO = { solid: 'hband', stripes: 'halves', hoops: 'stripes', sash: 'band', band: 'sash', hband: 'stripes', sleeves: 'hoops', halves: 'stripes' };
  function oscuro(c) { var x = parseInt(c.slice(1), 16); return 0.3 * ((x >> 16) & 255) + 0.59 * ((x >> 8) & 255) + 0.11 * (x & 255) < 70; }
  function colJersey(k) {
    if (BASICOS[k]) { return BASICOS[k]; }
    var f = String(k).split('~'), c = CLUBS[f[0]] && CLUBS[f[0]].c;
    if (!c) { return BASICOS.verde; }
    return f[1] === 'v' ? [c[1], c[0], 'solid'] : f[1] === 'r' ? [c[0], c[1], RETRO[c[2]] || 'hband'] :
      f[1] === 'n' ? ['#15181c', oscuro(c[0]) ? c[1] : c[0], 'sash'] : c;
  }

  // Festejos para mandar al rival: [clave, nombre, precio, pose, frase].
  var FESTEJOS = [
    ['saludo', 'Buen partido', 0, 'brazos', 'Buen partido. Pero gané yo.'],
    ['cielo', 'Al cielo', 300, 'cielo', 'Esta va para arriba.'],
    ['grito', 'El grito', 400, 'siu', '¡Tómala!'],
    ['frio', 'Sangre fría', 500, 'cruzados', 'Así de fácil.'],
    ['rey', 'El rey', 700, 'abierto', '¿Quién manda aquí?'],
    ['chilena', 'De chilena', 1000, 'chilena', 'De chilena y sin despeinarme.']
  ];
  FESTEJOS.forEach(function (f) { PRECIO['festejo:' + f[0]] = f[2]; });
  function festejoDe(k) { return FESTEJOS.filter(function (f) { return f[0] === k; })[0] || FESTEJOS[0]; }

  // Deja un monito valido aunque venga de un enlace o de datos viejos.
  function limpio(a) {
    a = a || {};
    var o = { piel: Math.max(0, Math.min(4, a.piel | 0)), tinte: Math.max(0, Math.min(5, a.tinte | 0)), jersey: String(a.jersey || 'verde').slice(0, 40) };
    CATALOGO.forEach(function (c) { o[c[0]] = VALIDO[c[0]][a[c[0]]] ? a[c[0]] : c[2][0][0]; });
    return o;
  }
  function figuraDe(a, clase) {
    return Arte.figura({ t: { piel: a.piel, tinte: a.tinte, pelo: a.pelo, barba: a.barba, acc: a.acc }, pose: a.pose,
      col: colJersey(a.jersey), botin: a.botin, balon: a.balon, mascota: a.mascota }, clase);
  }
  D.av = limpio(D.av);
  D.festejo = festejoDe(D.festejo)[0];
  Sonido.config(D.cfg);
  document.body.classList.toggle('quieto', !!D.cfg.quieto);
  function monito(clase) { return figuraDe(D.av, clase); }
  function conPose(a, pose) { var o = {}; Object.keys(a).forEach(function (k) { o[k] = a[k]; }); o.pose = pose; return o; }

  function precio(k) {
    if (k in PRECIO) { return PRECIO[k]; }
    if (k.indexOf('jersey:') !== 0 || BASICOS[k.slice(7)]) { return 0; }
    var v = k.split('~')[1] || 'l', V = VARIANTES.filter(function (x) { return x[0] === v; })[0];
    return V ? V[2] : 200;
  }
  function tengo(k) { return !precio(k) || D.items[k]; }

  // ---------- Cartas ----------
  var RAREZAS = [
    { id: 'ultra', n: 'Ultra legendaria', dup: 400 },
    { id: 'leg', n: 'Legendaria', dup: 100 },
    { id: 'media', n: 'Media', dup: 30 },
    { id: 'basica', n: 'Básica', dup: 10 }
  ];
  // Cuantas cartas de cada rareza hay por puesto (ultra, legendaria, media, basica).
  var CUPOS = { POR: [2, 8, 20, 40], DEF: [3, 12, 30, 60], MED: [4, 12, 30, 60], DEL: [3, 10, 25, 50] };
  // Tres sobres. Las monedas salen de jugar; los trofeos solo de jugar bien
  // (26 victorias o mas, ganar la eliminatoria, ganarle a un amigo, el invicto).
  // prob: ultra, legendaria, media, basica. min: la tercera carta es de esa rareza o mejor.
  var SOBRES = {
    basico: { n: 'Sobre Potrero', corto: 'POTRERO', precio: 250, trofeos: 0, prob: [0.002, 0.02, 0.18, 0.798], txt: '3 cartas. Casi todas básicas.' },
    medio: { n: 'Sobre Clásico', corto: 'CLÁSICO', precio: 600, trofeos: 1, prob: [0.01, 0.07, 0.42, 0.50], min: 2, txt: '3 cartas, una media o mejor asegurada.' },
    elite: { n: 'Sobre Leyenda', corto: 'LEYENDA', precio: 1200, trofeos: 3, prob: [0.05, 0.25, 0.50, 0.20], min: 1, txt: '3 cartas, una legendaria o mejor asegurada.' }
  };
  function alcanza(S) { return D.monedas >= S.precio && D.trofeos >= S.trofeos; }
  var CARTAS = null, POR_ID = {};
  var SERIE = 'S1';   // los sobres nuevos traeran S2, S3...

  // La rareza sale de los datos reales: seleccion, trayectoria y gol, comparando
  // a cada jugador solo contra los de su puesto. Una carta por jugador, con el
  // club y la decada donde mas rindio.
  function cartas() {
    if (CARTAS) { return CARTAS; }
    var mejor = {};
    LIGAS.forEach(function (l) {
      Engine.combosDeLiga(l, CLUBS).forEach(function (c) {
        c.players.forEach(function (p) {
          var pos = p.pos[0], gN = Math.min(1, p.gpp / 0.7);
          var v = pos === 'DEL' ? 0.35 * p.sel + 0.2 * p.tra + 0.45 * gN :
            pos === 'MED' ? 0.45 * p.sel + 0.3 * p.tra + 0.25 * gN : 0.6 * p.sel + 0.4 * p.tra;
          if (!mejor[p.id] || v > mejor[p.id].v) {
            mejor[p.id] = { id: p.id, name: p.name, pos: pos, club: p.club, col: p.colores, dec: p.dec, m: p.m, g: p.g, caps: p.caps, v: v };
          }
        });
      });
    });
    CARTAS = [];
    Object.keys(CUPOS).forEach(function (pos) {
      var lista = Object.keys(mejor).map(function (k) { return mejor[k]; }).filter(function (c) { return c.pos === pos; })
        .sort(function (a, b) { return b.v - a.v; });
      var i = 0;
      CUPOS[pos].forEach(function (n, r) {
        lista.slice(i, i + n).forEach(function (c) { c.r = r; CARTAS.push(c); POR_ID[c.id] = c; });
        i += n;
      });
    });
    CARTAS.sort(function (a, b) { return a.r - b.r || b.v - a.v; });
    // Numero de coleccion: el orden dentro de la serie.
    CARTAS.forEach(function (c, i) { c.num = ('00' + (i + 1)).slice(-3); });
    return CARTAS;
  }

  function cartaHtml(c, extra) {
    var R = RAREZAS[c.r];
    return '<div class="carta r-' + R.id + '"><span class="num">' + SERIE + ' · ' + c.num + '/' + cartas().length + '</span><div class="arte">' + Arte.dibujar(c) + '</div>' +
      '<b>' + esc(c.name) + '</b><small>' + esc(c.club) + ' · ' + c.pos + '</small>' +
      '<small>PJ ' + c.m + (c.pos === 'POR' ? '' : ' · G ' + c.g) + ' · Sel ' + c.caps + '</small><i>' + R.n + '</i>' + (extra || '') + '</div>';
  }

  function abrir(tipo, gratis) {
    var S = SOBRES[tipo], todas = cartas(), out = [];
    if (!gratis) {
      if (!alcanza(S)) { return null; }
      D.monedas -= S.precio; D.trofeos -= S.trofeos;
    }
    for (var i = 0; i < 3; i++) {
      var t = Math.random(), r = 0, acc = 0;
      for (r = 0; r < 4; r++) { acc += S.prob[r]; if (t < acc) { break; } }
      r = Math.min(3, r);
      if (i === 2 && S.min !== undefined && r > S.min) { r = S.min; }
      var grupo = todas.filter(function (c) { return c.r === r; });
      var c = grupo[Math.floor(Math.random() * grupo.length)];
      var repetida = !!D.cartas[c.id];
      D.cartas[c.id] = (D.cartas[c.id] || 0) + 1;
      if (repetida) { D.monedas += RAREZAS[r].dup; }
      out.push({ c: c, repetida: repetida });
    }
    guardar();
    return out;
  }

  // ---------- Pantalla ----------
  var pestana = 'monito', aviso = '', recien = null;

  function chip() {
    $('chip').innerHTML = monito('pxm mini') + '<span><b>' + esc(D.nombre || 'Tu perfil') + '</b><small>' +
      Object.keys(D.cartas).length + ' cartas</small></span><span class="monedas"><i></i>' + D.monedas + '</span><span class="trofeos"><i></i>' + D.trofeos + '</span>';
  }

  function boton(k, etiqueta, puesto) {
    var p = precio(k), mio = tengo(k);
    return '<button data-item="' + k + '" class="' + (puesto ? 'on' : '') + (mio ? '' : ' cand') + '">' + esc(etiqueta) +
      (mio ? '' : ' <span class="monedas"><i></i>' + p + '</span>') + '</button>';
  }
  function muestras(campo, lista) {
    return lista.map(function (c, i) {
      return '<button data-set="' + campo + ':' + i + '" class="muestra' + (D.av[campo] === i ? ' on' : '') + '" style="background:' + c + '" aria-label="' + campo + ' ' + (i + 1) + '"></button>';
    }).join('');
  }

  var clubVisto = '';
  function vistaMonito() {
    var actual = String(D.av.jersey).split('~')[0];
    if (!clubVisto) { clubVisto = CLUBS[actual] ? actual : LIGAS[0].clubs[0]; }
    var clubs = LIGAS.map(function (l) {
      return '<optgroup label="' + esc(l.n) + '">' + l.clubs.map(function (cid) {
        return '<option value="' + cid + '"' + (clubVisto === cid ? ' selected' : '') + '>' + esc(CLUBS[cid].n) + '</option>';
      }).join('') + '</optgroup>';
    }).join('');
    return '<div class="escenario">' + monito('pxm grande') + '</div>' +
      '<h4>Piel</h4><div class="fila-op">' + muestras('piel', Arte.PIEL) + '</div>' +
      '<h4>Color de pelo</h4><div class="fila-op">' + muestras('tinte', Arte.TINTE) + '</div>' +
      '<h4>Camiseta</h4><div class="fila-op">' + Object.keys(BASICOS).map(function (k) { return boton('jersey:' + k, k.charAt(0).toUpperCase() + k.slice(1), D.av.jersey === k); }).join('') + '</div>' +
      '<select id="pClub">' + clubs + '</select><div class="fila-op" style="margin-top:8px">' + VARIANTES.map(function (v) {
        var k = clubVisto + '~' + v[0];
        return boton('jersey:' + k, v[1], D.av.jersey === k);
      }).join('') + '</div>' +
      CATALOGO.map(function (c) {
        return '<h4>' + c[1] + '</h4><div class="fila-op">' + c[2].map(function (o) { return boton(c[0] + ':' + o[0], o[1], D.av[c[0]] === o[0]); }).join('') + '</div>';
      }).join('') +
      '<h4>Festejo para tu rival</h4><div class="fila-op">' + FESTEJOS.map(function (f) { return boton('festejo:' + f[0], f[1], D.festejo === f[0]); }).join('') + '</div>' +
      '<div class="reto" style="margin-top:10px">' + figuraDe(conPose(D.av, festejoDe(D.festejo)[3]), 'pxm grande festeja') + '«' + esc(festejoDe(D.festejo)[4]) + '»<br><span class="tenue">Así le llega a tu rival cuando le ganas un reto.</span></div>';
  }

  function costo(S) {
    return '<span class="monedas"><i></i>' + S.precio + '</span>' + (S.trofeos ? ' + <span class="trofeos"><i></i>' + S.trofeos + '</span>' : '');
  }
  function vistaSobres() {
    var h = '<p class="nota tenue" style="margin-top:0">Tienes <span class="monedas"><i></i>' + D.monedas + '</span> y <span class="trofeos"><i></i>' + D.trofeos +
      '</span> trofeos. Los trofeos solo se ganan jugando bien: 26 victorias o más, ganar la eliminatoria, ganarle un reto a un amigo o el invicto perfecto.</p>';
    h += Object.keys(SOBRES).map(function (k) {
      var S = SOBRES[k];
      return '<div class="sobre s-' + k + '"><div class="papel"><span>INVICTO 7</span><b>' + S.corto + '</b></div><div><b>' + S.n + '</b><small>' + S.txt +
        '</small><button class="btn" data-sobre="' + k + '"' + (alcanza(S) ? '' : ' disabled') + '>Abrir · ' + costo(S) + '</button></div></div>';
    }).join('');
    if (recien) {
      h += '<h4>Te salió</h4><div class="cartas">' + recien.map(function (x) {
        return cartaHtml(x.c, '<em>' + (x.repetida ? 'Repetida · +' + RAREZAS[x.c.r].dup : 'Nueva') + '</em>');
      }).join('') + '</div>';
    }
    return h + '<p class="nota tenue">Nada se compra con dinero. Una carta repetida te devuelve monedas: 10 la básica, 30 la media, 100 la legendaria y 400 la ultra legendaria.</p>';
  }

  function interruptor(k, etiqueta) {
    return '<div class="ajuste"><span>' + etiqueta + '</span><button data-cfg="' + k + '" class="palanca' + (D.cfg[k] ? ' on' : '') + '">' + (D.cfg[k] ? 'Sí' : 'No') + '</button></div>';
  }
  function volumen(k, etiqueta) {
    return '<div class="ajuste"><span>' + etiqueta + '</span><input type="range" min="0" max="100" data-vol="' + k + '" value="' + Math.round(D.cfg[k] * 100) + '" aria-label="' + etiqueta + '"></div>';
  }
  var porBorrar = false;
  function vistaAjustes() {
    return '<h4>Sonido</h4>' + interruptor('musica', 'Música') + volumen('volM', 'Volumen de la música') +
      interruptor('fx', 'Efectos') + volumen('volF', 'Volumen de los efectos') +
      '<h4>Pantalla</h4>' + interruptor('vibra', 'Vibración en el teléfono') + interruptor('quieto', 'Reducir animaciones') +
      '<h4>Privacidad</h4><div class="ajuste"><span>Estadísticas de uso (Google Analytics)</span><button data-ana="1" class="palanca' + (Analitica.activo() ? ' on' : '') + '">' + (Analitica.activo() ? 'Sí' : 'No') + '</button></div>' +
      '<h4>Progreso</h4><p class="nota tenue" style="margin-top:0">' + D.partidas + ' partidas jugadas · ' + Object.keys(D.cartas).length + ' cartas. Todo se guarda solo en este navegador.</p>' +
      '<button class="btn sec" id="pBorrar">' + (porBorrar ? 'Toca otra vez para borrar todo' : 'Borrar mi progreso') + '</button>' +
      '<p class="nota tenue">¿No suena? Sube el volumen de multimedia del teléfono y, en iPhone, quita el modo silencio. Estado del audio: ' + ({ running: 'sonando', suspended: 'en pausa', interrupted: 'interrumpido' }[Sonido.estado()] || 'sin iniciar') + '.</p>' +
      '<p class="nota tenue">Datos de jugadores: Wikidata y Wikipedia. Música y efectos generados por el juego.</p>';
  }

  function vistaAlbum() {
    var todas = cartas();
    return RAREZAS.map(function (R, r) {
      var grupo = todas.filter(function (c) { return c.r === r; });
      var mias = grupo.filter(function (c) { return D.cartas[c.id]; }).length;
      return '<h4>' + R.n + ' · ' + mias + ' de ' + grupo.length + '</h4><div class="cartas">' + grupo.map(function (c) {
        return D.cartas[c.id] ? cartaHtml(c, D.cartas[c.id] > 1 ? '<em>×' + D.cartas[c.id] + '</em>' : '')
          : '<div class="carta falta r-' + R.id + '"><span class="num">' + SERIE + ' · ' + c.num + '</span><div class="arte">?</div><small>' + c.pos + '</small></div>';
      }).join('') + '</div>';
    }).join('');
  }

  // Cabecera del perfil: quien eres, cuanto tienes y para que sirve.
  function cabeza() {
    var total = cartas().length, mias = Object.keys(D.cartas).length;
    var barato = SOBRES.basico, falta = barato.precio - D.monedas;
    var meta = falta > 0 ? 'Te faltan <b>' + falta + '</b> monedas para tu próximo ' + barato.n + '.'
      : 'Ya te alcanza para abrir un ' + (alcanza(SOBRES.elite) ? SOBRES.elite.n : alcanza(SOBRES.medio) ? SOBRES.medio.n : barato.n) + '.';
    return '<div class="quien">' + monito('pxm mini') +
      '<input id="pNombre" maxlength="18" placeholder="Tu nombre o apodo" autocomplete="off" value="' + esc(D.nombre) + '">' +
      '<button class="btn" id="pGuardar">Guardar</button></div>' +
      '<div class="saldo"><div><span class="monedas"><i></i>' + D.monedas + '</span><small>Monedas</small></div>' +
      '<div><span class="trofeos"><i></i>' + D.trofeos + '</span><small>Trofeos</small></div>' +
      '<div><span>' + mias + '<em>/' + total + '</em></span><small>Cartas</small></div></div>' +
      '<ol class="como"><li><b>Juega.</b> Cada partida te da monedas; jugar bien te da trofeos.</li>' +
      '<li><b>Canjea.</b> Con monedas vistes a tu monito: playeras, peinados, tachos, mascotas y festejos.</li>' +
      '<li><b>Colecciona.</b> Con monedas y trofeos abres sobres de cartas para llenar tu álbum.</li></ol>' +
      '<p class="meta">' + meta + '</p>' +
      '<div class="dos"><button class="btn sec" data-ir="monito">Vestir a mi monito</button><button class="btn" data-ir="sobres">Abrir sobres</button></div>';
  }

  function pintar() {
    $('pCabeza').innerHTML = cabeza();
    $('pMonedas').innerHTML = '<i></i>' + D.monedas + ' <span class="trofeos"><i></i>' + D.trofeos + '</span>';
    document.querySelectorAll('#pTabs button').forEach(function (b) { b.classList.toggle('on', b.dataset.tab === pestana); });
    $('pAviso').textContent = aviso; aviso = '';
    $('pCuerpo').innerHTML = pestana === 'monito' ? vistaMonito() : pestana === 'sobres' ? vistaSobres() : pestana === 'ajustes' ? vistaAjustes() : vistaAlbum();
  }

  // ---------- Apertura del sobre ----------
  // El sobre tiembla y cambia de color; al tocarlo revienta y las cartas salen
  // boca abajo, de la peor a la mejor. Cada dorso "duda" antes de voltearse, y
  // a veces destella como si fuera una carta grande sin serlo.
  var COLOR = ['#ff5fd2', '#ffc83d', '#4aa3ff', '#8a968f'];
  function apertura(tipo, res) {
    var suena = function (n) { Sonido.fx(n); };
    var el = $('apertura'), orden = res.slice().sort(function (a, b) { return b.c.r - a.c.r; }), paso = 0, i = 0, reloj = null;
    var quieto = D.cfg.quieto || (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    function destello(c) {
      var d = document.createElement('div'); d.className = 'destello'; d.style.background = c;
      el.appendChild(d); setTimeout(function () { d.remove(); }, 750);
    }
    function confeti(n) {
      for (var k = 0; k < n; k++) {
        var d = document.createElement('i'); d.className = 'confeti';
        d.style.left = Math.random() * 100 + '%';
        d.style.background = ['#ff5fd2', '#7c5cff', '#3de0ff', '#c8f04a', '#ffd23f', '#f7f7f2'][k % 6];
        d.style.animationDuration = 1.6 + Math.random() * 1.8 + 's';
        d.style.animationDelay = Math.random() * 0.6 + 's';
        el.appendChild(d);
        setTimeout(function (x) { x.remove(); }, 4200, d);
      }
    }
    function etiqueta(x) { return '<em>' + (x.repetida ? 'Repetida · +' + RAREZAS[x.c.r].dup : 'Nueva') + '</em>'; }
    function romper() {
      if (paso) { return; }
      paso = 1; clearTimeout(reloj);
      el.querySelector('.mega').classList.add('rompe');
      destello('#ffffff'); suena('rompe'); Sonido.vibra(60);
      reloj = setTimeout(mesa, quieto ? 0 : 650);
    }
    function mesa() {
      paso = 2;
      el.innerHTML = '<div class="mesa">' + orden.map(function () { return '<div class="puesto"><div class="dorso">?</div></div>'; }).join('') + '</div><p id="apTxt"></p>';
      siguiente();
    }
    function siguiente() {
      if (i >= orden.length) { fin(); return; }
      var x = orden[i], p = el.querySelectorAll('.puesto')[i];
      // El amague: cuatro de cada diez cartas comunes destellan como si fueran grandes.
      var fuerte = x.c.r <= 1 || Math.random() < 0.4;
      p.firstChild.className = 'dorso duda' + (fuerte ? ' fuerte' : '');
      $('apTxt').textContent = fuerte ? '¿Será…?' : '';
      if (fuerte) { suena('duda'); }
      reloj = setTimeout(function () { revelar(p, x); }, quieto ? 0 : fuerte ? 1900 : 900);
    }
    function revelar(p, x) {
      var grande = x.c.r <= 1;
      p.innerHTML = (grande ? '<div class="rayos r-' + RAREZAS[x.c.r].id + '"></div>' : '') + cartaHtml(x.c, etiqueta(x));
      p.classList.add('revela');
      suena(grande ? 'epica' : 'carta');
      if (grande) { Sonido.vibra([80, 40, 160]); }
      if (grande) {
        p.classList.add('epica');
        destello(COLOR[x.c.r]); confeti(x.c.r === 0 ? 70 : 36);
        el.classList.add('sacude'); setTimeout(function () { el.classList.remove('sacude'); }, 460);
      }
      $('apTxt').textContent = grande ? '¡' + RAREZAS[x.c.r].n + '!' : '';
      i++;
      reloj = setTimeout(siguiente, quieto ? 0 : grande ? 1800 : 650);
    }
    function fin() {
      paso = 3;
      var mejor = orden[orden.length - 1].c.r;
      $('apTxt').textContent = mejor <= 1 ? '¡Te salió una ' + RAREZAS[mejor].n.toLowerCase() + '!' : 'Nada mal. La próxima sale la grande.';
      var b = document.createElement('button'); b.className = 'btn'; b.id = 'apSeguir'; b.textContent = 'Seguir';
      el.appendChild(b);
    }
    el.onclick = function (e) {
      if (paso === 0) { romper(); }
      else if (paso === 3 && e.target.id === 'apSeguir') { el.classList.add('hidden'); el.innerHTML = ''; el.onclick = null; }
    };
    el.innerHTML = '<div class="mega s-' + tipo + '"><div class="papel"><span>INVICTO 7</span><b>' + SOBRES[tipo].corto +
      '</b><span>' + SERIE + '</span></div></div><p id="apTxt">Toca el sobre para abrirlo</p>';
    el.classList.remove('hidden');
    reloj = setTimeout(romper, quieto ? 0 : 4500);
  }

  function ver(id) {
    ['inicio', 'partida', 'final', 'perfil'].forEach(function (s) { $(s).classList.toggle('hidden', s !== id); });
    window.scrollTo(0, 0);
  }

  function usar(k) {
    var p = precio(k), campo = k.split(':')[0];
    if (!tengo(k)) {
      if (D.monedas < p) { aviso = 'Te faltan ' + (p - D.monedas) + ' monedas.'; Sonido.fx('error'); return; }
      D.monedas -= p; D.items[k] = 1; Sonido.fx('moneda');
      Analitica.evento('articulo_comprado', { articulo: k.split('~')[0].indexOf('jersey:') === 0 && k.indexOf('~') > 0 ? 'jersey:club~' + k.split('~')[1] : k, precio: p });
    }
    if (campo === 'festejo') { D.festejo = k.slice(8); } else { D.av[campo] = k.slice(campo.length + 1); }
    guardar();
  }

  function abrirPerfil(tab) { recien = null; porBorrar = false; if (tab) { pestana = tab; } ver('perfil'); pintar(); }
  function guardarNombre() {
    D.nombre = $('pNombre').value.trim().slice(0, 18); guardar(); chip();
    var b = $('pGuardar'); b.textContent = 'Guardado'; b.disabled = true; Sonido.fx('moneda');
    setTimeout(function () { b.textContent = 'Guardar'; b.disabled = false; }, 1500);
  }
  $('chip').addEventListener('click', function () { abrirPerfil(); });
  $('pCabeza').addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (!b) { return; }
    if (b.id === 'pGuardar') { guardarNombre(); }
    else if (b.dataset.ir) { pestana = b.dataset.ir; pintar(); $('pTabs').scrollIntoView({ block: 'start' }); }
  });
  $('pCabeza').addEventListener('keydown', function (e) { if (e.target.id === 'pNombre' && e.key === 'Enter') { guardarNombre(); e.target.blur(); } });
  // Desde la pantalla de resultado: ir directo a gastar lo ganado.
  $('premio').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-perfil]'), r = e.target.closest('button[data-regalo]');
    if (b) { abrirPerfil(b.dataset.perfil); }
    if (r && D.regalo === 1) {
      D.regalo = 2;
      recien = abrir('basico', true);
      $('regalo').innerHTML = '<b>Sobre abierto</b>Tus cartas ya están en el álbum.<button class="btn sec" data-perfil="album">Ver mi álbum</button>';
      Analitica.evento('sobre_abierto', { sobre: 'regalo', mejor: RAREZAS[Math.min.apply(null, recien.map(function (x) { return x.c.r; }))].id });
      apertura('basico', recien);
    }
  });
  $('pVolver').addEventListener('click', function () { chip(); ver('inicio'); });
  $('pTabs').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-tab]');
    if (b) { pestana = b.dataset.tab; porBorrar = false; pintar(); }
  });
  $('pCuerpo').addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (!b) { return; }
    if (b.dataset.set) { var f = b.dataset.set.split(':'); D.av[f[0]] = +f[1]; guardar(); pintar(); }
    else if (b.dataset.item) { usar(b.dataset.item); pintar(); }
    else if (b.dataset.cfg) {
      D.cfg[b.dataset.cfg] = !D.cfg[b.dataset.cfg]; guardar(); Sonido.config(D.cfg);
      document.body.classList.toggle('quieto', !!D.cfg.quieto); pintar();
    }
    else if (b.id === 'pBorrar') {
      if (!porBorrar) { porBorrar = true; pintar(); return; }
      try { localStorage.removeItem(CLAVE); } catch (err) { /* sin almacenamiento */ }
      location.reload();
    }
    else if (b.dataset.sobre) {
      recien = abrir(b.dataset.sobre); pintar();
      if (recien) {
        Analitica.evento('sobre_abierto', { sobre: b.dataset.sobre, mejor: RAREZAS[Math.min.apply(null, recien.map(function (x) { return x.c.r; }))].id });
        apertura(b.dataset.sobre, recien);
      }
    }
    else if (b.dataset.ana) { Analitica.decidir(!Analitica.activo()); pintar(); }
  });
  $('pCuerpo').addEventListener('input', function (e) {
    var k = e.target.dataset && e.target.dataset.vol;
    if (k) { D.cfg[k] = e.target.value / 100; guardar(); Sonido.config(D.cfg); }
  });
  $('pCuerpo').addEventListener('change', function (e) {
    if (e.target.dataset && e.target.dataset.vol) { Sonido.fx('moneda'); }
    if (e.target.id === 'pClub') { clubVisto = e.target.value; pintar(); }
  });

  // lista: [[concepto, monedas, trofeos], ...]. Suma, guarda y devuelve el desglose.
  function premiar(lista) {
    var total = lista.reduce(function (s, x) { return s + x[1]; }, 0), tro = lista.reduce(function (s, x) { return s + (x[2] || 0); }, 0);
    D.monedas += total; D.trofeos += tro; D.partidas++;
    // Un sobre gratis, una sola vez: que todos vean una apertura pronto. Casi
    // nadie juntaba para el primero antes de irse. regalo: 1 pendiente, 2 abierto.
    if (!D.regalo) { D.regalo = 1; }
    guardar();
    return (D.regalo === 1 ? '<div class="regalo" id="regalo"><b>Tienes un sobre de regalo</b>Tres cartas para empezar tu álbum.' +
      '<button class="btn" data-regalo="1">Abrir mi sobre</button></div>' : '') + '<h3>Ganaste <span class="monedas"><i></i>' + total + '</span>' + (tro ? ' y <span class="trofeos"><i></i>' + tro + '</span>' : '') + '</h3>' + lista.map(function (x) {
      return '<div class="premio"><span>' + esc(x[0]) + '</span><span>' + (x[1] ? '+' + x[1] : '') + (x[2] ? ' <span class="trofeos"><i></i>' + x[2] + '</span>' : '') + '</span></div>';
    }).join('') + '<div class="sub tenue" style="margin-top:8px">Tienes ' + D.monedas + ' monedas y ' + D.trofeos + ' trofeos. Canjéalos por sobres de cartas o por artículos para tu monito.</div>' +
      '<div class="dos"><button class="btn sec" data-perfil="monito">Vestir a mi monito</button><button class="btn" data-perfil="sobres">Abrir sobres</button></div>';
  }

  chip();
  return {
    chip: chip, premiar: premiar,
    // El festejo viaja en el enlace como texto; al leerlo se valida campo por campo.
    codigoFestejo: function () {
      return btoa(JSON.stringify({ av: D.av, f: D.festejo })).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    },
    festejoDe: function (cod) {
      try {
        var o = JSON.parse(atob(cod.replace(/-/g, '+').replace(/_/g, '/'))), F = festejoDe(o.f);
        return { dibujo: figuraDe(conPose(limpio(o.av), F[3]), 'pxm grande festeja'), frase: F[4] };
      } catch (err) { return null; }
    },
    nombre: function () { return D.nombre; },
    ponNombre: function (n) { n = n.trim().slice(0, 18); if (n && n !== D.nombre) { D.nombre = n; guardar(); } }
  };
})();
