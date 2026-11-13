@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js 20.11 or newer is required.
  echo Download: https://nodejs.org/
  pause
  exit /b 1
)
if not exist node_modules\@huggingface\inference (
  echo Installing the Hugging Face inference client...
  call npm install
  if errorlevel 1 (
    echo Installation failed.
    pause
    exit /b 1
  )
)
if not exist .env (
  copy .env.example .env >nul
  echo Created tools\jerseys\.env
  echo Open it and add HF_TOKEN, then run start.bat again.
  notepad .env
  pause
  exit /b 0
)
call npm start
pause
