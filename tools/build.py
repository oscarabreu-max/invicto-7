"""Convierte los CSV de cache/ en ../data.js para el juego.

Uso: python3 build.py
Cada jugador lleva solo datos reales de Wikidata: anios en el club, partidos y
goles de liga con ese club, posiciones y partidos con su seleccion mayor.
"""
from __future__ import annotations

import csv
import json
import re
import subprocess
import time
from pathlib import Path

AQUI = Path(__file__).parent
CACHE = AQUI / "cache"
UA = "football-roster-research/0.1"
HOY = 2026
DECADAS = [1980, 1990, 2000, 2010, 2020]
MIN_PARTIDOS = 20      # menos que esto es un paso fugaz o una cesion
POR_DECADA = 16        # jugadores que se ofrecen por club y decada
MIN_PLANTEL = 9
# Goles por partido maximos creibles segun el puesto mas ofensivo del jugador.
LIMITE_GOL = {"DEF": 0.45, "MED": 0.6, "DEL": 1.1}
# Errores detectados a mano en Wikidata: [club, jugador] que nunca jugo ahi.
EXCLUIR = json.loads((AQUI / "excluir.json").read_text())
# Como reconocer cada club en una ficha de Wikipedia, y las fichas ya leidas (wiki.py).
ALIAS = json.loads((AQUI / "alias.json").read_text())
_ruta_wiki = CACHE / "wiki_stints.json"
WIKI = json.loads(_ruta_wiki.read_text()) if _ruta_wiki.exists() else {}


def es_club(texto: str, cid: str) -> bool:
    a = ALIAS.get(cid)
    if not a:
        return False
    t = " " + texto.replace("[[", " ").replace("]]", " ").replace("¦", " ") + " "
    return any(x in t for x in a["si"]) and not any(x in t for x in a["no"])


def num(x: str):
    try:
        return float(x)
    except (TypeError, ValueError):
        return None  # Wikidata marca "valor desconocido" con una URL


def anio(x: str):
    m = re.match(r"(\d{4})-", x or "")
    return int(m.group(1)) if m else None


def posiciones(texto: str) -> list[str]:
    out = []
    for p in texto.lower().split(";"):
        if "goalkeeper" in p:
            t = ["POR"]
        elif "wing-back" in p or "wing back" in p:
            t = ["DEF", "MED"]
        elif "winger" in p or "wing half" in p:
            t = ["MED", "DEL"]
        elif "back" in p or "defender" in p or "sweeper" in p or "libero" in p or "stopper" in p:
            t = ["DEF"]
        elif "midfield" in p or "playmaker" in p:
            t = ["MED"]
        elif "forward" in p or "striker" in p or "attacker" in p:
            t = ["DEL"]
        else:
            t = []
        for x in t:
            if x not in out:
                out.append(x)
    if out == ["POR"]:
        return out
    # Un jugador de campo que alguna vez atajo (Enzo Perez) no es portero.
    out = [x for x in out if x != "POR"]
    return sorted(out, key=["DEF", "MED", "DEL"].index)


