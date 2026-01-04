@echo off
REM Windows Port Manager - 一键发布到GitHub
REM 使用前请确保已创建GitHub仓库并设置了Personal Access Token

echo 🚀 Windows Port Manager - 一键发布到GitHub
echo ========================================

REM 检查Git状态
echo 📋 检查Git状态...
git status >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 当前目录不是Git仓库，请先运行：git init
    pause
    exit /b 1
)

REM 获取GitHub用户名
set /p GITHUB_USER=请输入您的GitHub用户名（例如：your-username）：
if "%GITHUB_USER%"=="" (
    echo ❌ GitHub用户名不能为空
    pause
    exit /b 1
)

REM 设置仓库信息
set REPO_NAME=windows-port-manager
set REPO_URL=https://github.com/%GITHUB_USER%/%REPO_NAME%.git

echo.
echo 📦 仓库信息：
echo    用户名：%GITHUB_USER%
echo    仓库名：%REPO_NAME%
echo    地址：%REPO_URL%
echo.

REM 检查是否已有远程仓库
git remote get-url origin >nul 2>&1
if %errorlevel% equ 0 (
    echo ⚠️  检测到已有远程仓库，是否更新为新的GitHub仓库？
    choice /C YN /M "是否继续"
    if %errorlevel% equ 2 (
        echo 取消操作
        pause
        exit /b 1
    )
    git remote remove origin
)

REM 添加远程仓库
echo 🔗 添加远程仓库...
git remote add origin %REPO_URL%

REM 推送代码
echo 📤 推送代码到GitHub...
echo 这可能需要几分钟时间...

git branch -M main
git push -u origin main

if %errorlevel% equ 0 (
    echo.
    echo ✅ 代码推送成功！
    echo 📖 项目地址：https://github.com/%GITHUB_USER%/%REPO_NAME%
    
    REM 创建标签
    echo.
    echo 🏷️  创建v1.0.0标签...
    git tag -a v1.0.0 -m "Windows Port Manager v1.0.0 - 首次发布"
    git push origin v1.0.0
    
    echo.
    echo 🎉 发布完成！您的项目已在GitHub上开源。
    echo.
    echo 📋 下一步建议：
    echo 1. 访问项目页面：https://github.com/%GITHUB_USER%/%REPO_NAME%
    echo 2. 添加项目标签（Topics）
    echo 3. 上传运行截图
    echo 4. 创建GitHub Release说明
    echo 5. 分享您的项目给社区
    echo.
    echo 🌟 恭喜！您已成功发布开源项目！
) else (
    echo.
    echo ❌ 代码推送失败
    echo.
    echo 🔧 故障排除：
    echo 1. 检查网络连接
    echo 2. 确认GitHub用户名正确
    echo 3. 确保已在GitHub上创建仓库
    echo 4. 检查GitHub Personal Access Token设置
    echo.
    echo 📖 详细指南请查看：COMPLETE_PUBLISH_GUIDE.md
)

pause