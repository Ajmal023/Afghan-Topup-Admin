import Stripe from 'stripe';
import { Transaction, ApiSataragan, SataraganBalance, Setting, PromoUse, PromoCode, SetaraganTopup, ProviderConfig } from '../models/index.js';
import axios from 'axios';
import { PromoCodeService } from './promoCodeService.js';
import { sequelize } from '../models/index.js';
import { Topups } from './providers/index.js';

export class StripeService {
    constructor() {
        this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
            apiVersion: '2023-10-16'
        });
        this.promoCodeService = new PromoCodeService();
        this.server = 2;
        this.setaraganProvider = Topups.setaragan;
        this.activeProvider = null;
        this.init();
    }
  
    async init() {
        try {
            const serverSetting = await Setting.findOne({ where: { setting_name: 'server' } });
            if (serverSetting) {
                this.server = parseInt(serverSetting.value);
            }

            await this.loadActiveProvider();
        } catch (error) {
            console.error('Error initializing StripeService:', error);
        }
    }

    async loadActiveProvider() {
        try {
            const activeProviderConfig = await ProviderConfig.findOne({ 
                where: { active: true },
                order: [['createdAt', 'DESC']]
            });

            if (activeProviderConfig) {
                let providerIdentifier = this.extractProviderIdentifier(activeProviderConfig);
                
                if (providerIdentifier && Topups[providerIdentifier]) {
                    this.activeProvider = {
                        config: activeProviderConfig,
                        provider: Topups[providerIdentifier],
                        identifier: providerIdentifier
                    };
                    console.log(`Active provider loaded: ${providerIdentifier} - ${activeProviderConfig.name}`);
                } else {
                    console.log(`Provider not found in Topups: ${providerIdentifier}, using Setaragan as fallback`);
                    this.activeProvider = {
                        config: activeProviderConfig,
                        provider: Topups.setaragan,
                        identifier: 'setaragan'
                    };
                }
            } else {
                console.log('No active provider configured, using Setaragan as default');
                this.activeProvider = {
                    config: null,
                    provider: Topups.setaragan,
                    identifier: 'setaragan'
                };
            }
        } catch (error) {
            console.error('Error loading active provider:', error);
            this.activeProvider = {
                config: null,
                provider: Topups.setaragan,
                identifier: 'setaragan'
            };
        }
    }

    extractProviderIdentifier(providerConfig) {
        if (providerConfig.provider && providerConfig.provider !== 'topup') {
            return providerConfig.provider.toLowerCase();
        }
        
        if (providerConfig.name) {
            const name = providerConfig.name.toLowerCase();
            if (name.includes('setaragan') || name.includes('setargan')) {
                return 'setaragan';
            } else if (name.includes('hesabpay') || name.includes('hesab')) {
                return 'hesabpay';
            } else if (name.includes('awcc')) {
                return 'awcc';
            }
        }

        return 'setaragan';
    }

    stripQuotes(text) {
        return text.replace(/^(\'(.*)\'|"(.*)")$/, '$2$3');
    }

    getPhoneNumberCategory(phoneNumber) {
        return this.setaraganProvider.detectOperator(phoneNumber) || '1';
    }

    async sendToActiveProvider(transaction) {
        try {
            await this.loadActiveProvider();

            const { provider, identifier } = this.activeProvider;

            console.log(`Sending to active provider (${identifier}) - Transaction:`, {
                phone_number: transaction.phone_number,
                value: transaction.value,
                transaction_id: transaction.id
            });

            const result = await provider.topup({
                order: { id: transaction.id },
                item: {
                    msisdn: transaction.phone_number,
                    unit_price_minor: parseFloat(transaction.value)
                },
                variant: {
                    amount_minor: parseFloat(transaction.value)
                },
                externalId: transaction.id.toString()
            });

            console.log(`${identifier} provider response:`, result);

            return this.mapProviderResponse(transaction, result, identifier);

        } catch (error) {
            console.error(`Error sending to active provider:`, {
                message: error.message,
                response: error.response?.data,
                status: error.response?.status
            });

            console.log('Falling back to Setaragan due to provider error');
            return await this.sendToSataragan(transaction);
        }
    }
mapProviderResponse(transaction, result, providerName) {
    console.log('Mapping provider response for:', providerName, result);
    

    const providerTxnId = result.provider_txn_id || result.hesab_transaction_id || result.setaragan_txn_id;
    const hesabTransactionId = result.hesab_transaction_id;
    const setaraganTxnId = result.setaragan_txn_id;
    

    let currentBalance = result.current_balance;
    if (!currentBalance && result.response && result.response.data && result.response.data.current_balance) {
        currentBalance = result.response.data.current_balance;
    }
    
    console.log('Extracted transaction IDs:', {
        providerTxnId,
        hesabTransactionId,
        setaraganTxnId,
        currentBalance,
        hasProviderTxnId: !!result.provider_txn_id,
        hasHesabTxnId: !!result.hesab_transaction_id,
        hasSetaraganTxnId: !!result.setaragan_txn_id
    });

    const baseResponse = {
        provider: providerName,
        status: result.status,
        provider_txn_id: providerTxnId,
        hesab_transaction_id: hesabTransactionId,
        setaragan_txn_id: setaraganTxnId,
        current_balance: currentBalance, 
        data: {
            status: this.mapProviderStatus(result.status),
            txn_id: providerTxnId || transaction.id.toString(),
            amount: transaction.value,
            customer_mobile: transaction.phone_number,
            commission: "0.0",
            message: result.error_message || result.message || this.getStatusMessage(result.status),
            api_txn_id: hesabTransactionId || setaraganTxnId || providerTxnId || "0",
            current_balance: currentBalance || "0",
            request_id: transaction.id.toString()
        },
        originalResult: result
    };

    console.log('Mapped base response:', {
        provider: baseResponse.provider,
        status: baseResponse.status,
        provider_txn_id: baseResponse.provider_txn_id,
        hesab_transaction_id: baseResponse.hesab_transaction_id,
        setaragan_txn_id: baseResponse.setaragan_txn_id,
        current_balance: baseResponse.current_balance
    });

    if (result.status === "success" || result.status === "accepted") {
        return {
            status: '1',
            data: baseResponse.data,
            provider: providerName,
            provider_txn_id: providerTxnId,
            hesab_transaction_id: hesabTransactionId,
            setaragan_txn_id: setaraganTxnId,
            current_balance: currentBalance,
            originalResult: result
        };
    } else {
        return {
            status: '0',
            data: {
                status: "Failed",
                message: result.error_message || "Transaction failed",
                request_id: transaction.id.toString()
            },
            provider: providerName,
            provider_txn_id: providerTxnId,
            hesab_transaction_id: hesabTransactionId,
            setaragan_txn_id: setaraganTxnId,
            current_balance: currentBalance,
            originalResult: result
        };
    }
}
    mapProviderStatus(providerStatus) {
        const statusMap = {
            'success': 'Success',
            'accepted': 'INPROCESS',
            'failed': 'Failed',
            'pending': 'INPROCESS'
        };
        return statusMap[providerStatus] || 'INPROCESS';
    }

    getStatusMessage(status) {
        const messageMap = {
            'success': 'Transaction is Successful',
            'accepted': 'Transaction is IN-PROCESS',
            'failed': 'Transaction failed',
            'pending': 'Transaction is pending'
        };
        return messageMap[status] || 'Transaction is being processed';
    }

    async sendToSataragan(transaction) {
        try {
            console.log('Sending to Sataragan via Provider - Transaction:', {
                phone_number: transaction.phone_number,
                value: transaction.value,
                transaction_id: transaction.id
            });

            const result = await this.setaraganProvider.topup({
                order: { id: transaction.id },
                item: {
                    msisdn: transaction.phone_number,
                    unit_price_minor: parseFloat(transaction.value)
                },
                variant: {
                    amount_minor: parseFloat(transaction.value)
                },
                externalId: transaction.id.toString()
            });

            console.log('Sataragan provider response:', result);

            if (result.status === "success" || result.status === "accepted") {
                return {
                    status: '1',
                    data: {
                        status: result.status === "success" ? "Success" : "INPROCESS",
                        txn_id: result.provider_txn_id || result.setaragan_txn_id || transaction.id.toString(),
                        amount: transaction.value,
                        customer_mobile: transaction.phone_number,
                        commission: "0.0",
                        message: result.status === "success" ? "Transaction is Successful" : "Transaction is IN-PROCESS",
                        api_txn_id: result.operator_txn_id || result.setaragan_txn_id || "0",
                        current_balance: result.current_balance || "0",
                        request_id: transaction.id.toString()
                    },
                    provider: 'setaragan',
                    provider_txn_id: result.provider_txn_id,
                    setaragan_txn_id: result.setaragan_txn_id
                };
            } else {
                return {
                    status: '0',
                    data: {
                        status: "Failed",
                        message: result.error_message || "Transaction failed",
                        request_id: transaction.id.toString()
                    },
                    provider: 'setaragan',
                    provider_txn_id: result.provider_txn_id,
                    setaragan_txn_id: result.setaragan_txn_id
                };
            }

        } catch (error) {
            console.error('Error sending to Sataragan via provider:', {
                message: error.message,
                response: error.response?.data,
                status: error.response?.status
            });

            return {
                status: '0',
                data: {
                    status: "Failed",
                    message: error.message || "API Error",
                    request_id: transaction.id.toString()
                },
                provider: 'setaragan'
            };
        }
    }

async processTransaction(transaction, dbTransaction = null) {
    try {
       console.log('Processing transaction:', {
            id: transaction.id,
            amount: transaction.amount,
            currency: transaction.currency, 
            status: transaction.status
        });
        
       
        if (transaction.status === "Paid" || transaction.status === "Confirmed") {
            console.log('Transaction already processed, skipping provider call:', transaction.id);
            return;
        }
        
        await transaction.update({
            status: "Paid",
            stripe_status: 'succeeded',
            output: this.server
        }, { transaction: dbTransaction });

        console.log('Transaction updated to Paid:', transaction.id);

        if (this.server == 2) {
            console.log('Server is 2 - Sending to active provider');
            
        
            const existingProviderRecord = await ApiSataragan.findOne({
                where: { transaction_id: transaction.id }
            });

            if (existingProviderRecord) {
                console.log('Provider already called for transaction, skipping duplicate call:', transaction.id);
                
        
                let output = 1;
                if (existingProviderRecord.status === 'Success' || existingProviderRecord.status === 'INPROCESS') {
                    output = 2;
                }
                
                await transaction.update({ output }, { transaction: dbTransaction });
                console.log(`Transaction ${transaction.id} output set to: ${output} based on existing provider record`);
                
            } else {
                const providerResult = await this.sendToActiveProvider(transaction);
                
                if (providerResult.status === '1') {
                    console.log('Provider processing successful');
                    
                    await this.recordProviderTransaction(transaction, providerResult, dbTransaction);

                    let output = 1; 
                    
                    if (providerResult.provider === 'setaragan') {
                        if (providerResult.data?.status === 'Success') {
                            output = 2; 
                        } else if (providerResult.data?.status === 'INPROCESS') {
                            output = 2; 
                        } else {
                            output = 1;
                        }
                    } else if (providerResult.provider === 'hesabpay') {
                        if (providerResult.status === 'accepted' || providerResult.status === 'success') {
                            output = 2;
                        } else {
                            output = 1; 
                        }
                    }
                    
           
                    await transaction.update({ output }, { transaction: dbTransaction });
                    console.log(`Transaction ${transaction.id} output set to: ${output} (${output === 2 ? 'External Provider' : 'Internal Processing'})`);

         
                    if (output === 2 && providerResult.data?.status === 'INPROCESS') {
                        console.log('Scheduling status check for pending external transaction');
                        setTimeout(() => {
                            this.checkProviderStatus(transaction, providerResult);
                        }, 30000);
                    }
                    
                } else {
                    console.log('Provider processing failed, set to internal processing');
                    await transaction.update({ output: 1 }, { transaction: dbTransaction });
                }
            }
        } else {
            console.log('Server is not 2, skipping provider call');
            await transaction.update({ output: 1 }, { transaction: dbTransaction });
        }

        if (transaction.output == 1) {
            console.log('Sending notification for internal order:', transaction.id);
            await this.sendNotification(transaction);
        }

        console.log('Transaction processing completed:', transaction.id);

    } catch (error) {
        console.error('Error processing transaction:', error);

        await transaction.update({ 
            status: "Failed",
            output: 1 
        }, { transaction: dbTransaction });
    }
}

    async recordProviderTransaction(transaction, providerResult, dbTransaction = null) {
        try {
            const providerName = providerResult.provider || 'hesabpay';
            
            console.log(`Recording transaction for provider: ${providerName}`, {
                transaction_id: transaction.id,
                provider_txn_id: providerResult.hesab_transaction_id || providerResult.provider_txn_id || providerResult.setaragan_txn_id,
                status: providerResult.data?.status
            });

        
            if (providerName === 'hesabpay') {
                await this.createHesabPayRecord(transaction, providerResult, dbTransaction);
            } 
        
            else if (providerName === 'setaragan') {
                await this.createSetaraganRecords(transaction, providerResult, dbTransaction);
            }

            else {
                await ApiSataragan.create({
                    status: providerResult.data?.status || "INPROCESS",
                    txn_id: providerResult.hesab_transaction_id || providerResult.provider_txn_id || providerResult.setaragan_txn_id,
                    amount: transaction.value,
                    customer_mobile: transaction.phone_number,
                    commission: "0.0",
                    message: providerResult.data?.message || providerResult.message || "Transaction processed",
                    api_txn_id: providerResult.hesab_transaction_id || providerResult.provider_txn_id || providerResult.setaragan_txn_id,
                    date: new Date(),
                    request_id: transaction.id.toString(),
                    transaction_id: transaction.id,
                    provider: providerName 
                }, { transaction: dbTransaction });
            }

            console.log(`Provider transaction recorded successfully for: ${providerName}`);

        } catch (error) {
            console.error('Error recording provider transaction:', error);
            throw error;
        }
    }

async createSetaraganRecords(transaction, providerResult, dbTransaction = null) {
    try {
        console.log('Creating Setaragan records for transaction:', transaction.id);
        
        const providerTxnId = providerResult.setaragan_txn_id || providerResult.provider_txn_id;
        
     
        let currentBalance = 0;
        if (providerResult.originalResult && providerResult.originalResult.current_balance) {
            currentBalance = parseFloat(providerResult.originalResult.current_balance);
        } else if (providerResult.current_balance) {
            currentBalance = parseFloat(providerResult.current_balance);
        } else if (providerResult.response && providerResult.response.data && providerResult.response.data.current_balance) {
            currentBalance = parseFloat(providerResult.response.data.current_balance);
        }
        
        const amount = parseFloat(transaction.value) || 0;
        const previousBalance = currentBalance + amount;
        
        console.log('Setaragan transaction details:', {
            providerTxnId,
            currentBalance,
            amount,
            previousBalance,
            setaraganTxnId: providerResult.setaragan_txn_id,
            originalResultCurrentBalance: providerResult.originalResult?.current_balance,
            responseDataCurrentBalance: providerResult.response?.data?.current_balance
        });

 
        const setaraganData = {
            status: providerResult.data?.status || "INPROCESS",
            txn_id: providerTxnId || transaction.id.toString(),
            amount: transaction.value,
            customer_mobile: transaction.phone_number,
            commission: "0.0",
            message: providerResult.data?.message || providerResult.message || "Transaction processed",
            api_txn_id: providerResult.operator_txn_id || providerTxnId || transaction.id.toString(),
            date: new Date(),
            request_id: transaction.id.toString(),
            transaction_id: transaction.id,
            provider: 'setaragan',
            setaragan_txn_id: providerResult.setaragan_txn_id,
            current_balance: currentBalance.toString(),
            original_response: JSON.stringify(providerResult.originalResult || providerResult)
        };

        console.log('Creating ApiSataragan record:', {
            txn_id: setaraganData.txn_id,
            api_txn_id: setaraganData.api_txn_id,
            setaragan_txn_id: setaraganData.setaragan_txn_id,
            current_balance: setaraganData.current_balance
        });

        await ApiSataragan.create(setaraganData, { transaction: dbTransaction });

  
        console.log('Creating SetaraganTopup record...');
        const setaraganTopupData = {
            transaction_id: transaction.id,
            customer_mobile: transaction.phone_number,
            uid: transaction.uid,
            amount: amount,
            txn_id: providerTxnId || transaction.id.toString(),
            status: providerResult.data?.status || "INPROCESS",
            current_balance: currentBalance,
            previous_balance: previousBalance,
            request_id: transaction.id.toString(),
            commission: parseFloat(providerResult.data?.commission) || 0,
            message: providerResult.data?.message || providerResult.message || "Transaction processed",
            api_txn_id: providerResult.operator_txn_id || providerTxnId || transaction.id.toString(),
            operator_id: this.getPhoneNumberCategory(transaction.phone_number),
            msisdn: process.env.SETARAGAN_MSISDN || '799042042',
            response_data: providerResult.originalResult || providerResult
        };

        console.log('SetaraganTopup record data:', {
            transaction_id: setaraganTopupData.transaction_id,
            amount: setaraganTopupData.amount,
            previous_balance: setaraganTopupData.previous_balance,
            current_balance: setaraganTopupData.current_balance,
            txn_id: setaraganTopupData.txn_id
        });

        const setaraganTopup = await SetaraganTopup.create(setaraganTopupData, { transaction: dbTransaction });

        console.log('SetaraganTopup record created with ID:', setaraganTopup.id);


        console.log('Updating Sataragan balance...');
        await this.updateSataraganBalance({
            current_balance: currentBalance.toString(),
            amount: amount.toString(),
            customer_mobile: transaction.phone_number,
            message: providerResult.data?.message || "Transaction processed",
            txn_id: providerTxnId
        }, transaction, dbTransaction);

        console.log('All Setaragan records created successfully for transaction:', transaction.id);

    } catch (error) {
        console.error('Error creating Setaragan records:', error);
        throw error;
    }
}

    async createHesabPayRecord(transaction, providerResult, dbTransaction = null) {
        try {
            console.log('Creating HesabPay transaction record for transaction:', transaction.id);
            
            const providerTxnId = providerResult.hesab_transaction_id || providerResult.provider_txn_id;
            const hesabTransactionId = providerResult.hesab_transaction_id;
            
            console.log('Transaction IDs for HesabPay record:', {
                providerTxnId,
                hesabTransactionId
            });

            const hesabTransactionData = {
                status: providerResult.data?.status || "INPROCESS",
                txn_id: providerTxnId || transaction.id.toString(),
                amount: transaction.value,
                customer_mobile: transaction.phone_number,
                commission: "0.0",
                message: providerResult.data?.message || providerResult.message || "Top Up in Progress",
                api_txn_id: hesabTransactionId || providerTxnId || transaction.id.toString(),
                date: new Date(),
                request_id: transaction.id.toString(),
                transaction_id: transaction.id,
                provider: 'hesabpay',
                hesab_transaction_id: hesabTransactionId,
                rrn: transaction.id.toString(),
                original_response: JSON.stringify(providerResult.originalResult || providerResult)
            };

            console.log('HesabPay record data with proper IDs:', {
                txn_id: hesabTransactionData.txn_id,
                api_txn_id: hesabTransactionData.api_txn_id,
                hesab_transaction_id: hesabTransactionData.hesab_transaction_id
            });

            await ApiSataragan.create(hesabTransactionData, { transaction: dbTransaction });

            console.log('HesabPay transaction record created successfully');

        } catch (error) {
            console.error('Error creating HesabPay record:', error);
            throw error;
        }
    }

    async updateSataraganBalance(responseData, transaction, dbTransaction = null) {
        try {
            console.log('Starting balance update with response data:', responseData);
            
            const currentBalance = parseFloat(responseData.current_balance) || 0;
            const amount = parseFloat(responseData.amount) || 0;
            
            const previousBalance = currentBalance + amount;
            
            console.log('Balance calculation:', {
                currentBalance,
                amount,
                previousBalance,
                calculated: previousBalance - amount 
            });

            const newBalanceRecord = await SataraganBalance.create({
                current_balance: currentBalance,
                previous_balance: previousBalance, 
                transaction_id: transaction.id,
                topup_id: responseData.txn_id || transaction.id.toString(),
                amount: amount,
                type: 'debit',
                notes: `Topup for ${responseData.customer_mobile} - ${responseData.message || 'Success'}`
            }, { transaction: dbTransaction });
            
            console.log('New Sataragan balance record created:', {
                id: newBalanceRecord.id,
                previous_balance: newBalanceRecord.previous_balance,
                current_balance: newBalanceRecord.current_balance,
                amount: newBalanceRecord.amount,
                transaction_id: newBalanceRecord.transaction_id
            });
            
            return newBalanceRecord;
        } catch (error) {
            console.error('❌ Error updating Sataragan balance:', error);
            throw error;
        }
    }

    async checkProviderStatus(transaction, providerResult) {
        try {
            await this.loadActiveProvider();

            const { provider, identifier } = this.activeProvider;

            if (!provider.checkStatus) {
                console.log(`Provider ${identifier} does not support status checks`);
                return;
            }

            console.log(`Checking status with ${identifier} for transaction:`, transaction.id);
            console.log('Provider result for status check:', {
                provider_txn_id: providerResult.provider_txn_id,
                hesab_transaction_id: providerResult.hesab_transaction_id,
                setaragan_txn_id: providerResult.setaragan_txn_id,
                originalResult: providerResult.originalResult
            });

            let statusResult;
            try {
                if (identifier === 'hesabpay') {
                    const transactionId = providerResult.hesab_transaction_id || providerResult.provider_txn_id;
                    console.log(`Using transaction ID for HesabPay status check: ${transactionId}`);
                    
                    statusResult = await provider.checkStatus(
                        transaction.id.toString(), 
                        transactionId 
                    );
                } else if (identifier === 'setaragan') {
                    statusResult = await provider.checkStatus(
                        transaction.id.toString(),
                        transaction.phone_number,
                        parseFloat(transaction.value),
                        this.getPhoneNumberCategory(transaction.phone_number)
                    );
                } else {
                    statusResult = await provider.checkStatus(
                        transaction.id.toString(),
                        providerResult.provider_txn_id
                    );
                }
            } catch (error) {
                console.log(`Status check error for ${identifier}:`, error.message);
                return;
            }

            console.log(`${identifier} status check result:`, statusResult);

            switch (statusResult.status) {
                case "success":
                    await this.handleSuccessfulStatus(transaction, statusResult, identifier);
                    break;
                    
                case "accepted":
                case "pending":
                    await this.handlePendingStatus(transaction, statusResult, identifier);
                    setTimeout(() => {
                        this.checkProviderStatus(transaction, providerResult);
                    }, 30000);
                    break;
                    
                case "failed":
                    await this.handleFailedStatus(transaction, statusResult, identifier);
                    break;
                    
                default:
                    console.log(`Unknown status: ${statusResult.status}`);
            }

        } catch (error) {
            console.error('Error checking provider status:', error);
        }
    }

    async handleSuccessfulStatus(transaction, statusResult, providerName) {
        console.log(`Transaction ${transaction.id} confirmed as successful by ${providerName}`);
        
        await transaction.update({ 
            status: "Confirmed",
            output: 2 
        });

        try {
            const updateResult = await ApiSataragan.update({
                status: "Success",
                message: statusResult.message || "Transaction confirmed via status check"
            }, { 
                where: { 
                    transaction_id: transaction.id,
                    provider: providerName
                } 
            });

            if (updateResult[0] === 0) {
                console.log(`No records found with provider ${providerName}, updating any record for transaction ${transaction.id}`);
                await ApiSataragan.update({
                    status: "Success",
                    message: statusResult.message || "Transaction confirmed via status check"
                }, { 
                    where: { 
                        transaction_id: transaction.id
                    } 
                });
            }
            
            console.log(`Transaction ${transaction.id} marked as Confirmed`);
        } catch (error) {
            console.error(`Error updating ApiSataragan for transaction ${transaction.id}:`, error.message);
        }
    }

    async handlePendingStatus(transaction, statusResult, providerName) {
        console.log(`Transaction ${transaction.id} is still processing with ${providerName}`);
        
        await transaction.update({ 
            status: "Paid" 
        });

        try {
            const updateResult = await ApiSataragan.update({
                status: "INPROCESS",
                message: statusResult.message || statusResult.error_message || "Transaction is being processed"
            }, { 
                where: { 
                    transaction_id: transaction.id,
                    provider: providerName
                } 
            });

            if (updateResult[0] === 0) {
                await ApiSataragan.update({
                    status: "INPROCESS",
                    message: statusResult.message || statusResult.error_message || "Transaction is being processed"
                }, { 
                    where: { 
                        transaction_id: transaction.id
                    } 
                });
            }
            
            console.log(`Transaction ${transaction.id} status updated to processing`);
        } catch (error) {
            console.error(`Error updating ApiSataragan status for transaction ${transaction.id}:`, error.message);
        }
    }

    async handleFailedStatus(transaction, statusResult, providerName) {
        console.log(`Transaction ${transaction.id} failed with ${providerName}`);
        
        await transaction.update({ 
            status: "Failed",
            output: 1 
        });

        try {
            const updateResult = await ApiSataragan.update({
                status: "Failed",
                message: statusResult.error_message || "Transaction failed"
            }, { 
                where: { 
                    transaction_id: transaction.id,
                    provider: providerName
                } 
            });

            if (updateResult[0] === 0) {
                await ApiSataragan.update({
                    status: "Failed",
                    message: statusResult.error_message || "Transaction failed"
                }, { 
                    where: { 
                        transaction_id: transaction.id
                    } 
                });
            }
            
            console.log(`Transaction ${transaction.id} marked as Failed`);
        } catch (error) {
            console.error(`Error updating ApiSataragan failure for transaction ${transaction.id}:`, error.message);
        }
    }

    async safeUpdateTransaction(transaction, status, output) {
        try {
            const validStatuses = ['Pending', 'Paid', 'Confirmed', 'failed'];
            const safeStatus = validStatuses.includes(status) ? status : 'failed';
            
            console.log(`Updating transaction ${transaction.id} to status: ${safeStatus}, output: ${output}`);
            await transaction.update({ 
                status: safeStatus,
                output: output 
            });
            
            console.log(`Transaction ${transaction.id} updated successfully to ${safeStatus}`);
        } catch (error) {
            console.error(`Error updating transaction status to ${status}:`, error.message);
            
            if (status !== 'Failed') {
                try {
                    await transaction.update({ 
                        status: 'Failed',
                        output: output 
                    });
                    console.log(`Transaction ${transaction.id} updated to Failed as fallback`);
                } catch (fallbackError) {
                    console.error('Even fallback update failed:', fallbackError.message);
                }
            }
        }
    }

    async processSataragan(transaction, dbTransaction = null) {
        try {
            const result = await this.sendToSataragan(transaction);
            
            console.log('Sataragan provider result:', result);

            if (result.status === '1') {
                const responseData = result.data;
                
                console.log('Creating ApiSataragan record with data:', responseData);

                await ApiSataragan.create({
                    status: responseData.status,
                    txn_id: responseData.txn_id,
                    amount: responseData.amount,
                    customer_mobile: responseData.customer_mobile,
                    commission: responseData.commission,
                    message: responseData.message,
                    api_txn_id: responseData.api_txn_id,
                    date: new Date(),
                    request_id: responseData.request_id,
                    transaction_id: transaction.id,
                    provider: 'setaragan'
                }, { transaction: dbTransaction });

                console.log('ApiSataragan record created');

                console.log('Creating SetaraganTopup record...');
                await this.createSetaraganTopupRecord(transaction, responseData, dbTransaction);

                console.log('Updating Sataragan balance...');
                await this.updateSataraganBalance(responseData, transaction, dbTransaction);

                console.log('Setaragan topup record and balance updated');

                if (responseData.status === 'INPROCESS') {
                    setTimeout(() => {
                        this.checkSataraganStatus(transaction, responseData);
                    }, 30000);
                }
            } else {
                console.log('Sataragan failed, set to internal processing');
                await transaction.update({ output: 1 }, { transaction: dbTransaction });
            }
        } catch (sataraganError) {
            console.error('Error in processSataragan:', sataraganError);
            await transaction.update({ output: 1 }, { transaction: dbTransaction });
            throw sataraganError; 
        }
    }

    async checkSataraganStatus(transaction, responseData) {
        try {
            console.log('Checking Sataragan status for transaction:', transaction.id);
            
            const statusResult = await this.setaraganProvider.checkStatus(
                transaction.id.toString(),
                transaction.phone_number,
                parseFloat(transaction.value),
                this.getPhoneNumberCategory(transaction.phone_number)
            );

            console.log('Sataragan status check result:', statusResult);

            if (statusResult.status === "success") {
                await transaction.update({ 
                    status: "Confirmed",
                    output: 2 
                });

                await ApiSataragan.update({
                    status: "Success",
                    message: "Transaction confirmed via status check"
                }, { where: { transaction_id: transaction.id } });
                
            } else if (statusResult.status === "failed") {
                await transaction.update({ 
                    status: "Failed",
                    output: 1 
                });
            }

        } catch (error) {
            console.error('Error checking Sataragan status:', error);
        }
    }

    async createSetaraganTopupRecord(transaction, responseData, dbTransaction = null) {
        try {
            console.log('Starting createSetaraganTopupRecord for transaction:', transaction.id);
            console.log('Response data received:', JSON.stringify(responseData, null, 2));
            
            let previousBalance = 0;
            const currentBalance = parseFloat(responseData.current_balance) || 0;
            const amount = parseFloat(responseData.amount) || 0;
            
            previousBalance = currentBalance + amount;
            
            console.log('Calculated previous balance:', {
                currentBalance,
                amount,
                calculatedPrevious: previousBalance
            });

            const setaraganTopup = await SetaraganTopup.create({
                transaction_id: transaction.id,
                customer_mobile: responseData.customer_mobile,
                uid: transaction.uid,
                amount: amount,
                txn_id: responseData.txn_id,
                status: responseData.status,
                current_balance: currentBalance,
                previous_balance: previousBalance, 
                request_id: responseData.request_id,
                commission: parseFloat(responseData.commission) || 0,
                message: responseData.message,
                api_txn_id: responseData.api_txn_id,
                operator_id: this.getPhoneNumberCategory(transaction.phone_number),
                msisdn: '730302030',
                response_data: responseData
            }, { transaction: dbTransaction });

            console.log('SetaraganTopup record created with balances:', {
                id: setaraganTopup.id,
                transaction_id: transaction.id,
                amount: amount,
                previous_balance: previousBalance,
                current_balance: currentBalance,
                txn_id: responseData.txn_id
            });

            return setaraganTopup;
        } catch (error) {
            console.error('Error creating SetaraganTopup record:', error);
            throw error;
        }
    }

    async getActiveProviderBalance() {
        try {
            await this.loadActiveProvider();

            const { provider, identifier } = this.activeProvider;

            if (!provider.getBalance) {
                console.log(`Provider ${identifier} does not support balance checks, using Setaragan`);
                return await this.getSetaraganBalance();
            }

            console.log(`Getting balance from ${identifier}`);
            const balanceResult = await provider.getBalance();
            
            if (balanceResult.status === "success") {
                return {
                    success: true,
                    provider: identifier,
                    balance: balanceResult.balance,
                    message: balanceResult.message
                };
            } else {
                return {
                    success: false,
                    error: balanceResult.error_message
                };
            }
        } catch (error) {
            console.error('Error getting provider balance:', error);
            return await this.getSetaraganBalance();
        }
    }

    async paymentIntent2(request) {
        const { uid, phone_number, amount, currency = 'USD', real_amount, value, promo_code } = request.body;
        console.log('Creating payment intent:', {
            uid, phone_number, amount, currency, real_amount, value, promo_code
        });

        const transaction = await sequelize.transaction();
        try {
            let finalAmount = parseFloat(amount);
            let discountAmount = 0;
            let appliedPromoCode = null;

            if (promo_code) {
                const validation = await this.promoCodeService.validatePromoCode(
                    promo_code, uid, finalAmount
                );

                if (validation.valid) {
                    const discountCalc = this.promoCodeService.calculateDiscount(
                        validation.promoCode, finalAmount
                    );
                    
                    discountAmount = discountCalc.discount;
                    finalAmount = discountCalc.finalAmount;
                    appliedPromoCode = validation.promoCode;

                    console.log('Promo code applied:', {
                        code: promo_code,
                        discount: discountAmount,
                        finalAmount: finalAmount
                    });
                } else {
                    await transaction.rollback();
                    return {
                        success: false,
                        error: validation.error
                    };
                }
            }

            const customers = await this.stripe.customers.search({
                query: `name:"${this.stripQuotes(uid)}"`,
            });

            let customer;
            if (customers.data.length === 0) {
                customer = await this.stripe.customers.create({
                    description: phone_number,
                    name: uid,
                    metadata: { uid, phone_number } 
                });
                console.log('New customer created:', customer.id);
            } else {
                customer = customers.data[0];
                console.log('Existing customer found:', customer.id);
            }

            const ephemeralKey = await this.stripe.ephemeralKeys.create(
                { customer: customer.id },
                { apiVersion: '2023-10-16' }
            );
            console.log(ephemeralKey, "EPH")

            console.log('Ephemeral key created');

            const paymentIntent = await this.stripe.paymentIntents.create({
                amount: Math.round(finalAmount * 100),
                currency: currency,
                customer: customer.id,
                description: `${uid} - ${phone_number}`,
                automatic_payment_methods: { enabled: true },
                metadata: {
                    uid: uid,
                    phone_number: phone_number,
                    real_amount: real_amount || amount,
                    value: value,
                    promo_code: promo_code || '',
                    original_amount: amount,
                    discount_amount: discountAmount,
                    final_amount: finalAmount,
                    promo_code_id: appliedPromoCode ? appliedPromoCode.id : '',
                    currency: currency
                }
            });

            console.log('Payment intent created:', {
                status: paymentIntent.status,
                id: paymentIntent.id,
                currency: paymentIntent.currency,
                client_secret: paymentIntent.client_secret ? 'present' : 'missing'
            });

            if (paymentIntent.status === 'requires_payment_method') {
               const newTransaction = await Transaction.create({
                    amount: finalAmount,
                    original_amount: parseFloat(amount),
                    discount_amount: discountAmount,
                    value: value,
                    phone_number: phone_number,
                    uid: uid,
                    status: "Pending",
                    payment_id: paymentIntent.id,
                    network: "Afghan Network",
                    output: this.server,
                    promo_code: promo_code || null,
                    promo_code_id: appliedPromoCode ? appliedPromoCode.id : null,
                    is_checked: false,
                    currency: currency
                }, { transaction });

                  console.log('Transaction created with currency:', {
            id: newTransaction.id,
            currency: newTransaction.currency,
            amount: newTransaction.amount
        });

                await transaction.commit();

                return {
                    success: true,
                    paymentIntent: paymentIntent.client_secret,
                    customer: paymentIntent.customer,
                    transaction_id: newTransaction.id,
                    ephemeral_key: ephemeralKey.secret,
                    discount_amount: discountAmount,
                    final_amount: finalAmount
                };
            } else {
                await transaction.rollback();
                console.error('❌ Payment intent not in correct state:', paymentIntent.status);
                throw new Error(`Payment intent status: ${paymentIntent.status}`);
            }
        } catch (error) {
            await transaction.rollback();
            console.error('❌ Error creating payment intent:', error);
            throw error;
        }
    }

    async handleWebhook(rawBody, signature) {
        try {
            console.log('Webhook received - Raw body length:', rawBody.length);
            console.log('Webhook signature:', signature);
            
            let event;
            try {
                event = this.stripe.webhooks.constructEvent(
                    rawBody, 
                    signature, 
                    "whsec_WwpLqBO5naZjemg87AZ5hxKqr6zn5hgy"
                );
            } catch (err) {
                console.error('❌ Webhook signature verification failed:', err.message);
                throw new Error(`Webhook signature verification failed: ${err.message}`);
            }

            console.log('Webhook event type:', event.type);
            console.log('Webhook event ID:', event.id);

            switch (event.type) {
                case 'payment_intent.succeeded':
                    await this.handlePaymentSucceeded(event.data.object);
                    break;
                case 'charge.succeeded':  
                    console.log('⚡ Handling charge.succeeded event');
                    const paymentIntentId = event.data.object.payment_intent;
                    if (paymentIntentId) {
                        const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
                        await this.handlePaymentSucceeded(paymentIntent);
                    } else {
                        console.log('No payment intent found in charge');
                    }
                    break;
                case 'payment_intent.payment_failed':
                    await this.handlePaymentFailed(event.data.object);
                    break;
                default:
                    console.log(`Unhandled event type: ${event.type}`);
            }

            return { success: true, eventId: event.id };
        } catch (error) {
            console.error('❌ Webhook processing error:', error);
            throw error;
        }
    }

    async handlePaymentSucceeded(paymentIntent) {
        console.log('Processing successful payment:', paymentIntent.id);
        console.log('Payment intent metadata:', paymentIntent.metadata);
        console.log('Payment intent currency:', paymentIntent.currency);

 console.log('=== STRIPE FEE CALCULATION ===');
    console.log('Payment Intent Amount:', paymentIntent.amount); // in cents
    console.log('Payment Intent Amount (USD):', (paymentIntent.amount / 100).toFixed(2));
    console.log('Currency:', paymentIntent.currency);
    
    try {
        // Get charges to see fee details
        const charges = await this.stripe.charges.list({
            payment_intent: paymentIntent.id,
            limit: 1
        });

        if (charges.data.length > 0) {
            const charge = charges.data[0];
            console.log('Charge Details:', {
                charge_id: charge.id,
                amount: charge.amount,
                amount_usd: (charge.amount / 100).toFixed(2),
                fee: charge.fee, // Total fee in cents
                fee_usd: charge.fee ? (charge.fee / 100).toFixed(2) : 'N/A',
                net_amount: charge.amount - (charge.fee || 0), // Net in cents
                net_amount_usd: ((charge.amount - (charge.fee || 0)) / 100).toFixed(2)
            });

     
            if (charge.balance_transaction) {
                const balanceTransaction = await this.stripe.balanceTransactions.retrieve(
                    charge.balance_transaction
                );
                
                console.log('Balance Transaction Details:', {
                    gross_amount: balanceTransaction.amount,
                    gross_amount_usd: (balanceTransaction.amount / 100).toFixed(2),
                    fee: balanceTransaction.fee,
                    fee_usd: (balanceTransaction.fee / 100).toFixed(2),
                    net_amount: balanceTransaction.net,
                    net_amount_usd: (balanceTransaction.net / 100).toFixed(2),
                    fee_breakdown: balanceTransaction.fee_details,
                    available_on: new Date(balanceTransaction.available_on * 1000).toISOString()
                });
            }
        } else {
            console.log('No charges found for this payment intent');
        }
    } catch (feeError) {
        console.error('Error retrieving fee details:', feeError.message);
    }
    console.log('=== END FEE CALCULATION ===');
        const dbTransaction = await sequelize.transaction();
        try {
            const transaction = await Transaction.findOne({ 
                where: { payment_id: paymentIntent.id } 
            });

            if (!transaction) {
                console.error('Transaction not found for payment intent:', paymentIntent.id);
                
                if (paymentIntent.metadata && paymentIntent.metadata.uid) {
                    console.log('Creating transaction from webhook metadata');
                    const transactionCurrency = paymentIntent.currency || paymentIntent.metadata.currency || 'USD';
                    const newTransaction = await Transaction.create({
                        amount: paymentIntent.metadata.final_amount || (paymentIntent.amount / 100).toString(),
                        value: paymentIntent.metadata.value || '0',
                        phone_number: paymentIntent.metadata.phone_number || 'Unknown',
                        uid: paymentIntent.metadata.uid || 'Unknown',
                        status: "Paid",
                        payment_id: paymentIntent.id,
                        network: "Afghan Network",
                        output: this.server,
                        promo_code: paymentIntent.metadata.promo_code || null,
                        original_amount: paymentIntent.metadata.original_amount || (paymentIntent.amount / 100).toString(),
                        discount_amount: paymentIntent.metadata.discount_amount || 0,
                        promo_code_id: paymentIntent.metadata.promo_code_id || null,
                        is_checked: false,
                        currency: transactionCurrency
                    }, { transaction: dbTransaction });
                    
                                    console.log('New transaction created from webhook:', {
                    id: newTransaction.id,
                    currency: newTransaction.currency,
                    amount: newTransaction.amount
                });
                    
                    if (paymentIntent.metadata.promo_code) {
                        await this.recordPromoCodeUsage(newTransaction, paymentIntent.metadata, dbTransaction);
                    }
                    
                    await this.processTransaction(newTransaction, dbTransaction);
                    await dbTransaction.commit();
                } else {
                    await dbTransaction.rollback();
                    console.error('No metadata available to create transaction');
                }
                return;
            }

            console.log('Found transaction:', {
                id: transaction.id,
                status: transaction.status,
                payment_id: transaction.payment_id,
                currency: transaction.currency,
                promo_code: transaction.promo_code
            });

            if (transaction.status === "Pending" && transaction.promo_code) {
                await this.recordPromoCodeUsage(transaction, paymentIntent.metadata, dbTransaction);
            }

            await this.processTransaction(transaction, dbTransaction);
            await dbTransaction.commit();

        } catch (error) {
            await dbTransaction.rollback();
            console.error('Error handling payment succeeded:', error);
        }
    }

    async recordPromoCodeUsage(transaction, metadata, dbTransaction) {
        try {
            console.log('Recording promo code usage for transaction:', transaction.id);
            
            const promoCode = await PromoCode.findOne({ 
                where: { code: transaction.promo_code } 
            });

            if (!promoCode) {
                console.error('Promo code not found:', transaction.promo_code);
                return;
            }

            console.log('Found promo code:', {
                id: promoCode.id,
                code: promoCode.code,
                current_usage: promoCode.used_count,
                usage_limit: promoCode.usage_limit
            });

            const existingPromoUse = await PromoUse.findOne({
                where: { 
                    transaction_id: transaction.id,
                    promo_code_id: promoCode.id
                }
            });

            if (existingPromoUse) {
                await existingPromoUse.update({
                    status: 'used',
                    applied: true
                }, { transaction: dbTransaction });
                console.log('Existing PromoUse record updated');
            } else {
                await PromoUse.create({
                    promo_code_id: promoCode.id,
                    customer_uid: transaction.uid,
                    transaction_id: transaction.id,
                    original_amount: transaction.original_amount || parseFloat(metadata.original_amount),
                    discount_amount: transaction.discount_amount || parseFloat(metadata.discount_amount),
                    final_amount: transaction.amount,
                    status: 'used',
                    applied: true
                }, { transaction: dbTransaction });
                console.log('PromoUse record created');
            }

            const updatedCount = promoCode.used_count + 1;
            await PromoCode.update(
                { used_count: updatedCount },
                { 
                    where: { id: promoCode.id },
                    transaction: dbTransaction 
                }
            );

            console.log('Promo code usage count updated:', {
                code: promoCode.code,
                old_count: promoCode.used_count,
                new_count: updatedCount
            });

        } catch (error) {
            console.error('Error recording promo code usage:', error);
            throw error;
        }
    }

    async handlePaymentFailed(paymentIntent) {
        console.log('Payment failed:', paymentIntent.id);
        
        try {
            const transaction = await Transaction.findOne({ 
                where: { payment_id: paymentIntent.id } 
            });

            if (transaction && transaction.status === "Pending") {
                await transaction.update({
                    status: "Failed",
                    stripe_status: paymentIntent.status
                });
                
                console.log('Transaction marked as Failed:', transaction.id);
            }
        } catch (error) {
            console.error('Error handling payment failed:', error);
        }
    }

    async getPaymentIntentStatus(paymentIntentId) {
        try {
            const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
            console.log('Payment intent status:', paymentIntent.status);
            return paymentIntent.status;
        } catch (error) {
            console.error('Error retrieving payment intent:', error);
            return '';
        }
    }

    async markPaid(request) {
        const { transaction_id, server, source, payment_id } = request.body;

        console.log('Manual mark paid called:', {
            transaction_id, server, source, payment_id
        });

        if (server !== undefined && server !== null && server !== '') {
            this.server = parseInt(server);
        }

        const transaction = await Transaction.findByPk(transaction_id);
        if (!transaction) {
            throw new Error("Transaction not found");
        }

        if (transaction.status === "Paid" || transaction.status === "Confirmed") {
            console.log('Transaction already paid, returning:', transaction.status);
            return { transaction };
        }

        await this.processTransaction(transaction);

        const updatedTransaction = await Transaction.findByPk(transaction_id);
        return { transaction: updatedTransaction };
    }

    async sendNotification(transaction) {
        try {
            console.log('Notification would be sent for transaction:', transaction.id);
        } catch (error) {
            console.error('Notification error:', error);
        }
    }

    async getSetaraganBalance() {
        try {
            console.log('Getting Setaragan balance via provider');
            const balanceResult = await this.setaraganProvider.getBalance();
            
            if (balanceResult.status === "success") {
                return {
                    success: true,
                    balance: balanceResult.balance,
                    message: balanceResult.message
                };
            } else {
                return {
                    success: false,
                    error: balanceResult.error_message
                };
            }
        } catch (error) {
            console.error('Error getting Setaragan balance:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}