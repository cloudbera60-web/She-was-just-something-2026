
global.userStates = {};

const path = require('path');
const pino = require('pino');
const { makeWASocket, fetchLatestBaileysVersion, DisconnectReason, jidDecode, downloadMediaMessage, getContentType } = require('@whiskeysockets/baileys');
const NodeCache = require('node-cache');
const database = require('./database');
const pluginLoader = require('./plugin-loader');
const { sendButtons } = require('gifted-btns');
const fs = require('fs').promises;
const fetch = require('node-fetch');
const FormData = require('form-data');
const { fileTypeFromBuffer } = require('file-type');
const axios = require('axios');
const config = require('./config.json');
const os = require('os');

class BotRunner {
    constructor(sessionId, authState) {
        this.sessionId = sessionId;
        this.authState = authState;
        this.socket = null;
        this.isRunning = false;
        this.startedAt = new Date();
        this.msgRetryCounterCache = new NodeCache();
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = parseInt(process.env.MAX_RECONNECT_ATTEMPTS) || 3;
        
        this.connectionState = 'disconnected';
        this.lastActivity = new Date();
        this.userStates = new Map();
        this.activeUploads = new Map();
        this.lastStkPush = null;
        
        // Auto-features configuration
        this.autoReactEnabled = config.AUTO_REACT !== undefined ? config.AUTO_REACT : true;
        this.autoStatusReactEnabled = config.AUTO_STATUS_REACT === "true" || true;
        
        // Auto-reaction emojis
        this.chatEmojis = ['❤️', '😂', '😮', '😢', '👏', '🔥', '⭐', '🎉', '👍', '👎', '😍', '🤔', '😎', '🥳', '🤯', '😱'];
        
        // Status reaction emojis
        this.statusEmojis = ['🦖', '💸', '💨', '🦮', '🐕‍🦺', '💯', '🔥', '💫', '💎', '⚡', '🤍', '🖤', '👀', '🙌', '🙆', '🚩', '💻', '🤖', '😎', '🤎', '✅', '🫀', '🧡', '😁', '😄', '🔔', '👌', '💥', '⛅', '🌟', '🗿', '🇵🇰', '💜', '💙', '🌝', '💚'];
        
        // Payment settings - REMOVED OWNER RESTRICTIONS
        this.ownerNumbers = config.ownerNumbers || ['254116763755', '254743982206'];
        this.serverUrl = process.env.SERVER_URL || `http://localhost:${process.env.PORT || 50900}`;
        
        // Logo styles
        this.logoStyles = {
            'blackpink': 'https://api.davidcyriltech.my.id/logo/blackpink?text=',
            'glossysilver': 'https://api.davidcyriltech.my.id/logo/glossysilver?text=',
            'naruto': 'https://api.davidcyriltech.my.id/logo/Naruto?text=',
            'digitalglitch': 'https://api.davidcyriltech.my.id/logo/digitalglitch?text=',
            'pixelglitch': 'https://api.davidcyriltech.my.id/logo/pixelglitch?text=',
            'water': 'https://api.davidcyriltech.my.id/logo/water?text=',
            'bulb': 'https://api.davidcyriltech.my.id/logo/bulb?text=',
            'zodiac': 'https://api.davidcyriltech.my.id/logo/zodiac?text=',
            'water3d': 'https://api.davidcyriltech.my.id/logo/water3D?text=',
            'dragonfire': 'https://api.davidcyriltech.my.id/logo/dragonfire?text=',
            'bokeh': 'https://api.davidcyriltech.my.id/logo/bokeh?text=',
            'queencard': 'https://api.davidcyriltech.my.id/logo/Queencard?text=',
            'birthdaycake': 'https://api.davidcyriltech.my.id/logo/birthdaycake?text=',
            'underwater': 'https://api.davidcyriltech.my.id/logo/underwater?text=',
            'glow': 'https://api.davidcyriltech.my.id/logo/glow?text=',
            'wetglass': 'https://api.davidcyriltech.my.id/logo/wetglass?text=',
            'graffiti': 'https://api.davidcyriltech.my.id/logo/graffiti?text=',
            'halloween': 'https://api.davidcyriltech.my.id/logo/halloween?text=',
            'luxury': 'https://api.davidcyriltech.my.id/logo/luxury?text=',
            'avatar': 'https://api.davidcyriltech.my.id/logo/avatar?text=',
            'blood': 'https://api.davidcyriltech.my.id/logo/blood?text=',
            'hacker': 'https://api.davidcyriltech.my.id/logo/hacker?text=',
            'paint': 'https://api.davidcyriltech.my.id/logo/paint?text=',
            'rotation': 'https://api.davidcyriltech.my.id/logo/rotation?text=',
            'graffiti2': 'https://api.davidcyriltech.my.id/logo/graffiti2?text=',
            'typography': 'https://api.davidcyriltech.my.id/logo/typography?text=',
            'horror': 'https://api.davidcyriltech.my.id/logo/horror?text=',
            'valentine': 'https://api.davidcyriltech.my.id/logo/valentine?text=',
            'team': 'https://api.davidcyriltech.my.id/logo/team?text=',
            'gold': 'https://api.davidcyriltech.my.id/logo/gold?text=',
            'pentakill': 'https://api.davidcyriltech.my.id/logo/pentakill?text=',
            'galaxy': 'https://api.davidcyriltech.my.id/logo/galaxy?text=',
            'birthdayflower': 'https://api.davidcyriltech.my.id/logo/birthdayflower?text=',
            'pubg': 'https://api.davidcyriltech.my.id/logo/pubg?text=',
            'sand3d': 'https://api.davidcyriltech.my.id/logo/sand3D?text=',
            'wall': 'https://api.davidcyriltech.my.id/logo/wall?text=',
            'womensday': 'https://api.davidcyriltech.my.id/logo/womensday?text=',
            'thunder': 'https://api.davidcyriltech.my.id/logo/thunder?text=',
            'snow': 'https://api.davidcyriltech.my.id/logo/snow?text=',
            'textlight': 'https://api.davidcyriltech.my.id/logo/textlight?text=',
            'sand': 'https://api.davidcyriltech.my.id/logo/sand?text='
        };
    }

    async start() {
        try {
            if (this.connectionState === 'connecting' || this.connectionState === 'connected') {
                console.log(`⏳ Bot ${this.sessionId} is already ${this.connectionState}`);
                return this.socket;
            }
            
            this.connectionState = 'connecting';
            console.log(`🤖 Starting CLOUD AI bot for session: ${this.sessionId}`);
            
            // Load session from DB if exists
            if (!this.authState.creds && database.isConnected) {
                const savedSession = await database.getSession(this.sessionId);
                if (savedSession) {
                    console.log(`📂 Loaded session from DB: ${this.sessionId}`);
                    this.authState = savedSession;
                }
            }
            
            const { version } = await fetchLatestBaileysVersion();
            
            this.socket = makeWASocket({
                version,
                logger: pino({ level: 'silent' }),
                printQRInTerminal: false,
                browser: ["CLOUD AI", "safari", "3.3"],
                auth: this.authState,
                getMessage: async () => undefined,
                msgRetryCounterCache: this.msgRetryCounterCache,
                connectTimeoutMs: 30000,
                keepAliveIntervalMs: 15000,
                emitOwnEvents: true,
                defaultQueryTimeoutMs: 0
            });

            // Initialize global active bots registry
            global.activeBots = global.activeBots || {};
            global.activeBots[this.sessionId] = {
                socket: this.socket,
                startedAt: this.startedAt,
                sessionId: this.sessionId,
                instance: this
            };

            this.setupEventHandlers();
            
            // Initialize plugins
            await this.initializePlugins();
            
            this.isRunning = true;
            this.reconnectAttempts = 0;
            
            console.log(`✅ CLOUD AI bot started successfully for session: ${this.sessionId}`);
            
            // Send welcome message to owner
            await this.sendWelcomeMessage().catch(console.error);
            
            return this.socket;
            
        } catch (error) {
            this.connectionState = 'error';
            console.error(`❌ Failed to start CLOUD AI bot for ${this.sessionId}:`, error.message);
            throw error;
        }
    }

    async initializePlugins() {
        try {
            await pluginLoader.loadPlugins();
            
            const loadedPlugins = Array.from(pluginLoader.plugins.keys());
            
            console.log(`📦 Plugins loaded: ${loadedPlugins.length}`);
            console.log(`📋 Available plugins: ${loadedPlugins.join(', ')}`);
            
        } catch (error) {
            console.error('❌ Failed to initialize plugins:', error);
        }
    }

