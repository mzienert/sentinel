"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const hyper_express_1 = __importDefault(require("hyper-express"));
const CoinbaseWebSocket_1 = require("./websocket/CoinbaseWebSocket");
class App {
    constructor(port = 3000) {
        this.server = new hyper_express_1.default.Server();
        this.port = port;
        this.wsClient = CoinbaseWebSocket_1.CoinbaseWebSocket.getInstance();
        this.initializeRoutes();
    }
    initializeRoutes() {
        this.server.get('/', async (_req, res) => {
            await res.send('Server is running!');
        });
        this.server.get('/hello', async (_req, res) => {
            const response = {
                message: 'Hello from HyperExpress!',
                timestamp: new Date().toISOString()
            };
            await res.json(response);
        });
        this.server.get('/ws-status', async (_req, res) => {
            await res.json({
                status: 'WebSocket connection active',
                timestamp: new Date().toISOString()
            });
        });
        this.server.set_error_handler((_req, res, error) => {
            console.error('Error:', error);
            return res.status(500).json({
                status: 500,
                message: 'Internal Server Error'
            });
        });
        this.server.set_not_found_handler((req, res) => {
            return res.status(404).json({
                status: 404,
                message: 'Route not found',
                path: req.path
            });
        });
    }
    async start() {
        try {
            await this.server.listen(this.port);
            console.log(`Server is running at http://localhost:${this.port}`);
            console.log(`Try: http://localhost:${this.port}/hello`);
            await this.wsClient.connect();
            console.log('WebSocket client initialized');
        }
        catch (error) {
            console.error('Failed to start server:', error);
            process.exit(1);
        }
    }
    async stop() {
        try {
            this.wsClient.disconnect();
            console.log('WebSocket connection closed');
            await this.server.close();
            console.log('HTTP Server stopped');
        }
        catch (error) {
            console.error('Error while stopping server:', error);
            process.exit(1);
        }
    }
}
const app = new App();
app.start();
process.on('SIGTERM', async () => {
    console.log('Received SIGTERM signal, shutting down gracefully...');
    await app.stop();
    process.exit(0);
});
process.on('SIGINT', async () => {
    console.log('Received SIGINT signal, shutting down gracefully...');
    await app.stop();
    process.exit(0);
});
exports.default = App;