def leer_club(cid: str) -> list[dict]:
    """Une las etapas de cada jugador en el club y filtra desde 1980."""
    jug: dict[str, dict] = {}
    todos: dict[str, tuple] = {}   # qid -> (nombre, posiciones), tenga o no partidos
    with open(CACHE / f"{cid}.csv", newline="") as f:
        for r in csv.DictReader(f):
            if not re.fullmatch(r"Q\d+", r["pLabel"]):
                todos.setdefault(r["p"].rsplit("/", 1)[-1], (r["pLabel"], posiciones(r["pos"])))
            y0, m = anio(r["start"]), num(r["m"])
            if y0 is None or m is None or m <= 0:
                continue
            y1 = anio(r["end"])
            if y1 is None:
                # Sin fecha de salida: sigue en el club si es reciente; si no, se estima por partidos.
                y1 = HOY if y0 >= 2014 else y0 + max(1, round(m / 30))
            qid = r["p"].rsplit("/", 1)[-1]
            nombre = r["pLabel"]
            if re.fullmatch(r"Q\d+", nombre):
                continue
            if y1 < y0:
                y1 = y0
            if m / (y1 - y0 + 1) > 55:
                continue  # mas de 55 partidos de liga por anio no existe: dato mal capturado
            if [cid, qid] in EXCLUIR or [cid, nombre] in EXCLUIR:
                continue
            j = jug.setdefault(qid, {"q": qid, "n": nombre, "pos": posiciones(r["pos"]), "m": 0, "g": 0, "y0": y0, "y1": y1, "et": []})
            j["m"] += int(m)
            j["g"] += int(num(r["g"]) or 0)
            j["y0"], j["y1"] = min(j["y0"], y0), max(j["y1"], y1)
            j["et"].append((y0, y1))
    # Donde Wikidata no trae partidos o fechas, se usa la ficha de Wikipedia.
    for qid, (nombre, pos) in todos.items():
        if qid in jug or [cid, qid] in EXCLUIR or [cid, nombre] in EXCLUIR:
            continue
        for e in WIKI.get(qid, {}).get("stints", []):
            if not es_club(e["club"], cid) or e["m"] <= 0:
                continue
            y0 = e["y0"]
            y1 = e["y1"] if e["y1"] else (HOY if y0 >= 2014 else y0 + max(1, round(e["m"] / 30)))
            y1 = max(y1, y0)
            if e["m"] / (y1 - y0 + 1) > 55:
                continue
            j = jug.setdefault(qid, {"q": qid, "n": nombre, "pos": pos, "m": 0, "g": 0, "y0": y0, "y1": y1, "et": []})
            j["m"] += e["m"]
            j["g"] += e["g"]
            j["y0"], j["y1"] = min(j["y0"], y0), max(j["y1"], y1)
            j["et"].append((y0, y1))

    out = []
    for j in jug.values():
        if not j["pos"] or j["m"] < MIN_PARTIDOS or j["y1"] < 1980:
            continue
        gpp = j["g"] / j["m"]
        if j["pos"] == ["POR"]:
            if j["g"] > 10:
                j["g"] = 0  # en porteros Wikidata a veces guarda los goles recibidos
        elif gpp > LIMITE_GOL[j["pos"][-1]]:
            continue  # promedio imposible para el puesto: dato mal capturado, se descarta
        out.append(j)
    return out


def en_decada(j: dict, d: int) -> bool:
    # Se cuenta etapa por etapa: un regreso simbolico anios despues no lo mete en esa decada.
    solape = sum(max(0, min(y1, d + 9) - max(y0, d) + 1) for y0, y1 in j["et"])
    total = sum(y1 - y0 + 1 for y0, y1 in j["et"])
    return solape >= 3 or (solape >= 1 and solape >= 0.5 * total)


def plantel(js: list[dict]) -> list[dict]:
    """Los de mas partidos, pero garantizando que haya de todos los puestos."""
    js = sorted(js, key=lambda j: -j["m"])
    elegidos: list[dict] = []
    for puesto, cuantos in (("POR", 2), ("DEF", 4), ("MED", 4), ("DEL", 4)):
        n = 0
        for j in js:
            if j["pos"][0] == puesto and j not in elegidos and n < cuantos:
                elegidos.append(j)
                n += 1
    for j in js:
        if len(elegidos) >= POR_DECADA:
            break
        if j not in elegidos and j["pos"] != ["POR"]:
            elegidos.append(j)
    orden = {"POR": 0, "DEF": 1, "MED": 2, "DEL": 3}
    return sorted(elegidos, key=lambda j: (orden[j["pos"][0]], -j["m"]))


def traer_caps(qids: list[str]) -> dict[str, int]:
    """Partidos con la seleccion mayor, en lotes y con cache."""
    ruta = CACHE / "caps.json"
    caps = json.loads(ruta.read_text()) if ruta.exists() else {}
    faltan = [q for q in qids if q not in caps]
    for i in range(0, len(faltan), 150):
        lote = faltan[i:i + 150]
        q = """SELECT ?p (MAX(?nm) AS ?caps) WHERE {
  VALUES ?p { %s }
  ?p p:P54 ?ns. ?ns ps:P54 ?nt; pq:P1350 ?nm.
  VALUES ?clase { wd:Q135408445 wd:Q6979593 } ?nt wdt:P31 ?clase.
  ?nt rdfs:label ?l. FILTER(LANG(?l)="en")
  FILTER(!REGEX(?l, "under|U-?[0-9]|Olympic|youth| B$|amateur|women", "i"))
} GROUP BY ?p""" % " ".join("wd:" + x for x in lote)
        r = subprocess.run(["curl", "-sS", "-f", "-G", "-m", "90", "-A", UA, "-H", "Accept: text/csv",
                            "--data-urlencode", "query=" + q, "https://query.wikidata.org/sparql"],
                           capture_output=True, check=False)
        if r.returncode != 0:
            print("  caps: fallo un lote, espero 60 s:", r.stderr.decode().strip()[:80])
            time.sleep(60)
            continue
        for x in lote:
            caps[x] = 0
        for fila in csv.DictReader(r.stdout.decode().splitlines()):
            v = num(fila["caps"])
            if v is not None:
                caps[fila["p"].rsplit("/", 1)[-1]] = int(v)
        ruta.write_text(json.dumps(caps))
        print(f"  caps {min(i + 150, len(faltan))}/{len(faltan)}", flush=True)
        time.sleep(3)
    return caps


