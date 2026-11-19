-- Buzon de retos. Un reto lo registra quien lo comparte; un intento, quien lo juega.
CREATE TABLE IF NOT EXISTS retos (
  id TEXT PRIMARY KEY,
  dueno TEXT NOT NULL,
  nombre TEXT NOT NULL,
  liga TEXT NOT NULL,
  marca TEXT NOT NULL,
  creado INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS retos_dueno ON retos (dueno, creado);
-- Un intento por reto y por telefono: si repite, se queda el ultimo.
CREATE TABLE IF NOT EXISTS intentos (
  reto TEXT NOT NULL,
  de TEXT NOT NULL,
  nombre TEXT NOT NULL,
  marca TEXT NOT NULL,
  gano INTEGER NOT NULL,
  festejo TEXT NOT NULL DEFAULT '',
  cuando INTEGER NOT NULL,
  PRIMARY KEY (reto, de)
);
