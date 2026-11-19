// Campeones reales por anio de la final. Solo se usan los que tienen plantel
// en data.js; el rival se arma con los jugadores de ese club activos ese anio.
var CAMPEONES = {
  ucl: { trofeo: 'Champions', lista: [
    [1981, 'liverpool'], [1983, 'hamburg'], [1984, 'liverpool'], [1985, 'juventus'], [1986, 'steaua'],
    [1987, 'porto'], [1988, 'psv'], [1989, 'milan'], [1990, 'milan'], [1991, 'redstar'], [1992, 'barcelona'],
    [1993, 'marseille'], [1994, 'milan'], [1995, 'ajax'], [1996, 'juventus'], [1997, 'dortmund'],
    [1998, 'realmadrid'], [1999, 'manutd'], [2000, 'realmadrid'], [2001, 'bayern'], [2002, 'realmadrid'],
    [2003, 'milan'], [2004, 'porto'], [2005, 'liverpool'], [2006, 'barcelona'], [2007, 'milan'],
    [2008, 'manutd'], [2009, 'barcelona'], [2010, 'inter'], [2011, 'barcelona'], [2012, 'chelsea'],
    [2013, 'bayern'], [2014, 'realmadrid'], [2015, 'barcelona'], [2016, 'realmadrid'], [2017, 'realmadrid'],
    [2018, 'realmadrid'], [2019, 'liverpool'], [2020, 'bayern'], [2021, 'chelsea'], [2022, 'realmadrid'],
    [2023, 'mancity'], [2024, 'realmadrid'], [2025, 'psg']
  ] },
  lib: { trofeo: 'Libertadores', lista: [
    [1980, 'nacional_uy'], [1981, 'flamengo'], [1982, 'penarol'], [1983, 'gremio'], [1984, 'independiente'],
    [1985, 'argentinos'], [1986, 'river'], [1987, 'penarol'], [1988, 'nacional_uy'], [1989, 'atleticonacional'],
    [1990, 'olimpia'], [1991, 'colocolo'], [1992, 'saopaulo'], [1993, 'saopaulo'], [1994, 'velez'],
    [1995, 'gremio'], [1996, 'river'], [1997, 'cruzeiro'], [1999, 'palmeiras'], [2000, 'boca'],
    [2001, 'boca'], [2002, 'olimpia'], [2003, 'boca'], [2005, 'saopaulo'], [2006, 'inter_br'],
    [2007, 'boca'], [2008, 'ldu'], [2009, 'estudiantes'], [2010, 'inter_br'], [2011, 'santos_br'],
    [2012, 'corinthians'], [2013, 'atleticomg'], [2015, 'river'], [2016, 'atleticonacional'],
    [2017, 'gremio'], [2018, 'river'], [2019, 'flamengo'], [2020, 'palmeiras'], [2021, 'palmeiras'],
    [2022, 'flamengo'], [2023, 'fluminense'], [2025, 'flamengo']
  ] }
};
if (typeof module !== 'undefined') { module.exports = CAMPEONES; }
