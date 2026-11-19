@echo off
setlocal EnableExtensions EnableDelayedExpansion

set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"
cd /d "%ROOT%"
if not exist "%ROOT%\.env" copy /y "%ROOT%\.env.example" "%ROOT%\.env" >nul
set "VSUMMARY_DATA=%ROOT%\.vsummary"
set "VSUMMARY_CACHE=%ROOT%\.cache"
set "TEMP=%VSUMMARY_CACHE%\tmp"
set "TMP=%VSUMMARY_CACHE%\tmp"
set "PIP_CACHE_DIR=%VSUMMARY_CACHE%\pip"
set "UV_CACHE_DIR=%VSUMMARY_CACHE%\uv"
set "NPM_CONFIG_CACHE=%VSUMMARY_CACHE%\npm"
set "HF_HOME=%VSUMMARY_DATA%\cache\huggingface"
set "HUGGINGFACE_HUB_CACHE=%VSUMMARY_DATA%\cache\huggingface\hub"
set "HF_XET_CACHE=%VSUMMARY_DATA%\cache\huggingface\xet"
set "HF_HUB_DISABLE_XET=1"
set "HF_HUB_DISABLE_SYMLINKS_WARNING=1"
if not exist "%TEMP%" mkdir "%TEMP%"
if not exist "%PIP_CACHE_DIR%" mkdir "%PIP_CACHE_DIR%"
if not exist "%UV_CACHE_DIR%" mkdir "%UV_CACHE_DIR%"
if not exist "%NPM_CONFIG_CACHE%" mkdir "%NPM_CONFIG_CACHE%"
set "PATH=%ROOT%\runtime;%ROOT%\runtime\Library\bin;%ROOT%\runtime\Scripts;%PATH%"
set "NVIDIA_BIN_ROOT=%ROOT%\runtime\Lib\site-packages\nvidia"
if exist "%NVIDIA_BIN_ROOT%" for /d %%D in ("%NVIDIA_BIN_ROOT%\*") do if exist "%%~fD\bin" set "PATH=%%~fD\bin;!PATH!"
set "PYTHONPATH=%ROOT%\src"

start "" http://127.0.0.1:4173
call "%ROOT%\runtime\python.exe" -m backend.api.http.server --host 127.0.0.1 --port 4173 --managed-mysql-home "%ROOT%\runtime\mysql" --managed-data-root "%VSUMMARY_DATA%"
if errorlevel 1 pause

