# Windows Port Manager

## 📖 项目简介

**Windows Port Manager** 是一个专为 Windows 系统设计的轻量级、可视化的本地端口管理工具。它通过优雅的 Web 界面，将繁琐的命令行操作转化为直观的点选操作，让端口监控、服务启停和管理变得前所未有的简单高效。无论是开发人员、运维工程师还是普通用户，都能轻松掌握。

**核心价值：** 告别记忆复杂的 `netstat` 命令和频繁切换的任务管理器，用一个现代、统一的 Web 界面管理您 Windows 设备上的所有端口和服务。

## ✨ 功能特性

-   **🔍 全面的端口状态监控**
    -   实时列表显示所有监听/已建立的 TCP/UDP 端口。
    -   清晰展示对应端口号、进程名、进程 ID(PID)、协议及状态。
    -   快速筛选和搜索特定端口或进程。

-   **⚡️ 便捷的服务进程管理**
    -   **一键停止：** 通过 Web 界面直接终止占用指定端口的进程。
    -   **一键启动：** 对于已知的服务脚本，支持配置并一键启动，自动绑定到指定端口。

-   **🔄 高效的批量操作**
    -   支持批量选择多个端口进程进行统一停止操作，提升管理效率。
    -   提供"刷新列表"、"清空筛选"等快捷操作按钮。

-   **🌐 现代化的 Web 管理界面**
    -   基于现代前端技术构建，界面美观、响应迅速。
    -   无需安装额外桌面客户端，通过浏览器即可访问（默认：`http://localhost:9029`）。
    -   操作反馈即时，体验流畅。

-   **💾 多版本实现**
    -   **Node.js 版：** 基于 Express.js，轻快灵活，适合 JavaScript 技术栈用户。
    -   **Python 版：** 基于 Flask，简洁高效，适合 Python 技术栈用户。
    -   两个版本核心功能一致，用户可根据自身环境偏好选择。

## 🚀 快速开始

### 版本选择

本项目提供两个实现版本，请根据您的偏好和环境选择一个进行安装。

### 前提条件

-   **操作系统：** Windows 10 / Windows 11
-   **权限：** 需要以**管理员身份**运行，才能正确获取所有进程信息并进行管理操作。
-   **Node.js 版：** 需要安装 [Node.js](https://nodejs.org/) (v12 或更高版本)。
-   **Python 版：** 需要安装 [Python](https://www.python.org/) (v3.7 或更高版本)。

---

### 版本一：Node.js 版（推荐）

#### 1. 获取项目
```bash
git clone https://github.com/your-username/windows-port-manager.git
cd windows-port-manager
```

#### 2. 安装依赖
```bash
npm install
```

#### 3. 启动服务
在终端（**管理员身份**）中运行：
```bash
npm start
# 或直接运行
start.bat
```
成功启动后，您将看到类似提示：`Server running on http://localhost:9029`

#### 4. 访问管理界面
打开您的浏览器，访问：`http://localhost:9029`

---

### 版本二：Python 版

#### 1. 获取项目
```bash
git clone https://github.com/your-username/windows-port-manager.git
cd windows-port-manager
```

#### 2. 安装依赖
建议使用虚拟环境。
```bash
pip install flask psutil
```

#### 3. 启动服务
在命令行（**管理员身份**）中运行：
```bash
python PortManagerNew.py
```
成功启动后，您将看到类似提示：`* Running on http://127.0.0.1:9029`

#### 4. 访问管理界面
打开您的浏览器，访问：`http://localhost:9029`

## 📖 使用指南

1.  **查看端口列表：**
    访问首页，系统将自动加载并展示当前所有活动的网络端口及其关联进程。

2.  **停止单个进程：**
    在对应端口所在行的操作列，点击 **"释放"** 按钮，确认后即可终止该进程，释放端口。

3.  **启动服务：**
    对于已配置启动命令的端口，点击 **"启动"** 按钮即可在新终端中启动服务。

4.  **使用批量操作：**
    点击"全部启动"、"全部释放"、"全部删除"按钮进行统一操作。

5.  **搜索与筛选：**
    使用顶部的搜索功能，输入端口号或进程名关键字，可快速定位特定项。

6.  **查看日志：**
    点击"日志"按钮可以查看该端口的服务运行日志。

## 🖼️ 截图示例

> *以下是工具界面的功能示意，实际截图将后续更新。*

1.  **主界面**
    ![主界面截图](screenshots/main.png)
    *（截图将展示完整的端口列表、状态显示及主要操作按钮）*

2.  **新建端口对话框**
    ![新建端口截图](screenshots/add-port.png)
    *（截图将展示添加新端口时的配置表单）*

3.  **批量操作确认**
    ![批量操作截图](screenshots/batch-action.png)
    *（截图将展示批量操作确认对话框）*

## 🛠️ 开发说明

如果您对技术细节感兴趣或希望参与开发：

### 技术栈
-   **Node.js 版:** Express.js, `netstat`命令解析, Bootstrap, 前端JavaScript。
-   **Python 版:** Flask, `psutil`库和子进程调用`netstat`, 现代CSS, 原生JavaScript。

### 项目结构
```
windows-port-manager/
├── README.md              # 项目说明文档
├── LICENSE                # MIT许可证
├── package.json           # Node.js依赖配置
├── port-manager.js        # Node.js主程序
├── PortManagerNew.py      # Python主程序
├── start.bat              # Windows启动脚本
├── public/                # 前端静态资源
│   └── index.html         # Web界面
├── requirements.txt       # Python依赖
└── screenshots/           # 截图目录
```

### 运行开发环境
1.  确保已安装依赖。
2.  Node.js版可使用`npm start`启动。
3.  Python版可使用`python PortManagerNew.py`启动。
4.  修改代码后服务将自动重启，便于调试。

## 🤝 贡献指南

我们非常欢迎和感谢任何形式的贡献！

1.  **报告问题：** 在 [GitHub Issues](https://github.com/your-username/windows-port-manager/issues) 页面提交Bug或功能建议。请尽量描述清晰，包括复现步骤和环境信息。
2.  **贡献代码：**
    -   Fork 本仓库。
    -   创建您的功能分支 (`git checkout -b feature/amazing-feature`)。
    -   提交您的更改 (`git commit -m 'Add some amazing feature'`)。
    -   推送到分支 (`git push origin feature/amazing-feature`)。
    -   开启一个 Pull Request，并描述您的修改。
3.  **改进文档：** 优化README、补充注释或翻译文档同样是宝贵的贡献。

## 📄 许可证

本项目采用 [MIT License](LICENSE)。

---

**⚠️ 温馨提示：** 强制结束进程可能导致数据丢失或应用异常，请谨慎操作，确保目标进程可被安全终止。建议先在测试环境验证操作的影响。