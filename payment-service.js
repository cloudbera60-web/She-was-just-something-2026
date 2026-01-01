const { PayHeroClient } = require('payhero-devkit');

class PaymentService {
    constructor() {
        this.client = null;
        this.initialized = false;
        this.init();
    }
    
    init() {
        try {
            console.log('🔐 Initializing payment service...');
            
            const authToken = process.env.PAYHERO_AUTH_TOKEN || process.env.AUTH_TOKEN;
            const channelId = process.env.CHANNEL_ID || '3342';
            const provider = process.env.DEFAULT_PROVIDER || 'm-pesa';
            
            console.log('📋 Payment Config:');
            console.log('   Token:', authToken ? 'Present (' + authToken.substring(0, 20) + '...)' : 'Missing');
            console.log('   Channel:', channelId);
            console.log('   Provider:', provider);
            
            if (!authToken) {
                console.log('⚠️  Payment system disabled - No auth token in .env');
                console.log('   Add AUTH_TOKEN or PAYHERO_AUTH_TOKEN to .env file');
                return;
            }
            
            this.client = new PayHeroClient({
                authToken: authToken,
                baseURL: process.env.PAYHERO_BASE_URL || 'https://api.payhero.dev',
                environment: process.env.PAYHERO_ENVIRONMENT || 'production'
            });
            
            this.initialized = true;
            console.log('✅ Payment service initialized successfully');
            
            // Test connection
            this.testConnection();
            
        } catch (error) {
            console.error('❌ Payment service init failed:', error.message);
        }
    }
    
    async testConnection() {
        if (!this.initialized) return;
        
        try {
            console.log('🔍 Testing payment connection...');
            const balance = await this.client.serviceWalletBalance();
            console.log('✅ Payment connection test successful');
            console.log('💰 Account balance:', JSON.stringify(balance, null, 2));
        } catch (error) {
            console.error('❌ Payment connection test failed:', error.message);
            console.error('   Check your AUTH_TOKEN and internet connection');
        }
    }
    
    isAvailable() {
        return this.initialized && this.client !== null;
    }
    
    async stkPush(phone, amount, reference = null, customerName = 'CLOUD AI Customer') {
        if (!this.isAvailable()) {
            throw new Error('Payment service not available. Check credentials in .env file.');
        }
        
        // Format phone
        let formattedPhone = phone.toString().trim();
        if (formattedPhone.startsWith('0')) {
            formattedPhone = '254' + formattedPhone.substring(1);
        } else if (formattedPhone.startsWith('+')) {
            formattedPhone = formattedPhone.substring(1);
        }
        
        if (!formattedPhone.startsWith('254') || formattedPhone.length !== 12) {
            throw new Error(`Invalid phone: ${phone}. Use 2547XXXXXXXX or 07XXXXXXXX`);
        }
        
        const amountNum = parseFloat(amount);
        if (isNaN(amountNum) || amountNum <= 0) {
            throw new Error(`Invalid amount: ${amount}. Must be a positive number.`);
        }
        
        const txRef = reference || `BOT-${Date.now().toString().slice(-8)}`;
        
        console.log('💳 Processing STK Push:', {
            phone: formattedPhone,
            amount: amountNum,
            reference: txRef,
            channel: process.env.CHANNEL_ID || '3342',
            provider: process.env.DEFAULT_PROVIDER || 'm-pesa'
        });
        
        try {
            const result = await this.client.stkPush({
                phone_number: formattedPhone,
                amount: amountNum,
                provider: process.env.DEFAULT_PROVIDER || 'm-pesa',
                channel_id: process.env.CHANNEL_ID || '3342',
                external_reference: txRef,
                customer_name: customerName
            });
            
            console.log('✅ STK Push successful:', {
                reference: result.reference || txRef,
                status: result.status,
                message: result.message
            });
            
            return {
                success: true,
                reference: result.reference || txRef,
                message: 'STK push initiated successfully',
                status: result.status || 'pending',
                phone: formattedPhone,
                amount: amountNum,
                timestamp: new Date().toISOString(),
                raw: result
            };
            
        } catch (error) {
            console.error('❌ STK Push failed:', error.message);
            
            // Provide more helpful error messages
            let errorMessage = error.message;
            if (error.message.includes('unauthorized') || error.message.includes('401')) {
                errorMessage = 'Invalid payment credentials. Check AUTH_TOKEN in .env';
            } else if (error.message.includes('network') || error.message.includes('ECONN')) {
                errorMessage = 'Network error. Check internet connection.';
            } else if (error.message.includes('timeout')) {
                errorMessage = 'Payment request timeout. Try again.';
            }
            
            throw new Error(`STK Push failed: ${errorMessage}`);
        }
    }
    
    async checkTransaction(reference) {
        if (!this.isAvailable()) {
            throw new Error('Payment service not available');
        }
        
        if (!reference || reference.trim() === '') {
            throw new Error('Transaction reference is required');
        }
        
        console.log('📊 Checking transaction:', reference);
        
        try {
            const result = await this.client.transactionStatus(reference);
            
            console.log('✅ Transaction status retrieved:', {
                reference: result.reference,
                status: result.status,
                amount: result.amount
            });
            
            return {
                success: true,
                reference: result.reference,
                status: result.status || 'unknown',
                amount: result.amount,
                phone_number: result.phone_number,
                response_code: result.response_code,
                response_description: result.response_description,
                timestamp: result.timestamp || new Date().toISOString(),
                raw: result
            };
            
        } catch (error) {
            console.error('❌ Transaction check failed:', error.message);
            throw new Error(`Transaction check failed: ${error.message}`);
        }
    }
    
    async getBalance() {
        if (!this.isAvailable()) {
            throw new Error('Payment service not available');
        }
        
        console.log('💰 Checking account balance...');
        
        try {
            const result = await this.client.serviceWalletBalance();
            
            console.log('✅ Balance check successful:', {
                balance: result.balance,
                currency: result.currency
            });
            
            return {
                success: true,
                account_id: process.env.CHANNEL_ID || '3342',
                balance: result.balance || '0.00',
                currency: result.currency || 'KES',
                provider: process.env.DEFAULT_PROVIDER || 'm-pesa',
                timestamp: new Date().toISOString(),
                raw: result
            };
            
        } catch (error) {
            console.error('❌ Balance check failed:', error.message);
            throw new Error(`Balance check failed: ${error.message}`);
        }
    }
}

// Create and export singleton instance
let paymentServiceInstance = null;

function createPaymentService() {
    if (!paymentServiceInstance) {
        paymentServiceInstance = new PaymentService();
    }
    return paymentServiceInstance;
}

module.exports = { createPaymentService, PaymentService };
