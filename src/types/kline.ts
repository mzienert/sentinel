export interface Kline {
    symbol: string;
    interval: string;
    openTime: number;
    closeTime: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    trades?: number;
    timestamp?: number;
}

export interface KlineRecord extends Kline {
    id: string;
    type: 'KLINE';
    timestamp: number;
    ttl: number;
}