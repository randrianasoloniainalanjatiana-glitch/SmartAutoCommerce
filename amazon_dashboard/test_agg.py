from pymongo import MongoClient
import sys
import os

sys.path.append(os.path.abspath('.'))
from config.settings import Config

def test_aggregation():
    client = MongoClient(Config.CONNECTION_STRING)
    db = client[Config.DATABASE_NAME]
    collection = db[Config.COLLECTION_NAME]
    
    user_id = "edad3d6f-abb8-40b7-ba38-558c45223de2"
    filtre = {"id_utilisateur": user_id}
    
    # 1. Get stats
    stats_pipeline = [
        {"$match": filtre},
        {"$group": {
            "_id": None,
            "min_note": {"$min": "$note"}, "max_note": {"$max": "$note"},
            "min_avis": {"$min": "$avis_int"}, "max_avis": {"$max": "$avis_int"},
            "min_achats": {"$min": "$achats_mensuels"}, "max_achats": {"$max": "$achats_mensuels"},
            "min_qp": {"$min": "$rapport_qualite_prix"}, "max_qp": {"$max": "$rapport_qualite_prix"}
        }}
    ]
    stats = list(collection.aggregate(stats_pipeline))[0]
    print("Stats:", stats)
    
    poids = Config.POIDS_SCORE
    
    def norm_expr(field, min_val, max_val):
        if min_val == max_val: return 0.5
        return { "$divide": [ { "$subtract": [field, min_val] }, max_val - min_val ] }
    
    # Avoid field undefined issues
    def safe_field(field, default=0):
        return { "$ifNull": [field, default] }
        
    score_expr = { "$add": [
        { "$multiply": [ poids["note"], norm_expr(safe_field("$note", 0), stats["min_note"], stats["max_note"]) ] },
        { "$multiply": [ poids["volume_avis"], norm_expr(safe_field("$avis_int", 0), stats["min_avis"], stats["max_avis"]) ] },
        { "$multiply": [ poids["achats"], norm_expr(safe_field("$achats_mensuels", 0), stats["min_achats"], stats["max_achats"]) ] },
        { "$multiply": [ poids["rapport_qp"], norm_expr(safe_field("$rapport_qualite_prix", 0), stats["min_qp"], stats["max_qp"]) ] }
    ] }
    
    pipeline = [
        { "$match": filtre },
        { "$addFields": { "score_global": score_expr } },
        { "$sort": { "score_global": -1 } },
        { "$limit": 5 }
    ]
    
    res = list(collection.aggregate(pipeline))
    print(f"\nTop 5 Sourcing Products:")
    for r in res:
        print(f"ASIN: {r.get('asin')}, Score: {r.get('score_global')}")

if __name__ == "__main__":
    test_aggregation()
