// Estadisticas de uso con Google Analytics 4. Solo se cargan si la persona
// acepta el aviso, y nunca se manda nombre, apodo ni nada que la identifique:
// solo que liga se jugo, cuantas victorias, que sobre se abrio, etc.
var Analitica = (function () {
  'use strict';
  var ID = 'G-MRKFM9GMG2', CLAVE = 'invicto7_permiso', cargado = false, cola = [];

  function permiso() { try { return localStorage.getItem(CLAVE); } catch (err) { return null; } }
  function gtag() { window.dataLayer.push(arguments); }

  function cargar() {
    if (cargado) { return; }
    cargado = true;
    window.dataLayer = window.dataLayer || [];
    gtag('js', new Date());
    // Sin senales publicitarias: solo medicion.
    gtag('config', ID, { allow_google_signals: false, allow_ad_personalization_signals: false });
    var s = document.createElement('script');
    s.async = true; s.src = 'https://www.googletagmanager.com/gtag/js?id=' + ID;
    document.head.appendChild(s);
    cola.forEach(function (e) { gtag('event', e[0], e[1]); });
    cola = [];
  }

  function evento(nombre, datos) {
    if (permiso() === 'no') { return; }
    if (cargado) { gtag('event', nombre, datos || {}); } else { cola.push([nombre, datos || {}]); }
  }

  // si = true acepta, false rechaza. Rechazar despues de aceptar deja de medir
  // desde la siguiente vez que se abra el juego.
  function decidir(si) {
    try { localStorage.setItem(CLAVE, si ? 'si' : 'no'); } catch (err) { /* sin almacenamiento */ }
    var b = document.getElementById('avisoAna');
    if (b) { b.classList.add('hidden'); }
    if (si) { cargar(); } else { cola = []; }
  }

  var p = permiso();
  if (p === 'si') { cargar(); }
  else if (p !== 'no') {
    var b = document.getElementById('avisoAna');
    b.classList.remove('hidden');
    b.addEventListener('click', function (e) {
      if (e.target.dataset && e.target.dataset.ok) { decidir(e.target.dataset.ok === 'si'); }
    });
  }

  return { evento: evento, decidir: decidir, activo: function () { return permiso() === 'si'; } };
})();
