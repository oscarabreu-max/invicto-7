"""Descarga de Wikidata los jugadores de cada club de clubs.json.

Uso: python3 fetch.py            (salta lo que ya esta en cache/)
Deja un CSV por club en cache/<id>.csv y el mapa id -> QID en cache/qids.json.
Wikidata es CC0: datos libres, sin scraping de sitios con terminos restrictivos.
"""
from __future__ import annotations

import json
import subprocess
import time
import urllib.parse
import urllib.request
from pathlib import Path

AQUI = Path(__file__).parent
CACHE = AQUI / "cache"
UA = "football-roster-research/0.1"

SPARQL = """
SELECT ?p ?pLabel ?start ?end ?m ?g (GROUP_CONCAT(DISTINCT ?posL; separator=";") AS ?pos) WHERE {
  ?p p:P54 ?st. ?st ps:P54 wd:CLUB.
  OPTIONAL { ?st pq:P580 ?start } OPTIONAL { ?st pq:P582 ?end }
  OPTIONAL { ?st pq:P1350 ?m } OPTIONAL { ?st pq:P1351 ?g }
  OPTIONAL { ?p wdt:P413 ?po. ?po rdfs:label ?posL. FILTER(LANG(?posL)="en") }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en,es,mul,fr,pt". }
} GROUP BY ?p ?pLabel ?start ?end ?m ?g
"""


def get(url: str, accept: str) -> bytes:
    # Con urllib Wikidata responde 429 (limite agresivo); con curl no. Se usa curl.
    r = subprocess.run(["curl", "-sS", "-f", "-m", "90", "-A", UA, "-H", f"Accept: {accept}", url],
                       capture_output=True, check=False)
    if r.returncode != 0:
        raise RuntimeError(r.stderr.decode()[:200])
    return r.stdout


def resolver_qids(clubs: dict) -> dict:
    """Titulo de Wikipedia en ingles -> QID, siguiendo redirecciones."""
    ruta = CACHE / "qids.json"
    qids = json.loads(ruta.read_text()) if ruta.exists() else {}
    faltan = [(cid, c[1]) for cid, c in clubs.items() if cid not in qids]
    for i in range(0, len(faltan), 40):
        lote = faltan[i:i + 40]
        url = "https://www.wikidata.org/w/api.php?" + urllib.parse.urlencode({
            "action": "wbgetentities", "sites": "enwiki", "titles": "|".join(t for _, t in lote),
            "props": "labels|sitelinks", "languages": "en", "sitefilter": "enwiki",
            "redirects": "yes", "normalize": "", "format": "json"})
        # normalize solo admite un titulo; sin el, los titulos deben ir exactos.
        url = url.replace("&normalize=", "")
        data = json.loads(get(url, "application/json"))
        por_titulo = {}
        for qid, ent in data.get("entities", {}).items():
            if qid.startswith("Q"):
                por_titulo[ent["sitelinks"]["enwiki"]["title"]] = (qid, ent.get("labels", {}).get("en", {}).get("value", ""))
        for cid, titulo in lote:
            if titulo in por_titulo:
                qids[cid] = por_titulo[titulo]
            else:
                print("  SIN RESOLVER:", cid, titulo)
    ruta.write_text(json.dumps(qids, indent=1, ensure_ascii=False))
    return qids


def main() -> None:
    CACHE.mkdir(exist_ok=True)
    clubs = json.loads((AQUI / "clubs.json").read_text())["clubs"]
    qids = resolver_qids(clubs)
    for cid, (qid, etiqueta) in qids.items():
        ruta = CACHE / f"{cid}.csv"
        if ruta.exists() and ruta.stat().st_size > 200:
            continue
        url = "https://query.wikidata.org/sparql?" + urllib.parse.urlencode({"query": SPARQL.replace("CLUB", qid)})
        for intento in range(3):
            try:
                cuerpo = get(url, "text/csv")
                ruta.write_bytes(cuerpo)
                filas = cuerpo.count(b"\n") - 1
                print(f"{cid:18} {qid:10} {etiqueta[:34]:34} {filas} filas")
                break
            except Exception as e:  # red inestable o limite de peticiones: esperar y reintentar
                print(f"  {cid}: {e}; reintento {intento + 1}")
                time.sleep(10 * (intento + 1))
        time.sleep(1.5)


if __name__ == "__main__":
    main()