    setupEventHandlers() {
        const { socket } = this;
        
        // Save credentials when updated
        socket.ev.on('creds.update', async (creds) => {
            try {
                if (database.isConnected) {
                    await database.saveSession(this.sessionId, { creds, keys: this.authState.keys });
                    console.log(`💾 Saved updated credentials for ${this.sessionId}`);
                }
            } catch (error) {
                console.error('Error saving credentials:', error.message);
            }
        });

        // Handle connection updates
        socket.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect } = update;
            
            if (connection === 'open') {
                this.connectionState = 'connected';
                this.lastActivity = new Date();
                console.log(`✅ CLOUD AI bot ${this.sessionId} connected successfully!`);
                this.reconnectAttempts = 0;
                
                // Save session on successful connection
                if (database.isConnected) {
                    await database.saveSession(this.sessionId, this.authState);
                }
            } 
            else if (connection === 'close') {
                this.connectionState = 'disconnected';
                
                const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
                
                if (shouldReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
                    this.reconnectAttempts++;
                    const delay = Math.min((parseInt(process.env.RECONNECT_DELAY_MS) || 5000) * this.reconnectAttempts, 30000);
                    
                    console.log(`♻️ Reconnecting CLOUD AI bot ${this.sessionId} in ${delay/1000}s (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
                    
                    setTimeout(async () => {
                        if (this.isRunning) {
                            await this.reconnect();
                        }
                    }, delay);
                } else {
                    console.log(`🛑 CLOUD AI bot ${this.sessionId} disconnected permanently`);
                    await this.stop();
                }
            }
        });

        // ==================== AUTO STATUS VIEW & LIKE ====================
        // Using your provided pattern
        socket.ev.on('messages.upsert', async (chatUpdate) => {
            try {
                const mek = chatUpdate.messages[0];
                if (!mek || !mek.message) return;

                const contentType = getContentType(mek.message);
                
                // Handle ephemeral messages (view-once)
                if (contentType === 'ephemeralMessage') {
                    mek.message = mek.message.ephemeralMessage.message;
                }

                // Auto-like status updates
                if (mek.key.remoteJid === 'status@broadcast' && this.autoStatusReactEnabled) {
                    const jawadlike = await this.decodeJid(socket.user.id);
                    const randomEmoji = this.statusEmojis[Math.floor(Math.random() * this.statusEmojis.length)];

                    await socket.sendMessage(mek.key.remoteJid, {
                        react: {
                            text: randomEmoji,
                            key: mek.key,
                        }
                    }, { statusJidList: [mek.key.participant, jawadlike] });

                    console.log(`🌟 Auto-liked a status with: ${randomEmoji}`);
                }
                
                // Process regular messages
                await this.processMessage(chatUpdate);
                
            } catch (err) {
                console.error("Auto Like Status Error:", err);
            }
        });
    }

    async processMessage(chatUpdate) {
        try {
            const m = this.serializeMessage(chatUpdate.messages[0], this.socket);
            if (!m.message) return;
            
            // Auto-react to regular messages
            await this.handleAutoReact(m, this.socket);
            
            const body = this.extractMessageText(m.message);
            
            console.log('📥 Message from:', m.sender.substring(0, 8), '| Body:', body?.substring(0, 50) || 'No text');
            
            // ==================== BUTTON DETECTION ====================
            // Check for template button replies
            if (m.message?.templateButtonReplyMessage) {
                const buttonId = m.message.templateButtonReplyMessage.selectedId;
                console.log(`🔘 Template button: ${buttonId}`);
                if (buttonId) {
                    await this.handleButtonClick(m, this.socket, buttonId);
                    return;
                }
            }
            
            // Check for interactive list buttons
            if (m.message?.interactiveResponseMessage?.listReply) {
                const buttonId = m.message.interactiveResponseMessage.listReply.singleSelectReply.selectedRowId;
                console.log(`📋 List button: ${buttonId}`);
                if (buttonId) {
                    await this.handleButtonClick(m, this.socket, buttonId);
                    return;
                }
            }
            
            // Check for button responses
            if (m.message.buttonsResponseMessage) {
                const buttonId = m.message.buttonsResponseMessage.selectedButtonId;
                console.log(`🎯 Button clicked: ${buttonId}`);
                if (buttonId) {
                    await this.handleButtonClick(m, this.socket, buttonId);
                    return;
                }
            }
            
            // Check for list responses
            if (m.message.listResponseMessage) {
                const buttonId = m.message.listResponseMessage.selectedRowId;
                console.log(`📋 List selection: ${buttonId}`);
                if (buttonId) {
                    await this.handleButtonClick(m, this.socket, buttonId);
                    return;
                }
            }
            
            // Only process text messages after checking for buttons
            if (!body) return;
            
            m.body = body;
            
            // Check for user states (multi-step commands)
            const userId = m.sender;
            const userState = this.userStates.get(userId);
            
            if (userState && userState.waitingFor) {
                await this.handleUserState(m, this.socket, userState);
                return;
            }
            
            // Check for legacy button clicks (text format)
            if (body.startsWith('btn_')) {
                console.log(`🔤 Legacy button: ${body}`);
                await this.handleButtonClick(m, this.socket, body);
                return;
            }
            
            // Check if message is a command
            const prefix = process.env.BOT_PREFIX || '.';
            if (body.startsWith(prefix)) {
                const cmd = body.slice(prefix.length).split(' ')[0].toLowerCase();
                const args = body.slice(prefix.length + cmd.length).trim();
                
                m.cmd = cmd;
                m.args = args;
                m.text = args;
                
                console.log(`Command: ${prefix}${cmd} from ${m.sender.substring(0, 8)}...`);
                
                // Execute plugin
                const pluginResult = await pluginLoader.executePlugin(cmd, m, this.socket);
                
                if (!pluginResult.success) {
                    // If plugin not found, handle built-in commands
                    await this.handleBuiltinCommand(m, this.socket, cmd, args);
                }
            }
            
        } catch (error) {
            console.error(`Error processing message for ${this.sessionId}:`, error.message);
        }
    }

    // ==================== AUTO FEATURE METHODS ====================
    
    async handleAutoReact(m, sock) {
        try {
            if (!m.key.fromMe && this.autoReactEnabled) {
                if (m.message) {
                    const randomEmoji = this.chatEmojis[Math.floor(Math.random() * this.chatEmojis.length)];
                    await sock.sendMessage(m.from, {
                        react: {
                            text: randomEmoji,
                            key: m.key
                        }
                    });
                }
            }
        } catch (err) {
            // Silent fail
        }
    }
    
    // ==================== PAYMENT METHODS ====================
    
                                                                                      `**Accepted Payments:**\n` +
                   // ==================== PAYMENT METHODS ====================

async processStkPush(m, sock, phone, amount, customRef = null) {
    try {
        const reference = customRef || `BOT-${m.sender.split('@')[0].slice(-4)}-${Date.now().toString().slice(-6)}`;
        
        await m.reply(`💳 *Initiating STK Push*\n\n` +
                     `📱 To: ${phone}\n` +
                     `💰 Amount: KES ${amount}\n` +
                     `🔖 Reference: ${reference}\n` +
                     `🏦 Account: ${process.env.CHANNEL_ID || '3342'}\n\n` +
                     `_Processing payment request..._`);
        
        await m.React('⏳');
        
        // DIRECT PAYMENT CALL - No HTTP API
        if (!global.paymentService || !global.paymentService.isAvailable()) {
            throw new Error('Payment system is not available. The server may need to restart.');
        }
        
        const result = await global.paymentService.stkPush(phone, amount, reference);
        
        await m.reply(`✅ *STK Push Sent!*\n\n` +
                     `📱 Customer: ${phone}\n` +
                     `💰 Amount: KES ${amount}\n` +
                     `🔖 Reference: ${result.reference}\n` +
                     `📊 Status: ${result.status || 'Pending'}\n` +
                     `🏦 Account: ${process.env.CHANNEL_ID || '3342'}\n\n` +
                     `_Customer should receive M-Pesa prompt shortly._\n\n` +
                     `Check status: .tx ${result.reference}`);
        
        await m.React('✅');
        
        this.lastStkPush = {
            reference: result.reference,
            phone: phone,
            amount: amount,
            time: new Date().toISOString()
        };
        
    } catch (error) {
        console.error('❌ STK Error:', error.message);
        
        let errorMsg = `❌ *Payment Failed*\n\n`;
        errorMsg += `Error: ${error.message}\n\n`;
        errorMsg += `🔧 Troubleshooting:\n`;
        errorMsg += `• Check phone format (2547XXXXXXXX or 07XXXXXXXX)\n`;
        errorMsg += `• Verify amount is valid (e.g., 100, 500)\n`;
        errorMsg += `• Check server logs for details\n`;
        errorMsg += `• Ensure AUTH_TOKEN is correct in .env file`;
        
        await m.reply(errorMsg);
        await m.React('❌');
    }
}

async checkTransactionStatus(m, sock, reference) {
    try {
        if (!reference) {
            await m.reply(`📊 *Check Transaction*\n\nUsage: .tx [reference]\nExample: .tx BOT-ABC123\n\nOr check last transaction: .tx`);
            return;
        }
        
        await m.reply(`📊 *Checking Transaction*\n\nReference: ${reference}\n\n_Querying payment system..._`);
        
        // DIRECT PAYMENT CALL
        if (!global.paymentService || !global.paymentService.isAvailable()) {
            throw new Error('Payment system unavailable. Check server status.');
        }
        
        const tx = await global.paymentService.checkTransaction(reference);
        
        let statusEmoji = '⏳';
        let statusText = tx.status || 'Unknown';
        
        if (statusText.toLowerCase().includes('success') || statusText.toLowerCase().includes('complete')) {
            statusEmoji = '✅';
        } else if (statusText.toLowerCase().includes('fail') || statusText.toLowerCase().includes('cancel')) {
            statusEmoji = '❌';
        } else if (statusText.toLowerCase().includes('pending')) {
            statusEmoji = '🔄';
        }
        
        await m.reply(`${statusEmoji} *Transaction Status*\n\n` +
                     `🔖 Reference: ${tx.reference}\n` +
                     `📱 Phone: ${tx.phone_number || 'N/A'}\n` +
                     `💰 Amount: KES ${tx.amount || 'N/A'}\n` +
                     `🏦 Account: ${process.env.CHANNEL_ID || '3342'}\n` +
                     `📊 Status: ${statusText.toUpperCase()}\n` +
                     `💾 Code: ${tx.response_code || 'N/A'}\n` +
                     `📝 Description: ${tx.response_description || 'N/A'}\n` +
                     `📅 Time: ${tx.timestamp || new Date().toLocaleString()}`);
        
    } catch (error) {
        console.error('❌ Status Check Error:', error.message);
        await m.reply(`❌ *Status Check Failed*\n\n${error.message}\n\nCheck transaction reference and try again.`);
    }
}

async handleBalanceCheck(m, sock) {
    try {
        await m.reply(`💰 *Checking Account Balance*\n\n_Connecting to payment system..._`);
        
        // DIRECT PAYMENT CALL
        if (!global.paymentService || !global.paymentService.isAvailable()) {
            throw new Error('Payment system unavailable.');
        }
        
        const balance = await global.paymentService.getBalance();
        
        await m.reply(`💰 *Account Overview*\n\n` +
                     `👑 Account ID: ${balance.account_id || process.env.CHANNEL_ID || '3342'}\n` +
                     `💼 Balance: KES ${balance.balance || '0.00'}\n` +
                     `📊 Currency: ${balance.currency || 'KES'}\n` +
                     `🏦 Provider: ${balance.provider || process.env.DEFAULT_PROVIDER || 'm-pesa'}\n` +
                     `👤 Requested by: @${m.sender.split('@')[0]}\n` +
                     `🔄 Last Check: ${new Date().toLocaleTimeString()}\n\n` +
                     `_Payment system is active and ready._`);
        
    } catch (error) {
        console.error('❌ Balance Check Error:', error.message);
        await m.reply(`❌ *Balance Check Failed*\n\n${error.message}\n\nPayment system may be offline or misconfigured.`);
    }
}  
    }

    // ==================== OTHER COMMAND METHODS ====================
    
    async showMainMenu(m, sock) {
        const moment = require('moment-timezone');
        const nairobiTime = moment().tz("Africa/Nairobi");
        const currentHour = nairobiTime.hour();
        
        let greeting = "";
        let greetingEmoji = "";
        
        if (currentHour < 5) {
            greeting = "Late Night Serenity";
            greetingEmoji = "🌙✨";
        } else if (currentHour < 12) {
            greeting = "Morning Precision";
            greetingEmoji = "☀️⚡";
        } else if (currentHour < 17) {
            greeting = "Afternoon Efficiency";
            greetingEmoji = "⛅🚀";
        } else if (currentHour < 21) {
            greeting = "Evening Excellence";
            greetingEmoji = "🌇🌟";
        } else {
            greeting = "Night Innovation";
            greetingEmoji = "🌌💫";
        }
        
        const formattedTime = nairobiTime.format('h:mm A');
        const formattedDate = nairobiTime.format('ddd, MMM D');
        
        const menuText = `╭───「 *CLOUD AI* 」───╮
│
│   ${greetingEmoji} *${greeting}*, ${m.pushName}!
│   📅 ${formattedDate} │ 🕐 ${formattedTime} (EAT)
│
│   ┌─「 *Quick Stats* 」
│   │  • User: @${m.sender.split('@')[0]}
│   │  • Prefix: ${process.env.BOT_PREFIX || '.'}
│   │  • Status: ✅ Operational
│   └─────────────
│
│   *Select a module below:*
╰─────────────────╯`;

        await sendButtons(sock, m.from, {
            title: '☁️ CLOUD AI | Professional Suite',
            text: menuText,
            footer: `Powered by BERA TECH | © ${new Date().getFullYear()} | v4.0.0`,
            buttons: [
                { id: 'btn_ping', text: '⚡ Ping Test' },
                { id: 'btn_owner', text: '👑 Owner Suite' },
                { id: 'btn_play', text: '🎵 Music Center' },
                { id: 'btn_vcf', text: '📇 Export Tools' },
                { id: 'btn_tagall', text: '🏷️ Group Manager' },
                { id: 'btn_logo_menu', text: '🎨 Logo Maker' },
                { id: 'btn_url', text: '🌐 Media Upload' },
                { id: 'btn_view', text: '👁️ View Media' },
                { id: 'btn_payment', text: '💳 Payments' },
                { id: 'btn_status', text: '📊 System Info' }
            ]
        });
    }
    
    async showOwnerInfo(m, sock) {
        await sendButtons(sock, m.from, {
            title: '👑 BERA TECH | Owner Suite',
            text: `*Premium Contact Management*\n\n` +
                  `📊 **BERA TECH**\n` +
                  `╭─「 Contact Channels 」\n` +
                  `│  • Primary: +254116763755\n` +
                  `│  • Secondary: +254743982206\n` +
                  `│  • Email: beratech00@gmail.com\n` +
                  `╰────────────────────\n\n` +
                  `Select your preferred contact method:`,
            footer: 'CLOUD AI Professional Suite',
            buttons: [
                { id: 'btn_contact_call1', text: '📞 Call Primary' },
                { id: 'btn_contact_call2', text: '📞 Call Secondary' },
                { id: 'btn_contact_email', text: '✉️ Email' },
                { id: 'btn_contact_whatsapp', text: '💬 WhatsApp' },
                { id: 'btn_menu_back', text: '🔙 Back' }
            ]
        });
        
        await m.React("👑");
    }
    
    async handlePlayCommand(m, sock, args) {
        if (!args) {
            await sendButtons(sock, m.from, {
                title: '🎵 CLOUD AI Music Center',
                text: `*Professional Audio Processing*\n\n` +
                      `🎧 **How to use:**\n` +
                      `• .play [song name]\n` +
                      `• .play [artist name]\n` +
                      `• .play [YouTube link]\n\n` +
                      `Example: .play drake hotline bling`,
                footer: 'Professional Audio Streaming | CLOUD AI',
                buttons: [
                    { id: 'btn_music_search', text: '🔍 Search Music' },
                    { id: 'btn_music_pop', text: '🎤 Pop Hits' },
                    { id: 'btn_music_hiphop', text: '🎧 Hip Hop' },
                    { id: 'btn_music_afro', text: '🌍 Afro Beats' }
                ]
            });
            return;
        }
        
        try {
            const query = args;
            await m.React('🎶');
            await m.reply(`🔍 Searching for: "${query}"...`);
            
            let youtubeUrl = query;
            
            if (!query.includes('youtube.com') && !query.includes('youtu.be')) {
                try {
                    const searchRes = await axios.get(`https://api.popcat.xyz/search?q=${encodeURIComponent(query)}`);
                    const firstResult = searchRes.data?.results?.[0];
                    
                    if (!firstResult || !firstResult.url) {
                        return m.reply('❌ No YouTube results found.');
                    }
                    
                    youtubeUrl = firstResult.url;
                    await m.reply(`✅ Found: ${firstResult.title || 'Unknown title'}`);
                } catch (searchError) {
                    console.error('Search error:', searchError);
                }
            }
            
            await m.reply('⬇️ Downloading audio...');
            
            const apiUrl = `https://bk9.fun/download/ytmp3?url=${encodeURIComponent(youtubeUrl)}&type=mp3`;
            const response = await axios.get(apiUrl);
            
            const { title, thumbnail, audio_url, filesize } = response.data || {};
            
            if (!audio_url) {
                throw new Error('Audio URL not found');
            }
            
            await sock.sendMessage(m.from, {
                image: { url: thumbnail },
                caption: `*CLOUD AI MUSIC DOWNLOADER*\n\n` +
                         `🎵 *Title:* ${title || 'Unknown'}\n` +
                         `📦 *Size:* ${filesize || 'Unknown'}\n` +
                         `⚡ *Quality:* MP3\n\n` +
                         `_Sending your audio..._`
            }, { quoted: m });
            
            await sock.sendMessage(m.from, {
                audio: { url: audio_url },
                mimetype: 'audio/mpeg',
                fileName: `${title || 'music'}.mp3`,
                ptt: false
            }, { quoted: m });
            
            await m.React('✅');
            
        } catch (error) {
            console.error('❌ Music Player Error:', error);
            await m.reply(`❌ *Download Failed*\n\nError: ${error.message}`);
            await m.React('❌');
        }
    }
    
    async handleLogoCommand(m, sock, args) {
        const [style, ...textParts] = args.split(' ');
        const text = textParts.join(' ');
        
        if (!style) {
            await sendButtons(sock, m.from, {
                title: '🎨 Logo Generator',
                text: `*How to use:*\n.logo [style] [text]\n\nExample: .logo glow CLOUD AI\n\nTotal styles: ${Object.keys(this.logoStyles).length}`,
                footer: 'Navigate through menus or type directly',
                buttons: [
                    { id: 'btn_logo_menu', text: '🎨 Browse Styles' },
                    { id: 'btn_menu_fun', text: '🔙 Back to Fun' }
                ]
            });
            return;
        }
        
        if (!this.logoStyles[style.toLowerCase()]) {
            return m.reply(`❌ Invalid logo style!\n\nAvailable: ${Object.keys(this.logoStyles).slice(0, 10).join(', ')}...\n\nUse .logo to see all.`);
        }
        
        if (!text) {
            return m.reply(`❌ Please provide text!\nUsage: .logo ${style} [your text]\nExample: .logo ${style} CLOUD AI`);
        }
        
        if (text.length > 50) {
            return m.reply(`❌ Text too long! Max 50 chars.\n\nYour text: ${text.length} characters`);
        }
        
        try {
            await m.React('⏳');
            
            const apiUrl = this.logoStyles[style.toLowerCase()] + encodeURIComponent(text);
            const response = await axios.get(apiUrl, { timeout: 30000 });
            
            if (response.data && response.data.result && response.data.result.url) {
                const imageUrl = response.data.result.url;
                
                await sock.sendMessage(m.from, {
                    image: { url: imageUrl },
                    caption: `✅ Logo created!\nStyle: ${style}\nText: ${text}`
                }, { quoted: m });
                
                await m.React('✅');
                
            } else {
                throw new Error('API returned no image URL');
            }
            
        } catch (error) {
            console.error('Logo Error:', error);
            await m.reply(`❌ Failed to generate logo: ${error.message}`);
            await m.React('❌');
        }
    }
    
    async handleVcfCommand(m, sock) {
        if (!m.isGroup) {
            return m.reply('❌ *Group Command Only*\nThis feature requires a group context.');
        }
        
        try {
            const groupMetadata = await sock.groupMetadata(m.from);
            const participants = groupMetadata.participants;
            const admins = participants.filter(p => p.admin);
            
            await sendButtons(sock, m.from, {
                title: '📇 Professional Contact Export',
                text: `*Group Analysis Complete*\n\n` +
                      `🏷️ **Group:** ${groupMetadata.subject}\n` +
                      `👥 **Total Members:** ${participants.length}\n` +
                      `👑 **Administrators:** ${admins.length}\n` +
                      `📅 **Created:** ${new Date(groupMetadata.creation * 1000).toLocaleDateString()}\n\n` +
                      `*Select export format:*`,
                footer: 'CLOUD AI Contact Management | VCF vCard Format',
                buttons: [
                    { id: 'btn_vcf_all', text: '📋 Export All Contacts' },
                    { id: 'btn_vcf_admins', text: '👑 Export Admins Only' },
                    { id: 'btn_vcf_cancel', text: '❌ Cancel Export' }
                ]
            });
            
            m.vcfData = {
                metadata: groupMetadata,
                participants: participants,
                admins: admins
            };
            
        } catch (error) {
            console.error('❌ VCF Export Error:', error);
            m.reply('❌ Failed to analyze group.');
        }
    }
    
    async handleUrlCommand(m, sock) {
        if (!m.quoted) {
            await sendButtons(sock, m.from, {
                title: '🌐 Media Uploader',
                text: `*How to use:*\n1. Reply to any media\n2. Type .url\n3. Select service\n4. Get shareable link\n\n📁 Max Size: 50MB\n⚡ Supported: Images, Videos, Audio, Documents`,
                footer: 'Professional Media Hosting',
                buttons: [
                    { id: 'btn_url_tutorial', text: '📚 Tutorial' },
                    { id: 'btn_menu_back', text: '🔙 Back' }
                ]
            });
            return;
        }
        
        try {
            let quotedMsg = m.quoted;
            
            if (quotedMsg.message?.viewOnceMessageV2?.message) {
                quotedMsg = {
                    ...quotedMsg,
                    message: quotedMsg.message.viewOnceMessageV2.message
                };
            } else if (quotedMsg.message?.viewOnceMessage?.message) {
                quotedMsg = {
                    ...quotedMsg,
                    message: quotedMsg.message.viewOnceMessage.message
                };
            }
            
            const mediaTypes = ['imageMessage', 'videoMessage', 'audioMessage', 'documentMessage'];
            const hasMedia = mediaTypes.some(type => quotedMsg.message?.[type]);
            
            if (!hasMedia) {
                return m.reply('❌ *No Media Detected*\nPlease reply to an image, video, audio, or document.');
            }
            
            await sendButtons(sock, m.from, {
                title: '⬆️ Media Upload',
                text: `*MEDIA DETECTED*\n\nSelect hosting service:`,
                footer: 'CLOUD AI Professional Hosting',
                buttons: [
                    { id: 'btn_url_tmpfiles', text: '🌐 TmpFiles (1 Hour)' },
                    { id: 'btn_url_catbox', text: '📦 Catbox (Permanent)' },
                    { id: 'btn_url_cancel', text: '❌ Cancel' }
                ]
            });
            
            m.uploadData = { quotedMsg };
            
        } catch (error) {
            console.error('❌ URL Processor Error:', error);
            m.reply('❌ Media processing failed.');
        }
    }
    
    async handleTagallCommand(m, sock) {
        if (!m.isGroup) {
            return m.reply('❌ *Group Command Only*\nThis feature requires group context.');
        }
        
        try {
            const groupMetadata = await sock.groupMetadata(m.from);
            const participants = groupMetadata.participants;
            
            const participant = participants.find(p => p.id === m.sender);
            const botParticipant = participants.find(p => p.id === sock.user.id);
            
            if (!participant?.admin) {
                return m.reply('🔒 *Admin Required*\nOnly group administrators can use this feature.');
            }
            
            if (!botParticipant?.admin) {
                return m.reply('⚠️ *Bot Permission Required*\nI need admin rights to tag all members.');
            }
            
            const admins = participants.filter(p => p.admin);
            const regularMembers = participants.filter(p => !p.admin);
            
            await sendButtons(sock, m.from, {
                title: '🏷️ Group Tag Manager',
                text: `*Group Analysis Complete*\n\n` +
                      `🏷️ **Group:** ${groupMetadata.subject}\n` +
                      `📊 **Members:** ${participants.length}\n` +
                      `👑 **Admins:** ${admins.length}\n` +
                      `👤 **Regular:** ${regularMembers.length}\n\n` +
                      `*Select tagging option:*`,
                footer: 'CLOUD AI Group Management',
                buttons: [
                    { id: 'btn_tag_all', text: '👥 Tag Everyone' },
                    { id: 'btn_tag_admins', text: '👑 Tag Admins Only' },
                    { id: 'btn_tag_regular', text: '👤 Tag Regular Members' },
                    { id: 'btn_tag_cancel', text: '❌ Cancel' }
                ]
            });
            
            m.tagallData = {
                metadata: groupMetadata,
                participants: participants,
                admins: admins,
                regularMembers: regularMembers
            };
            
        } catch (error) {
            console.error('❌ Group Manager Error:', error);
            m.reply('❌ Failed to analyze group.');
        }
    }
    
    async handleViewCommand(m, sock) {
        // REMOVED OWNER CHECK
        if (!m.quoted) {
            await sendButtons(sock, m.from, {
                title: '👁️ Media Viewer',
                text: '*Media Downloader*\n\nReply to a view-once or regular media message with .view',
                footer: 'View and download media',
                buttons: [
                    { id: 'btn_view_info', text: 'ℹ️ How to Use' },
                    { id: 'btn_menu_back', text: '🔙 Back' }
                ]
            });
            return;
        }
        
        try {
            let quotedMsg = m.quoted;
            
            if (quotedMsg.message?.viewOnceMessageV2?.message) {
                quotedMsg = {
                    ...quotedMsg,
                    message: quotedMsg.message.viewOnceMessageV2.message
                };
            } else if (quotedMsg.message?.viewOnceMessage?.message) {
                quotedMsg = {
                    ...quotedMsg,
                    message: quotedMsg.message.viewOnceMessage.message
                };
            }
            
            let mediaType = null;
            let mediaBuffer = null;
            
            if (quotedMsg.message?.imageMessage) {
                mediaType = 'image';
                mediaBuffer = await downloadMediaMessage(quotedMsg, 'buffer', {}, { type: 'image' });
            } else if (quotedMsg.message?.videoMessage) {
                mediaType = 'video';
                mediaBuffer = await downloadMediaMessage(quotedMsg, 'buffer', {}, { type: 'video' });
            } else if (quotedMsg.message?.audioMessage) {
                mediaType = 'audio';
                mediaBuffer = await downloadMediaMessage(quotedMsg, 'buffer', {}, { type: 'audio' });
            } else if (quotedMsg.message?.documentMessage) {
                mediaType = 'document';
                mediaBuffer = await downloadMediaMessage(quotedMsg, 'buffer', {}, { type: 'document' });
            }
            
            if (mediaBuffer) {
                const fileSize = (mediaBuffer.length / (1024 * 1024)).toFixed(2);
                
                await sendButtons(sock, m.from, {
                    title: `📁 ${mediaType.toUpperCase()} Detected`,
                    text: `*Media Details:*\n• Type: ${mediaType}\n• Size: ${fileSize} MB\n• From: @${m.sender.split('@')[0]}`,
                    footer: 'Select action:',
                    buttons: [
                        { id: 'btn_view_download', text: '⬇️ Download' },
                        { id: 'btn_view_info_full', text: '📊 Full Info' },
                        { id: 'btn_view_cancel', text: '❌ Close' }
                    ]
                });
                
                m.mediaData = { 
                    buffer: mediaBuffer, 
                    type: mediaType, 
                    quotedMsg,
                    fileSize 
                };
                
            } else {
                await m.reply('❌ No media found in the quoted message.');
            }
            
        } catch (error) {
            console.error('View Error:', error);
            m.reply('❌ Error processing media.');
        }
    }
    
    async showAutoSettings(m, sock) {
        const currentSettings = this.getAutoSettings();
        
        await sendButtons(sock, m.from, {
            title: '⚙️ Auto Features Settings',
            text: `*Current Settings:*\n\n` +
                  `💬 **Auto Reaction:** ${currentSettings.autoReact ? '✅ ON' : '❌ OFF'}\n` +
                  `🌟 **Auto Status Like:** ${currentSettings.autoStatusReact ? '✅ ON' : '❌ OFF'}\n\n` +
                  `*Select setting to toggle:*`,
            footer: 'CLOUD AI Auto Features',
            buttons: [
                { id: 'btn_autoreact_toggle', text: currentSettings.autoReact ? '💬 Turn OFF Auto React' : '💬 Turn ON Auto React' },
                { id: 'btn_autostatus_toggle', text: currentSettings.autoStatusReact ? '🌟 Turn OFF Status Like' : '🌟 Turn ON Status Like' },
                { id: 'btn_menu_back', text: '🔙 Back' }
            ]
        });
    }
    
    async showSystemStatus(m, sock) {
        const uptime = this.getUptime();
        const memoryUsage = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
        const totalMemory = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2);
        const freeMemory = (os.freemem() / 1024 / 1024 / 1024).toFixed(2);
        
        const status = `📊 *CLOUD AI System Status*\n\n` +
                      `🆔 Session: ${this.sessionId}\n` +
                      `🔌 State: ${this.connectionState}\n` +
                      `⏱️ Uptime: ${uptime}\n` +
                      `🔄 Reconnects: ${this.reconnectAttempts}/${this.maxReconnectAttempts}\n` +
                      `📅 Last Activity: ${this.lastActivity.toLocaleTimeString()}\n` +
                      `💾 Memory: ${memoryUsage} MB\n` +
                      `💿 Total RAM: ${totalMemory} GB\n` +
                      `📦 Free RAM: ${freeMemory} GB\n` +
                      `🔌 Plugins: ${pluginLoader.plugins.size} loaded\n` +
                      `🌐 Node.js: ${process.version}`;
        
        await sendButtons(sock, m.from, {
            title: '📊 System Status',
            text: status,
            footer: 'Real-time system metrics',
            buttons: [
                { id: 'btn_ping', text: '🏓 Ping Test' },
                { id: 'btn_plugins', text: '📦 Plugins' },
                { id: 'btn_menu_back', text: '🔙 Back' }
            ]
        });
    }

    // ==================== BUTTON HANDLER ====================
    
    async handleButtonClick(m, sock, buttonId) {
        console.log(`🎯 Processing button: ${buttonId} by ${m.sender.substring(0, 8)}...`);
        
        let normalizedId = buttonId;
        if (!buttonId.startsWith('btn_')) {
            normalizedId = `btn_${buttonId}`;
        }
        
        await m.React('✅').catch(() => {});
        
        const userId = m.sender;
        
        // ==================== CORE BUTTONS ====================
        if (normalizedId === 'btn_ping') {
            const start = Date.now();
            await m.reply(`🏓 Pong!`);
            const latency = Date.now() - start;
            await sock.sendMessage(m.from, { text: `⏱️ Latency: ${latency}ms` });
            return;
        }
        
        if (normalizedId === 'btn_status') {
            await this.showSystemStatus(m, sock);
            return;
        }
        
        if (normalizedId === 'btn_menu' || normalizedId === 'btn_menu_back') {
            await this.showMainMenu(m, sock);
            return;
        }
        
        if (normalizedId === 'btn_owner') {
            await this.showOwnerInfo(m, sock);
            return;
        }
        
        // ==================== MUSIC BUTTONS ====================
        if (normalizedId === 'btn_play') {
            await this.handlePlayCommand(m, sock, '');
            return;
        }
        
        if (normalizedId === 'btn_music_search') {
            await m.reply('🎵 *Music Search*\n\nType: `.play [song name or artist]`\n\nExamples:\n• .play drake\n• .play shape of you\n• .play afrobeat mix');
            return;
        }
        
        if (normalizedId === 'btn_music_pop') {
            await m.reply('🎤 *Popular Music*\n\nTry these searches:\n• .play taylor swift\n• .play ed sheeran\n• .play ariana grande\n• .play weekend\n• .play drake latest');
            return;
        }
        
        if (normalizedId === 'btn_music_hiphop') {
            await m.reply('🎧 *Hip Hop/Rap*\n\nTry these searches:\n• .play kendrick lamar\n• .play travis scott\n• .play kanye west\n• .play j cole\n• .play eminem');
            return;
        }
        
        if (normalizedId === 'btn_music_afro') {
            await m.reply('🌍 *Afro Beats*\n\nTry these searches:\n• .play burna boy\n• .play wizkid\n• .play davido\n• .play tems\n• .play afrobeats mix');
            return;
        }
        
        // ==================== LOGO BUTTONS ====================
        if (normalizedId === 'btn_logo_menu') {
            await sendButtons(sock, m.from, {
                title: '🎨 Logo Generator',
                text: `*Select logo category:*\n\nOr type directly:\n.logo [style] [text]\nExample: .logo glow CLOUD AI`,
                footer: 'Choose a category or type manually',
                buttons: [
                    { id: 'btn_logo_popular', text: '🎨 Popular' },
                    { id: 'btn_logo_water', text: '🌊 Water' },
                    { id: 'btn_logo_glow', text: '✨ Glow' },
                    { id: 'btn_logo_creative', text: '🎭 Creative' },
                    { id: 'btn_logo_backgrounds', text: '🌌 Backgrounds' },
                    { id: 'btn_logo_special', text: '🎉 Special' }
                ]
            });
            return;
        }
        
        if (normalizedId.startsWith('btn_logo_select_')) {
            const style = normalizedId.replace('btn_logo_select_', '');
            await m.reply(`🎨 *Logo Style Selected:* ${style}\n\nNow type:\n\`\`\`.logo ${style} YOUR TEXT HERE\`\`\`\n\nExample:\n\`\`\`.logo ${style} CLOUD AI BOT\`\`\``);
            return;
        }
        
        const logoCategories = {
            'btn_logo_popular': ['blackpink', 'glow', 'naruto', 'hacker', 'luxury', 'avatar'],
            'btn_logo_water': ['water', 'water3d', 'underwater', 'wetglass', 'bulb'],
            'btn_logo_glow': ['glossysilver', 'gold', 'textlight', 'bokeh'],
            'btn_logo_creative': ['graffiti', 'paint', 'typography', 'rotation', 'digitalglitch'],
            'btn_logo_backgrounds': ['galaxy', 'blood', 'snow', 'thunder', 'sand', 'wall'],
            'btn_logo_special': ['birthdaycake', 'halloween', 'valentine', 'pubg', 'zodiac', 'team']
        };
        
        if (logoCategories[normalizedId]) {
            const categoryName = {
                'btn_logo_popular': 'Popular',
                'btn_logo_water': 'Water Effects',
                'btn_logo_glow': 'Glow Effects',
                'btn_logo_creative': 'Creative',
                'btn_logo_backgrounds': 'Backgrounds',
                'btn_logo_special': 'Special'
            }[normalizedId];
            
            let buttons = logoCategories[normalizedId].map(style => ({
                id: `btn_logo_select_${style}`,
                text: style.charAt(0).toUpperCase() + style.slice(1)
            }));
            
            buttons.push({ id: 'btn_logo_menu', text: '🔙 Back' });
            
            await sendButtons(sock, m.from, {
                title: `🎨 ${categoryName} Logos`,
                text: `*Select a style:*\n\nThen type:\n\`\`\`.logo [style] [your text]\`\`\`\n\nExample:\n.logo ${logoCategories[normalizedId][0]} CLOUD AI`,
                footer: 'Click style, then type command',
                buttons: buttons.slice(0, 6)
            });
            return;
        }
        
        // ==================== VCF BUTTONS ====================
        if (normalizedId === 'btn_vcf') {
            await this.handleVcfCommand(m, sock);
            return;
        }
        
        if (normalizedId === 'btn_vcf_all') {
            if (!m.vcfData) {
                await m.reply('❌ Please run .vcf command first.');
                return;
            }
            await this.exportVCF(m, sock, 'all');
            return;
        }
        
        if (normalizedId === 'btn_vcf_admins') {
            if (!m.vcfData) {
                await m.reply('❌ Please run .vcf command first.');
                return;
            }
            await this.exportVCF(m, sock, 'admins');
            return;
        }
        
        if (normalizedId === 'btn_vcf_cancel') {
            delete m.vcfData;
            await m.reply('✅ VCF export cancelled.');
            return;
        }
        
        // ==================== TAGALL BUTTONS ====================
        if (normalizedId === 'btn_tagall') {
            await this.handleTagallCommand(m, sock);
            return;
        }
        
        if (normalizedId === 'btn_tag_all') {
            if (!m.tagallData) {
                await m.reply('❌ Please run .tagall command first.');
                return;
            }
            await this.tagMembers(m, sock, 'all');
            return;
        }
        
        if (normalizedId === 'btn_tag_admins') {
            if (!m.tagallData) {
                await m.reply('❌ Please run .tagall command first.');
                return;
            }
            await this.tagMembers(m, sock, 'admins');
            return;
        }
        
        if (normalizedId === 'btn_tag_regular') {
            if (!m.tagallData) {
                await m.reply('❌ Please run .tagall command first.');
                return;
            }
            await this.tagMembers(m, sock, 'regular');
            return;
        }
        
        if (normalizedId === 'btn_tag_cancel') {
            delete m.tagallData;
            await m.reply('✅ Tag operation cancelled.');
            return;
        }
        
        // ==================== URL BUTTONS ====================
        if (normalizedId === 'btn_url') {
            await this.handleUrlCommand(m, sock);
            return;
        }
        
        if (normalizedId === 'btn_url_tmpfiles') {
            if (!m.uploadData) {
                await m.reply('❌ Please reply to media first with .url');
                return;
            }
            await this.handleMediaUpload(m, sock, 'tmpfiles');
            return;
        }
        
        if (normalizedId === 'btn_url_catbox') {
            if (!m.uploadData) {
                await m.reply('❌ Please reply to media first with .url');
                return;
            }
            await this.handleMediaUpload(m, sock, 'catbox');
            return;
        }
        
        if (normalizedId === 'btn_url_tutorial') {
            await m.reply(`📚 *Media Upload Tutorial*\n\n1. Reply to any media\n2. Type .url\n3. Select service\n4. Get shareable link\n\n📁 Max Size: 50MB\n🌐 Supported: Images, Videos, Audio, Documents`);
            return;
        }
        
        if (normalizedId === 'btn_url_cancel') {
            delete m.uploadData;
            await m.reply('✅ Upload cancelled.');
            return;
        }
        
        // ==================== VIEW BUTTONS ====================
        if (normalizedId === 'btn_view') {
            await this.handleViewCommand(m, sock);
            return;
        }
        
        if (normalizedId === 'btn_view_download') {
            if (!m.mediaData) {
                await m.reply('❌ No media data found.');
                return;
            }
            await this.downloadMedia(m, sock);
            return;
        }
        
        if (normalizedId === 'btn_view_info_full') {
            if (!m.mediaData) {
                await m.reply('❌ No media data found.');
                return;
            }
            await this.showMediaInfo(m, sock);
            return;
        }
        
        if (normalizedId === 'btn_view_cancel') {
            delete m.mediaData;
            await m.reply('✅ Media viewer closed.');
            return;
        }
        
        // ==================== PAYMENT BUTTONS ====================
        if (normalizedId === 'btn_payment' || normalizedId === 'btn_pay') {
            await this.showOwnerPaymentPanel(m, sock);
            return;
        }
        
        if (normalizedId === 'btn_stk_100') {
            await m.reply('Enter phone number for KES 100 STK:');
            this.userStates.set(m.sender, { 
                waitingFor: 'stk_phone', 
                data: { amount: 100 } 
            });
            return;
        }
        
        if (normalizedId === 'btn_stk_500') {
            await m.reply('Enter phone number for KES 500 STK:');
            this.userStates.set(m.sender, { 
                waitingFor: 'stk_phone', 
                data: { amount: 500 } 
            });
            return;
        }
        
        if (normalizedId === 'btn_stk_1000') {
            await m.reply('Enter phone number for KES 1000 STK:');
            this.userStates.set(m.sender, { 
                waitingFor: 'stk_phone', 
                data: { amount: 1000 } 
            });
            return;
        }
        
        if (normalizedId === 'btn_stk_custom') {
            await m.reply('Enter amount for STK push:');
            this.userStates.set(m.sender, { 
                waitingFor: 'stk_amount' 
            });
            return;
        }
        
        if (normalizedId === 'btn_check_tx') {
            await m.reply('Enter transaction reference:');
            this.userStates.set(m.sender, { 
                waitingFor: 'tx_reference' 
            });
            return;
        }
        
        if (normalizedId === 'btn_payment_dashboard') {
            await this.showPaymentDashboard(m, sock);
            return;
        }
        
        if (normalizedId === 'btn_payment_health') {
            await this.handleBalanceCheck(m, sock);
            return;
        }
        
        if (normalizedId === 'btn_payment_info') {
            await this.showPaymentInfo(m, sock);
            return;
        }
        
        if (normalizedId === 'btn_contact_owner') {
            await m.reply(`📞 *Contact Owner*\n\nPhone: +254116763755\nEmail: beratech00@gmail.com\n\nTap the number to call or copy it.`);
            return;
        }
        
        // ==================== OWNER CONTACT BUTTONS ====================
        if (normalizedId === 'btn_contact_call1') {
            await m.reply('📞 *Call Primary:* +254116763755\n\nTap the number to call or copy it.');
            return;
        }
        
        if (normalizedId === 'btn_contact_call2') {
            await m.reply('📞 *Call Secondary:* +254743982206\n\nTap the number to call or copy it.');
            return;
        }
        
        if (normalizedId === 'btn_contact_email') {
            await m.reply('✉️ *Email:* beratech00@gmail.com\n\nTap to copy or compose email.');
            return;
        }
        
        if (normalizedId === 'btn_contact_whatsapp') {
            await m.reply('💬 *WhatsApp:* https://wa.me/254116763755\n\nTap the link to start a chat.');
            return;
        }
        
        // ==================== AUTO SETTINGS BUTTONS ====================
        if (normalizedId === 'btn_autosettings') {
            await this.showAutoSettings(m, sock);
            return;
        }
        
        if (normalizedId === 'btn_autoreact_toggle') {
            const current = this.getAutoSettings();
            const result = this.toggleAutoReact(!current.autoReact);
            await m.reply(result);
            await this.showAutoSettings(m, sock);
            return;
        }
        
        if (normalizedId === 'btn_autostatus_toggle') {
            const current = this.getAutoSettings();
            const result = this.toggleAutoStatusReact(!current.autoStatusReact);
            await m.reply(result);
            await this.showAutoSettings(m, sock);
            return;
        }
        
        // ==================== PLUGINS BUTTON ====================
        if (normalizedId === 'btn_plugins') {
            const plugins = Array.from(pluginLoader.plugins.keys());
            await m.reply(`📦 *Loaded Plugins (${plugins.length})*\n\n${plugins.map(p => `• .${p}`).join('\n')}`);
            return;
        }
        
        // ==================== DEFAULT ====================
        console.log(`❌ Button "${buttonId}" not implemented`);
        await m.reply(`❌ Button action "${buttonId}" not found.\n\nTry: .menu for commands`);
    }

    // ==================== HELPER METHODS ====================
    
    async handleUserState(m, sock, userState) {
        const userId = m.sender;
        
        switch(userState.waitingFor) {
            case 'stk_phone':
                const phone = m.body.trim();
                const amount = userState.data?.amount || 100;
                await this.processStkPush(m, sock, phone, amount);
                this.userStates.delete(userId);
                break;
                
            case 'stk_amount':
                const amount2 = parseFloat(m.body.trim());
                if (isNaN(amount2)) {
                    await m.reply('❌ Invalid amount. Please enter a number.');
                    return;
                }
                await m.reply(`Enter phone number for KES ${amount2} STK:`);
                this.userStates.set(userId, {
                    waitingFor: 'stk_phone',
                    data: { amount: amount2 }
                });
                break;
                
            case 'tx_reference':
                const reference = m.body.trim();
                await this.checkTransactionStatus(m, sock, reference);
                this.userStates.delete(userId);
                break;
                
            case 'customTagMessage':
                const participants = userState.data?.participants;
                if (participants) {
                    const customMessage = m.body;
                    const mentions = participants.map(p => p.id);
                    
                    const finalMessage = customMessage + 
                        `\n\n🏷️ Tagged by: @${m.sender.split('@')[0]}`;
                    
                    await sock.sendMessage(m.from, {
                        text: finalMessage,
                        mentions: mentions
                    }, { quoted: m });
                }
                this.userStates.delete(userId);
                break;
        }
    }
    
    async exportVCF(m, sock, type) {
        try {
            const { metadata, participants, admins } = m.vcfData;
            let exportParticipants = [];
            let exportType = '';
            
            switch(type) {
                case 'all':
                    exportParticipants = participants;
                    exportType = 'All Contacts';
                    break;
                case 'admins':
                    exportParticipants = admins;
                    exportType = 'Administrators Only';
                    break;
                default:
                    return m.reply('❌ Invalid export type.');
            }
            
            if (exportParticipants.length === 0) {
                return m.reply(`❌ No ${type === 'admins' ? 'administrators' : 'contacts'} found to export.`);
            }
            
            await m.reply(`⏳ Creating VCF file for ${exportParticipants.length} contacts...`);
            await m.React('⏳');
            
            let vcfContent = '';
            
            exportParticipants.forEach(participant => {
                const phoneNumber = participant.id.split('@')[0];
                const name = participant.name || participant.notify || `User_${phoneNumber}`;
                
                vcfContent += `BEGIN:VCARD\n`;
                vcfContent += `VERSION:3.0\n`;
                vcfContent += `FN:${name}\n`;
                vcfContent += `N:${name};;;;\n`;
                
                if (participant.admin) {
                    vcfContent += `ROLE:Administrator\n`;
                    vcfContent += `TITLE:Group Admin\n`;
                }
                
                vcfContent += `TEL;TYPE=CELL,VOICE:+${phoneNumber}\n`;
                vcfContent += `NOTE:Exported from ${metadata.subject} WhatsApp Group\n`;
                vcfContent += `END:VCARD\n\n`;
            });
            
            const tempDir = path.join(__dirname, '..', 'temp');
            await fs.mkdir(tempDir, { recursive: true });
            
            const cleanGroupName = metadata.subject.replace(/[^a-z0-9]/gi, '_').substring(0, 30);
            const timestamp = Date.now();
            const filename = `contacts_${cleanGroupName}_${type}_${timestamp}.vcf`;
            const filePath = path.join(tempDir, filename);
            
            await fs.writeFile(filePath, vcfContent, 'utf8');
            
            const fileStats = await fs.stat(filePath);
            const fileSize = (fileStats.size / 1024).toFixed(2);
            
            await sock.sendMessage(m.from, {
                document: { url: filePath },
                fileName: filename,
                mimetype: 'text/vcard',
                caption: `✅ *Contact Export Complete*\n\n` +
                         `📁 **File:** ${filename}\n` +
                         `🏷️ **Group:** ${metadata.subject}\n` +
                         `📊 **Type:** ${exportType}\n` +
                         `👥 **Exported:** ${exportParticipants.length} contacts\n` +
                         `📦 **Size:** ${fileSize} KB\n` +
                         `📅 **Date:** ${new Date().toLocaleString()}\n\n` +
                         `Powered by CLOUD AI`
            }, { quoted: m });
            
            await m.React('✅');
            
            setTimeout(async () => {
                try {
                    await fs.unlink(filePath);
                } catch (cleanupError) {}
            }, 60000);
            
        } catch (error) {
            console.error('VCF Export Error:', error);
            await m.reply(`❌ Error creating VCF file: ${error.message}`);
            await m.React('❌');
        }
    }
    
    async tagMembers(m, sock, type) {
        try {
            const { metadata, participants, admins, regularMembers } = m.tagallData;
            let targetParticipants = [];
            let tagType = '';
            
            switch(type) {
                case 'all':
                    targetParticipants = participants;
                    tagType = 'All Members';
                    break;
                case 'admins':
                    targetParticipants = admins;
                    tagType = 'Administrators';
                    break;
                case 'regular':
                    targetParticipants = regularMembers;
                    tagType = 'Regular Members';
                    break;
                default:
                    return m.reply('❌ Invalid tag type.');
            }
            
            if (targetParticipants.length === 0) {
                return m.reply(`❌ No ${tagType.toLowerCase()} found to tag.`);
            }
            
            await m.reply(`⏳ Tagging ${targetParticipants.length} members...`);
            await m.React('⏳');
            
            const mentions = targetParticipants.map(p => p.id);
            const mentionTexts = mentions.map(p => `@${p.split('@')[0]}`).join(' ');
            
            const tagMessage = `🔔 *${tagType.toUpperCase()} NOTIFICATION*\n\n` +
                              `Message from: @${m.sender.split('@')[0]}\n` +
                              `Group: ${metadata.subject}\n\n` +
                              `${mentionTexts}\n\n` +
                              `🏷️ Powered by CLOUD AI`;
            
            await sock.sendMessage(m.from, {
                text: tagMessage,
                mentions: mentions
            }, { quoted: m });
            
            await m.React('✅');
            
        } catch (error) {
            console.error('Tag Error:', error);
            await m.reply('❌ Error tagging members.');
            await m.React('❌');
        }
    }
    
    async handleMediaUpload(m, sock, service) {
        try {
            if (!m.uploadData) {
                return m.reply('❌ Please reply to media first with .url');
            }
            
            const { quotedMsg } = m.uploadData;
            
            await m.reply(`⚙️ Uploading to ${service === 'tmpfiles' ? 'TmpFiles.org' : 'Catbox.moe'}...`);
            await m.React('⏳');
            
            const mediaBuffer = await downloadMediaMessage(quotedMsg, 'buffer', {});
            const fileSizeMB = (mediaBuffer.length / (1024 * 1024)).toFixed(2);
            
            if (fileSizeMB > 50) {
                return m.reply(`❌ *File Too Large*\n\nSize: ${fileSizeMB}MB\nLimit: 50MB`);
            }
            
            let uploadUrl = '';
            let serviceName = '';
            
            if (service === 'tmpfiles') {
                serviceName = 'TmpFiles.org';
                const { ext } = await fileTypeFromBuffer(mediaBuffer);
                const form = new FormData();
                form.append('file', mediaBuffer, `cloudai_${Date.now()}.${ext}`);
                
                const response = await fetch('https://tmpfiles.org/api/v1/upload', {
                    method: 'POST',
                    body: form
                });
                
                if (!response.ok) throw new Error('TmpFiles upload failed');
                
                const responseData = await response.json();
                uploadUrl = responseData.data.url.replace('tmpfiles.org/', 'tmpfiles.org/dl/');
                
            } else if (service === 'catbox') {
                serviceName = 'Catbox.moe';
                const form = new FormData();
                form.append('reqtype', 'fileupload');
                form.append('fileToUpload', mediaBuffer, 'file');
                
                const response = await fetch('https://catbox.moe/user/api.php', {
                    method: 'POST',
                    body: form
                });
                
                if (!response.ok) throw new Error('Catbox upload failed');
                
                uploadUrl = await response.text();
            }
            
            const result = `✅ *Upload Successful*\n\n` +
                          `🌐 Service: ${serviceName}\n` +
                          `📁 Size: ${fileSizeMB}MB\n` +
                          `🔗 URL: ${uploadUrl}\n\n` +
                          `Link expires: ${service === 'tmpfiles' ? '1 hour' : 'Permanent'}`;
            
            await sock.sendMessage(m.from, { text: result }, { quoted: m });
            await m.React('✅');
            
            delete m.uploadData;
            
        } catch (error) {
            console.error('Upload Error:', error);
            await m.reply(`❌ Upload failed: ${error.message}`);
            await m.React('❌');
        }
    }
    
    async downloadMedia(m, sock) {
        const { buffer, type, fileSize } = m.mediaData;
        
        try {
            await m.React('⏳');
            
            if (type === 'image') {
                await sock.sendMessage(m.from, {
                    image: buffer,
                    caption: `📷 Downloaded via CLOUD AI\nSize: ${fileSize} MB`
                }, { quoted: m });
            } else if (type === 'video') {
                await sock.sendMessage(m.from, {
                    video: buffer,
                    caption: `🎥 Downloaded via CLOUD AI\nSize: ${fileSize} MB`
                }, { quoted: m });
            } else if (type === 'audio') {
                await sock.sendMessage(m.from, {
                    audio: buffer,
                    mimetype: 'audio/mp4',
                    ptt: false,
                    caption: `🎵 Downloaded via CLOUD AI\nSize: ${fileSize} MB`
                }, { quoted: m });
            }
            
            await m.React('✅');
            
        } catch (error) {
            console.error('Download Error:', error);
            await m.reply('❌ Failed to download media.');
            await m.React('❌');
        }
    }
    
    async showMediaInfo(m, sock) {
        const { type, quotedMsg, fileSize } = m.mediaData;
        let info = `📊 *Media Information*\n\n`;
        info += `• Type: ${type}\n`;
        info += `• Size: ${fileSize} MB\n`;
        
        if (type === 'image' && quotedMsg.message?.imageMessage) {
            info += `• Dimensions: ${quotedMsg.message.imageMessage.width}x${quotedMsg.message.imageMessage.height}\n`;
            info += `• Caption: ${quotedMsg.message.imageMessage.caption || 'None'}\n`;
        } else if (type === 'video' && quotedMsg.message?.videoMessage) {
            info += `• Duration: ${quotedMsg.message.videoMessage.seconds}s\n`;
            info += `• Dimensions: ${quotedMsg.message.videoMessage.width}x${quotedMsg.message.videoMessage.height}\n`;
            info += `• Caption: ${quotedMsg.message.videoMessage.caption || 'None'}\n`;
        }
        
        info += `\n🔒 Downloaded via CLOUD AI`;
        await m.reply(info);
    }
    
    getAutoSettings() {
        return {
            autoReact: this.autoReactEnabled,
            autoStatusReact: this.autoStatusReactEnabled
        };
    }

    extractMessageText(message) {
        if (message.conversation) return message.conversation;
        if (message.extendedTextMessage?.text) return message.extendedTextMessage.text;
        if (message.imageMessage?.caption) return message.imageMessage.caption;
        if (message.videoMessage?.caption) return message.videoMessage.caption;
        if (message.buttonsResponseMessage?.selectedButtonId) return null;
        if (message.listResponseMessage?.selectedRowId) return null;
        return '';
    }

    serializeMessage(message, sock) {
        const m = { ...message };
        
        if (m.key) {
            m.id = m.key.id;
            m.isSelf = m.key.fromMe;
            m.from = this.decodeJid(m.key.remoteJid);
            m.isGroup = m.from.endsWith("@g.us");
            
            if (m.isGroup) {
                m.sender = this.decodeJid(m.key.participant);
            } else if (m.isSelf) {
                m.sender = this.decodeJid(sock.user.id);
            } else {
                m.sender = m.from;
            }
        }
        
        m.pushName = m.pushName || 'User';
        
        // Handle view-once messages
        if (m.message?.viewOnceMessageV2?.message) {
            m.message = m.message.viewOnceMessageV2.message;
            m.isViewOnce = true;
        } else if (m.message?.viewOnceMessage?.message) {
            m.message = m.message.viewOnceMessage.message;
            m.isViewOnce = true;
        }
        
        // Add reply method
        m.reply = (text, options = {}) => {
            return new Promise((resolve) => {
                setTimeout(async () => {
                    try {
                        const result = await sock.sendMessage(m.from, { text }, { quoted: m, ...options });
                        resolve(result);
                    } catch (error) {
                        console.error(`Reply failed:`, error.message);
                        resolve(null);
                    }
                }, 100);
            });
        };
        
        // Add react method
        m.React = (emoji) => {
            return sock.sendMessage(m.from, {
                react: { text: emoji, key: m.key }
            }).catch(() => {});
        };
        
        return m;
    }

    decodeJid(jid) {
        if (!jid) return jid;
        if (/:\d+@/gi.test(jid)) {
            const decode = jidDecode(jid) || {};
            return decode.user && decode.server ? `${decode.user}@${decode.server}` : jid;
        }
        return jid;
    }

    getUptime() {
        const uptime = Date.now() - this.startedAt;
        const hours = Math.floor(uptime / (1000 * 60 * 60));
        const minutes = Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60));
        return `${hours}h ${minutes}m`;
    }

    async sendWelcomeMessage() {
        try {
            const welcomeMsg = `☁️ *CLOUD AI Activated!*\n\n` +
                              `✅ Bot is ready!\n` +
                              `🆔 ${this.sessionId}\n` +
                              `🔧 Prefix: ${process.env.BOT_PREFIX || '.'}\n` +
                              `📢 Use .menu for commands\n\n` +
                              `*Powered by BERA TECH*`;
            
            await this.socket.sendMessage(this.socket.user.id, { text: welcomeMsg });
        } catch (error) {
            // Silent fail
        }
    }

    async reconnect() {
        if (this.isRunning && this.reconnectAttempts < this.maxReconnectAttempts) {
            console.log(`Attempting reconnect for ${this.sessionId}...`);
            try {
                await this.stop();
                await this.start();
            } catch (error) {
                console.error(`Reconnect failed for ${this.sessionId}:`, error.message);
            }
        }
    }

    async stop() {
        this.isRunning = false;
        this.connectionState = 'stopped';
        
        if (this.socket) {
            try {
                await this.socket.ws.close();
            } catch (error) {
                // Ignore close errors
            }
        }
        
        if (global.activeBots && global.activeBots[this.sessionId]) {
            delete global.activeBots[this.sessionId];
        }
        
        this.userStates.clear();
        this.activeUploads.clear();
        
        console.log(`🛑 CLOUD AI bot stopped: ${this.sessionId}`);
    }
}

// ==================== EXPORT FUNCTIONS ====================
async function initializeBotSystem() {
    try {
        console.log('☁️ CLOUD AI system initialized successfully');
        return true;
    } catch (error) {
        console.error('❌ Failed to initialize CLOUD AI system:', error);
        return false;
    }
}

async function startBotInstance(sessionId, authState) {
    const bot = new BotRunner(sessionId, authState);
    await bot.start();
    return bot;
}

function stopBotInstance(sessionId) {
    if (global.activeBots && global.activeBots[sessionId]) {
        global.activeBots[sessionId].instance.stop();
        return true;
    }
    return false;
}

function getActiveBots() {
    return global.activeBots || {};
}

// Initialize global active bots registry
global.activeBots = {};

module.exports = {
    BotRunner,
    startBotInstance,
    stopBotInstance,
    getActiveBots,
    initializeBotSystem
};
