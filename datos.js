// Pantalla de carga: un dato o una frase al azar antes de cada partida.
// Solo entran datos comprobables y frases bien documentadas; las que circulan
// sin fuente clara van marcadas como "atribuida" o "cuentan que".
var Carga = (function () {
  'use strict';
  // [tipo, texto, firma]
  var LISTA = [
    ['Dato', 'El Arsenal 2003-04 terminó la liga invicto: 26 ganados y 12 empatados. Ni los Invencibles hicieron 38-0-0.', ''],
    ['Dato', 'Lionel Messi marcó 91 goles en el año 2012, entre Barcelona y Argentina.', ''],
    ['Dato', 'Javier Zanetti jugó 858 partidos con el Inter.', ''],
    ['Dato', 'Paolo Maldini jugó 25 temporadas como profesional, todas en el Milan.', ''],
    ['Dato', 'Hugo Sánchez ganó cinco Pichichis. En 1989-90 hizo 38 goles de liga, todos a un solo toque.', ''],
    ['Dato', 'Hugo Sánchez festejaba con una voltereta en honor a su hermana, gimnasta olímpica.', ''],
    ['Dato', 'Jorge Campos diseñaba sus propios uniformes y también jugó como delantero.', ''],
    ['Dato', 'Rafael Márquez fue capitán de México en cinco Mundiales, de 2002 a 2018.', ''],
    ['Dato', 'Cabinho es el máximo goleador histórico de la liga mexicana, con 312 goles.', ''],
    ['Dato', 'José Saturnino Cardozo marcó 29 goles con Toluca en el Apertura 2002, récord en torneos cortos.', ''],
    ['Dato', 'Cuauhtémoc Blanco sorprendió al mundo en Francia 98 saltando entre dos rivales con el balón entre los pies: la cuauhtemiña.', ''],
    ['Dato', 'Rogério Ceni, portero del São Paulo, marcó más de 100 goles entre tiros libres y penales.', ''],
    ['Dato', 'José Luis Chilavert fue el primer portero en marcar un triplete, en 1999 con Vélez.', ''],
    ['Dato', 'René Higuita sacó un centro con el escorpión en Wembley, en 1995.', ''],
    ['Dato', 'Martín Palermo falló tres penales en un mismo partido, en la Copa América de 1999.', ''],
    ['Dato', 'En la final de Estambul 2005 el Liverpool perdía 3-0 al descanso contra el Milan. Empató en seis minutos y ganó en penales.', ''],
    ['Dato', 'En la final de 1999 el Manchester United perdía en el minuto 90. Ganó 2-1 con dos goles en el tiempo añadido.', ''],
    ['Dato', 'El Leicester City fue campeón de la Premier en 2016. Las casas de apuestas pagaban 5,000 a 1 al inicio de la temporada.', ''],
    ['Dato', 'Ronaldo Nazário marcó 47 goles en 49 partidos en su única temporada en el Barcelona, 1996-97.', ''],
    ['Dato', 'Zinedine Zidane ganó la final de la Champions 2002 con una volea de zurda, su pierna menos hábil.', ''],
    ['Dato', 'En 1986 Maradona le hizo a Inglaterra la Mano de Dios y el Gol del Siglo con cuatro minutos de diferencia.', ''],
    ['Dato', 'Gianluigi Buffon pasó 974 minutos seguidos sin recibir gol en la Serie A, en 2016.', ''],
    ['Dato', 'El Real Madrid de Zidane ganó tres Champions seguidas, de 2016 a 2018.', ''],
    ['Dato', 'El Boca de Carlos Bianchi ganó la Libertadores en 2000, 2001 y 2003.', ''],
    ['Dato', 'Independiente es el club con más Libertadores: siete.', ''],
    ['Dato', 'El Barcelona de Guardiola ganó los seis títulos que disputó en 2009.', ''],
    ['Dato', 'En noviembre de 2005 el Bernabéu aplaudió de pie a Ronaldinho después de un 0-3 del Barcelona.', ''],
    ['Dato', 'Zlatan Ibrahimović le marcó cuatro goles a Inglaterra en 2012. El último, de chilena desde fuera del área.', ''],
    ['Dato', 'Romário celebró su gol número 1,000 en 2007, según su propia cuenta.', ''],
    ['Cuentan que', 'Romário le pidió a Cruyff unos días para ir al carnaval de Río. Cruyff aceptó si marcaba dos goles; los hizo en veinte minutos y pidió el cambio para alcanzar el avión.', ''],
    ['Frase', 'El fútbol es un juego simple: 22 hombres corren detrás de un balón durante 90 minutos y, al final, siempre ganan los alemanes.', 'Gary Lineker'],
    ['Frase', 'Jugar al fútbol es muy sencillo, pero jugar un fútbol sencillo es lo más difícil que hay.', 'Johan Cruyff'],
    ['Frase', 'Salid y disfrutad.', 'Johan Cruyff, antes de la final de Wembley 1992'],
    ['Frase', 'Algunos creen que el fútbol es cuestión de vida o muerte. Les aseguro que es mucho más importante que eso.', 'Bill Shankly'],
    ['Frase', 'La pelota no se mancha.', 'Diego Maradona'],
    ['Frase', 'Me cortaron las piernas.', 'Diego Maradona, 1994'],
    ['Frase', 'Fútbol, maldita sea.', 'Alex Ferguson, tras la final de 1999'],
    ['Frase', 'Ganar, ganar, ganar y volver a ganar.', 'Luis Aragonés'],
    ['Frase', 'Por favor, no me llamen arrogante, pero soy campeón de Europa y creo que soy alguien especial.', 'José Mourinho, 2004'],
    ['Frase', 'Yo soy el normal.', 'Jürgen Klopp, 2015'],
    ['Frase', 'Dilly ding, dilly dong.', 'Claudio Ranieri, Leicester 2016'],
    ['Frase', 'Cuando las gaviotas siguen al barco pesquero es porque creen que van a tirar sardinas al mar.', 'Eric Cantona, 1995'],
    ['Frase', 'Un Mundial sin mí no vale la pena verlo.', 'Zlatan Ibrahimović, 2013'],
    ['Frase', 'El fútbol es un estado de ánimo.', 'Jorge Valdano'],
    ['Frase atribuida', 'El fútbol es la cosa más importante de las cosas menos importantes.', 'Arrigo Sacchi'],
    ['Frase atribuida', 'Cuando nací, Dios me señaló y dijo: ese es el elegido.', 'Romário'],
    ['Frase atribuida', 'La noche siempre fue mi amiga. Si no salgo, no meto goles.', 'Romário']
  ];
  var bolsa = [], reloj = null, alTerminar = null;
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  // Sin repetir hasta agotar la lista.
  function otro() {
    if (!bolsa.length) { bolsa = LISTA.slice().sort(function () { return Math.random() - 0.5; }); }
    return bolsa.pop();
  }
  function cerrar() {
    clearTimeout(reloj);
    document.getElementById('carga').classList.add('hidden');
    var f = alTerminar; alTerminar = null;
    if (f) { f(); }
  }
  // Muestra la pantalla unos segundos (o hasta que la toquen) y luego sigue.
  function mostrar(titulo, despues) {
    var d = otro(), el = document.getElementById('carga');
    el.innerHTML = '<div class="pelota"></div><div class="cTitulo">' + esc(titulo) + '</div><div class="cTipo">' + d[0] + '</div><p class="cTexto">' +
      (d[2] ? '«' + esc(d[1]) + '»' : esc(d[1])) + '</p>' + (d[2] ? '<div class="cFirma">' + esc(d[2]) + '</div>' : '') +
      '<div class="cBarra"><div></div></div><small class="tenue">Toca para saltar</small>';
    el.classList.remove('hidden');
    alTerminar = despues;
    reloj = setTimeout(cerrar, 3600);
  }
  document.getElementById('carga').addEventListener('click', cerrar);
  return { mostrar: mostrar, otro: otro, total: LISTA.length };
})();
