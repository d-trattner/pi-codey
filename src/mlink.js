'use strict';

const path = require('path');

function loadSocketIoClient() {
  const candidates = [
    'socket.io-client',
    'C:/Users/Public/Programs/mblock/resources/ml/node_modules/socket.io-client',
  ];
  for (const candidate of candidates) {
    try {
      return require(candidate);
    } catch (_) {}
  }
  throw new Error(
    'socket.io-client not found. Keep mBlock installed, or run: npm install socket.io-client@2'
  );
}

class MLinkSerial {
  constructor(options = {}) {
    this.host = options.host || '127.0.0.1';
    this.port = Number(options.mlinkPort || process.env.PI_CODEY_MLINK_PORT || process.env.CODEYX_MLINK_PORT || 58085);
    this.baudRate = Number(options.baudRate || 115200);
    this.devicePort = options.devicePort || process.env.PI_CODEY_PORT || process.env.CODEYX_PORT || null;
    this.timeout = Number(options.timeout || 5000);
    this.io = loadSocketIoClient();
    this.socket = null;
    this.seq = 1;
    this.pending = new Map();
    this.connectedPort = null;
  }

  async connectBridge() {
    if (this.socket && this.socket.connected) return;
    await new Promise((resolve, reject) => {
      const socket = this.io(`http://${this.host}:${this.port}`, {
        transports: ['websocket'],
        timeout: this.timeout,
        reconnection: false,
      });
      const timer = setTimeout(() => {
        socket.close();
        reject(new Error(`Timed out connecting to mLink at ${this.host}:${this.port}`));
      }, this.timeout);
      socket.on('connect', () => {
        clearTimeout(timer);
        this.socket = socket;
        socket.on('s2c_send', (id, message) => this._handleReply(id, message));
        socket.on('s2c_receive', (message) => this._handleReceive(message));
        resolve();
      });
      socket.on('connect_error', (error) => {
        clearTimeout(timer);
        reject(error);
      });
    });
  }

  _handleReply(id, message) {
    const pending = this.pending.get(id);
    if (!pending) return;
    clearTimeout(pending.timer);
    this.pending.delete(id);
    if (message && message.error) pending.reject(new Error(String(message.error)));
    else pending.resolve(message ? message.data : undefined);
  }

  _handleReceive(message) {
    // Hook point for future sensor/subscription support.
    if (this.onReceive) this.onReceive(message);
  }

  async request(connectType, cmd, params = {}) {
    await this.connectBridge();
    const id = this.seq++;
    const body = { connectType, cmd, params };
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`mLink request timed out: ${cmd}`));
      }, this.timeout);
      this.pending.set(id, { resolve, reject, timer });
      this.socket.emit('c2s_send', id, body);
    });
  }

  async listPorts() {
    return this.request('serialport', 'getDevices', {});
  }

  async autoPort() {
    if (this.devicePort) return this.devicePort;
    const ports = await this.listPorts();
    const preferred = ports.find((p) =>
      /1A86|7523|CH340|Codey|Makeblock/i.test(
        `${p.vendorId || ''} ${p.productId || ''} ${p.manufacturer || ''} ${p.friendlyName || ''}`
      )
    );
    const selected = preferred || ports[0];
    if (!selected) throw new Error('No serial ports found for Codey Rocky.');
    this.devicePort = selected.comName || selected.path;
    return this.devicePort;
  }

  async open() {
    const port = await this.autoPort();
    await this.request('serialport', 'open', {
      options: { port, baudRate: this.baudRate, timeout: this.timeout },
    });
    this.connectedPort = port;
    return port;
  }

  async write(buffer) {
    if (!this.connectedPort) await this.open();
    const data = Array.from(Buffer.from(buffer));
    return this.request('serialport', 'write', {
      options: { port: this.connectedPort },
      data,
    });
  }

  async close() {
    if (this.connectedPort) {
      await this.request('serialport', 'close', { options: { port: this.connectedPort } }).catch(() => {});
      this.connectedPort = null;
    }
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }
}

module.exports = { MLinkSerial };
