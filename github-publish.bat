@echo off
REM GitHub发布脚本 - Windows Port Manager
REM 用于初始化Git仓库并推送到GitHub

echo 🚀 Windows Port Manager - GitHub发布脚本
echo ==========================================

REM 检查Git是否安装
where git >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Git未安装，请先安装Git
    exit /b 1
)

REM 检查参数
if "%~1"=="" (
    echo 用法: %0 ^<GitHub仓库URL^>
    echo 示例: %0 https://github.com/your-username/windows-port-manager.git
    exit /b 1
)

set REPO_URL=%~1
echo 📦 准备发布到: %REPO_URL%

REM 初始化Git仓库
echo 📁 初始化Git仓库...
git init
if %errorlevel% neq 0 (
    echo ❌ Git初始化失败
    exit /b 1
)

REM 添加所有文件（除了.gitignore中指定的）
echo 📋 添加文件到Git...
git add .
if %errorlevel% neq 0 (
    echo ❌ 添加文件失败
    exit /b 1
)

REM 创建初始提交
echo 💾 创建初始提交...
git commit -m "🎉 Initial commit: Windows Port Manager

- Node.js版本端口管理工具
- Python版本端口管理工具  
- Web界面管理端口
- 支持批量操作和日志管理
- 美观的响应式界面"

if %errorlevel% neq 0 (
    echo ❌ 创建提交失败
    exit /b 1
)

REM 添加远程仓库
echo 🔗 添加远程仓库...
git remote add origin %REPO_URL%
if %errorlevel% neq 0 (
    echo ❌ 添加远程仓库失败
    exit /b 1
)

REM 推送到主分支
echo 📤 推送到GitHub...
git branch -M main
git push -u origin main

if %errorlevel% neq 0 (
    echo ❌ 推送失败，请检查网络连接和仓库权限
    exit /b 1
)

echo.
echo ✅ GitHub发布完成！
echo 📖 请访问 %REPO_URL% 查看您的项目
echo.
echo 下一步建议：
echo 1. 在GitHub上完善项目描述
echo 2. 添加项目标签和话题
echo 3. 创建第一个Release版本
echo 4. 添加实际截图到README.md
echo 5. 考虑添加GitHub Actions自动化

REM 可选：创建标签和Release
echo.
set /p CREATE_RELEASE=是否创建v1.0.0标签和Release? (y/n): 
if /i "%CREATE_RELEASE%"=="y" (
    echo 🏷️ 创建v1.0.0标签...
    git tag -a v1.0.0 -m "🚀 First stable release
    
    ✨ Features:
    - Web界面端口管理
    - 实时状态监控
    - 批量操作支持
    - 双语言实现
    - 美观响应式设计"
    
    echo 📤 推送标签到GitHub...
    git push origin v1.0.0
    
    if %errorlevel% equ 0 (
        echo ✅ 标签创建完成！
        echo 请在GitHub上创建对应的Release说明
    ) else (
        echo ❌ 标签创建失败
    )
)

echo.
echo 🎊 发布流程全部完成！
pause