const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');
const { exec, spawn, execSync } = require('child_process');
const os = require('os');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// 配置
const CONFIG_FILE = path.join(__dirname, 'ports.json');
const DESKTOP_PATH = path.join(os.homedir(), 'Desktop');
const LOG_DIR = path.join(__dirname, 'logs');
const APP_JSON_LOG = path.join(LOG_DIR, 'app.jsonl'); // 结构化应用日志（JSON 行）
const APP_HUMAN_LOG = path.join(LOG_DIR, 'app.log');  // 便于人工阅读
const PORT = parseInt(process.env.PORT || '3000', 10);

// 中间件
app.use(express.json());
app.use(express.static('public'));

// 元信息中间件：采集部门/操作者/按钮/来源页面
app.use((req, res, next) => {
  req._meta = {
    dept: req.headers['x-dept'] || '',
    actor: req.headers['x-actor'] || '',
    action: req.headers['x-action'] || '',
    originPage: req.headers['x-origin-page'] || ''
  };
  next();
});

// 请求入/出栈日志（包含 traceId 与耗时 + 部门/按钮/操作者/来源）
app.use((req, res, next) => {
  try {
    const traceId = req.headers['x-request-id'] || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const start = Date.now();
    req.traceId = traceId;
    const meta = {
      dept: req.headers['x-dept'] || '',
      actor: req.headers['x-actor'] || '',
      action: req.headers['x-action'] || '',
      originPage: req.headers['x-origin-page'] || ''
    };
    writeAppLog('request.in', { method: req.method, url: req.originalUrl || req.url, ip: req.ip, traceId, ...meta });
    res.on('finish', () => {
      const durationMs = Date.now() - start;
      writeAppLog('request.out', { method: req.method, url: req.originalUrl || req.url, status: res.statusCode, durationMs, traceId, ...meta });
    });
  } catch (e) {
    // 忽略请求日志异常，避免影响请求流程
  }
  next();
});

// 全局状态
let ports = [];
let portStatusMap = new Map();
let monitoringInterval = null;

// ==================== 时间与日志工具 ====================
function nowLocal() {
  const d = new Date();
  const pad = (n, w = 2) => String(n).padStart(w, '0');
  const y = d.getFullYear();
  const m = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hh = pad(d.getHours());
  const mm = pad(d.getMinutes());
  const ss = pad(d.getSeconds());
  const ms = pad(d.getMilliseconds(), 3);
  const tzMin = -d.getTimezoneOffset(); // e.g. 480 for +08:00
  const sign = tzMin >= 0 ? '+' : '-';
  const tzH = pad(Math.floor(Math.abs(tzMin) / 60));
  const tzM = pad(Math.abs(tzMin) % 60);
  return `${y}-${m}-${day} ${hh}:${mm}:${ss}.${ms}${sign}${tzH}:${tzM}`;
}

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function appendLineSafe(file, line) {
  try {
    ensureDir(path.dirname(file));
    fs.appendFileSync(file, line + '\n', 'utf8');
  } catch (_) { /* ignore */ }
}

// 预检工具：检测命令是否存在与版本输出
function hasCmdOnPath(cmd) {
  try { execSync(`where ${cmd}`, { stdio: 'pipe', windowsHide: true }); return true; } catch { return false; }
}
function tryWhere(cmd) {
  try { return execSync(`where ${cmd}`, { stdio: ['ignore','pipe','pipe'], windowsHide: true }).toString().trim(); } catch { return ''; }
}
function tryVersion(cmd) {
  try { return execSync(`${cmd} -V`, { stdio: ['ignore','pipe','pipe'], windowsHide: true }).toString().trim(); } catch { return ''; }
}

