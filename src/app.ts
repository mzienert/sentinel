import { config } from 'dotenv';
import { resolve } from 'path';

// Load dotenv at the very top, before any other imports
const result = config({ path: resolve(__dirname, '../.env') });

if (result.error) {
    console.error('Error loading .env file:', result.error);
    process.exit(1);
}

console.log('Loaded environment variables from:', resolve(__dirname, '../.env'));
console.log('Dotenv load result:', result);

import HyperExpress from 'hyper-express';
import { CoinbaseWebSocket } from './websocket/CoinbaseWebSocket';

interface HelloResponse {
    message: string;
    timestamp: string;
}

class App {
    private static instance: App | null = null;
    private server: HyperExpress.Server;
    private readonly port: number;
    private wsClient: CoinbaseWebSocket;
    private isStarted: boolean = false;

    private constructor(port: number = 3000) {
        this.server = new HyperExpress.Server();
        this.port = port;
        this.wsClient = CoinbaseWebSocket.getInstance();
        this.initializeRoutes();
    }

    public static getInstance(port: number = 3000): App {
        if (!App.instance) {
            App.instance = new App(port);
        }
        return App.instance;
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

        this.server.get('/ws-status', async (_req: HyperExpress.Request, res: HyperExpress.Response) => {
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

    public async start(): Promise<void> {
        if (this.isStarted) {
            console.log('Server is already running');
            return;
        }

        try {
            await this.server.listen(this.port);
            console.log(`Server is running at http://localhost:${this.port}`);
            console.log(`Try: http://localhost:${this.port}/hello`);

            await this.wsClient.connect();
            console.log('WebSocket client initialized');
            
            this.isStarted = true;
        } catch (error) {
            console.error('Failed to start server:', error);
            process.exit(1);
        }
    }

    public async stop(): Promise<void> {
        if (!this.isStarted) {
            return;
        }

        try {
            this.wsClient.disconnect();
            console.log('WebSocket connection closed');

            await this.server.close();
            console.log('HTTP Server stopped');
            
            this.isStarted = false;
        } catch (error) {
            console.error('Error while stopping server:', error);
            process.exit(1);
        }
    }
}

// Get the singleton instance and start it
const app = App.getInstance();
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