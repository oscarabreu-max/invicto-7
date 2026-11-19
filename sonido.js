// Musica y efectos generados con Web Audio: no hay archivos de sonido.
// La musica es propia: electronica oscura de sintetizadores.
var Sonido = (function () {
  'use strict';
  var ctx = null, gM = null, gF = null, reloj = null, paso = 0, cuando = 0;
  var cfg = { musica: true, fx: true, volM: 0.5, volF: 0.7, vibra: true };

  function listo() {
    if (!ctx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) { return false; }
      ctx = new AC();
      gM = ctx.createGain(); gF = ctx.createGain();
      gM.connect(ctx.destination); gF.connect(ctx.destination);
      niveles();
    }
    // En iPhone el estado tambien puede ser 'interrupted' (llamada, cambio de app).
    if (ctx.state !== 'running') { ctx.resume(); }
    return true;
  }
  function niveles() {
    if (!ctx) { return; }
    gM.gain.value = cfg.musica ? 0.16 * cfg.volM : 0;
    gF.gain.value = cfg.fx ? 0.30 * cfg.volF : 0;
  }
  function nota(f, t, dur, tipo, salida, vol) {
    var o = ctx.createOscillator(), v = ctx.createGain();
    o.type = tipo; o.frequency.value = f;
    v.gain.setValueAtTime(vol, t);
    v.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(v); v.connect(salida);
    o.start(t); o.stop(t + dur + 0.03);
  }
  function hz(midi) { return 440 * Math.pow(2, (midi - 69) / 12); }

  // ---------- Musica ----------
  // Electronica oscura de sintetizadores: bajo en semicorcheas, arpegio, colchon
  // de acordes y un filtro que se abre y se cierra. Composicion propia en re
  // menor; toma el estilo, no las melodias de ninguna banda sonora.
  // Cada acorde: [bajo, tres notas]. Un compas por acorde, 16 pasos por compas.
  var ACORDES = [[38, 50, 53, 57], [34, 46, 50, 53], [31, 43, 46, 50], [33, 45, 49, 52]];
  var ARPEGIO = [0, 2, 1, 2, 0, 2, 1, 3, 0, 2, 1, 2, 3, 2, 1, 2];   // 3 = la primera nota una octava arriba
  var PASO = 0.121;   // semicorchea a 124 pulsos por minuto
  var filtro = null, ruido = null;

  function equipo() {
    if (filtro) { return; }
    filtro = ctx.createBiquadFilter(); filtro.type = 'lowpass'; filtro.Q.value = 7;
    filtro.connect(gM);
    var n = ctx.sampleRate * 0.4, buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
    for (var i = 0; i < n; i++) { d[i] = Math.random() * 2 - 1; }
    ruido = buf;
  }
  // Voz con ataque y caida; desafina dos osciladores para que suene ancho.
  function voz(midi, t, dur, tipo, vol, ataque, salida) {
    [-6, 6].forEach(function (cents) {
      var o = ctx.createOscillator(), v = ctx.createGain();
      o.type = tipo; o.frequency.value = hz(midi); o.detune.value = cents;
      v.gain.setValueAtTime(0.0001, t);
      v.gain.linearRampToValueAtTime(vol, t + ataque);
      v.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(v); v.connect(salida);
      o.start(t); o.stop(t + dur + 0.05);
    });
  }
  function bombo(t) {
    var o = ctx.createOscillator(), v = ctx.createGain();
    o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.14);
    v.gain.setValueAtTime(1.6, t); v.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    o.connect(v); v.connect(gM); o.start(t); o.stop(t + 0.22);
  }
  function golpe(t, dur, tipo, frec, vol) {
    var f = ctx.createBufferSource(), q = ctx.createBiquadFilter(), v = ctx.createGain();
    f.buffer = ruido; q.type = tipo; q.frequency.value = frec;
    v.gain.setValueAtTime(vol, t); v.gain.exponentialRampToValueAtTime(0.001, t + dur);
    f.connect(q); q.connect(v); v.connect(gM); f.start(t); f.stop(t + dur + 0.02);
  }
  // El tema crece por bloques de cuatro compases: bajo y colchon, entra el
  // arpegio, entra la bateria, y al final se suma una voz aguda.
  function programar() {
    equipo();
    if (ctx.state !== 'running') { return; }
    if (cuando < ctx.currentTime) { cuando = ctx.currentTime + 0.05; }
    while (cuando < ctx.currentTime + 0.3) {
      var compas = Math.floor(paso / 16), i = paso % 16, bloque = Math.floor(compas / 4) % 4, A = ACORDES[compas % 4];
      // El filtro respira cada ocho compases.
      filtro.frequency.setValueAtTime(420 + 1900 * (0.5 - 0.5 * Math.cos(paso / 128 * 2 * Math.PI)), cuando);
      voz(A[0], cuando, PASO * 0.95, 'sawtooth', i % 4 === 0 ? 0.9 : 0.55, 0.005, filtro);
      if (i === 0) { A.slice(1).forEach(function (n) { voz(n + 12, cuando, PASO * 16, 'sawtooth', 0.16, PASO * 4, filtro); }); }
      if (bloque >= 1) {
        var k = ARPEGIO[i], n = k === 3 ? A[1] + 12 : A[1 + k];
        voz(n + 24, cuando, PASO * 1.6, 'square', 0.22, 0.004, filtro);
      }
      if (bloque >= 2) {
        if (i % 4 === 0) { bombo(cuando); }
        if (i % 4 === 2) { golpe(cuando, 0.04, 'highpass', 7000, 0.35); }
        if (i === 4 || i === 12) { golpe(cuando, 0.16, 'bandpass', 1800, 0.7); }
      }
      if (bloque === 3 && i % 8 === 0) { voz(A[i === 0 ? 3 : 2] + 36, cuando, PASO * 7, 'triangle', 0.3, 0.03, gM); }
      cuando += PASO; paso++;
    }
  }
  function musica() {
    var debe = cfg.musica && ctx && !document.hidden;
    if (debe && !reloj) { cuando = ctx.currentTime + 0.05; reloj = setInterval(programar, 90); }
    if (!debe && reloj) { clearInterval(reloj); reloj = null; }
  }

  // ---------- Efectos: [frecuencia, retraso, duracion, onda] ----------
  var FX = {
    clic: [[720, 0, 0.05, 'square']],
    tic: [[420, 0, 0.03, 'triangle']],
    elegir: [[660, 0, 0.08, 'square'], [990, 0.07, 0.12, 'square']],
    moneda: [[988, 0, 0.07, 'square'], [1319, 0.07, 0.2, 'square']],
    error: [[196, 0, 0.12, 'sawtooth'], [147, 0.1, 0.2, 'sawtooth']],
    final: [[523, 0, 0.12, 'square'], [659, 0.12, 0.12, 'square'], [784, 0.24, 0.12, 'square'], [1047, 0.36, 0.4, 'square']],
    rompe: [[90, 0, 0.3, 'sawtooth'], [180, 0.05, 0.25, 'sawtooth'], [1400, 0.2, 0.25, 'square']],
    duda: [[330, 0, 0.08, 'triangle'], [392, 0.15, 0.08, 'triangle'], [330, 0.3, 0.08, 'triangle'], [392, 0.45, 0.08, 'triangle']],
    carta: [[523, 0, 0.07, 'square'], [784, 0.06, 0.14, 'square']],
    epica: [[523, 0, 0.1, 'square'], [659, 0.09, 0.1, 'square'], [784, 0.18, 0.1, 'square'], [1047, 0.27, 0.1, 'square'],
      [1319, 0.36, 0.1, 'square'], [1568, 0.45, 0.5, 'square'], [262, 0, 0.9, 'triangle']]
  };
  function fx(nombre) {
    if (!cfg.fx || !FX[nombre] || !listo()) { return; }
    var t = ctx.currentTime;
    FX[nombre].forEach(function (n) { nota(n[0], t + n[1], n[2], n[3], gF, 0.6); });
  }
  function vibra(ms) { if (cfg.vibra && navigator.vibrate) { try { navigator.vibrate(ms); } catch (err) { /* sin vibracion */ } } }

  // Los navegadores solo dejan sonar despues de un toque del usuario, y en el
  // telefono el toque cuenta al levantar el dedo (touchend o click), no al
  // apoyarlo. Por eso se escucha en varios eventos y se repite en cada toque.
  var abierto = false;
  function despertar() {
    // iPhone: sin esto, el interruptor de silencio tambien calla el juego.
    try { if (navigator.audioSession) { navigator.audioSession.type = 'playback'; } } catch (err) { /* navegador sin esa opcion */ }
    if (!listo()) { return; }
    if (!abierto) {
      // Un sonido vacio dentro del toque termina de desbloquear el audio en iOS.
      var b = ctx.createBufferSource(); b.buffer = ctx.createBuffer(1, 1, 22050); b.connect(ctx.destination); b.start(0);
      abierto = ctx.state === 'running';
    }
    // Si el audio estuvo detenido, el reloj de la musica quedo atras: se reinicia.
    if (reloj && cuando < ctx.currentTime) { cuando = ctx.currentTime + 0.05; }
    musica();
  }
  ['touchend', 'click', 'keydown'].forEach(function (ev) { document.addEventListener(ev, despertar, true); });
  document.addEventListener('visibilitychange', musica);
  document.addEventListener('click', function (e) {
    if (e.target.closest && e.target.closest('button')) { fx('clic'); }
  }, true);

  return {
    fx: fx, vibra: vibra,
    estado: function () { return ctx ? ctx.state : 'sin iniciar'; },
    config: function (c) { Object.keys(cfg).forEach(function (k) { if (k in c) { cfg[k] = c[k]; } }); niveles(); musica(); }
  };
})();
