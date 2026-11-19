// Buzon de retos: avisa al servidor cuando compartes un reto y cuando alguien
// lo juega, para que el dueno vea el resultado al abrir el juego. Si el
// servidor no responde, el juego sigue igual: los retos viajan en el enlace.
var Buzon = (function () {
  'use strict';
  // En la computadora de desarrollo habla con el servidor local de pruebas.
  var LOCAL = /^(127\.0\.0\.1|localhost)$/.test(location.hostname);
  var API = LOCAL ? 'http://127.0.0.1:8787' : 'https://invicto7-buzon.invicto7.workers.dev', K_YO = 'invicto7_yo', K_VISTO = 'invicto7_buzon';
  var LETRAS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';

  function azar(n) {
    var a = new Uint8Array(n), s = '', i;
    crypto.getRandomValues(a);
    for (i = 0; i < n; i++) { s += LETRAS[a[i] % LETRAS.length]; }
    return s;
  }
  function lee(k) { try { return localStorage.getItem(k); } catch (err) { return null; } }
  function pon(k, v) { try { localStorage.setItem(k, v); } catch (err) { /* sin almacenamiento */ } }
  // Clave de este telefono: nadie mas la conoce y es lo que abre su buzon.
  function yo() {
    var c = lee(K_YO);
    if (!c) { c = azar(28); pon(K_YO, c); }
    return c;
  }
  function manda(ruta, datos) {
    datos.yo = yo();
    return fetch(API + ruta, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify(datos) })
      .then(function (r) { return r.json(); });
  }
  function callado(p) { p.catch(function () { /* sin red: no pasa nada */ }); }

  return {
    nuevoId: function () { return azar(10); },
    registrar: function (id, nombre, liga, marca) { callado(manda('/reto', { id: id, nombre: nombre, liga: liga, marca: marca })); },
    intento: function (reto, nombre, marca, gano, festejo) { callado(manda('/intento', { reto: reto, nombre: nombre, marca: marca, gano: gano, festejo: festejo || '' })); },
    // Entrega la lista con .nuevo en lo que llego desde la ultima vez que se vio.
    leer: function (listo) {
      if (!lee(K_YO)) { return; }   // nunca compartio un reto: no hay nada que buscar
      manda('/buzon', {}).then(function (d) {
        if (!d || !d.ok) { return; }
        var visto = +lee(K_VISTO) || 0;
        d.lista.forEach(function (x) { x.nuevo = x.cuando > visto; });
        listo(d.lista);
      }).catch(function () { /* sin red */ });
    },
    visto: function (lista) { if (lista.length) { pon(K_VISTO, String(lista[0].cuando)); } }
  };
})();
