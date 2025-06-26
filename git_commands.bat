@echo off
cd /d "C:\Users\hu\Desktop\kaifa\Xblog\backend"

echo Step 1: Checking Git status...
"D:\Git\bin\git.exe" status

echo.
echo Step 2: Adding all files...
"D:\Git\bin\git.exe" add .

echo.
echo Step 3: Committing files...
"D:\Git\bin\git.exe" commit -m "Initial commit: Add Xblog backend server"

echo.
echo Step 4: Setting up remote origin...
"D:\Git\bin\git.exe" remote -v

echo.
echo Step 5: Pulling from remote (if exists)...
"D:\Git\bin\git.exe" pull origin main --allow-unrelated-histories

echo.
echo Step 6: Pushing to GitHub...
"D:\Git\bin\git.exe" push -u origin main

echo.
echo All steps completed!
pause
