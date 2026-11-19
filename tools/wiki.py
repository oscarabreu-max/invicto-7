"""Rellena huecos de Wikidata con la ficha (infobox) de Wikipedia en ingles.

Uso: python3 wiki.py mx        (liga cuyos clubes se quieren completar)
Para cada jugador que Wikidata asocia a un club pero sin partidos o sin fecha,
baja su articulo y lee de la ficha: anios, club, partidos y goles de liga, y
partidos con la seleccion mayor. Deja el resultado en cache/wiki_stints.json,
que build.py usa solo donde Wikidata no tiene el dato.
"""
from __future__ import annotations

import csv
import json
import re
import subprocess
import sys
import time
from pathlib import Path

AQUI = Path(__file__).parent
CACHE = AQUI / "cache"
UA = "football-roster-research/0.1"


def api(url: str, params: dict) -> dict:
    cmd = ["curl", "-sS", "-f", "-G", "-m", "90", "-A", UA, url]
    for k, v in params.items():
        cmd += ["--data-urlencode", f"{k}={v}"]
    for intento in range(3):
        r = subprocess.run(cmd, capture_output=True, check=False)
        if r.returncode == 0:
            return json.loads(r.stdout)
        time.sleep(15 * (intento + 1))
    raise RuntimeError(r.stderr.decode()[:200])


def cargar(nombre: str) -> dict:
    ruta = CACHE / nombre
    return json.loads(ruta.read_text()) if ruta.exists() else {}


def pendientes(clubs: list[str]) -> list[str]:
    """Jugadores con alguna etapa sin partidos o sin fecha de inicio en esos clubes."""
    out = set()
    for cid in clubs:
        with open(CACHE / f"{cid}.csv", newline="") as f:
            for r in csv.DictReader(f):
                if not r["start"] or not r["m"] or r["m"].startswith("http"):
                    out.add(r["p"].rsplit("/", 1)[-1])
    return sorted(out)


def titulos(qids: list[str]) -> dict:
    # Por SPARQL y no por la API de entidades: esa devuelve 429 con facilidad.
    links = cargar("sitelinks.json")
    faltan = [q for q in qids if q not in links]
    for i in range(0, len(faltan), 200):
        lote = faltan[i:i + 200]
        q = ("SELECT ?p ?t WHERE { VALUES ?p { %s } ?a schema:about ?p; "
             "schema:isPartOf <https://en.wikipedia.org/>; schema:name ?t }" % " ".join("wd:" + x for x in lote))
        cmd = ["curl", "-sS", "-f", "-G", "-m", "90", "-A", UA, "-H", "Accept: text/csv",
               "--data-urlencode", "query=" + q, "https://query.wikidata.org/sparql"]
        r = subprocess.run(cmd, capture_output=True, check=False)
        if r.returncode != 0:
            print("  titulos: fallo un lote, espero 60 s:", r.stderr.decode().strip()[:80], flush=True)
            time.sleep(60)
            continue
        for x in lote:
            links[x] = ""
        for fila in csv.DictReader(r.stdout.decode().splitlines()):
            links[fila["p"].rsplit("/", 1)[-1]] = fila["t"]
        (CACHE / "sitelinks.json").write_text(json.dumps(links, ensure_ascii=False))
        print(f"  titulos {min(i + 200, len(faltan))}/{len(faltan)}", flush=True)
        time.sleep(3)
    return links


