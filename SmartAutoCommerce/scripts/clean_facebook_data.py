"""
Script de nettoyage et audit des données Facebook.
Collection : Facebook_data_clean (base Scrapping_produit)
Peut être relancé à chaque nouveau scraping sans erreur.
"""

import json
import re
import os
from datetime import datetime
from collections import Counter, defaultdict

from pymongo import MongoClient


# ─── Configuration ───────────────────────────────────────────
MONGO_URI = "mongodb+srv://Lanjatiana:uY6Y8QhFARvcmdtK@scraping.37diz8i.mongodb.net/?appName=Scraping"
DB_NAME = "Scrapping_produit"
COLLECTION_NAME = "Facebook_data_clean"

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")
EXPORT_PATH = os.path.join(DATA_DIR, "facebook_clean_export.json")
RAPPORT_PATH = os.path.join(DATA_DIR, "rapport_qualite_facebook.json")


# ─── Mapping catégories ─────────────────────────────────────
CATEGORY_RULES = [
    (["câble", "cable"],                                          "Câble"),
    (["powerbank", "power bank"],                                 "PowerBank"),
    (["écouteur", "ecouteur", "earbuds", "tws", "intra-auriculaire"], "Écouteurs"),
    (["casque", "headphone", "headset"],                          "Casque"),
    (["chargeur", "charger", "gan"],                              "Chargeur"),
    (["montre", "watch", "smartwatch"],                           "Montre connectée"),
    (["enceinte", "speaker"],                                     "Enceinte"),
    (["moniteur", "écran", "ecran", "monitor"],                   "Moniteur"),
    (["laptop", "ordinateur", "lenovo", "asus", "dell", "hp", "pc"], "PC / Laptop"),
    (["gpu", "rtx", "rx ", "carte graphique"],                    "GPU"),
    (["ram", "ssd"],                                              "Composant PC"),
]


def classify_category(produit_nom, resume_fr):
    """Détermine la catégorie d'un document selon les mots-clés."""
    text = f"{produit_nom or ''} {resume_fr or ''}".lower()
    for keywords, category in CATEGORY_RULES:
        for kw in keywords:
            if kw in text:
                return category
    return "Autre"


def safe_int(value, default=0):
    """Convertit une valeur en int, retourne default si impossible."""
    if value is None:
        return default
    try:
        return int(value)
    except (ValueError, TypeError):
        return default


