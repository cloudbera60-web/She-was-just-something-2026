// Load environment variables first
require('dotenv').config();

const express = require('express');
const path = require('path');
const app = express();
const bodyParser = require("body-parser");
const cors = require('cors');

// Get port from environment
const PORT = process.env.PORT || 50900;

const { 
  qrRoute,
  pairRoute
} = require('./routes');

require('events').EventEmitter.defaultMaxListeners = 2000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// ==================== PAYMENT SERVICE INITIALIZATION ====================
console.log('💰 Initializing Payment System...');

// Import and create payment service
const { createPaymentService } = require('./payment-service');

// Initialize payment service (shared globally)
try {
    global.paymentService = createPaymentService();
    
    if (global.paymentService && global.paymentService.isAvailable()) {
        console.log('✅ Payment service initialized and ready');
    } else {
        console.log('⚠️  Payment service initialized but not available (check credentials)');
    }
} catch (error) {
    console.error('❌ Failed to initialize payment service:', error.message);
    global.paymentService = null;
}

// ==================== ROUTES ====================

// QR Code and Pairing
app.use('/qr', qrRoute);
app.use('/code', pairRoute);

// Payment webhook (for external callbacks from PayHero)
app.post('/api/payment/webhook', async (req, res) => {
    try {
        const paymentData = req.body;
        
        console.log('💰 Payment Webhook Received:', JSON.stringify(paymentData, null, 2));
        
        // You can process successful payments here
        // Example: Send WhatsApp notification, update database, etc.
        
        res.json({ success: true, message: 'Webhook received' });
        
    } catch (error) {
        console.error('❌ Webhook Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== BASIC ROUTES ====================

app.get('/pair', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'pair.html'));
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Health check endpoint
app.get('/health', async (req, res) => {
    const pluginLoader = require('./plugin-loader');
    const database = require('./database');
    const { getActiveBots } = require('./bot-runner');
    
    // Check payment service status
    let paymentStatus = '❌ Not initialized';
    let paymentDetails = {};
    
    if (global.paymentService) {
        if (global.paymentService.isAvailable()) {
            paymentStatus = '✅ Available';
            try {
                const balance = await global.paymentService.getBalance();
                paymentDetails = {
                    account_id: process.env.CHANNEL_ID || '3342',
                    balance: balance,
                    provider: process.env.DEFAULT_PROVIDER || 'm-pesa'
                };
            } catch (error) {
                paymentStatus = `⚠️ Available but error: ${error.message}`;
            }
        } else {
            paymentStatus = '⚠️ Initialized but not available';
        }
    }
    
    res.json({
        status: 200,
        success: true,
        service: 'CLOUD AI Bot Runner',
        environment: process.env.NODE_ENV || 'production',
        timestamp: new Date().toISOString(),
        server: {
            port: PORT,
            uptime: process.uptime(),
            memory: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`
        },
        bot: {
            activeBots: Object.keys(getActiveBots() || {}).length,
            pluginsLoaded: pluginLoader.plugins ? pluginLoader.plugins.size : 0,
            name: process.env.BOT_NAME || 'CLOUD AI',
            mode: process.env.BOT_MODE || 'public',
            prefix: process.env.BOT_PREFIX || '.'
        },
        database: {
            mongoConnected: database.isConnected ? '✅ Connected' : '❌ Disconnected'
        },
        payment: {
            status: paymentStatus,
            ...paymentDetails
        },
        owner: {
            name: 'BERA TECH',
            phone: process.env.OWNER_NUMBER || '254116763755',
            email: process.env.OWNER_EMAIL || 'beratech00@gmail.com'
        }
    });
});

// API Documentation
app.get('/api/docs', (req, res) => {
    res.json({
        endpoints: {
            web: {
                'GET /': 'Home page',
                'GET /pair': 'Pairing interface',
                'GET /health': 'System health check',
                'GET /api/docs': 'This documentation'
            },
            payment: {
                'POST /api/payment/webhook': 'Payment confirmation webhook (for PayHero callbacks)'
            }
        },
        note: 'Payment commands are handled directly via WhatsApp (.stk, .tx, .balance)'
    });
});

// Debug endpoint for testing payment service
app.get('/api/debug/payment', async (req, res) => {
    try {
        if (!global.paymentService || !global.paymentService.isAvailable()) {
            return res.status(503).json({
                success: false,
                message: 'Payment service not available',
                credentials: {
                    hasToken: !!(process.env.PAYHERO_AUTH_TOKEN || process.env.AUTH_TOKEN),
                    channelId: process.env.CHANNEL_ID,
                    provider: process.env.DEFAULT_PROVIDER
                }
            });
        }
        
        // Test with balance check
        const balance = await global.paymentService.getBalance();
        
        res.json({
            success: true,
            message: 'Payment service is working!',
            server: {
                port: PORT,
                url: `http://localhost:${PORT}`,
                environment: process.env.NODE_ENV
            },
            credentials: {
                tokenPresent: !!(process.env.PAYHERO_AUTH_TOKEN || process.env.AUTH_TOKEN),
                channelId: process.env.CHANNEL_ID || '3342',
                provider: process.env.DEFAULT_PROVIDER || 'm-pesa'
            },
            balance: balance
        });
        
    } catch (error) {
        console.error('Debug Payment Error:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
            credentials: {
                tokenPresent: !!(process.env.PAYHERO_AUTH_TOKEN || process.env.AUTH_TOKEN),
                channelId: process.env.CHANNEL_ID,
                provider: process.env.DEFAULT_PROVIDER
            }
        });
    }
});

// ==================== SERVER INITIALIZATION ====================

async function startServer() {
    try {
        console.log('🚀 Starting CLOUD AI Bot Runner...');
        console.log('💳 Payment System:', global.paymentService ? 'INTEGRATED' : 'DISABLED');
        console.log('🔐 Account ID:', process.env.CHANNEL_ID || '3342');
        
        // Load configuration
        const configManager = require('./config-manager');
        await configManager.loadConfig();
        
        // Connect to MongoDB (optional)
        const database = require('./database');
        const dbConnected = await database.connect();
        
        if (dbConnected) {
            console.log('✅ Database connected successfully');
        } else {
            console.log('⚠️ Running without database persistence');
        }
        
        // Load plugins
        const pluginLoader = require('./plugin-loader');
        const pluginCount = await pluginLoader.loadPlugins();
        console.log(`✅ ${pluginCount} plugin(s) loaded`);
        
        // Initialize bot system
        const { initializeBotSystem } = require('./bot-runner');
        const systemReady = await initializeBotSystem();
        
        if (systemReady) {
            app.listen(PORT, () => {
                console.log(`
╔══════════════════════════════════════════════════════════╗
║                CLOUD AI BOT RUNNER                       ║
╠══════════════════════════════════════════════════════════╣
║  📍 Port: ${PORT}                                            ║
║  🤖 Bot Name: ${process.env.BOT_NAME || 'CLOUD AI'}             ║
║  👑 Owner: ${process.env.OWNER_NAME || 'BERA TECH'}           ║
║  🔧 Prefix: ${process.env.BOT_PREFIX || '.'}                  ║
║  💳 Account: ${process.env.CHANNEL_ID || '3342'}              ║
║  💰 Payment: ${global.paymentService ? '✅ Ready' : '❌ Disabled'}
║  🗄️  Database: ${database.isConnected ? '✅ Connected' : '❌ Disconnected'}
║  📦 Plugins: ${pluginCount} loaded                         ║
║  🔗 URL: http://localhost:${PORT}                         ║
╚══════════════════════════════════════════════════════════╝
                `);
                console.log('✅ Server is ready!');
                console.log(`• Home: http://localhost:${PORT}`);
                console.log(`• Pair: http://localhost:${PORT}/pair`);
                console.log(`• Health: http://localhost:${PORT}/health`);
                console.log(`• Payment Debug: http://localhost:${PORT}/api/debug/payment`);
                console.log('💳 Payment Commands: .stk, .tx, .balance');
                console.log('📱 All payment commands available to everyone');
            });
        } else {
            console.error('❌ Failed to initialize bot system');
            process.exit(1);
        }
    } catch (error) {
        console.error('❌ Server startup error:', error);
        process.exit(1);
    }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n👋 Shutting down gracefully...');
    const database = require('./database');
    await database.close();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n👋 Received termination signal...');
    const database = require('./database');
    await database.close();
    process.exit(0);
});

// Start the server
startServer();

// Export for other modules
module.exports = {
    app,
    paymentService: global.paymentService
};
