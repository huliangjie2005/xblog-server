@echo off
echo Syncing with GitHub repository...

REM Set Git path
set GIT_PATH=D:\Git\bin\git.exe

REM Check current status
echo Checking current Git status...
"%GIT_PATH%" status

REM Pull from remote first to sync
echo Pulling from remote repository...
"%GIT_PATH%" pull origin main --allow-unrelated-histories

REM Add all files
echo Adding all files...
"%GIT_PATH%" add .

REM Check if there are changes to commit
"%GIT_PATH%" diff --cached --quiet
if %errorlevel% neq 0 (
    echo Committing changes...
    "%GIT_PATH%" commit -m "Add Xblog backend server files"
) else (
    echo No changes to commit.
)

REM Push to GitHub
echo Pushing to GitHub...
"%GIT_PATH%" push origin main

echo Sync completed!
pause
