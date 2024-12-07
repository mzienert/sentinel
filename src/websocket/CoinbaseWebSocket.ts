import WebSocket from 'ws';
import { Kline } from '../types/kline';
import { KlineService } from '../services/KlineService';

export class CoinbaseWebSocket {
    private static instance: CoinbaseWebSocket;
    private readonly WEBSOCKET_URI = 'wss://ws-feed.exchange.coinbase.com';
    private ws: WebSocket | null = null;
    private reconnectAttempts = 0;
    private readonly MAX_RECONNECT_ATTEMPTS = 5;
    private readonly RECONNECT_DELAY = 5000;
    private currentKline: Kline | null = null;
    private klineStartTime = 0;
    private klines: Kline[] = [];
    private readonly MAX_KLINES = 50;
    private klineService: KlineService;


    private constructor() {
        this.klineService = new KlineService();
    }

    public static getInstance(): CoinbaseWebSocket {
        if (!CoinbaseWebSocket.instance) {
            CoinbaseWebSocket.instance = new CoinbaseWebSocket();
        }
        return CoinbaseWebSocket.instance;
    }

    public async connect(): Promise<void> {
        try {
            console.log('Connecting to Coinbase WebSocket...');
            this.ws = new WebSocket(this.WEBSOCKET_URI);

            this.ws.on('open', this.handleOpen.bind(this));
            this.ws.on('message', this.handleMessage.bind(this));
            this.ws.on('error', this.handleError.bind(this));
            this.ws.on('close', this.handleClose.bind(this));

        } catch (error) {
            console.error('Error establishing WebSocket connection:', error);
            await this.handleReconnect();
        }
    }

    private handleOpen(): void {
        console.log('Connected to Coinbase WebSocket');
        this.reconnectAttempts = 0;

        const subscribeMessage = {
            type: 'subscribe',
            product_ids: ['BTC-USD'],
            channels: ['ticker']
        };

        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(subscribeMessage));
            console.log('Sent subscription message:', JSON.stringify(subscribeMessage));
        }
    }

    private handleMessage(data: WebSocket.Data): void {
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
        } catch (error) {
            console.error('Error processing message:', error);
            console.error('Raw message:', data);
        }
    }

    private async handleTickerUpdate(data: any): Promise<void> {
        const price = parseFloat(data.price);
        const size = parseFloat(data.last_size);
        const time = new Date(data.time).getTime();

        if (!this.currentKline || time >= this.klineStartTime + 60000) {
            if (this.currentKline) {
                const completeKline: Kline = {
                    symbol: 'BTC-USD',
                    interval: '1m',
                    openTime: this.klineStartTime,
                    closeTime: this.klineStartTime + 60000,
                    open: this.currentKline.open,
                    high: this.currentKline.high,
                    low: this.currentKline.low,
                    close: this.currentKline.close,
                    volume: this.currentKline.volume,
                    trades: this.currentKline.trades
                };

                this.klines.unshift(completeKline);
                this.logKline(completeKline);
                
                try {
                    await this.klineService.saveKline(completeKline);
                    console.log(`Successfully saved kline to DynamoDB for ${completeKline.symbol} at ${new Date(completeKline.openTime).toISOString()}`);
                } catch (error) {
                    console.error('Failed to save kline to DynamoDB:', error);
                }
                
                if (this.klines.length > this.MAX_KLINES) {
                    this.klines.pop();
                }
            }

            this.klineStartTime = Math.floor(time / 60000) * 60000;
            this.currentKline = {
                symbol: 'BTC-USD',
                interval: '1m',
                openTime: this.klineStartTime,
                closeTime: this.klineStartTime + 60000,
                open: price,
                high: price,
                low: price,
                close: price,
                volume: size,
                trades: 1
            };
            console.log(`Started new kline at ${new Date(this.klineStartTime).toISOString()}`);
        } else {
            if (this.currentKline) {
                this.currentKline.high = Math.max(this.currentKline.high, price);
                this.currentKline.low = Math.min(this.currentKline.low, price);
                this.currentKline.close = price;
                this.currentKline.volume += size;
                this.currentKline.trades = (this.currentKline.trades || 0) + 1;
            }
        }
    }

    private logKline(kline: Kline): void {
        console.log(`
            Completed Kline:
            Symbol: ${kline.symbol}
            Interval: ${kline.interval}
            OpenTime: ${new Date(kline.openTime).toISOString()}
            CloseTime: ${new Date(kline.closeTime).toISOString()}
            Open: ${kline.open.toFixed(2)}
            High: ${kline.high.toFixed(2)}
            Low: ${kline.low.toFixed(2)}
            Close: ${kline.close.toFixed(2)}
            Volume: ${kline.volume.toFixed(8)}
            Trades: ${kline.trades}
            Current Kline Array Length: ${this.klines.length}/${this.MAX_KLINES}
        `);
    }

    private handleError(error: Error): void {
        console.error('WebSocket error:', error);
        console.error('Error details:', error.message);
    }

    private async handleClose(): Promise<void> {
        console.log('WebSocket connection closed');
        await this.handleReconnect();
    }

    private async handleReconnect(): Promise<void> {
        if (this.reconnectAttempts < this.MAX_RECONNECT_ATTEMPTS) {
            this.reconnectAttempts++;
            console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.MAX_RECONNECT_ATTEMPTS}) in ${this.RECONNECT_DELAY/1000} seconds...`);
            await new Promise(resolve => setTimeout(resolve, this.RECONNECT_DELAY));
            await this.connect();
        } else {
            console.error('Max reconnection attempts reached. Please check the connection and restart the application.');
        }
    }

    public disconnect(): void {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }

    public getKlines(): Kline[] {
        return [...this.klines];
    }
}