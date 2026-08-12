@echo off
echo ========================================================
echo Lancement de SmartAutoCommerce pour acces au reseau local
echo ========================================================
echo.

echo Demarrage du backend Django (Port 8000)...
start "Backend Django" cmd /k "cd SmartAutoCommerce && python manage.py runserver 0.0.0.0:8000"

echo Demarrage du backend Flask (Port 5000)...
start "Backend Flask" cmd /k "cd amazon_dashboard && python run.py"

echo Demarrage du frontend Vite (Port 5173)...
start "Frontend Vite" cmd /k "cd SmartAutoCommerce\Frontend && npm run dev -- --host 0.0.0.0"

echo.
echo ========================================================
echo Tous les serveurs sont lances dans de nouvelles fenetres!
echo.
echo Pour acceder a l'application depuis un autre appareil :
echo 1. Ouvrez l'invite de commande (cmd) et tapez 'ipconfig'
echo 2. Cherchez l'adresse IPv4 (ex: 192.168.1.X)
echo 3. Sur l'autre appareil, allez sur : http://192.168.1.X:5173
echo ========================================================
pause
