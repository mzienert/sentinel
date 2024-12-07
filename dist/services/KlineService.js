"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KlineService = void 0;
const aws_sdk_1 = require("aws-sdk");
const uuid_1 = require("uuid");
class KlineService {
    constructor() {
        this.dynamoDB = new aws_sdk_1.DynamoDB.DocumentClient({
            region: process.env.AWS_REGION || 'us-west-1'
        });
        this.tableName = process.env.DYNAMODB_TABLE || 'GalvitronStack-GalvitronTable1808E743-A10U3EPBPH98';
    }
    async saveKline(kline) {
        const timestamp = Date.now();
        const ttl = Math.floor(timestamp / 1000) + (7 * 24 * 60 * 60);
        const item = {
            ...kline,
            id: (0, uuid_1.v4)(),
            type: 'KLINE',
            timestamp,
            ttl
        };
        try {
            await this.dynamoDB.put({
                TableName: this.tableName,
                Item: item
            }).promise();
        }
        catch (error) {
            console.error('Error saving kline to DynamoDB:', error);
            throw new Error('Failed to save kline data');
        }
    }
    async getKlinesBySymbol(symbol, startTime, endTime) {
        const params = {
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
            return (result.Items || []);
        }
        catch (error) {
            console.error('Error querying klines from DynamoDB:', error);
            throw new Error('Failed to retrieve kline data');
        }
    }
}
exports.KlineService = KlineService;
