@echo off
echo ========================================================
echo Configuration du Pare-feu Windows pour SmartAutoCommerce
echo ========================================================
echo.
echo Cette operation va ouvrir les ports 8000, 5000 et 5173
echo pour permettre l'acces aux serveurs depuis le reseau local.
echo.

netsh advfirewall firewall add rule name="SmartAutoCommerce-Django" dir=in action=allow protocol=TCP localport=8000
netsh advfirewall firewall add rule name="SmartAutoCommerce-Flask" dir=in action=allow protocol=TCP localport=5000
netsh advfirewall firewall add rule name="SmartAutoCommerce-Vite" dir=in action=allow protocol=TCP localport=5173

echo.
echo ========================================================
echo Configuration terminee !
echo ========================================================
pause
