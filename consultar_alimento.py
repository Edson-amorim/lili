# -*- coding: utf-8 -*-
"""
Utilitário de Consulta Direta ao Banco de Dados SQLite da Tabela NEPA/TACO
Uso: python consultar_alimento.py "nome do alimento" [quantidade_gramas]
"""

import sqlite3
import sys
import unicodedata
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent / "banco_dados" / "taco_nepa.db"


def remover_acentos(texto: str) -> str:
    nfkd = unicodedata.normalize("NFKD", texto)
    return "".join(c for c in nfkd if not unicodedata.combining(c)).lower()


def consultar_alimento(termo: str, porcao_g: float = 100.0):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    palavras = remover_acentos(termo).replace(",", " ").split()
    condicoes = " AND ".join(["alimento_busca LIKE ?"] * len(palavras))
    parametros = [f"%{p}%" for p in palavras]

    sql = f"SELECT * FROM alimentos WHERE {condicoes} ORDER BY id LIMIT 10" if palavras else "SELECT * FROM alimentos LIMIT 10"
    cur.execute(sql, parametros)
    resultados = cur.fetchall()
    conn.close()

    fator = porcao_g / 100.0
    lista_formatada = []
    for row in resultados:
        d = dict(row)
        lista_formatada.append({
            "id": d["id"],
            "alimento": d["alimento"],
            "categoria": d["categoria"],
            "porcao_g": porcao_g,
            "calorias_kcal": round(d["calorias_kcal"] * fator, 1),
            "energia_kj": round(d["energia_kj"] * fator, 1),
            "proteinas_g": round(d["proteinas_g"] * fator, 1),
            "carboidratos_g": round(d["carboidratos_g"] * fator, 1),
            "gorduras_g": round(d["gorduras_g"] * fator, 1),
            "fibras_g": round(d["fibras_g"] * fator, 1),
            "colesterol_mg": round(d["colesterol_mg"] * fator, 1),
            "calcio_mg": round(d["calcio_mg"] * fator, 1),
            "ferro_mg": round(d["ferro_mg"] * fator, 2),
            "sodio_mg": round(d["sodio_mg"] * fator, 1),
            "potassio_mg": round(d["potassio_mg"] * fator, 1),
            "magnesio_mg": round(d["magnesio_mg"] * fator, 1),
            "fosforo_mg": round(d["fosforo_mg"] * fator, 1),
            "zinco_mg": round(d["zinco_mg"] * fator, 2),
            "vitamina_c_mg": round(d["vitamina_c_mg"] * fator, 1),
        })
    return lista_formatada


if __name__ == "__main__":
    termo = sys.argv[1] if len(sys.argv) > 1 else "arroz cozido"
    porcao = float(sys.argv[2]) if len(sys.argv) > 2 else 100.0
    itens = consultar_alimento(termo, porcao)
    print(f"=== Resultados na Tabela NEPA/TACO para '{termo}' (Porcao: {porcao}g) ===")
    for item in itens:
        print(
            f"[{item['id']}] {item['alimento']} ({item['categoria']})\n"
            f"    Calorias: {item['calorias_kcal']} kcal | Proteinas: {item['proteinas_g']} g | "
            f"Carboidratos: {item['carboidratos_g']} g | Gorduras: {item['gorduras_g']} g | "
            f"Fibras: {item['fibras_g']} g | Sodio: {item['sodio_mg']} mg | "
            f"Calcio: {item['calcio_mg']} mg | Ferro: {item['ferro_mg']} mg"
        )
