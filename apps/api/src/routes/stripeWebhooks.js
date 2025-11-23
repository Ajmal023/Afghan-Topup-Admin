import express from 'express';
import { Router } from "express";
import { StripeService } from "../services/stripeService.js";

const stripeWebhooksRouter = Router();
const stripeService = new StripeService();

stripeWebhooksRouter.post("/stripe", express.raw({type: 'application/json'}), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    
    console.log('🔔 Webhook received - Headers:', {
        'stripe-signature': sig ? 'present' : 'missing',
        'content-type': req.headers['content-type'],
        'content-length': req.headers['content-length']
    });

    let event;
    
    try {
        const payload = req.body;
        
        console.log('📦 Raw body type:', typeof payload);
        console.log('📦 Raw body buffer:', Buffer.isBuffer(payload));
        console.log('📦 Raw body length:', payload?.length || 0);
        
        if (!Buffer.isBuffer(payload)) {
            console.error('❌ Payload is not a Buffer:', typeof payload);
            return res.status(400).send('Webhook Error: Invalid payload format');
        }
        
        console.log('🔐 Using webhook secret from service');
        
        event = stripeService.stripe.webhooks.constructEvent(
            payload,
            sig,
            "whsec_WwpLqBO5naZjemg87AZ5hxKqr6zn5hgy" 
        );
        
        console.log('✅ Webhook signature verified - Event type:', event.type);
        
    } catch (err) {
        console.error('❌ Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Process the event SYNCHRONOUSLY before sending response
    try {
        console.log(`🔄 Processing event: ${event.type}`);
        
        switch (event.type) {
            case 'payment_intent.succeeded':
                console.log('💰 Payment intent succeeded - Processing...');
                await stripeService.handlePaymentSucceeded(event.data.object);
                console.log('✅ Payment processing completed');
                break;
                
            case 'payment_intent.payment_failed':
                console.log('🔴 PAYMENT FAILED - Processing failure...');
                await stripeService.handlePaymentFailed(event.data.object);
                console.log('✅ Payment failure processed');
                break;
                
            case 'charge.failed':
                console.log('🔴 CHARGE FAILED - Processing failure...');
                // Also handle charge.failed events for additional details
                await stripeService.handleChargeFailed(event.data.object);
                break;
                
            default:
                console.log(`⚡ Unhandled event type: ${event.type}`);
        }
        
        // Send response ONLY AFTER processing is complete
        res.json({received: true, processed: true, eventType: event.type});
        console.log('📤 Webhook response sent');
        
    } catch (error) {
        console.error('❌ Error processing webhook:', error);
        res.status(500).json({received: false, error: error.message});
    }
});

export { stripeWebhooksRouter };