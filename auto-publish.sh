#!/bin/bash
# 自动GitHub发布脚本 - Windows Port Manager
# 这个脚本会创建GitHub仓库并推送代码

echo "🚀 Windows Port Manager - 自动GitHub发布"
echo "========================================"

# GitHub用户名 - 请根据实际情况修改
GITHUB_USER="trae-ai"
REPO_NAME="windows-port-manager"
REPO_DESCRIPTION="A simple Windows port management tool with web interface"

# 创建GitHub仓库（使用curl调用GitHub API）
echo "📦 创建GitHub仓库..."

# 注意：这里需要GitHub Personal Access Token
# 您需要在GitHub Settings -> Developer settings -> Personal access tokens 中创建
# 然后设置环境变量：export GITHUB_TOKEN="your_token_here"

if [ -z "$GITHUB_TOKEN" ]; then
    echo "⚠️  未找到GITHUB_TOKEN环境变量"
    echo "请设置您的GitHub Personal Access Token："
    echo "export GITHUB_TOKEN=\"your_github_token_here\""
    echo ""
    echo "或者手动在GitHub上创建仓库，然后使用以下命令推送："
    echo "git remote add origin https://github.com/$GITHUB_USER/$REPO_NAME.git"
    echo "git push -u origin main"
    exit 1
fi

# 创建仓库
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST \
    -H "Authorization: token $GITHUB_TOKEN" \
    -H "Accept: application/vnd.github.v3+json" \
    https://api.github.com/user/repos \
    -d "{
        \"name\": \"$REPO_NAME\",
        \"description\": \"$REPO_DESCRIPTION\",
        \"private\": false,
        \"has_issues\": true,
        \"has_projects\": true,
        \"has_wiki\": true
    }")

if [ "$RESPONSE" = "201" ]; then
    echo "✅ GitHub仓库创建成功！"
elif [ "$RESPONSE" = "422" ]; then
    echo "⚠️  仓库可能已经存在，继续推送代码..."
else
    echo "❌ 仓库创建失败，HTTP状态码: $RESPONSE"
    exit 1
fi

# 添加远程仓库并推送
echo "🔗 添加远程仓库..."
git remote add origin https://github.com/$GITHUB_USER/$REPO_NAME.git

echo "📤 推送代码到GitHub..."
git branch -M main
git push -u origin main

if [ $? -eq 0 ]; then
    echo "✅ 代码推送成功！"
    echo "📖 项目地址：https://github.com/$GITHUB_USER/$REPO_NAME"
    
    # 创建标签
    echo "🏷️  创建v1.0.0标签..."
    git tag -a v1.0.0 -m "🚀 Windows Port Manager v1.0.0
    
    ✨ 功能特性：
    - Web界面端口管理（端口9029）
    - 实时状态监控
    - 批量操作支持
    - 双语言实现（Node.js + Python）
    - 美观响应式设计
    
    🔧 技术亮点：
    - 管理员权限支持
    - 自动日志管理
    - 智能错误处理
    - 跨设备兼容
    
    首次发布版本，包含完整功能和详细文档。"
    
    git push origin v1.0.0
    
    echo "✅ 标签创建完成！"
    echo ""
    echo "🎉 发布完成！您的项目已在GitHub上开源。"
    echo "📋 下一步建议："
    echo "1. 访问项目页面完善README中的截图"
    echo "2. 添加项目标签（Topics）"
    echo "3. 创建GitHub Release说明"
    echo "4. 分享您的项目给社区"
else
    echo "❌ 代码推送失败，请检查网络连接和权限"
    exit 1
fi