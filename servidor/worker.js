// Buzon de retos de Invicto 7. Guarda quien compartio cada reto y quien lo jugo,
// para que el dueno vea el resultado al abrir el juego. No hay cuentas: cada
// telefono se identifica con una clave al azar que solo el conoce.
const ORIGENES = ['https://invicto7.com', 'https://www.invicto7.com', 'http://127.0.0.1:8778', 'http://localhost:8778'];
const CLAVE = /^[A-Za-z0-9]{20,40}$/, ID = /^[A-Za-z0-9]{8,16}$/, MARCA = /^\d{1,2}-\d{1,2}-\d{1,2}$/, LIGA = /^[a-z0-9]{2,12}$/;
const MAX_RETOS_DIA = 60;   // por telefono: frena a quien quiera llenar la base

function cabeceras(req) {
  const o = req.headers.get('Origin');
  return {
    'Access-Control-Allow-Origin': ORIGENES.includes(o) ? o : ORIGENES[0],
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  };
}
function nombre(s) { return String(s || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 18); }

export default {
  async fetch(req, env) {
    const h = cabeceras(req), ruta = new URL(req.url).pathname;
    const resp = (obj, estado) => new Response(JSON.stringify(obj), { status: estado || 200, headers: h });
    if (req.method === 'OPTIONS') { return new Response(null, { status: 204, headers: h }); }
    if (req.method !== 'POST') { return resp({ error: 'metodo' }, 405); }
    let d;
    try {
      const txt = await req.text();
      if (txt.length > 2000) { return resp({ error: 'largo' }, 413); }
      d = JSON.parse(txt);
    } catch (err) { return resp({ error: 'json' }, 400); }
    if (!d || !CLAVE.test(d.yo || '')) { return resp({ error: 'clave' }, 400); }
    const ahora = Date.now();

    // Registrar un reto compartido. Si el id ya existe, no se toca.
    if (ruta === '/reto') {
      if (!ID.test(d.id || '') || !MARCA.test(d.marca || '') || !LIGA.test(d.liga || '')) { return resp({ error: 'datos' }, 400); }
      const hoy = await env.DB.prepare('SELECT COUNT(*) AS n FROM retos WHERE dueno = ? AND creado > ?').bind(d.yo, ahora - 86400000).first();
      if (hoy.n >= MAX_RETOS_DIA) { return resp({ error: 'limite' }, 429); }
      await env.DB.prepare('INSERT OR IGNORE INTO retos (id, dueno, nombre, liga, marca, creado) VALUES (?, ?, ?, ?, ?, ?)')
        .bind(d.id, d.yo, nombre(d.nombre), d.liga, d.marca, ahora).run();
      return resp({ ok: true });
    }

    // Avisar que alguien jugo un reto. El dueno no cuenta como rival de si mismo.
    if (ruta === '/intento') {
      if (!ID.test(d.reto || '') || !MARCA.test(d.marca || '') || [-1, 0, 1].indexOf(d.gano) < 0) { return resp({ error: 'datos' }, 400); }
      const festejo = typeof d.festejo === 'string' && /^[A-Za-z0-9_-]{0,600}$/.test(d.festejo) ? d.festejo : '';
      const r = await env.DB.prepare('SELECT dueno FROM retos WHERE id = ?').bind(d.reto).first();
      if (!r) { return resp({ error: 'sin reto' }, 404); }
      if (r.dueno === d.yo) { return resp({ ok: true, propio: true }); }
      await env.DB.prepare('INSERT INTO intentos (reto, de, nombre, marca, gano, festejo, cuando) VALUES (?, ?, ?, ?, ?, ?, ?) ' +
        'ON CONFLICT (reto, de) DO UPDATE SET nombre = excluded.nombre, marca = excluded.marca, gano = excluded.gano, festejo = excluded.festejo, cuando = excluded.cuando')
        .bind(d.reto, d.yo, nombre(d.nombre) || 'Un amigo', d.marca, d.gano, d.gano === 1 ? festejo : '', ahora).run();
      return resp({ ok: true });
    }

    // Lo que le llego al dueno: los ultimos intentos sobre sus retos.
    if (ruta === '/buzon') {
      const q = await env.DB.prepare('SELECT i.nombre, i.marca, i.gano, i.festejo, i.cuando, r.liga, r.marca AS tuyo FROM intentos i ' +
        'JOIN retos r ON r.id = i.reto WHERE r.dueno = ? ORDER BY i.cuando DESC LIMIT 20').bind(d.yo).all();
      return resp({ ok: true, lista: q.results });
    }
    return resp({ error: 'ruta' }, 404);
  }
};