function writeAppLog(message, detail, level) {
  // 兼容旧调用：message 为事件/简述，detail 可为对象或无；level 可选
  try {
    ensureDir(LOG_DIR);
    let inferredLevel = level || 'info';
    let extra = undefined;
    let msgText = '';

    if (typeof detail === 'string') {
      msgText = detail;
    } else if (detail && typeof detail === 'object') {
      extra = { ...detail };
      // 含 error/err 字段则按错误级别记；尽量保留堆栈
      const err = extra.error || extra.err;
      if (err) inferredLevel = level || 'error';
    }

    // JSON 行日志对象
    const jsonObj = {
      ts: new Date().toISOString(),
      level: inferredLevel,
      event: message,
      msg: msgText || undefined,
      ...((extra && typeof extra === 'object') ? { ...extra } : {})
    };

    // 写 JSON 行日志文件
    appendLineSafe(APP_JSON_LOG, JSON.stringify(jsonObj));

    // 写文本日志（便于人工阅读）
    const human = `[${nowLocal()}] [${inferredLevel}] ${message}${msgText ? (' ' + msgText) : ''}${extra ? (' ' + JSON.stringify(extra)) : ''}`;
    appendLineSafe(APP_HUMAN_LOG, human);

    // 终端显示（使用 stdout，避免被 console.* 二次处理）
    try { process.stdout.write(human + '\n'); } catch (_) {}
  } catch (_) { /* ignore */ }
}

// 统一纳管 console 输出到日志（终端显示必须记录）
(function wrapConsole(){
  try {
    const levels = ['log','info','warn','error'];
    levels.forEach(lv => {
      const orig = console[lv] && console[lv].bind(console);
      console[lv] = (...args) => {
        try {
          const text = args.map(a => typeof a === 'string' ? a : (a instanceof Error ? (a.stack || a.message) : JSON.stringify(a))).join(' ');
          writeAppLog('console', { level: lv, text });
        } catch (_) {}
        if (orig) orig(...args);
      };
    });
  } catch (_) {}
})();

function writePortLog(port, text, customLogPath) {
  try {
    const logPath = getLogPath(port, customLogPath);
    ensureDir(path.dirname(logPath));
    const line = `[${nowLocal()}] ${text}`;
    fs.appendFileSync(logPath, line + '\n', 'utf8');
  } catch (_) { /* ignore */ }
}

// ==================== 数据持久化 ====================
function loadPorts() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = fs.readFileSync(CONFIG_FILE, 'utf8');
      ports = JSON.parse(data);
    } else {
      ports = [];
      savePorts();
    }
  } catch (err) {
    writeAppLog('加载配置失败', { error: String(err) });
    ports = [];
  }
}

function savePorts() {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(ports, null, 2), 'utf8');
  } catch (err) {
    writeAppLog('保存配置失败', { error: String(err) });
  }
}

// ==================== 端口监测（只认 LISTENING） ====================
function checkPortStatus(port) {
  return new Promise((resolve) => {
    exec('netstat -ano -p TCP', { shell: 'cmd.exe', windowsHide: true }, (error, stdout) => {
      if (error || !stdout) return resolve(false);
      const lines = stdout.split(/\r?\n/);
      const isListening = lines.some(line => line.includes(`:${port}`) && /\bLISTENING\b/i.test(line));
      resolve(isListening);
    });
  });
}

async function monitorAllPorts() {
  for (const portConfig of ports) {
    const isInUse = await checkPortStatus(portConfig.port);
    portStatusMap.set(portConfig.id, isInUse);
  }
  broadcastStatus();
}

function startMonitoring() {
  if (monitoringInterval) clearInterval(monitoringInterval);
  monitoringInterval = setInterval(() => {
    monitorAllPorts();
  }, 1000);
}

function stopMonitoring() {
  if (monitoringInterval) {
    clearInterval(monitoringInterval);
    monitoringInterval = null;
  }
}

// ==================== WebSocket 广播 ====================
function broadcastStatus() {
  const statusData = ports.map(p => ({
    id: p.id,
    port: p.port,
    status: portStatusMap.get(p.id) || false,
    remark: p.remark
  }));

  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({
        type: 'status_update',
        data: statusData
      }));
    }
  });
}

// ==================== 命令构建与执行 ====================
function replacePlaceholders(str, port) {
  return (str || '').replace(/\{port\}/g, String(port));
}

function isPowerShellLike(cmd) {
  const t = (cmd || '').trim();
  if (/^(powershell(\.exe)?)(\b|\s)/i.test(t)) return true;
  if (/^(Stop-Process|Get-Process|Get-NetTCPConnection|Start-Process|Restart-Service|Set-ExecutionPolicy|Remove-Item|New-Item|Get-Service)\b/i.test(t)) return true;
  if (/\|\s*(Select-Object|Where-Object|ForEach-Object)\b/.test(t)) return true;
  if (/^\$[A-Za-z_]/.test(t)) return true;
  return false;
}