def fichas(links: dict, qids: list[str]) -> dict:
    """Texto de la ficha de cada articulo (solo la plantilla, no el articulo entero)."""
    txt = cargar("fichas.json")
    por_titulo = {links[q]: q for q in qids if links.get(q) and q not in txt}
    lista = sorted(por_titulo)
    for i in range(0, len(lista), 40):
        lote = lista[i:i + 40]
        data = api("https://en.wikipedia.org/w/api.php", {
            "action": "query", "prop": "revisions", "rvprop": "content", "rvslots": "main",
            "titles": "|".join(lote), "format": "json", "formatversion": "2", "redirects": "1"})
        vuelta = {n["to"]: n["from"] for n in data["query"].get("normalized", [])}
        vuelta.update({r["to"]: vuelta.get(r["from"], r["from"]) for r in data["query"].get("redirects", [])})
        for pag in data["query"].get("pages", []):
            titulo = vuelta.get(pag["title"], pag["title"])
            q = por_titulo.get(titulo)
            if not q:
                continue
            cuerpo = pag.get("revisions", [{}])[0].get("slots", {}).get("main", {}).get("content", "")
            a = re.search(r"\{\{\s*Infobox football biography", cuerpo, re.I)
            txt[q] = cuerpo[a.start():a.start() + 9000] if a else ""
        for t in lote:
            txt.setdefault(por_titulo[t], "")
        (CACHE / "fichas.json").write_text(json.dumps(txt, ensure_ascii=False))
        print(f"  fichas {min(i + 40, len(lista))}/{len(lista)}", flush=True)
        time.sleep(0.5)
    return txt


def limpiar(v: str) -> str:
    v = re.sub(r"<ref[^>]*/>|<ref.*?</ref>|<!--.*?-->", "", v, flags=re.S)
    return re.sub(r"\{\{[^{}]*\}\}", "", v).strip()


def entero(v: str):
    m = re.search(r"\d+", limpiar(v))
    return int(m.group()) if m else None


def leer_ficha(t: str) -> dict:
    """Devuelve {'stints': [{club, y0, y1, m, g}], 'caps': n} a partir del texto de la ficha."""
    t = re.sub(r"\[\[([^\]|]*)\|([^\]]*)\]\]", r"[[\1¦\2]]", t)   # el | dentro de enlaces estorba al partir
    campos: dict[tuple[str, str], str] = {}
    # Las fichas usan "nationalteam1" o "national_team1" segun la epoca del articulo.
    for k, n, v in re.findall(r"\|\s*([a-z_]+?)_?(\d+)\s*=\s*([^|\n]*)", t):
        campos[(k.replace("_", ""), n)] = v.strip()
    stints = []
    for (k, n), club in campos.items():
        if k != "clubs":
            continue
        anios = re.findall(r"\d{4}", limpiar(campos.get(("years", n), "")))
        m = entero(campos.get(("caps", n), ""))
        if not anios or m is None:
            continue
        abierto = bool(re.search(r"\d{4}\s*[–-]\s*$", limpiar(campos.get(("years", n), ""))))
        stints.append({"club": limpiar(club).lower(), "y0": int(anios[0]),
                       "y1": None if abierto else int(anios[-1]),
                       "m": m, "g": entero(campos.get(("goals", n), "")) or 0})
    caps = 0
    for (k, n), equipo in campos.items():
        if k == "nationalteam" and not re.search(r"U-?\d|under|olympic|youth| B\b", equipo, re.I):
            caps = max(caps, entero(campos.get(("nationalcaps", n), "")) or 0)
    return {"stints": stints, "caps": caps}


def main() -> None:
    liga = sys.argv[1] if len(sys.argv) > 1 else "mx"
    cfg = json.loads((AQUI / "clubs.json").read_text())
    clubs = next(l for l in cfg["ligas"] if l["id"] == liga)["clubs"]
    qids = pendientes(clubs)
    print(f"{len(qids)} jugadores con huecos en {liga}")
    links = titulos(qids)
    txt = fichas(links, qids)
    out = cargar("wiki_stints.json")
    for q in qids:
        if txt.get(q):
            out[q] = leer_ficha(txt[q])
    (CACHE / "wiki_stints.json").write_text(json.dumps(out, ensure_ascii=False))
    con = sum(1 for q in qids if out.get(q, {}).get("stints"))
    print(f"con articulo: {sum(1 for q in qids if links.get(q))}, con ficha util: {con}")


if __name__ == "__main__":
    main()
