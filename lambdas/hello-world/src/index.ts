const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, QueryCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const createResponse = (statusCode, body) => ({
    statusCode,
    headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true
    },
    body: JSON.stringify(body)
});

const handleError = (error) => {
    console.error('Error:', error);
    
    if (error.name === 'ResourceNotFoundException') {
        return {
            statusCode: 404,
            message: 'DynamoDB table not found'
        };
    }
    
    if (error.name === 'ValidationException') {
        return {
            statusCode: 400,
            message: 'Invalid query parameters'
        };
    }
    
    return {
        statusCode: 500,
        message: 'Internal server error',
        error: error.message
    };
};

const queryTable = async () => {
    try {
        // Try using the GSI first
        const params = {
            TableName: process.env.DYNAMODB_TABLE || 'GalvitronTable',
            IndexName: 'symbol-timestamp-index',
            KeyConditionExpression: '#type = :type',
            ExpressionAttributeNames: {
                '#type': 'type'
            },
            ExpressionAttributeValues: {
                ':type': 'KLINE'
            },
            ScanIndexForward: false,
            Limit: 50
        };

        const result = await docClient.send(new QueryCommand(params));
        return result.Items || [];
    } catch (error) {
        // If GSI is backfilling, fall back to scanning the main table
        if (error.message && error.message.includes('backfilling')) {
            console.log('GSI is backfilling, falling back to table scan');
            const scanParams = {
                TableName: process.env.DYNAMODB_TABLE || 'GalvitronTable',
                FilterExpression: '#type = :type',
                ExpressionAttributeNames: {
                    '#type': 'type'
                },
                ExpressionAttributeValues: {
                    ':type': 'KLINE'
                },
                Limit: 50
            };
            
            const scanResult = await docClient.send(new ScanCommand(scanParams));
            return scanResult.Items || [];
        }
        throw error;
    }
};

exports.handler = async (event) => {
    console.log('Event:', JSON.stringify(event, null, 2));
    
    try {
        const items = await queryTable();
        
        const response = {
            message: 'Successfully retrieved records',
            timestamp: new Date().toISOString(),
            count: items.length,
            items: items
        };

        return createResponse(200, response);
    } catch (error) {
        const errorResponse = handleError(error);
        return createResponse(errorResponse.statusCode, errorResponse);
    }
};