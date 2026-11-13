@echo off
title Subir Porci-Chat a GitHub
color 0b
echo ========================================================
echo         SUBIENDO PORCI-CHAT A GITHUB
echo ========================================================
echo.
echo Conectando con https://github.com/chat6121/mortalidad-hembras-app...
echo.
echo Si te aparece una ventana pidiendo iniciar sesion en GitHub,
echo haz clic en "Sign in with your browser" para autorizar.
echo.
git push -u origin main --force
echo.
echo ========================================================
echo   SI VISTE "Everything up-to-date" O EL CONTEO DE OBJETOS,
echo   TU APLICACION YA QUEDO SUBIDA EXITOSAMENTE A TU WEB:
echo   https://chat6121.github.io/mortalidad-hembras-app/
echo ========================================================
echo.
pause

