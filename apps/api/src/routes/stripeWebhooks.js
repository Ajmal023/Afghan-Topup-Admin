import express from 'express';
import { Router } from "express";
import { StripeService } from "../services/stripeService.js";

const stripeWebhooksRouter = Router();
const stripeService = new StripeService();


stripeWebhooksRouter.post("/stripe", express.raw({type: 'application/json'}), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    
    console.log('Webhook received - Headers:', {
        'stripe-signature': sig ? 'present' : 'missing',
        'content-type': req.headers['content-type'],
        'content-length': req.headers['content-length']
    });


    res.on('finish', () => {
        console.log('Webhook response sent');
    });

    let event;
    
    try {
        const payload = req.body;
        
        console.log('Raw body type:', typeof payload);
        console.log('raw body buffer:', Buffer.isBuffer(payload));
        console.log('Raw body length:', payload?.length || 0);
        
        if (!Buffer.isBuffer(payload)) {
            console.error('Payload is not a Buffer:', typeof payload);
            return res.status(400).send('Webhook Error: Invalid payload format');
        }
        
        console.log('Using webhook secret from service');
        
        event = stripeService.stripe.webhooks.constructEvent(
            payload,
            sig,
            "whsec_WwpLqBO5naZjemg87AZ5hxKqr6zn5hgy" 
        );
        
        console.log('Webhook signature verified - Event type:', event.type);
        
    } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }


    try {
        res.json({received: true});
        console.log('Processing event asynchronously:', event.type);
        switch (event.type) {
            case 'payment_intent.succeeded':
                console.log('Payment intent succeeded - Processing...');

                stripeService.handlePaymentSucceeded(event.data.object)
                    .then(() => console.log('Payment processing completed'))
                    .catch(error => console.error('Payment processing failed:', error));
                break;
            case 'payment_intent.payment_failed':
                console.log('Payment intent failed');
                stripeService.handlePaymentFailed(event.data.object)
                    .then(() => console.log('Payment failure processed'))
                    .catch(error => console.error('Payment failure processing failed:', error));
                break;
            default:
                console.log(`Unhandled event type: ${event.type}`);
        }
        
    } catch (error) {
        console.error('Error processing webhook:', error);
    }
});

export { stripeWebhooksRouter };