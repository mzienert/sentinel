import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
//import { v4 as uuidv4 } from 'uuid';

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
    private docClient: DynamoDBDocumentClient;
    private readonly tableName: string;

    constructor() {
        const dynamoDbClient = new DynamoDBClient({
            region: process.env.AWS_REGION || 'us-west-1'
        });

        this.docClient = DynamoDBDocumentClient.from(dynamoDbClient);

        const tableName = process.env.DYNAMODB_TABLE;
        if (!tableName) {
            throw new Error('DYNAMODB_TABLE environment variable must be set');
        }
        this.tableName = tableName;
    }

    async saveKline(kline: Kline): Promise<void> {
        if (!this.tableName) {
            throw new Error('DynamoDB table name is not configured');
        }

        const timestamp = Date.now();
        const ttl = Math.floor(timestamp / 1000) + (7 * 24 * 60 * 60); // 7 days TTL

        const item: DynamoDBKline = {
            ...kline,
            id: `${kline.symbol}-${kline.openTime}`, // Using compound key to prevent duplicates
            type: 'KLINE',
            timestamp,
            ttl
        };

        try {
            await this.docClient.send(new PutCommand({
                TableName: this.tableName,
                Item: item,
                // Add condition to prevent overwriting existing klines
                ConditionExpression: 'attribute_not_exists(id)'
            }));
        } catch (error: any) {
            // If the error is a ConditionalCheckFailedException, this kline already exists
            if (error.name === 'ConditionalCheckFailedException') {
                console.log(`Kline already exists for ${kline.symbol} at ${new Date(kline.openTime).toISOString()}`);
                return;
            }
            console.error('Error saving kline to DynamoDB:', error);
            throw new Error('Failed to save kline data');
        }
    }

    async getKlinesBySymbol(symbol: string, startTime?: number, endTime?: number): Promise<DynamoDBKline[]> {
        if (!this.tableName) {
            throw new Error('DynamoDB table name is not configured');
        }

        const params: any = {
            TableName: this.tableName,
            IndexName: 'symbol-timestamp-index',
            KeyConditionExpression: 'symbol = :symbol',
            FilterExpression: '#type = :type',
            ExpressionAttributeNames: {
                '#type': 'type'
            },
            ExpressionAttributeValues: {
                ':symbol': symbol,
                ':type': 'KLINE'
            }
        };

        if (startTime && endTime) {
            params.KeyConditionExpression += ' AND #ts BETWEEN :startTime AND :endTime';
            params.ExpressionAttributeNames['#ts'] = 'timestamp';
            params.ExpressionAttributeValues[':startTime'] = startTime;
            params.ExpressionAttributeValues[':endTime'] = endTime;
        }

        try {
            const result = await this.docClient.send(new QueryCommand(params));
            return (result.Items || []) as DynamoDBKline[];
        } catch (error) {
            console.error('Error querying klines from DynamoDB:', error);
            throw new Error('Failed to retrieve kline data');
        }
    }
}