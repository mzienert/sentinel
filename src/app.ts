// src/app.ts
import HyperExpress from 'hyper-express';
import { CoinbaseWebSocket } from './websocket/CoinbaseWebSocket';

interface HelloResponse {
    message: string;
    timestamp: string;
}

class App {
    private server: HyperExpress.Server;
    private readonly port: number;
    private wsClient: CoinbaseWebSocket;

    constructor(port: number = 3000) {
        this.server = new HyperExpress.Server();
        this.port = port;
        this.wsClient = CoinbaseWebSocket.getInstance();
        this.initializeRoutes();
    }

    private initializeRoutes(): void {
        this.server.get('/', async (_req: HyperExpress.Request, res: HyperExpress.Response) => {
            await res.send('Server is running!');
        });

        this.server.get('/hello', async (_req: HyperExpress.Request, res: HyperExpress.Response) => {
            const response: HelloResponse = {
                message: 'Hello from HyperExpress!',
                timestamp: new Date().toISOString()
            };
            
            await res.json(response);
        });

        // WebSocket status endpoint
        this.server.get('/ws-status', async (_req: HyperExpress.Request, res: HyperExpress.Response) => {
            await res.json({
                status: 'WebSocket connection active',
                timestamp: new Date().toISOString()
            });
        });

        // Set up global error handler
        this.server.set_error_handler((_req, res, error) => {
            console.error('Error:', error);
            return res.status(500).json({
                status: 500,
                message: 'Internal Server Error'
            });
        });

        // Set up not found handler
        this.server.set_not_found_handler((req, res) => {
            return res.status(404).json({
                status: 404,
                message: 'Route not found',
                path: req.path
            });
        });
    }

    public async start(): Promise<void> {
        try {
            // Start the HTTP server
            await this.server.listen(this.port);
            console.log(`Server is running at http://localhost:${this.port}`);
            console.log(`Try: http://localhost:${this.port}/hello`);

            // Start the WebSocket connection
            await this.wsClient.connect();
            console.log('WebSocket client initialized');
        } catch (error) {
            console.error('Failed to start server:', error);
            process.exit(1);
        }
    }

    public async stop(): Promise<void> {
        try {
            // Disconnect WebSocket
            this.wsClient.disconnect();
            console.log('WebSocket connection closed');

            // Stop HTTP server
            await this.server.close();
            console.log('HTTP Server stopped');
        } catch (error) {
            console.error('Error while stopping server:', error);
            process.exit(1);
        }
    }
}

// Create and start server instance
const app = new App();
app.start();

// Handle graceful shutdown
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

export default App;