def mujeres(qids: list[str]) -> set[str]:
    """Jugadoras: Wikidata a veces las asocia al club varonil. Se excluyen del juego."""
    ruta = CACHE / "genero.json"
    gen = json.loads(ruta.read_text()) if ruta.exists() else {}
    faltan = [q for q in qids if q not in gen]
    for i in range(0, len(faltan), 300):
        lote = faltan[i:i + 300]
        q = "SELECT ?p WHERE { VALUES ?p { %s } ?p wdt:P21 wd:Q6581072 }" % " ".join("wd:" + x for x in lote)
        r = subprocess.run(["curl", "-sS", "-f", "-G", "-m", "90", "-A", UA, "-H", "Accept: text/csv",
                            "--data-urlencode", "query=" + q, "https://query.wikidata.org/sparql"],
                           capture_output=True, check=False)
        if r.returncode != 0:
            print("  genero: fallo un lote, espero 60 s", flush=True)
            time.sleep(60)
            continue
        for x in lote:
            gen[x] = 0
        for fila in csv.DictReader(r.stdout.decode().splitlines()):
            gen[fila["p"].rsplit("/", 1)[-1]] = 1
        ruta.write_text(json.dumps(gen))
        print(f"  genero {min(i + 300, len(faltan))}/{len(faltan)}", flush=True)
        time.sleep(3)
    return {q for q, v in gen.items() if v}


def main() -> None:
    cfg = json.loads((AQUI / "clubs.json").read_text())
    clubs = {}
    leidos = {cid: leer_club(cid) for cid in cfg["clubs"]}
    fuera = mujeres(sorted({j["q"] for js in leidos.values() for j in js}))
    for cid, (nombre, _titulo, c1, c2, patron) in cfg["clubs"].items():
        js = [j for j in leidos[cid] if j["q"] not in fuera]
        decs = {}
        for d in DECADAS:
            p = plantel([j for j in js if en_decada(j, d)])
            if len(p) >= MIN_PLANTEL and p[0]["pos"] == ["POR"]:
                decs[d] = p
        clubs[cid] = {"n": nombre, "c": [c1, c2, patron], "d": decs}

    qids = sorted({j["q"] for c in clubs.values() for p in c["d"].values() for j in p})
    caps = traer_caps(qids)

    salida = {}
    for cid, c in clubs.items():
        salida[cid] = {"n": c["n"], "c": c["c"], "d": {
            str(d): [[j["q"], j["n"], ",".join(j["pos"]), j["m"], j["g"], max(caps.get(j["q"], 0), WIKI.get(j["q"], {}).get("caps", 0)), j["y0"], j["y1"]] for j in p]
            for d, p in c["d"].items()}}
    ligas = [{"id": l["id"], "n": l["n"], "clubs": [c for c in l["clubs"] if salida[c]["d"]]} for l in cfg["ligas"]]

    js_txt = ("// Generado por tools/build.py a partir de Wikidata (CC0). No editar a mano.\n"
              "// Jugador: [id, nombre, posiciones, partidos, goles, partidos con seleccion, desde, hasta]\n"
              "var LIGAS = " + json.dumps(ligas, ensure_ascii=False) + ";\n"
              "var CLUBS = " + json.dumps(salida, ensure_ascii=False, separators=(",", ":")) + ";\n"
              "if (typeof module !== 'undefined') { module.exports = { LIGAS: LIGAS, CLUBS: CLUBS }; }\n")
    (AQUI.parent / "data.js").write_text(js_txt)

    print(f"{len(qids)} jugadores, data.js {len(js_txt) // 1024} KB")
    for l in ligas:
        combos = sum(len(salida[c]["d"]) for c in l["clubs"])
        flojos = [f"{salida[c]['n']}({len(salida[c]['d'])})" for c in l["clubs"] if len(salida[c]["d"]) < 4]
        fuera = [cfg["clubs"][c][0] for c in next(x for x in cfg["ligas"] if x["id"] == l["id"])["clubs"] if c not in l["clubs"]]
        print(f"{l['n']:18} {len(l['clubs'])} clubes, {combos} club-decada | <4 decadas: {flojos} | sin datos: {fuera}")


if __name__ == "__main__":
    main()
