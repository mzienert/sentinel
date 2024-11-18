// src/app.ts
import HyperExpress from 'hyper-express';

interface HelloResponse {
    message: string;
    timestamp: string;
}

class App {
    private server: HyperExpress.Server;
    private readonly port: number;

    constructor(port: number = 3000) {
        this.server = new HyperExpress.Server();
        this.port = port;
        this.initializeRoutes();
    }

    private initializeRoutes(): void {
        // Add root route for testing
        this.server.get('/', async (req: HyperExpress.Request, res: HyperExpress.Response) => {
            await res.send('Server is running!');
        });

        this.server.get('/hello', async (req: HyperExpress.Request, res: HyperExpress.Response) => {
            const response: HelloResponse = {
                message: 'Hello from HyperExpress!',
                timestamp: new Date().toISOString()
            };
            
            await res.json(response);
        });

        // Set up global error handler
        this.server.set_error_handler((req, res, error) => {
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
            await this.server.listen(this.port);
            console.log(`Server is running at http://localhost:${this.port}`);
            console.log(`Try: http://localhost:${this.port}/hello`);
        } catch (error) {
            console.error('Failed to start server:', error);
            process.exit(1);
        }
    }

    public async stop(): Promise<void> {
        try {
            await this.server.close();
            console.log('Server stopped');
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