def main():
    print("=" * 60)
    print("  NETTOYAGE DONNÉES FACEBOOK — Facebook_data_clean")
    print("=" * 60)

    # ─── Connexion MongoDB ───────────────────────────────────
    client = MongoClient(MONGO_URI)
    db = client[DB_NAME]
    collection = db[COLLECTION_NAME]

    docs = list(collection.find({}))
    nb_original = len(docs)
    print(f"\n📦 Documents originaux : {nb_original}")

    if nb_original == 0:
        print("⚠️  Aucun document trouvé. Arrêt.")
        client.close()
        return

    # ═══════════════════════════════════════════════════════════
    # 1. AUDIT
    # ═══════════════════════════════════════════════════════════
    print("\n─── PHASE 1 : AUDIT ───")

    # Doublons sur id_unique
    id_groups = defaultdict(list)
    for doc in docs:
        uid = doc.get("id_unique")
        if uid:
            id_groups[uid].append(doc)

    doublons = {uid: group for uid, group in id_groups.items() if len(group) > 1}
    nb_doublons = sum(len(g) - 1 for g in doublons.values())
    print(f"  🔁 Groupes de doublons (id_unique) : {len(doublons)}  ({nb_doublons} docs en double)")

    # Différences dans les doublons
    for uid, group in list(doublons.items())[:5]:
        diffs = []
        ref = group[0]
        for other in group[1:]:
            for field in ("resume_fr", "priority_score", "produit_nom"):
                if ref.get(field) != other.get(field):
                    diffs.append(field)
        if diffs:
            print(f"    ↳ {uid} : différences sur {', '.join(set(diffs))}")

    # Taux de complétude
    fields_to_check = [
        "id_unique", "concurrent", "produit_nom", "prix", "resume_fr",
        "date_post", "likes", "comments", "lien_facebook", "analyzed_at",
        "priority_score", "priority_status"
    ]
    taux_completude = {}
    for field in fields_to_check:
        non_null = sum(1 for doc in docs if doc.get(field) is not None and doc.get(field) != "")
        taux_completude[field] = round(non_null / nb_original * 100, 1)

    print("\n  📊 Taux de complétude par champ :")
    for field, pct in taux_completude.items():
        bar = "█" * int(pct // 5) + "░" * (20 - int(pct // 5))
        print(f"    {field:20s} {bar} {pct}%")

    # Documents problématiques
    produit_vide = sum(1 for d in docs if not d.get("produit_nom"))
    prix_zero = sum(1 for d in docs if safe_int(d.get("prix")) == 0)
    concurrent_none = sum(1 for d in docs if not d.get("concurrent"))
    print(f"\n  ⚠️  produit_nom vide/None : {produit_vide}")
    print(f"  ⚠️  prix = 0 ou None       : {prix_zero}")
    print(f"  ⚠️  concurrent = None       : {concurrent_none}")

    # ═══════════════════════════════════════════════════════════
    # 2. NETTOYAGE
    # ═══════════════════════════════════════════════════════════
    print("\n─── PHASE 2 : NETTOYAGE ───")

    # Déduplique sur id_unique
    deduped = {}
    for doc in docs:
        uid = doc.get("id_unique")
        if not uid:
            # Garder les docs sans id_unique tels quels (clé = _id)
            deduped[str(doc["_id"])] = doc
            continue

        if uid not in deduped:
            deduped[uid] = doc
        else:
            existing = deduped[uid]
            existing_score = safe_int(existing.get("priority_score"))
            new_score = safe_int(doc.get("priority_score"))

            if new_score > existing_score:
                deduped[uid] = doc
            elif new_score == existing_score:
                # Garde le plus récent
                existing_date = existing.get("analyzed_at") or existing.get("date_post") or ""
                new_date = doc.get("analyzed_at") or doc.get("date_post") or ""
                if str(new_date) > str(existing_date):
                    deduped[uid] = doc

    cleaned_docs = list(deduped.values())
    nb_supprimes = nb_original - len(cleaned_docs)
    print(f"  🗑️  Doublons supprimés : {nb_supprimes}")
    print(f"  ✅ Documents après déduplication : {len(cleaned_docs)}")

    # Conversion des types + standardisation
    for doc in cleaned_docs:
        doc["likes"] = safe_int(doc.get("likes"))
        doc["comments"] = safe_int(doc.get("comments"))
        doc["prix"] = safe_int(doc.get("prix"))

        concurrent = doc.get("concurrent")
        if concurrent and isinstance(concurrent, str):
            doc["concurrent"] = concurrent.strip().lower()

    # ═══════════════════════════════════════════════════════════
    # 3. MAPPING CATÉGORIES
    # ═══════════════════════════════════════════════════════════
    print("\n─── PHASE 3 : MAPPING CATÉGORIES ───")
    categories_count = Counter()
    for doc in cleaned_docs:
        cat = classify_category(doc.get("produit_nom"), doc.get("resume_fr"))
        doc["categorie"] = cat
        categories_count[cat] += 1

    print("  📂 Catégories détectées :")
    for cat, count in categories_count.most_common():
        print(f"    {cat:20s} → {count} produits")

    # ═══════════════════════════════════════════════════════════
    # 4. SCORE D'ENGAGEMENT
    # ═══════════════════════════════════════════════════════════
    print("\n─── PHASE 4 : SCORE_ENGAGEMENT ───")
    for doc in cleaned_docs:
        doc["score_engagement"] = doc["likes"] * 1.0 + doc["comments"] * 3.0

    scores = [d["score_engagement"] for d in cleaned_docs]
    if scores:
        print(f"  📈 Score engagement — min: {min(scores):.0f}, max: {max(scores):.0f}, moy: {sum(scores)/len(scores):.0f}")

    # ═══════════════════════════════════════════════════════════
    # 5. OUTPUTS
    # ═══════════════════════════════════════════════════════════
    print("\n─── PHASE 5 : SAUVEGARDE ───")

    os.makedirs(DATA_DIR, exist_ok=True)

    # Préparer pour JSON (convertir ObjectId et dates)
    def serialize_doc(doc):
        d = {}
        for k, v in doc.items():
            if k == "_id":
                d[k] = str(v)
            elif isinstance(v, datetime):
                d[k] = v.isoformat()
            else:
                d[k] = v
        return d

    export_data = [serialize_doc(d) for d in cleaned_docs]

    with open(EXPORT_PATH, "w", encoding="utf-8") as f:
        json.dump(export_data, f, ensure_ascii=False, indent=2)
    print(f"  💾 Export nettoyé : {EXPORT_PATH} ({len(export_data)} documents)")

    # Rapport qualité
    rapport = {
        "nb_original": nb_original,
        "nb_apres_nettoyage": len(cleaned_docs),
        "nb_doublons_supprimes": nb_supprimes,
        "taux_completude": taux_completude,
        "categories_trouvees": dict(categories_count),
        "date_nettoyage": datetime.utcnow().isoformat(),
    }

    with open(RAPPORT_PATH, "w", encoding="utf-8") as f:
        json.dump(rapport, f, ensure_ascii=False, indent=2)
    print(f"  📝 Rapport qualité : {RAPPORT_PATH}")

    # ═══════════════════════════════════════════════════════════
    # Mise à jour de la collection MongoDB avec les données nettoyées
    # ═══════════════════════════════════════════════════════════
    print("\n─── MISE À JOUR MONGODB ───")
    update_count = 0
    for doc in cleaned_docs:
        doc_id = doc.get("_id")
        if doc_id:
            update_fields = {
                "likes": doc["likes"],
                "comments": doc["comments"],
                "prix": doc["prix"],
                "concurrent": doc["concurrent"],
                "categorie": doc["categorie"],
                "score_engagement": doc["score_engagement"],
            }
            collection.update_one({"_id": doc_id}, {"$set": update_fields})
            update_count += 1

    print(f"  🔄 Documents mis à jour dans MongoDB : {update_count}")

    client.close()

    print("\n" + "=" * 60)
    print("  ✅ NETTOYAGE TERMINÉ AVEC SUCCÈS")
    print(f"  {nb_original} → {len(cleaned_docs)} documents (−{nb_supprimes} doublons)")
    print("=" * 60)


if __name__ == "__main__":
    main()
