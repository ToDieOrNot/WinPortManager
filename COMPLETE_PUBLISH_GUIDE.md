# 🚀 Windows Port Manager - GitHub发布指南

## 📋 发布前准备

### 1. 创建GitHub账户（如果还没有）
访问 https://github.com 注册账户

### 2. 创建Personal Access Token
1. 登录GitHub
2. 点击右上角头像 → Settings
3. 左侧菜单 → Developer settings
4. → Personal access tokens → Tokens (classic)
5. 点击 "Generate new token"
6. 权限选择：
   - ✅ repo (Full control of private repositories)
   - ✅ workflow (Update GitHub Action workflows)
7. 生成token并保存（只显示一次）

## 🎯 创建GitHub仓库

### 方法1：手动创建（推荐）
1. 访问：https://github.com/new
2. 仓库名称：`windows-port-manager`
3. 描述：`A simple Windows port management tool with web interface`
4. 选择 **Public**（开源）
5. 勾选 ✅ Add a README file
6. 点击 "Create repository"

### 方法2：使用GitHub CLI（高级用户）
```bash
# 安装GitHub CLI
winget install GitHub.cli

# 登录
gh auth login

# 创建仓库
gh repo create windows-port-manager --public --description "A simple Windows port management tool with web interface" --enable-issues --enable-wiki
```

## 📤 推送代码到GitHub

### 步骤1：设置远程仓库
```bash
# 在您的项目目录中执行
git remote add origin https://github.com/您的用户名/windows-port-manager.git

# 如果origin已存在，先删除旧的
git remote remove origin
git remote add origin https://github.com/您的用户名/windows-port-manager.git
```

### 步骤2：推送到GitHub
```bash
# 推送到main分支
git branch -M main
git push -u origin main
```

### 步骤3：创建发布标签
```bash
# 创建v1.0.0标签
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

# 推送标签到GitHub
git push origin v1.0.0
```

## 🎨 完善GitHub项目页面

### 1. 添加项目标签（Topics）
在仓库页面右侧，点击"Add topics"，添加：
- `windows`
- `port-management`
- `nodejs`
- `python`
- `web-interface`
- `flask`
- `port-manager`
- `network-tools`

### 2. 上传截图
1. 先运行您的应用，截取几张界面截图
2. 上传到README.md中的截图位置
3. 或者直接在GitHub上编辑README文件

### 3. 创建GitHub Release
1. 点击仓库页面的 "Releases" → "Create a new release"
2. 选择标签：v1.0.0
3. 标题：`Windows Port Manager v1.0.0`
4. 描述：
```markdown
🎉 Windows端口管理工具正式发布！

## ✨ 新功能
- Web界面端口管理（端口9029）
- 实时状态监控和自动刷新
- 批量操作支持（全部启动/释放/删除）
- 双语言实现（Node.js + Python版本）
- 美观响应式设计

## 🔧 技术特性
- 管理员权限支持
- 自动日志管理
- 智能错误处理
- 跨设备兼容

## 📖 使用说明
1. 运行 `start.bat` 启动服务
2. 访问 http://localhost:9029
3. 开始管理您的端口！

## 🚀 快速开始
查看 [README.md](README.md) 获取详细安装和使用说明。

感谢使用！欢迎提交Issue和Pull Request。
```

## 📢 分享和推广

### 技术社区分享
- Reddit: r/programming, r/webdev, r/sysadmin
- Hacker News
- V2EX
- 掘金、CSDN、知乎

### 社交媒体
- Twitter
- LinkedIn
- 微信群/QQ群

## 🔧 后续维护建议

### 定期更新
- 修复bug
- 添加新功能
- 更新依赖包

### 社区互动
- 回复Issue
- 合并Pull Request
- 感谢贡献者

### 版本管理
- 使用语义化版本号（Semantic Versioning）
- 维护CHANGELOG.md
- 定期发布新版本

## 📞 遇到问题？

1. **推送失败？** 检查网络连接和GitHub权限
2. **认证错误？** 确认Personal Access Token是否正确
3. **仓库创建失败？** 检查仓库名称是否已被使用

## 🎉 恭喜！

完成以上步骤后，您的Windows Port Manager就成功开源了！

🌟 项目地址：`https://github.com/您的用户名/windows-port-manager`

现在您可以自豪地分享您的开源项目了！