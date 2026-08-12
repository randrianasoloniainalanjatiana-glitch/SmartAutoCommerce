"""
Script pour corriger le type de la colonne code_confirmation
dans la table utilisateurs (de character(1) vers text).

Exécuter une seule fois : python manage.py shell < SAC/fix_column.py
"""
from SAC.supabase_client import supabase

print("=== Correction de la colonne code_confirmation ===")

try:
    # Utiliser la fonction rpc pour exécuter du SQL brut
    # Supabase permet d'exécuter du SQL via la fonction rpc
    result = supabase.rpc('', {}).execute()
except Exception:
    pass

# Alternative : utiliser postgrest pour forcer le type
# Si rpc ne marche pas, il faut modifier la colonne manuellement dans Supabase Dashboard
print("""
╔══════════════════════════════════════════════════════════════╗
║  IMPORTANT : Allez dans votre Supabase Dashboard            ║
║  → SQL Editor → New query → Collez et exécutez :            ║
║                                                              ║
║  ALTER TABLE utilisateurs                                    ║
║    ALTER COLUMN code_confirmation TYPE text;                  ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
""")
