import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';

const dynamoClient = new DynamoDBClient({
    region: process.env.AWS_REGION || 'us-west-1'
});

const docClient = DynamoDBDocumentClient.from(dynamoClient);

interface ErrorResponse {
    statusCode: number;
    message: string;
    error?: any;
}

const createResponse = (statusCode: number, body: any): APIGatewayProxyResult => {
    return {
        statusCode,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*', // Enable CORS
            'Access-Control-Allow-Credentials': true
        },
        body: JSON.stringify(body)
    };
};

const handleError = (error: any): ErrorResponse => {
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

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    console.log('Event:', JSON.stringify(event, null, 2));
    
    try {
        const params = {
            TableName: process.env.DYNAMODB_TABLE || 'GalvitronTable',
            IndexName: 'symbol-timestamp-index', // Using the GSI we saw in KlineService.ts
            KeyConditionExpression: '#type = :type',
            ExpressionAttributeNames: {
                '#type': 'type'
            },
            ExpressionAttributeValues: {
                ':type': 'KLINE'
            },
            ScanIndexForward: false, // This will sort in descending order (newest first)
            Limit: 50
        };

        const result = await docClient.send(new QueryCommand(params));
        
        const response = {
            message: 'Successfully retrieved records',
            timestamp: new Date().toISOString(),
            count: result.Items?.length || 0,
            items: result.Items || []
        };

        return createResponse(200, response);
    } catch (error) {
        const errorResponse = handleError(error);
        return createResponse(errorResponse.statusCode, errorResponse);
    }
};