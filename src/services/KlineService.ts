import { DynamoDB } from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';

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
}

interface DynamoDBKline extends Kline {
    id: string;
    type: 'KLINE';
    timestamp: number;
    ttl: number;
}

export class KlineService {
    private dynamoDB: DynamoDB.DocumentClient;
    private readonly tableName: string;

    constructor() {
        this.dynamoDB = new DynamoDB.DocumentClient({
            region: process.env.AWS_REGION || 'us-west-1'
        });
        this.tableName = process.env.DYNAMODB_TABLE || 'GalvitronStack-GalvitronTable1808E743-A10U3EPBPH98';
    }

    async saveKline(kline: Kline): Promise<void> {
        const timestamp = Date.now();
        const ttl = Math.floor(timestamp / 1000) + (7 * 24 * 60 * 60); // 7 days TTL

        const item: DynamoDBKline = {
            ...kline,
            id: uuidv4(),
            type: 'KLINE',
            timestamp,
            ttl
        };

        try {
            await this.dynamoDB.put({
                TableName: this.tableName,
                Item: item
            }).promise();
        } catch (error) {
            console.error('Error saving kline to DynamoDB:', error);
            throw new Error('Failed to save kline data');
        }
    }

    async getKlinesBySymbol(symbol: string, startTime?: number, endTime?: number): Promise<DynamoDBKline[]> {
        const params: DynamoDB.DocumentClient.QueryInput = {
            TableName: this.tableName,
            IndexName: 'symbol-timestamp-index',
            KeyConditionExpression: 'symbol = :symbol',
            FilterExpression: 'type = :type',
            ExpressionAttributeValues: {
                ':symbol': symbol,
                ':type': 'KLINE'
            }
        };

        if (startTime && endTime) {
            params.KeyConditionExpression += ' AND #ts BETWEEN :startTime AND :endTime';
            params.ExpressionAttributeNames = {
                '#ts': 'timestamp'
            };
            params.ExpressionAttributeValues = {
                ...params.ExpressionAttributeValues,
                ':startTime': startTime,
                ':endTime': endTime
            };
        }

        try {
            const result = await this.dynamoDB.query(params).promise();
            return (result.Items || []) as DynamoDBKline[];
        } catch (error) {
            console.error('Error querying klines from DynamoDB:', error);
            throw new Error('Failed to retrieve kline data');
        }
    }
}