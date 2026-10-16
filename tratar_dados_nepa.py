# -*- coding: utf-8 -*-
"""
Script de Tratamento de Dados da Tabela TACO / NEPA-UNICAMP (4ª Edição)
Projeto Lili - Sistema de Rastreamento e Consulta Nutricional para Nutricionistas
"""

import csv
import json
import os
import re
import sqlite3
import unicodedata
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
DB_DIR = BASE_DIR / "banco_dados"
DB_DIR.mkdir(exist_ok=True)
RAW_JSON_PATH = DB_DIR / "brutos" / "TACO_bruta.json"
RAW_CSV_PATH = DB_DIR / "brutos" / "taco_composicao_bruta.csv"

# Valores de referência (TBCA/IBGE por 100g) para os 4 itens que na TACO 4ª ed. vieram com '*' (em revisão)
IMPUTACOES_REVISAO = {
    450: {  # Iogurte, sabor abacaxi
        "umidade_pct": 78.5,
        "calorias_kcal": 89.0,
        "energia_kj": 372.0,
        "proteinas_g": 3.2,
        "gorduras_g": 1.8,
        "colesterol_mg": 7.0,
        "carboidratos_g": 15.0,
        "fibras_g": 0.2,
        "cinzas_g": 0.7,
        "calcio_mg": 110.0,
        "magnesio_mg": 11.0,
        "fosforo_mg": 88.0,
        "ferro_mg": 0.1,
        "sodio_mg": 46.0,
        "potassio_mg": 145.0,
        "zinco_mg": 0.4,
        "vitamina_c_mg": 1.5,
    },
    457: {  # Leite, de vaca, desnatado, UHT
        "umidade_pct": 90.8,
        "calorias_kcal": 35.0,
        "energia_kj": 146.0,
        "proteinas_g": 3.4,
        "gorduras_g": 0.2,
        "colesterol_mg": 2.0,
        "carboidratos_g": 4.9,
        "fibras_g": 0.0,
        "cinzas_g": 0.7,
        "calcio_mg": 125.0,
        "magnesio_mg": 11.0,
        "fosforo_mg": 95.0,
        "ferro_mg": 0.1,
        "sodio_mg": 52.0,
        "potassio_mg": 150.0,
        "zinco_mg": 0.4,
        "vitamina_c_mg": 0.0,
    },
    458: {  # Leite, de vaca, integral
        "umidade_pct": 87.7,
        "calorias_kcal": 61.0,
        "energia_kj": 255.0,
        "proteinas_g": 3.2,
        "gorduras_g": 3.3,
        "colesterol_mg": 10.0,
        "carboidratos_g": 4.7,
        "fibras_g": 0.0,
        "cinzas_g": 0.7,
        "calcio_mg": 123.0,
        "magnesio_mg": 10.0,
        "fosforo_mg": 93.0,
        "ferro_mg": 0.1,
        "sodio_mg": 49.0,
        "potassio_mg": 140.0,
        "zinco_mg": 0.4,
        "vitamina_c_mg": 0.9,
    },
    591: {  # Coco, verde, cru (polpa)
        "umidade_pct": 84.0,
        "calorias_kcal": 95.0,
        "energia_kj": 397.0,
        "proteinas_g": 1.1,
        "gorduras_g": 8.5,
        "colesterol_mg": 0.0,
        "carboidratos_g": 4.8,
        "fibras_g": 2.2,
        "cinzas_g": 0.6,
        "calcio_mg": 11.0,
        "magnesio_mg": 20.0,
        "fosforo_mg": 42.0,
        "ferro_mg": 1.1,
        "sodio_mg": 16.0,
        "potassio_mg": 250.0,
        "zinco_mg": 0.3,
        "vitamina_c_mg": 3.3,
    },
}


def remover_acentos(texto: str) -> str:
    nfkd = unicodedata.normalize("NFKD", texto)
    return "".join(c for c in nfkd if not unicodedata.combining(c)).lower()


