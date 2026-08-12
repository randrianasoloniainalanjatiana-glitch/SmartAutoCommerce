import time
import json
from app.services import DatabaseService, SourcingService

def test_perf():
    db = DatabaseService()
    user_id = "edad3d6f-abb8-40b7-ba38-558c45223de2"
    filtre = db.filtre_utilisateur_produit(user_id)
    
    t0 = time.time()
    produits = db.get_tous_produits(filtre)
    t1 = time.time()
    
    print(f"Loaded {len(produits)} produits from MongoDB in {t1-t0:.3f}s")
    
    svc = SourcingService(produits)
    data = svc.tout()
    t2 = time.time()
    
    print(f"Calculated SourcingService.tout() in {t2-t1:.3f}s")
    
    json_data = json.dumps(data)
    t3 = time.time()
    print(f"JSON dumps took {t3-t2:.3f}s, size: {len(json_data) / 1024 / 1024:.2f} MB")

if __name__ == "__main__":
    test_perf()
