// Calibracion: juega miles de partidas con un bot en cada liga y muestra como
// se reparten los records.
// Uso: node calibrar.js            (configuracion actual)
//      node calibrar.js 0.97:1.4 0.9:1.2   (barrido techo:curva)
var Engine = require('./engine.js');
var DB = require('./data.js');
var SLOTS = Engine.SLOTS;
var N = 6000;

// habil=true elige al de mayor aporte; false elige al azar entre los que caben.
function partida(G, habil) {
  var lineup = [], usados = {}, vistos = {}, puestos = 0, guardia = 0;
  while (puestos < 7 && guardia++ < 500) {
    var c = G.combos[Math.floor(Math.random() * G.combos.length)];
    if (vistos[c.cid + c.dec]) { continue; }
    var ops = [];
    c.players.forEach(function (p) {
      if (usados[p.id]) { return; }
      SLOTS.forEach(function (t, i) {
        if (!lineup[i] && p.pos.indexOf(t) >= 0) { ops.push({ p: p, i: i, v: G.aporte(p, t) }); }
      });
    });
    if (!ops.length) { continue; }
    vistos[c.cid + c.dec] = 1;
    ops.sort(function (a, b) { return b.v - a.v; });
    var o = habil ? ops[0] : ops[Math.floor(Math.random() * ops.length)];
    lineup[o.i] = o.p; usados[o.p.id] = 1; puestos++;
  }
  return G.proyectar(lineup);
}

function correr(G, habil) {
  var wins = [], topes = 0;
  for (var i = 0; i < N; i++) { var r = partida(G, habil); wins.push(r.g); if (r.tope) { topes++; } }
  wins.sort(function (a, b) { return a - b; });
  var q = function (f) { return wins[Math.floor(f * (N - 1))]; };
  return (habil ? 'habil' : 'azar ') + ' p10 ' + q(0.1) + ' med ' + q(0.5) + ' p90 ' + q(0.9) + ' max ' + wins[N - 1] +
    ' 38-0:' + wins.filter(function (w) { return w === 38; }).length + ' tope:' + Math.round(100 * topes / N) + '%';
}

function todo() {
  DB.LIGAS.forEach(function (l) {
    var G = Engine.build(Engine.combosDeLiga(l, DB.CLUBS));
    console.log((l.n + '                ').slice(0, 17) + '| ' + correr(G, true) + ' | ' + correr(G, false));
  });
}

var args = process.argv.slice(2);
if (!args.length) {
  DB.LIGAS.forEach(function (l) {
    var G = Engine.build(Engine.combosDeLiga(l, DB.CLUBS));
    console.log(l.n + ' ideal: ' + G.ideal.map(function (p, i) { return SLOTS[i] + ' ' + p.name; }).join(' · '));
  });
  todo();
}
args.forEach(function (a) {
  var f = a.split(':');
  Engine.CFG.techo = +f[0]; Engine.CFG.curva = +f[1];
  console.log('--- techo ' + f[0] + ', curva ' + f[1]);
  todo();
});
