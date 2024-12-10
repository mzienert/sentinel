"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const handler = async () => {
    const now = new Date();
    return {
        statusCode: 200,
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            message: 'Hello, World!',
            timestamp: now.toISOString(),
            datetime: now.toLocaleString(),
        })
    };
};
exports.handler = handler;