def limpar_numero(valor, casas=2) -> float:
    """Converte valores brutos da TACO ('NA', 'Tr', '*', '', ',0,02', 'a', float) para float limpo."""
    if valor is None:
        return 0.0
    if isinstance(valor, (int, float)):
        return round(float(valor), casas)
    s = str(valor).strip()
    if not s or s in ("NA", "Tr", "*", "a", "-"):
        return 0.0
    # Caso específico do item 373 na TACO bruta: ',0,02' -> '0.02'
    s = s.lstrip(",").replace(",", ".")
    try:
        return round(float(s), casas)
    except ValueError:
        return 0.0


def limpar_texto(texto: str) -> str:
    """Normaliza espaços duplicados na descrição do alimento."""
    return re.sub(r"\s+", " ", str(texto).strip())


def carregar_complementos_csv():
    """Carrega base, preparo e qualificadores do CSV complementar se existir."""
    mapa = {}
    if RAW_CSV_PATH.exists():
        with open(RAW_CSV_PATH, encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                num = int(row["numero_alimento"])
                mapa[num] = {
                    "alimento_base": limpar_texto(row.get("base", "")),
                    "preparo": limpar_texto(row.get("preparo", "")),
                    "qualificadores": limpar_texto(row.get("qualificadores", "")),
                }
    return mapa


def processar_dados():
    with open(RAW_JSON_PATH, encoding="utf-8") as f:
        dados_brutos = json.load(f)

    complementos = carregar_complementos_csv()
    alimentos_tratados = []

    for item in dados_brutos:
        id_alimento = int(item["id"])
        nome = limpar_texto(item["description"])
        categoria = limpar_texto(item["category"])
        comp = complementos.get(id_alimento, {})

        registro = {
            "id": id_alimento,
            "alimento": nome,
            "alimento_busca": remover_acentos(nome),
            "categoria": categoria,
            "alimento_base": comp.get("alimento_base", nome.split(",")[0].strip()),
            "preparo": comp.get("preparo", ""),
            "qualificadores": comp.get("qualificadores", ""),
            "porcao_referencia_g": 100,
            "umidade_pct": limpar_numero(item.get("humidity_percents"), 1),
            "calorias_kcal": limpar_numero(item.get("energy_kcal"), 1),
            "energia_kj": limpar_numero(item.get("energy_kj"), 1),
            "proteinas_g": limpar_numero(item.get("protein_g"), 1),
            "gorduras_g": limpar_numero(item.get("lipid_g"), 1),
            "carboidratos_g": limpar_numero(item.get("carbohydrate_g"), 1),
            "fibras_g": limpar_numero(item.get("fiber_g"), 1),
            "colesterol_mg": limpar_numero(item.get("cholesterol_mg"), 1),
            "cinzas_g": limpar_numero(item.get("ashes_g"), 2),
            "calcio_mg": limpar_numero(item.get("calcium_mg"), 1),
            "magnesio_mg": limpar_numero(item.get("magnesium_mg"), 1),
            "manganes_mg": limpar_numero(item.get("manganese_mg"), 2),
            "fosforo_mg": limpar_numero(item.get("phosphorus_mg"), 1),
            "ferro_mg": limpar_numero(item.get("iron_mg"), 2),
            "sodio_mg": limpar_numero(item.get("sodium_mg"), 1),
            "potassio_mg": limpar_numero(item.get("potassium_mg"), 1),
            "cobre_mg": limpar_numero(item.get("copper_mg"), 2),
            "zinco_mg": limpar_numero(item.get("zinc_mg"), 2),
            "retinol_mcg": limpar_numero(item.get("retinol_mcg"), 1),
            "tiamina_mg": limpar_numero(item.get("thiamine_mg"), 2),
            "riboflavina_mg": limpar_numero(item.get("riboflavin_mg"), 2),
            "piridoxina_mg": limpar_numero(item.get("pyridoxine_mg"), 2),
            "niacina_mg": limpar_numero(item.get("niacin_mg"), 2),
            "vitamina_c_mg": limpar_numero(item.get("vitaminC_mg"), 1),
            "gordura_saturada_g": limpar_numero(item.get("saturated_g"), 2),
            "gordura_monoinsaturada_g": limpar_numero(item.get("monounsaturated_g"), 2),
            "gordura_poliinsaturada_g": limpar_numero(item.get("polyunsaturated_g"), 2),
        }

        # Aplicar imputação para os 4 alimentos marcados com '*' na TACO 4ª ed.
        if id_alimento in IMPUTACOES_REVISAO:
            registro.update(IMPUTACOES_REVISAO[id_alimento])

        alimentos_tratados.append(registro)

    return alimentos_tratados


def salvar_json(alimentos):
    caminho_json = DB_DIR / "taco_nepa_tratada.json"
    with open(caminho_json, "w", encoding="utf-8") as f:
        json.dump(alimentos, f, ensure_ascii=False, indent=2)
    print(f"[OK] JSON salvo em: {caminho_json} ({len(alimentos)} alimentos)")


def salvar_csv(alimentos):
    caminho_csv = DB_DIR / "taco_nepa_tratada.csv"
    colunas = list(alimentos[0].keys())
    with open(caminho_csv, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=colunas)
        writer.writeheader()
        writer.writerows(alimentos)
    print(f"[OK] CSV salvo em: {caminho_csv}")


def salvar_sqlite(alimentos):
    caminho_db = DB_DIR / "taco_nepa.db"
    if caminho_db.exists():
        caminho_db.unlink()

    conn = sqlite3.connect(caminho_db)
    cur = conn.cursor()

    cur.execute("""
        CREATE TABLE alimentos (
            id INTEGER PRIMARY KEY,
            alimento TEXT NOT NULL,
            alimento_busca TEXT NOT NULL,
            categoria TEXT NOT NULL,
            alimento_base TEXT,
            preparo TEXT,
            qualificadores TEXT,
            porcao_referencia_g INTEGER DEFAULT 100,
            umidade_pct REAL,
            calorias_kcal REAL,
            energia_kj REAL,
            proteinas_g REAL,
            gorduras_g REAL,
            carboidratos_g REAL,
            fibras_g REAL,
            colesterol_mg REAL,
            cinzas_g REAL,
            calcio_mg REAL,
            magnesio_mg REAL,
            manganes_mg REAL,
            fosforo_mg REAL,
            ferro_mg REAL,
            sodio_mg REAL,
            potassio_mg REAL,
            cobre_mg REAL,
            zinco_mg REAL,
            retinol_mcg REAL,
            tiamina_mg REAL,
            riboflavina_mg REAL,
            piridoxina_mg REAL,
            niacina_mg REAL,
            vitamina_c_mg REAL,
            gordura_saturada_g REAL,
            gordura_monoinsaturada_g REAL,
            gordura_poliinsaturada_g REAL
        )
    """)

    colunas = list(alimentos[0].keys())
    placeholders = ", ".join(["?"] * len(colunas))
    sql_insert = f"INSERT INTO alimentos ({', '.join(colunas)}) VALUES ({placeholders})"

    for a in alimentos:
        cur.execute(sql_insert, [a[col] for col in colunas])

    cur.execute("CREATE INDEX idx_alimentos_nome ON alimentos(alimento)")
    cur.execute("CREATE INDEX idx_alimentos_busca ON alimentos(alimento_busca)")
    cur.execute("CREATE INDEX idx_alimentos_categoria ON alimentos(categoria)")

    conn.commit()
    conn.close()
    print(f"[OK] Banco SQLite salvo em: {caminho_db}")


def salvar_js(alimentos):
    caminho_js = BASE_DIR / "banco_alimentos.js"
    conteudo_js = (
        "// Banco de Dados Tratado da Tabela TACO / NEPA-UNICAMP (4ª Edição - 597 Alimentos)\n"
        "// Valores nutricionais de referência por 100g de parte comestível\n"
        "const BANCO_ALIMENTOS_NEPA = "
        + json.dumps(alimentos, ensure_ascii=False, indent=2)
        + ";\n"
    )
    with open(caminho_js, "w", encoding="utf-8") as f:
        f.write(conteudo_js)
    print(f"[OK] Banco JS para o sistema web salvo em: {caminho_js}")


if __name__ == "__main__":
    alimentos = processar_dados()
    salvar_json(alimentos)
    salvar_csv(alimentos)
    salvar_sqlite(alimentos)
    salvar_js(alimentos)
