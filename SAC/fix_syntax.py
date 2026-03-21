#!/usr/bin/env python3
# Script pour corriger l'erreur de syntaxe dans views.py

with open('views.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Corriger les guillemets incorrects
content = content.replace('.select("*")', '.select("*")')

with open('views.py', 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ Erreur de syntaxe corrigée dans views.py")
print("Les guillemets ont été corrigés dans .select()")
