// Interfaz: seleccion de liga, ruleta, eleccion de jugadores y resultado.
(function () {
  'use strict';
  var SLOTS = Engine.SLOTS;
  var FILAS = [[6], [3, 4, 5], [1, 2], [0]]; // de arriba (delantero) a abajo (portero)
  var NOMBRE_CAT = { atk: 'Ataque', sel: 'Selección', tra: 'Trayectoria' };
  var MODO_TXT = { clasico: 'Ves los números reales de cada jugador.', ciegas: 'Sin números: eliges de memoria.' };
  var HOY = 2026;
  var $ = function (id) { return document.getElementById(id); };
  var motores = {};   // un motor por liga, creado la primera vez que se juega
  var modo = 'clasico';
  var G, S, nJersey = 0;
  var festejo = null;         // festejo que llego por enlace
  var retoPendiente = null;   // reto que llego por enlace: {liga, modo, nombre, res}

  function motor(liga) {
    if (!motores[liga.id]) { motores[liga.id] = Engine.build(Engine.combosDeLiga(liga, CLUBS)); }
    return motores[liga.id];
  }

  // Un reto viaja en el enlace como: liga ~ modo ~ nombre ~ siete elecciones
  // (club:decada:jugador). El record se recalcula aqui, no se confia en el enlace.
  function codigoReto() {
    return [S.liga.id, S.modo === 'ciegas' ? 'b' : 'c', encodeURIComponent($('nombre').value.trim()),
      S.lineup.map(function (p) { return p.cid + ':' + p.dec + ':' + p.id; }).join(',')].join('~');
  }
  function leerReto() {
    var m = /[#&]r=([^&]+)/.exec(location.hash);
    if (!m) { return null; }
    try {
      var f = m[1].split('~'), liga = LIGAS.filter(function (l) { return l.id === f[0]; })[0];
      var M = motor(liga), lineup = f[3].split(',').map(function (x) {
        var k = x.split(':');
        var c = M.combos.filter(function (c) { return c.cid === k[0] && c.dec === +k[1]; })[0];
        return c.players.filter(function (p) { return p.id === k[2]; })[0];
      });
      if (lineup.length !== SLOTS.length || lineup.some(function (p, i) { return !p || p.pos.indexOf(SLOTS[i]) < 0; })) { return null; }
      return { liga: liga, modo: f[1] === 'b' ? 'ciegas' : 'clasico', nombre: decodeURIComponent(f[2]).slice(0, 18) || 'Tu amigo', res: M.proyectar(lineup) };
    } catch (err) { return null; }
  }
  function marca(r) { return r.g + '-' + r.e + '-' + r.p; }

  function decada(d) { return 'Años ' + (d < 2000 ? String(d).slice(2) : d); }
  function azar(a) { return a[Math.floor(Math.random() * a.length)]; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function clave(c) { return c.cid + '|' + c.dec; }

  // Jersey dibujado con los colores del club. patron: solid, stripes, hoops,
  // sash, band, hband, sleeves o halves.
  var CAMISA = 'M12 2 L4 6 L0 14 L6 18 L9 14 L9 34 L31 34 L31 14 L34 18 L40 14 L36 6 L28 2 Q20 8 12 2 Z';
  function jersey(col) {
    var c1 = col[0], c2 = col[1], pat = col[2], id = 'cj' + (++nJersey), extra = '', i;
    if (pat === 'stripes') { for (i = 0; i < 4; i++) { extra += '<rect x="' + (11 + i * 6) + '" y="0" width="3" height="36" fill="' + c2 + '"/>'; } }
    else if (pat === 'hoops') { for (i = 0; i < 4; i++) { extra += '<rect x="0" y="' + (7 + i * 7) + '" width="40" height="3.5" fill="' + c2 + '"/>'; } }
    else if (pat === 'sash') { extra = '<polygon points="9,6 15,4 31,30 31,34 26,34 9,12" fill="' + c2 + '"/>'; }
    else if (pat === 'band') { extra = '<rect x="15.5" y="0" width="9" height="36" fill="' + c2 + '"/>'; }
    else if (pat === 'hband') { extra = '<rect x="0" y="14" width="40" height="6" fill="' + c2 + '"/>'; }
    else if (pat === 'sleeves') { extra = '<rect x="0" y="0" width="9.5" height="20" fill="' + c2 + '"/><rect x="30.5" y="0" width="9.5" height="20" fill="' + c2 + '"/>'; }
    else if (pat === 'halves') { extra = '<rect x="20" y="0" width="20" height="36" fill="' + c2 + '"/>'; }
    return '<svg class="jersey" viewBox="-1 0 42 36" width="40" height="36" aria-hidden="true"><defs><clipPath id="' + id + '"><path d="' + CAMISA + '"/></clipPath></defs>' +
      '<g clip-path="url(#' + id + ')"><rect x="0" y="0" width="40" height="36" fill="' + c1 + '"/>' + extra + '</g>' +
      '<path d="M12 2 Q20 8 28 2" fill="none" stroke="' + c2 + '" stroke-width="2"/>' +
      '<path d="' + CAMISA + '" fill="none" stroke="rgba(0,0,0,.45)" stroke-width="1"/></svg>';
  }

  function mostrar(id) {
    ['inicio', 'partida', 'final', 'perfil'].forEach(function (s) { $(s).classList.toggle('hidden', s !== id); });
    window.scrollTo(0, 0);
  }

  function pintarInicio() {
    $('modoTxt').textContent = MODO_TXT[modo];
    document.querySelectorAll('#modo button').forEach(function (b) { b.classList.toggle('on', b.dataset.modo === modo); });
    var rt = retoPendiente;
    Perfil.chip();
    $('retoInicio').classList.toggle('hidden', !rt && !festejo);
    if (!rt && festejo) {
      $('retoInicio').innerHTML = festejo.dibujo + '«' + esc(festejo.frase) + '»<br><b>' + esc(festejo.nombre) + '</b> te ganó el reto. Hizo <b>' +
        festejo.suyo + '</b> contra tu ' + festejo.tuyo + '. Arma otro siete y pide la revancha.';
    }
    if (rt) {
      $('retoInicio').innerHTML = '<b>' + esc(rt.nombre) + '</b> te reta en ' + esc(rt.liga.n) + (rt.modo === 'ciegas' ? ' a ciegas' : '') +
        ':<br>hizo <b>' + marca(rt.res) + '</b> (' + rt.res.nivel + '). ¿Lo superas?<button class="btn" id="aceptar">Aceptar el reto</button>';
    }
    $('ligas').innerHTML = LIGAS.map(function (l, i) {
      var combos = l.clubs.reduce(function (n, c) { return n + Object.keys(CLUBS[c].d).length; }, 0);
      return '<button data-liga="' + i + '"><b>' + esc(l.n) + '</b><span>' + l.clubs.length + ' clubes · ' + combos + ' planteles</span></button>';
    }).join('');
  }

  function nueva(liga) {
    G = motor(liga);
    var rt = retoPendiente && retoPendiente.liga === liga && retoPendiente.modo === modo ? retoPendiente : null;
    S = { liga: liga, modo: modo, reto: rt, lineup: [], usados: {}, vistos: {}, saltos: { club: 1, dec: 1 }, combo: null, girando: false };
    Carga.mostrar(liga.n + ' · calentando', function () {
      mostrar('partida');
      girar(null);
    });
  }

  // Un jugador solo sirve si tiene un puesto libre donde pueda jugar y no fue elegido ya.
  function puestosLibres(p) {
    if (S.usados[p.id]) { return []; }
    var tipos = [];
    SLOTS.forEach(function (t, i) {
      if (!S.lineup[i] && p.pos.indexOf(t) >= 0 && tipos.indexOf(t) < 0) { tipos.push(t); }
    });
    return tipos;
  }
  function jugable(c) { return c.players.some(function (p) { return puestosLibres(p).length; }); }

  // filtro: null = cualquier club; {cid} = otra decada del mismo; {no} = otro club.
  function candidatos(filtro) {
    return G.combos.filter(function (c) {
      if (S.vistos[clave(c)] || !jugable(c)) { return false; }
      if (filtro && filtro.cid) { return c.cid === filtro.cid; }
      if (filtro && filtro.no) { return c.cid !== filtro.no; }
      return true;
    });
  }

  function girar(filtro) {
    var ops = candidatos(filtro);
    if (!ops.length) { return; }
    var destino = azar(ops), n = 0, fijo = filtro && filtro.cid ? destino : null;
    S.girando = true; S.combo = null;
    $('ruleta').classList.add('girando');
    $('lista').innerHTML = '';
    pintarSaltos();
    var t = setInterval(function () {
      var c = azar(G.combos);
      Sonido.fx('tic');
      $('escudo').innerHTML = jersey((fijo || c).colores);
      $('club').textContent = (fijo || c).club;
      $('dec').textContent = decada(c.dec);
      if (++n >= 12) {
        clearInterval(t);
        S.girando = false; S.combo = destino; S.vistos[clave(destino)] = 1;
        $('ruleta').classList.remove('girando');
        pintar();
      }
    }, 70);
  }

  function anios(p) { return p.y0 + '–' + (p.y1 >= HOY ? 'hoy' : p.y1); }

  function pintarCancha(el) {
    el.innerHTML = FILAS.map(function (fila) {
      return '<div class="fila">' + fila.map(function (i) {
        var p = S.lineup[i];
        return p
          ? '<div class="slot lleno">' + jersey(p.colores) + '<b>' + SLOTS[i] + '</b><div class="nom">' + esc(p.name) + '</div><div class="de">' + esc(p.club) + ' · ' + decada(p.dec) + '</div></div>'
          : '<div class="slot"><b>' + SLOTS[i] + '</b><div class="de">libre</div></div>';
      }).join('') + '</div>';
    }).join('');
  }

  function pintarSaltos() {
    var c = S.combo;
    $('saltaClub').textContent = 'Cambiar club (' + S.saltos.club + ')';
    $('saltaDec').textContent = 'Cambiar década (' + S.saltos.dec + ')';
    $('saltaClub').disabled = S.girando || !S.saltos.club || !c || !candidatos({ no: c.cid }).length;
    $('saltaDec').disabled = S.girando || !S.saltos.dec || !c || !candidatos({ cid: c.cid }).length;
  }

  function pintar() {
    var hechos = S.lineup.filter(Boolean).length, c = S.combo;
    $('ronda').textContent = S.liga.n + ' · Ronda ' + (hechos + 1) + ' de 7';
    pintarCancha($('cancha'));
    $('escudo').innerHTML = jersey(c.colores);
    $('club').textContent = c.club;
    $('dec').textContent = decada(c.dec);
    pintarSaltos();
    $('lista').innerHTML = c.players.map(function (p, i) {
      var libres = puestosLibres(p), stats = p.pos.join(' / ');
      if (S.modo !== 'ciegas') {
        stats += ' · PJ <i>' + p.m + '</i>' + (p.pos[0] === 'POR' ? '' : ' · Goles <i>' + p.g + '</i>') +
          ' · Sel <i>' + p.caps + '</i> · ' + anios(p);
      }
      var motivo = S.usados[p.id] ? 'Ya lo elegiste' : 'Sin puesto libre';
      return '<div class="jug' + (libres.length ? '' : ' no') + '"><div class="info"><div class="nombre">' + esc(p.name) +
        '</div><div class="stats">' + stats + '</div></div><div class="acc">' +
        (libres.length
          ? libres.map(function (t) { return '<button data-j="' + i + '" data-t="' + t + '">' + t + '</button>'; }).join('')
          : '<span class="tenue" style="font-size:11px">' + motivo + '</span>') +
        '</div></div>';
    }).join('');
  }

  function elegir(p, tipo) {
    var i = SLOTS.findIndex(function (t, k) { return t === tipo && !S.lineup[k]; });
    if (i < 0 || S.usados[p.id]) { return; }
    S.lineup[i] = p; S.usados[p.id] = 1;
    Sonido.fx('elegir');
    if (S.lineup.filter(Boolean).length === SLOTS.length) { terminar(); } else { girar(null); }
  }

  function terminar() {
    var r = G.proyectar(S.lineup);
    S.res = r;
    $('modoFinal').textContent = S.liga.n + ' · ' + (S.modo === 'ciegas' ? 'A ciegas' : 'Clásico');
    $('record').textContent = r.g + '-' + r.e + '-' + r.p;
    $('nivel').textContent = r.nivel;
    $('aviso').classList.toggle('hidden', !r.tope);
    if (r.tope) { $('aviso').textContent = 'Tu ' + NOMBRE_CAT[r.tope.cat].toLowerCase() + ' quedó floja y limitó el récord a ' + r.tope.max + ' victorias.'; }
    $('barras').innerHTML = Engine.CATS.map(function (k) {
      var v = Math.round(r.idx[k]);
      return '<div class="barra' + (v < 50 ? ' floja' : '') + '"><span>' + NOMBRE_CAT[k] + '</span><div class="riel"><div style="width:' +
        Math.min(100, v) + '%"></div></div><span>' + v + '</span></div>';
    }).join('');
    pintarCancha($('canchaFinal'));
    pintarReto(r);
    pintarCopa();
    // Monedas: por jugar, por cada victoria, por la copa y por ganarle al amigo.
    // Trofeos (tercer numero): solo por jugar bien. Hacen falta para los sobres caros.
    var pr = [['Partida jugada', 20], [r.g + ' victorias', 3 * r.g]];
    if (r.g >= Engine.PARTIDOS) { pr.push(['Invicto perfecto', 300, 3]); }
    else if (r.g >= 26) { pr.push(['Temporada de campeón (26 o más victorias)', 0, 1]); }
    if (S.copa) {
      var pasadas = S.copa.rondas.filter(function (x) { return x.gana; }).length;
      if (pasadas) { pr.push([pasadas + (pasadas === 1 ? ' ronda' : ' rondas') + ' de eliminatoria', 25 * pasadas]); }
      if (S.copa.campeon) { pr.push(['Campeón de la eliminatoria', 150, 1]); }
      if (S.copa.titulos) { pr.push([S.copa.titulos + ' ' + S.trofeo + ' en la vitrina', 2 * S.copa.titulos]); }
    }
    if (S.reto && (r.g - S.reto.res.g || r.fuerza - S.reto.res.fuerza) > 0) { pr.push(['Le ganaste a ' + S.reto.nombre, 75, 1]); }
    $('premio').innerHTML = Perfil.premiar(pr);
    Sonido.fx('final'); Sonido.vibra(120);
    $('nombre').value = Perfil.nombre();
    $('compartir').textContent = 'Retar a un amigo';
    mostrar('final');
  }

  function pintarReto(r) {
    var rt = S.reto;
    $('retoFinal').classList.toggle('hidden', !rt);
    if (!rt) { return; }
    // Desempate por fuerza: dos records iguales casi nunca valen exactamente lo mismo.
    var dif = r.g - rt.res.g || r.fuerza - rt.res.fuerza, n = esc(rt.nombre);
    $('retoFinal').innerHTML = (dif > 0 ? '<b>Le ganaste a ' + n + '.</b>' : dif < 0 ? '<b>' + n + ' te ganó.</b>' : '<b>Empate con ' + n + '.</b>') +
      '<br>Tú ' + marca(r) + ' · ' + n + ' ' + marca(rt.res) + (r.g === rt.res.g && dif ? '<br><span class="tenue">Mismas victorias: decide la fuerza del equipo.</span>' : '') +
      (dif > 0 ? '<button class="btn" id="festejo">Mandarle tu festejo</button>' : '');
  }

  function pintarCopa() {
    var cfg = typeof CAMPEONES !== 'undefined' && CAMPEONES[S.liga.id];
    $('copa').classList.toggle('hidden', !cfg);
    S.copa = null;
    if (!cfg) { return; }
    var c = S.copa = G.copa(S.lineup, cfg.lista);
    S.trofeo = cfg.trofeo;
    $('copa').innerHTML = '<h3>' + (c.campeon ? 'Campeón de la eliminatoria' : 'Eliminado en ' + c.llego.toLowerCase()) + '</h3>' +
      '<div class="sub tenue">Cuatro campeones reales sorteados, del más débil al más fuerte.</div>' +
      c.rondas.map(function (x) {
        var siete = x.siete.map(function (p) { return p.name; }).join(', ');
        var m = x.jugado ? x.ga + '–' + x.gb + (x.pen ? '<br><small>pen. ' + x.pen[0] + '–' + x.pen[1] + '</small>' : '') : '—';
        return '<div class="cruce ' + (!x.jugado ? 'nojugo' : x.gana ? 'gano' : 'perdio') + '"><span class="fase">' + x.fase + '</span><span class="quien"><b>' +
          esc(x.club) + ' ' + x.anio + '</b><small>' + esc(siete) + '</small></span><span class="marc">' + m + '</span></div>';
      }).join('') +
      '<h3 style="margin-top:14px">Vitrina: ' + c.titulos + ' de ' + c.vitrina.length + ' ' + cfg.trofeo + '</h3>' +
      '<div class="sub tenue">Un partido contra el campeón de cada año. En verde, los que ganarías.</div><div class="anios">' +
      c.vitrina.map(function (v) {
        return '<span' + (v.gana ? ' class="si"' : '') + ' title="' + esc(v.club) + ' ' + v.ga + '-' + v.gb + (v.pen ? ' (pen. ' + v.pen[0] + '-' + v.pen[1] + ')' : '') + '">' + v.anio + '</span>';
      }).join('') + '</div>';
  }

  // En el telefono abre el menu de compartir (WhatsApp, etc.); si no, copia.
  function enviar(texto, boton) {
    if (navigator.share) { navigator.share({ text: texto }).catch(function () {}); return; }
    try { navigator.clipboard.writeText(texto).then(function () { boton.textContent = 'Enlace copiado'; }, function () {}); } catch (err) { /* sin portapapeles */ }
  }
  // Festejo: tu monito, tu nombre y los dos records viajan en el enlace.
  function leerFestejo() {
    var m = /[#&]f=([^&]+)/.exec(location.hash);
    if (!m) { return null; }
    try {
      var f = m[1].split('~'), ok = /^\d{1,2}-\d{1,2}-\d{1,2}$/;
      if (!ok.test(f[1]) || !ok.test(f[2])) { return null; }
      var F = Perfil.festejoDe(f[3]);
      return F ? { nombre: decodeURIComponent(f[0]).slice(0, 18) || 'Tu rival', suyo: f[1], tuyo: f[2], dibujo: F.dibujo, frase: F.frase } : null;
    } catch (err) { return null; }
  }

  function enlaceReto() { return location.href.split('#')[0] + '#r=' + codigoReto(); }

  function textoCompartir() {
    var r = S.res;
    return 'INVICTO 7 · ' + S.liga.n + ' — ' + r.g + '-' + r.e + '-' + r.p + ' (' + r.nivel + ')' + (S.modo === 'ciegas' ? ' · a ciegas' : '') + '\n' +
      (S.copa ? (S.copa.campeon ? 'Campeón de la eliminatoria' : 'Eliminado en ' + S.copa.llego.toLowerCase()) + ' · ' + S.copa.titulos + ' de ' + S.copa.vitrina.length + ' ' + S.trofeo + '\n' : '') +
      '¿Lo superas? ' + enlaceReto();
  }

  $('modo').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-modo]');
    if (b) { modo = b.dataset.modo; pintarInicio(); }
  });
  $('ligas').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-liga]');
    if (b) { nueva(LIGAS[+b.dataset.liga]); }
  });
  $('saltaClub').addEventListener('click', function () {
    if (S.girando || !S.saltos.club) { return; }
    S.saltos.club--; girar({ no: S.combo.cid });
  });
  $('saltaDec').addEventListener('click', function () {
    if (S.girando || !S.saltos.dec) { return; }
    S.saltos.dec--; girar({ cid: S.combo.cid });
  });
  $('lista').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-j]');
    if (!b || S.girando || !S.combo) { return; }
    elegir(S.combo.players[+b.dataset.j], b.dataset.t);
  });
  $('otra').addEventListener('click', function () { mostrar('inicio'); pintarInicio(); });
  $('retoInicio').addEventListener('click', function (e) {
    if (e.target.id !== 'aceptar' || !retoPendiente) { return; }
    modo = retoPendiente.modo; nueva(retoPendiente.liga);
  });
  $('compartir').addEventListener('click', function () {
    Perfil.ponNombre($('nombre').value);
    enviar(textoCompartir(), $('compartir'));
  });
  $('retoFinal').addEventListener('click', function (e) {
    if (e.target.id !== 'festejo') { return; }
    var yo = Perfil.nombre() || 'Tu rival';
    enviar('INVICTO 7 · ' + yo + ' te ganó el reto: ' + marca(S.res) + ' contra tu ' + marca(S.reto.res) + '\n' +
      location.href.split('#')[0] + '#f=' + [encodeURIComponent(Perfil.nombre()), marca(S.res), marca(S.reto.res), Perfil.codigoFestejo()].join('~'), e.target);
  });

  retoPendiente = leerReto();
  festejo = leerFestejo();

  pintarInicio();
})();