function buildHiddenCommand(cmd) {
  const t = (cmd || '').trim();
  if (/^(powershell(\.exe)?)(\b|\s)/i.test(t)) return t;
  if (isPowerShellLike(t)) {
    const escaped = t.replace(/"/g, '\\"');
    return `powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -Command "${escaped}"`;
  }
  return t;
}

function escapePSSingleQuoted(s) {
  return String(s).replace(/'/g, "''");
}

function splitWorkingDirAndCmd(command) {
  const m = /^(?:\s*cd\s+\/d\s+("[^"]+"|[^&|]+)\s*&&\s*)([\s\S]+)$/i.exec(command || '');
  if (m) {
    let wd = m[1].trim();
    if (/^".*"$/.test(wd)) wd = wd.slice(1, -1);
    const rest = m[2].trim();
    return { cwd: wd, rest };
  }
  return { cwd: '', rest: (command || '').trim() };
}



function tokenizeArgs(s) {
  const result = [];
  let cur = '';
  let inQuote = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === '"') { inQuote = !inQuote; continue; }
    if (!inQuote && /\s/.test(ch)) { if (cur) { result.push(cur); cur=''; } continue; }
    cur += ch;
  }
  if (cur) result.push(cur);
  return result;
}

function isPythonLike(exe) {
  return /^(py|python|python3)(\.exe)?$/i.test(exe || '');
}



function normalizeCd(command) {
  return (command || '').replace(/(^|&&)\s*cd\s+(?!\/d)/gi, '$1 cd /d ');
}

function quoteCdPath(command) {
  return (command || '').replace(/(^|&&)\s*cd\s+\/d\s+([^&|]+?)(\s*(?:&&|$))/gi, (m, p1, p2, p3) => {
    const raw = p2.trim();
    if (/^".*"$/.test(raw)) return `${p1} cd /d ${raw}${p3}`;
    if(/[\s()&]/.test(raw)) return `${p1} cd /d "${raw}"${p3}`;
    return `${p1} cd /d ${raw}${p3}`;
  });
}

// 为即时命令提供简单的执行器，不返回输出
function executeSimple(command) {
  return new Promise((resolve, reject) => {
    // 使用 spawn 并忽略其输出，避免将结果返回给调用方
    const child = spawn('cmd.exe', ['/c', command], {
      detached: true,
      stdio: 'ignore',
      windowsHide: true
    });

    child.on('error', (err) => {
      writeAppLog('executeSimple 错误', { error: err.message, command });
      reject(err);
    });

    // 假设命令已成功发出
    child.on('spawn', () => {
      child.unref();
      resolve({ success: true });
    });
  });
}

// 隐藏窗口后台执行（不弹窗），用于启动常驻服务
function executeHidden(executable, args, cwd, logPath) {
  return new Promise((resolve, reject) => {
    try {
      // 以追加模式打开日志文件，获取文件描述符
      const logFd = fs.openSync(logPath, 'a');

      // 使用 spawn 直接创建子进程，这是最可靠的方法
      const child = spawn(executable, args, {
        cwd: cwd || process.cwd(), // 如果没有指定 cwd，则使用当前工作目录
        detached: true, // 使子进程在父进程退出后继续运行
        stdio: ['ignore', logFd, logFd], // [stdin, stdout, stderr] - 将标准输出和错误输出重定向到日志文件
        windowsHide: true
      });

      // 监听错误事件
      child.on('error', (err) => {
        writeAppLog('executeHidden spawn 错误', { error: err.message, executable, args, cwd });
        fs.closeSync(logFd); // 确保关闭文件描述符
        reject(err);
      });

      // unref() 允许父进程退出，而子进程继续运行
      child.unref();

      // 假设进程已成功启动，立即返回
      resolve({ success: true });

    } catch (err) {
      writeAppLog('executeHidden general 错误', { error: err.message, executable, args, cwd });
      reject(err);
    }
  });
}

// 使用 PowerShell 释放一个端口（并将输出重定向到该端口日志）
async function stopPortWithPowerShellSingle(port, logPath) {
  const psCmd = `
    $conn = Get-NetTCPConnection -LocalPort ${port} -ErrorAction SilentlyContinue | Select-Object -First 1;
    if ($conn) {
        $childPid = $conn.OwningProcess;
        try {
            $parentPid = (Get-CimInstance Win32_Process -Filter "ProcessId = $childPid").ParentProcessId;
            if ($parentPid -and $parentPid -ne 0) {
                Stop-Process -Id $parentPid -Force -ErrorAction SilentlyContinue;
                Write-Host \"Stopped parent process $parentPid for port ${port}\";
            } else {
                Stop-Process -Id $childPid -Force -ErrorAction SilentlyContinue;
                Write-Host \"Stopped process $childPid for port ${port}\";
            }
        } catch {
            Stop-Process -Id $childPid -Force -ErrorAction SilentlyContinue;
            Write-Host \"Stopped process $childPid for port ${port} (fallback)\";
        }
    } else {
        Write-Host \"No process found on port ${port}\";
    }
  `;
  const final = buildHiddenCommand(`${psCmd} >> "${logPath}" 2>&1`);
  await executeSimple(final); // 使用 simple 执行器
}

// 简单 HTTP 探活（尝试直连 127.0.0.1:port）
function probeHttp(port) {
  return new Promise((resolve) => {
    try {
      const req = http.get({ host: '127.0.0.1', port, path: '/', timeout: 1000 }, (res) => {
        res.resume();
        resolve(true);
      });
      req.on('timeout', () => { try { req.destroy(); } catch(_){} resolve(false); });
      req.on('error', () => resolve(false));
    } catch (_) { resolve(false); }
  });
}

// 通过 netstat+taskkill 释放指定端口（隐藏执行）兜底，并记录日志
function killPortProcesses(port, logPath) {
  return new Promise((resolve) => {
    exec(`cmd.exe /c netstat -ano | findstr ":${port}"`, { windowsHide: true }, (err, stdout) => {
      if (err) {
        writePortLog(port, `兜底检测失败: ${String(err)}`, logPath);
        return resolve({ success: false, killed: 0, error: err.message });
      }
      const lines = stdout.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      const pids = new Set();
      for (const line of lines) {
        const m = line.match(/\s(\d+)\s*$/);
        if (m && m[1]) pids.add(m[1]);
      }
      if (pids.size === 0) {
        writePortLog(port, '兜底未发现占用进程', logPath);
        return resolve({ success: true, killed: 0 });
      }
      let killed = 0;
      let done = 0;
      const total = pids.size;
      pids.forEach(pid => {
        exec(`cmd.exe /c taskkill /F /T /PID ${pid}`, { windowsHide: true }, (e, so, se) => {
          killed++;
          writePortLog(port, `taskkill 结果 PID=${pid} stdout=${(so||'').toString().trim()} stderr=${(se||'').toString().trim()}`, logPath);
          done++;
          if (done === total) resolve({ success: true, killed });
        });
      });
    });
  });
}

function getDefaultStartCommand(port) {
  return `echo 启动端口 ${port} 的服务...`;
}

function getDefaultStopCommand(port) {
  return `Stop-Process -Id (Get-NetTCPConnection -LocalPort ${port}).OwningProcess -Force`;
}

// ==================== 日志路径 ====================
function expandHomeAndPort(p, port) {
  if (!p || !String(p).trim()) return '';
  let s = String(p).replace(/\{port\}/g, port);
  s = s.replace(/^~(\\|\/)?/, os.homedir() + path.sep);
  return s;
}

function getLogPath(port, customPath = null) {
  if (customPath && customPath.trim()) {
    return expandHomeAndPort(customPath, port);
  }
  return path.join(DESKTOP_PATH, `${port}.log`);
}

function prepareLogFile(logPath) {
  try {
    const dir = path.dirname(logPath);
    ensureDir(dir);
    if (fs.existsSync(logPath)) {
      fs.unlinkSync(logPath);
    }
    fs.writeFileSync(logPath, `[${nowLocal()}] 日志文件已创建\n`, 'utf8');
    return true;
  } catch (err) {
    writeAppLog('日志文件准备失败', { error: String(err), logPath });
    return false;
  }
}

// ==================== API 路由 ====================

// 心跳（前端每几秒调用一次，便于确认页面确实从服务端加载且后端有请求落日志）
app.get('/api/ping', (req, res) => {
  writeAppLog('ping', { ip: req.ip, ua: req.headers['user-agent'] });
  res.json({ ok: 1, ts: Date.now() });
});

// 获取所有端口（含状态）
app.get('/api/ports', (req, res) => {
  const data = ports.map(p => ({
    ...p,
    status: portStatusMap.get(p.id) || false
  }));
  res.json(data);
});

// 获取单个端口详情
app.get('/api/ports/:id', (req, res) => {
  const { id } = req.params;
  const p = ports.find(x => x.id === id);
  if (!p) return res.status(404).json({ error: '端口不存在' });
  res.json({ ...p, status: portStatusMap.get(id) || false });
});

// 新建端口
app.post('/api/ports', (req, res) => {
  const { port, startCommand, stopCommand, remark, logPath } = req.body;


  if (!port || isNaN(port) || port < 1 || port > 65535) {
    writeAppLog('新建端口失败-端口无效', { port });
    return res.status(400).json({ error: '端口号无效' });
  }

  if (ports.some(p => p.port === parseInt(port))) {
    writeAppLog('新建端口失败-端口已存在', { port });
    return res.status(400).json({ error: '端口号已存在' });
  }

  const newPort = {
    id: Date.now().toString(),
    port: parseInt(port),
    startCommand: startCommand || getDefaultStartCommand(port),
    stopCommand: stopCommand || getDefaultStopCommand(port),
    remark: remark || '',
    logPath: logPath ? getLogPath(port, logPath) : getLogPath(port)
  };

  ports.push(newPort);
  savePorts();
  portStatusMap.set(newPort.id, false);


  writeAppLog('新建端口成功', newPort);
  res.json({ success: true, data: newPort });
});

// 更新端口（编辑）
app.put('/api/ports/:id', (req, res) => {
  const { id } = req.params;
  const idx = ports.findIndex(p => p.id === id);
  if (idx === -1) {
    writeAppLog('编辑端口失败-不存在', { id });
    return res.status(404).json({ error: '端口不存在' });
  }

  const before = { ...ports[idx] };
  const { port, startCommand, stopCommand, remark, logPath } = req.body;

  if (port !== undefined) {
    const n = parseInt(port);
    if (isNaN(n) || n < 1 || n > 65535) {
      writeAppLog('编辑端口失败-端口无效', { id, port });
      return res.status(400).json({ error: '端口号无效' });
    }
    if (ports.some(p => p.port === n && p.id !== id)) {
      writeAppLog('编辑端口失败-端口重复', { id, port });
      return res.status(400).json({ error: '端口号已存在' });
    }
    ports[idx].port = n;
  }

  if (typeof startCommand === 'string') ports[idx].startCommand = startCommand;
  if (typeof stopCommand === 'string') ports[idx].stopCommand = stopCommand;
  if (typeof remark === 'string') ports[idx].remark = remark;
  if (typeof logPath === 'string' && logPath.trim()) ports[idx].logPath = getLogPath(ports[idx].port, logPath);

  savePorts();
  writeAppLog('编辑端口成功', { before, after: ports[idx] });
  res.json({ success: true, data: ports[idx] });
});

// 删除端口
app.delete('/api/ports/:id', (req, res) => {
  const { id } = req.params;
  const index = ports.findIndex(p => p.id === id);

  if (index === -1) {
    writeAppLog('删除端口失败-不存在', { id });
    return res.status(404).json({ error: '端口不存在' });
  }

  const removed = ports[index];
  ports.splice(index, 1);
  portStatusMap.delete(id);
  savePorts();

  writeAppLog('删除端口成功', removed);
  res.json({ success: true });
});

// 启动端口服务（隐藏后台执行，不弹窗）
app.post('/api/ports/:id/start', async (req, res) => {
  const { id } = req.params;
  const portConfig = ports.find(p => p.id === id);

  if (!portConfig) {
    writeAppLog('启动失败-端口不存在', { id });
    return res.status(404).json({ error: '端口不存在' });
  }

  if (!portConfig.startCommand || portConfig.startCommand.trim() === '') {
    writeAppLog('启动失败-命令未设置', { id, port: portConfig.port });
    return res.status(400).json({ error: '启动命令未设置' });
  }

  try {

    const logPath = getLogPath(portConfig.port, portConfig.logPath);
    prepareLogFile(logPath);

    // 启动前预检：记录 py/python 命令可用性与版本，便于定位环境问题
    const pyWhere = tryWhere('py');
    const pyVer = tryVersion('py');
    const pythonWhere = tryWhere('python');
    const pythonVer = tryVersion('python');
    writeAppLog('启动预检', { id, port: portConfig.port, where: { py: pyWhere, python: pythonWhere }, version: { py: pyVer, python: pythonVer } });
    writePortLog(portConfig.port, `预检 where py: ${pyWhere || '未找到'}`, logPath);
    writePortLog(portConfig.port, `预检 where python: ${pythonWhere || '未找到'}`, logPath);
    writePortLog(portConfig.port, `预检 py -V: ${pyVer || '未输出'}`, logPath);
    writePortLog(portConfig.port, `预检 python -V: ${pythonVer || '未输出'}`, logPath);

    let userCmd = replacePlaceholders(portConfig.startCommand, portConfig.port);
    userCmd = normalizeCd(userCmd);
    userCmd = quoteCdPath(userCmd);

    // 核心修复：解析命令字符串，并直接调用 executeHidden
    const { cwd, rest } = splitWorkingDirAndCmd(userCmd);
    const tokens = tokenizeArgs(rest);
    if (!tokens.length) {
      throw new Error('无法从命令中解析出可执行文件。');
    }
    const executable = tokens[0];
    const args = tokens.slice(1);

    writeAppLog('启动命令执行', { id, port: portConfig.port, executable, args, cwd, strategy: 'spawn' });
    writePortLog(portConfig.port, `Final START Cmd: ${executable} ${args.join(' ')} in ${cwd}`, logPath);

    await executeHidden(executable, args, cwd, logPath);


    // 启动后检测并记录结果
    setTimeout(async () => {
      try {
        const ok = await checkPortStatus(portConfig.port);
        writeAppLog('启动检测结果', { id, port: portConfig.port, listening: ok });
        writePortLog(portConfig.port, `启动检测: ${ok ? 'LISTENING' : '未监听'}`, logPath);
      } catch (e) {
        writeAppLog('启动检测异常', { id, error: String(e) });
        writePortLog(portConfig.port, `启动检测异常: ${String(e)}`, logPath);
      }
    }, 1500);

    res.json({ success: true, message: '启动命令已在后台执行' });
  } catch (err) {
    writeAppLog('启动异常', { id, error: String(err) });
    res.status(500).json({ error: err.message });
  }
});

// 释放端口（优先 PowerShell；随后兜底 taskkill）
app.post('/api/ports/:id/stop', async (req, res) => {
  const { id } = req.params;
  const portConfig = ports.find(p => p.id === id);

  if (!portConfig) {
    writeAppLog('释放失败-端口不存在', { id });
    return res.status(404).json({ error: '端口不存在' });
  }

  try {
    const logPath = getLogPath(portConfig.port, portConfig.logPath);

    await stopPortWithPowerShellSingle(portConfig.port, logPath);
    writePortLog(portConfig.port, 'PowerShell 停止命令已下发', logPath);

    const result = await killPortProcesses(portConfig.port, logPath);
    writeAppLog('释放完成', { id, port: portConfig.port, killed: result.killed });

    // 释放后检测并记录结果
    setTimeout(async () => {
      try {
        const ok = await checkPortStatus(portConfig.port);
        writeAppLog('释放检测结果', { id, port: portConfig.port, listening: ok });
        writePortLog(portConfig.port, `释放检测: ${ok ? '仍在监听' : '未监听(成功)'}`, logPath);
      } catch (e) {
        writeAppLog('释放检测异常', { id, error: String(e) });
        writePortLog(portConfig.port, `释放检测异常: ${String(e)}`, logPath);
      }
    }, 1200);

    res.json({ success: true, message: `释放命令已执行${result.killed ? `，已结束 ${result.killed} 个进程` : ''}` });
  } catch (err) {
    writeAppLog('释放异常', { id, error: String(err) });
    res.status(500).json({ error: err.message });
  }
});

// 批量启动
app.post('/api/ports/batch/start-all', async (req, res) => {
  const results = [];
  for (const portConfig of ports) {
    if (portConfig.startCommand && portConfig.startCommand.trim()) {
      try {
        const logPath = getLogPath(portConfig.port, portConfig.logPath);
        prepareLogFile(logPath);
        let userCmd = replacePlaceholders(portConfig.startCommand, portConfig.port);
        userCmd = normalizeCd(userCmd);
        userCmd = quoteCdPath(userCmd);
        const cmdWithRedirect = `${userCmd} >> "${logPath}" 2>&1`;
        const finalCmd = buildHiddenCommand(cmdWithRedirect);
        writeAppLog('批量启动-执行', { port: portConfig.port, finalCmd });
        writePortLog(portConfig.port, `Final START Cmd: ${finalCmd}`, logPath);
        await executeHidden(finalCmd);
        // 异步记录检测
        setTimeout(async () => {
          const ok = await checkPortStatus(portConfig.port);
          writeAppLog('批量启动-检测结果', { port: portConfig.port, listening: ok });
          writePortLog(portConfig.port, `启动检测: ${ok ? 'LISTENING' : '未监听'}`, logPath);
        }, 1500);
        results.push({ port: portConfig.port, success: true });
      } catch (err) {
        writeAppLog('批量启动-异常', { port: portConfig.port, error: String(err) });
        results.push({ port: portConfig.port, success: false, error: err.message });
      }
    } else {
      writeAppLog('批量启动-跳过未配置命令', { port: portConfig.port });
      results.push({ port: portConfig.port, success: false, error: '未设置启动命令' });
    }
  }
  res.json({ success: true, results });
});

// 批量释放（逐端口执行，保证各自日志记录完整）
app.post('/api/ports/batch/stop-all', async (req, res) => {
  const results = [];
  for (const portConfig of ports) {
    try {
      const logPath = getLogPath(portConfig.port, portConfig.logPath);
      await stopPortWithPowerShellSingle(portConfig.port, logPath);
      const result = await killPortProcesses(portConfig.port, logPath);
      writeAppLog('批量释放-完成', { port: portConfig.port, killed: result.killed || 0 });
      setTimeout(async () => {
        const ok = await checkPortStatus(portConfig.port);
        writeAppLog('批量释放-检测结果', { port: portConfig.port, listening: ok });
        writePortLog(portConfig.port, `释放检测: ${ok ? '仍在监听' : '未监听(成功)'}`, logPath);
      }, 1200);
      results.push({ port: portConfig.port, success: true, killed: result.killed || 0 });
    } catch (err) {
      writeAppLog('批量释放-异常', { port: portConfig.port, error: String(err) });
      results.push({ port: portConfig.port, success: false, error: err.message });
    }
  }
  res.json({ success: true, results });
});

// 批量删除
app.post('/api/ports/batch/delete-all', (req, res) => {
  writeAppLog('批量删除-开始', { count: ports.length });
  ports = [];
  portStatusMap.clear();
  savePorts();
  writeAppLog('批量删除-完成', {});
  res.json({ success: true });
});

// ==================== WebSocket 处理 ====================
wss.on('connection', (ws) => {
  writeAppLog('WebSocket连接', {});
  broadcastStatus();
  ws.on('close', (code, reason) => {
    writeAppLog('WebSocket关闭', { code, reason: reason && reason.toString ? reason.toString() : String(reason || '') });
  });
  ws.on('error', (err) => {
    writeAppLog('WebSocket错误', { err: { message: String(err && err.message || err), stack: err && err.stack } });
  });
});

// ==================== 启动服务器 ====================
function start() {
  loadPorts();
  startMonitoring();

  server.listen(PORT, () => {
    writeAppLog('app.start', { url: `http://127.0.0.1:${PORT}`, host: '0.0.0.0', config: CONFIG_FILE, desktop: DESKTOP_PATH });
  });

  server.on('error', (err) => {
    writeAppLog('server.error', { err: { message: String(err && err.message || err), stack: err && err.stack } });
  });

  process.on('SIGINT', () => {
    stopMonitoring();
    wss.clients.forEach(client => client.close());
    server.close(() => {
      writeAppLog('app.stop', { status: 'success' });
      process.exit(0);
    });
  });

  // 全局异常兜底（必须记录）
  process.on('uncaughtException', (err) => {
    writeAppLog('exception.uncaught', { err: { message: String(err && err.message || err), stack: err && err.stack } });
  });
  process.on('unhandledRejection', (reason) => {
    const msg = (reason && reason.message) ? reason.message : String(reason);
    const stack = reason && reason.stack ? reason.stack : undefined;
    writeAppLog('promise.unhandled', { err: { message: msg, stack } });
  });
}

start();
