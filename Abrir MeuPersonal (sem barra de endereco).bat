@echo off
setlocal

rem Abre o MeuPersonal numa janela "de aplicativo" do Chrome/Edge - sem
rem barra de enderecos, sem abas, sem o resto da interface do navegador.
rem Este .bat e so um atalho: o .html continua funcionando normalmente
rem com duplo-clique direto nele tambem.

set "DIR=%~dp0"
set "DIR=%DIR:\=/%"
set "URL=file:///%DIR%Meu Personal.html"

where chrome >nul 2>nul
if %errorlevel%==0 (
  start "" chrome --app="%URL%"
  goto :eof
)

where msedge >nul 2>nul
if %errorlevel%==0 (
  start "" msedge --app="%URL%"
  goto :eof
)

echo Chrome/Edge nao encontrado no PATH — abrindo no navegador padrao.
start "" "%URL%"
