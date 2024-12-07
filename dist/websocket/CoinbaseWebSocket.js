"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CoinbaseWebSocket = void 0;
const ws_1 = __importDefault(require("ws"));
class CoinbaseWebSocket {
    constructor() {
        this.WEBSOCKET_URI = 'wss://ws-feed.exchange.coinbase.com';
        this.ws = null;
        this.reconnectAttempts = 0;
        this.MAX_RECONNECT_ATTEMPTS = 5;
        this.RECONNECT_DELAY = 5000;
        this.currentKline = null;
        this.klineStartTime = 0;
        this.klines = [];
        this.MAX_KLINES = 50;
    }
    static getInstance() {
        if (!CoinbaseWebSocket.instance) {
            CoinbaseWebSocket.instance = new CoinbaseWebSocket();
        }
        return CoinbaseWebSocket.instance;
    }
    async connect() {
        try {
            console.log('Connecting to Coinbase WebSocket...');
            this.ws = new ws_1.default(this.WEBSOCKET_URI);
            this.ws.on('open', this.handleOpen.bind(this));
            this.ws.on('message', this.handleMessage.bind(this));
            this.ws.on('error', this.handleError.bind(this));
            this.ws.on('close', this.handleClose.bind(this));
        }
        catch (error) {
            console.error('Error establishing WebSocket connection:', error);
            await this.handleReconnect();
        }
    }
    handleOpen() {
        console.log('Connected to Coinbase WebSocket');
        this.reconnectAttempts = 0;
        const subscribeMessage = {
            type: 'subscribe',
            product_ids: ['BTC-USD'],
            channels: ['ticker']
        };
        if (this.ws?.readyState === ws_1.default.OPEN) {
            this.ws.send(JSON.stringify(subscribeMessage));
            console.log('Sent subscription message:', JSON.stringify(subscribeMessage));
        }
    }
    handleMessage(data) {
        try {
            const message = JSON.parse(data.toString());
            switch (message.type) {
                case 'ticker':
                    this.handleTickerUpdate(message);
                    break;
                case 'subscriptions':
                    console.log('Received subscriptions confirmation:', JSON.stringify(message));
                    break;
                case 'error':
                    console.error('Received error message:', message);
                    break;
                default:
                    console.log(`Received message: ${JSON.stringify(message)}`);
            }
        }
        catch (error) {
            console.error('Error processing message:', error);
            console.error('Raw message:', data);
        }
    }
    handleTickerUpdate(data) {
        const price = parseFloat(data.price);
        const size = parseFloat(data.last_size);
        const time = new Date(data.time).getTime();
        if (!this.currentKline || time >= this.klineStartTime + 60000) {
            if (this.currentKline) {
                this.currentKline.timestamp = this.klineStartTime;
                this.klines.unshift(this.currentKline);
                this.logKline(this.currentKline);
                if (this.klines.length > this.MAX_KLINES) {
                    this.klines.pop();
                }
            }
            this.klineStartTime = Math.floor(time / 60000) * 60000;
            this.currentKline = {
                open: price,
                high: price,
                low: price,
                close: price,
                volume: size,
                timestamp: this.klineStartTime
            };
            console.log(`Started new kline at ${new Date(this.klineStartTime).toISOString()}`);
        }
        else {
            if (this.currentKline) {
                this.currentKline.high = Math.max(this.currentKline.high, price);
                this.currentKline.low = Math.min(this.currentKline.low, price);
                this.currentKline.close = price;
                this.currentKline.volume += size;
            }
        }
    }
    logKline(kline) {
        console.log(`
Completed Kline:
  Timestamp: ${new Date(kline.timestamp).toISOString()}
  Open: ${kline.open.toFixed(2)}
  High: ${kline.high.toFixed(2)}
  Low: ${kline.low.toFixed(2)}
  Close: ${kline.close.toFixed(2)}
  Volume: ${kline.volume.toFixed(8)}
Current Kline Array Length: ${this.klines.length}/${this.MAX_KLINES}
        `);
    }
    handleError(error) {
        console.error('WebSocket error:', error);
        console.error('Error details:', error.message);
    }
    async handleClose() {
        console.log('WebSocket connection closed');
        await this.handleReconnect();
    }
    async handleReconnect() {
        if (this.reconnectAttempts < this.MAX_RECONNECT_ATTEMPTS) {
            this.reconnectAttempts++;
            console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.MAX_RECONNECT_ATTEMPTS}) in ${this.RECONNECT_DELAY / 1000} seconds...`);
            await new Promise(resolve => setTimeout(resolve, this.RECONNECT_DELAY));
            await this.connect();
        }
        else {
            console.error('Max reconnection attempts reached. Please check the connection and restart the application.');
        }
    }
    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }
    getKlines() {
        return [...this.klines];
    }
}
exports.CoinbaseWebSocket = CoinbaseWebSocket;
