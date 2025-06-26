@echo off
echo Setting up Git repository and uploading to GitHub...

REM Set Git path
set GIT_PATH=D:\Git\bin\git.exe

REM Configure Git user (you may need to change the email)
"%GIT_PATH%" config --global user.name "huliangjie2005"
"%GIT_PATH%" config --global user.email "huliangjie2005@users.noreply.github.com"

REM Add remote origin
"%GIT_PATH%" remote add origin https://github.com/huliangjie2005/xblog-server.git

REM Add all files
"%GIT_PATH%" add .

REM Commit files
"%GIT_PATH%" commit -m "Initial commit: Xblog backend server"

REM Set default branch to main
"%GIT_PATH%" branch -M main

REM Push to GitHub
"%GIT_PATH%" push -u origin main

echo Upload completed!
pause
