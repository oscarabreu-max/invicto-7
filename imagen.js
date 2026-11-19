// Imagen para compartir: dibuja en un lienzo el siete, el record y la direccion
// del juego. En redes una imagen se comparte mucho mas que un enlace con texto.
var Imagen = (function () {
  'use strict';
  var W = 1080, H = 1350, FUENTE = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  var CAMISA = 'M12 2 L4 6 L0 14 L6 18 L9 14 L9 34 L31 34 L31 14 L34 18 L40 14 L36 6 L28 2 Q20 8 12 2 Z';

  function letra(x, peso, px, cursiva) { x.font = (cursiva ? 'italic ' : '') + peso + ' ' + px + 'px ' + FUENTE; }
  function caja(x, a, b, w, h, r) {
    x.beginPath(); x.moveTo(a + r, b); x.arcTo(a + w, b, a + w, b + h, r); x.arcTo(a + w, b + h, a, b + h, r);
    x.arcTo(a, b + h, a, b, r); x.arcTo(a, b, a + w, b, r); x.closePath();
  }
  // Mismo jersey que en el juego (40 x 36), escalado. cx = centro horizontal.
  function jersey(x, col, cx, y, k) {
    var c1 = col[0], c2 = col[1], pat = col[2], forma = new Path2D(CAMISA), i;
    x.save(); x.translate(cx - 20 * k, y); x.scale(k, k);
    x.save(); x.clip(forma);
    x.fillStyle = c1; x.fillRect(0, 0, 40, 36);
    x.fillStyle = c2;
    if (pat === 'stripes') { for (i = 0; i < 4; i++) { x.fillRect(11 + i * 6, 0, 3, 36); } }
    else if (pat === 'hoops') { for (i = 0; i < 4; i++) { x.fillRect(0, 7 + i * 7, 40, 3.5); } }
    else if (pat === 'sash') { x.beginPath(); x.moveTo(9, 6); x.lineTo(15, 4); x.lineTo(31, 30); x.lineTo(31, 34); x.lineTo(26, 34); x.lineTo(9, 12); x.fill(); }
    else if (pat === 'band') { x.fillRect(15.5, 0, 9, 36); }
    else if (pat === 'hband') { x.fillRect(0, 14, 40, 6); }
    else if (pat === 'sleeves') { x.fillRect(0, 0, 9.5, 20); x.fillRect(30.5, 0, 9.5, 20); }
    else if (pat === 'halves') { x.fillRect(20, 0, 20, 36); }
    x.restore();
    x.lineWidth = 2; x.strokeStyle = c2; x.stroke(new Path2D('M12 2 Q20 8 28 2'));
    x.lineWidth = 1; x.strokeStyle = 'rgba(0,0,0,.5)'; x.stroke(forma);
    x.restore();
  }

  // d: { nombre, liga, modo, marca, nivel, copa, filas: [[{pos, nombre, de, colores}]] }
  function crear(d) {
    var c = document.createElement('canvas'), x = c.getContext('2d'), i;
    c.width = W; c.height = H;
    x.fillStyle = '#0b1410'; x.fillRect(0, 0, W, H);
    x.textAlign = 'center'; x.textBaseline = 'alphabetic';

    // Logo: "INVICTO" crema y "7" lima, centrados como una sola palabra.
    letra(x, 900, 68, true);
    var a = x.measureText('INVICTO ').width, b = x.measureText('7').width, x0 = (W - a - b) / 2;
    x.textAlign = 'left';
    x.fillStyle = '#f2efe4'; x.fillText('INVICTO ', x0, 112);
    x.fillStyle = '#c8f04a'; x.fillText('7', x0 + a, 112);
    x.textAlign = 'center';

    letra(x, 600, 34);
    x.fillStyle = '#9db3a6';
    x.fillText((d.nombre ? 'El siete de ' + d.nombre + ' · ' : '') + d.liga + (d.modo === 'ciegas' ? ' · A ciegas' : ''), W / 2, 172, W - 120);

    letra(x, 900, 190);
    x.fillStyle = '#c8f04a'; x.fillText(d.marca, W / 2, 352);
    letra(x, 800, 42);
    x.fillStyle = '#f2efe4'; x.fillText(d.nivel + ' · 38 partidos', W / 2, 418, W - 120);

    // Cancha con franjas.
    var cx = 60, cy = 462, cw = W - 120, ch = 680, n = d.filas.length, alto = ch / n;
    x.save(); caja(x, cx, cy, cw, ch, 28); x.clip();
    for (i = 0; i < 8; i++) { x.fillStyle = i % 2 ? '#1a5c39' : '#1f6b43'; x.fillRect(cx, cy + i * ch / 8, cw, ch / 8 + 1); }
    x.strokeStyle = 'rgba(255,255,255,.18)'; x.lineWidth = 4;
    x.beginPath(); x.moveTo(cx, cy + ch / 2); x.lineTo(cx + cw, cy + ch / 2); x.stroke();
    x.beginPath(); x.arc(W / 2, cy + ch / 2, 86, 0, Math.PI * 2); x.stroke();
    x.restore();

    d.filas.forEach(function (fila, f) {
      var ancho = cw / fila.length, y = cy + f * alto + 14;
      fila.forEach(function (p, k) {
        var mx = cx + ancho * (k + 0.5), max = ancho - 24;
        jersey(x, p.colores, mx, y, 2);
        x.shadowColor = 'rgba(0,0,0,.6)'; x.shadowBlur = 6;
        letra(x, 800, 30); x.fillStyle = '#ffffff'; x.fillText(p.nombre, mx, y + 108, max);
        letra(x, 600, 22); x.fillStyle = 'rgba(255,255,255,.82)'; x.fillText(p.pos + ' · ' + p.de, mx, y + 138, max);
        x.shadowBlur = 0;
      });
    });

    if (d.copa) { letra(x, 700, 32); x.fillStyle = '#ffb14a'; x.fillText(d.copa, W / 2, 1198, W - 120); }
    letra(x, 900, 46); x.fillStyle = '#f2efe4'; x.fillText('¿Lo superas?', W / 2, d.copa ? 1262 : 1232);
    letra(x, 800, 38); x.fillStyle = '#c8f04a'; x.fillText('invicto7.com', W / 2, d.copa ? 1314 : 1290);
    return c;
  }

  // Sin esperas: el menu de compartir solo abre dentro del mismo toque.
  function archivo(lienzo) {
    var b = atob(lienzo.toDataURL('image/png').split(',')[1]), n = b.length, u = new Uint8Array(n);
    while (n--) { u[n] = b.charCodeAt(n); }
    return new File([u], 'invicto7.png', { type: 'image/png' });
  }
  // Devuelve 'menu' si abrio el menu de compartir o 'descarga' si la guardo.
  function compartir(d, texto) {
    var f = archivo(crear(d));
    if (navigator.canShare && navigator.canShare({ files: [f] })) {
      navigator.share({ files: [f], text: texto }).catch(function () { /* cancelado */ });
      return 'menu';
    }
    var a = document.createElement('a'), url = URL.createObjectURL(f);
    a.href = url; a.download = 'invicto7.png'; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
    return 'descarga';
  }
  return { crear: crear, compartir: compartir };
})();
