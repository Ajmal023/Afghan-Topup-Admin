import axios from "axios";

export const dingTopupProvider = {
    name: "ding",

    /**
     * 
     */
    getApiKey() {
        const apiKey = process.env.DING_API_KEY || "Gug7OtMUfzS5uS8cokUyuS";
        
        if (!apiKey) {
            throw new Error("Missing Ding API key");
        }
        return apiKey;
    },

    /**
     * 
     */
    getProviderCode(phoneNumber) {
        const cleanNumber = phoneNumber.replace(/^\+93|^93/, '').slice(-9);
        const firstTwoDigits = cleanNumber.substring(0, 2);
        

        const providerMap = {
            '70': 'AF_AW_TopUp',
            '71': 'AF_AW_TopUp',
            '78': 'AF_ET_TopUp',
            '73': 'AF_ET_TopUp',
            '77': 'AF_MT_TopUp',
            '76': 'AF_MT_TopUp',
            '72': 'AF_RH_TopUp', 
            '79': 'AF_RH_TopUp',
        };

        const skuCode = providerMap[firstTwoDigits] || 'AF_AW_TopUp'; 
        
        console.log('Ding provider mapping:', {
            phone: phoneNumber,
            cleanNumber: cleanNumber,
            firstTwoDigits: firstTwoDigits,
            skuCode: skuCode,
            provider: this.getProviderName(skuCode)
        });
        
        return skuCode;
    },

    /**
     *
     */
    getProviderName(skuCode) {
        const providerNames = {
            'AF_AW_TopUp': 'AWCC',
            'AF_RH_TopUp': 'Roshan', 
            'AF_MT_TopUp': 'MTN',
            'AF_ET_TopUp': 'Etisalat',
        };
        
        return providerNames[skuCode] || 'Unknown';
    },

    /**
     * 
     */
    validatePhoneNumber(phoneNumber) {
        const cleanNumber = phoneNumber.replace(/^\+93|^93/, '').slice(-9);
        

        if (cleanNumber.length !== 9) {
            return false;
        }
        
      
        const validPrefixes = ['70', '71', '72', '73',  '76', '77', '78', '79'];
        const prefix = cleanNumber.substring(0, 2);
        
        return validPrefixes.includes(prefix);
    },

    /**
     * @param { order, item, variant, externalId }
     */
    async topup({ order, item, variant, externalId }) {
        const baseUrl = process.env.DING_API_BASE_URL || "https://api.dingconnect.com/api/V1";
        const useDeferred = process.env.DING_USE_DEFERRED === 'true';
        
        const rechargeAmount = item?.unit_price_minor ?? variant?.amount_minor;
        const customerMobile = item.msisdn;

        console.log('Sending to Ding - Transaction:', {
            phone_number: customerMobile,
            value: rechargeAmount,
            transaction_id: externalId,
            useDeferred: useDeferred
        });

    
        if (!this.validatePhoneNumber(customerMobile)) {
            return {
                status: "failed",
                error_code: "INVALID_PHONE",
                error_message: "Invalid Afghan phone number format",
                request: null,
                response: null
            };
        }

        try {
            const apiKey = this.getApiKey();
            const skuCode = this.getProviderCode(customerMobile);
            
            console.log('Ding provider details:', {
                skuCode,
                provider: this.getProviderName(skuCode),
                amount: rechargeAmount,
                phone: customerMobile,
                apiKey: apiKey ? "***" + apiKey.slice(-4) : "missing"
            });


            if (rechargeAmount < 2 || rechargeAmount > 70) {
                return {
                    status: "failed",
                    error_code: "INVALID_AMOUNT",
                    error_message: "Amount must be between 2 and 70 USD",
                    request: null,
                    response: null
                };
            }

            const payload = {
                SkuCode: skuCode,
                SendValue: parseFloat(rechargeAmount),
                AccountNumber: customerMobile,
                DistributorRef: externalId.toString(),
                ValidateOnly: false
            };

            const headers = {
                'api_key': apiKey,
                'Content-Type': 'application/json'
            };

       
            if (useDeferred) {
                headers['X-Options'] = 'DeferTransfer';
                headers['X-Correlation-Id'] = externalId.toString();
            }

            let httpResponse;
            try {
                console.log('Sending Ding API request:', {
                    url: `${baseUrl}/SendTransfer`,
                    payload: payload,
                    headers: { ...headers, api_key: '***' } 
                });

                httpResponse = await axios.post(`${baseUrl}/SendTransfer`, payload, {
                    headers: headers,
                    timeout: 45_000 
                });

                console.log('Ding API response received:', {
                    status: httpResponse.status,
                    data: httpResponse.data
                });

            } catch (err) {
                console.error('Ding API error:', {
                    message: err.message,
                    response: err.response?.data,
                    status: err.response?.status,
                    headers: err.response?.headers
                });
                
             
                if (err.response?.status === 401) {
                    return {
                        status: "failed",
                        error_code: "AUTHENTICATION",
                        error_message: "Invalid API key or authentication failed",
                        request: payload,
                        response: err.response?.data || null
                    };
                } else if (err.response?.status === 429) {
                    return {
                        status: "failed",
                        error_code: "RATE_LIMIT",
                        error_message: "Rate limit exceeded, please try again later",
                        request: payload,
                        response: err.response?.data || null
                    };
                } else if (err.code === 'ECONNABORTED') {
                    return {
                        status: "failed",
                        error_code: "TIMEOUT",
                        error_message: "Ding API timeout, please try again",
                        request: payload,
                        response: null
                    };
                }
                
                return {
                    status: "failed",
                    error_code: "NETWORK",
                    error_message: err.message,
                    request: payload,
                    response: err.response?.data || null
                };
            }

            const response = httpResponse.data;
            console.log('Ding API response processed:', {
                resultCode: response.ResultCode,
                processingState: response.TransferRecord?.ProcessingState,
                errorCodes: response.ErrorCodes
            });

   
            if (response.ResultCode === 1) {
                const transferRecord = response.TransferRecord;
                const processingState = transferRecord.ProcessingState;
                
                let status;
                switch (processingState) {
                    case 'Complete':
                        status = "success";
                        break;
                    case 'Submitted':
                    case 'Pending':
                        status = "accepted";
                        break;
                    case 'Failed':
                    case 'Cancelled':
                        status = "failed";
                        break;
                    default:
                        status = "accepted";
                }

                const result = {
                    status: status,
                    provider_txn_id: transferRecord.TransferId?.TransferRef || externalId.toString(),
                    ding_transfer_ref: transferRecord.TransferId?.TransferRef,
                    distributor_ref: transferRecord.TransferId?.DistributorRef,
                    processing_state: processingState,
                    receive_value: transferRecord.Price?.ReceiveValue,
                    receive_currency: transferRecord.Price?.ReceiveCurrencyIso,
                    send_value: transferRecord.Price?.SendValue,
                    send_currency: transferRecord.Price?.SendCurrencyIso,
                    request: payload,
                    response: response
                };

                console.log('Ding transaction result:', result);
                return result;

            } else if (response.ResultCode === 2) {
            
                console.log('Ding transaction completed with warning:', response.ErrorCodes);
                
                const result = {
                    status: "accepted",
                    provider_txn_id: response.TransferRecord?.TransferId?.TransferRef || externalId.toString(),
                    ding_transfer_ref: response.TransferRecord?.TransferId?.TransferRef,
                    processing_state: response.TransferRecord?.ProcessingState,
                    warning_codes: response.ErrorCodes,
                    request: payload,
                    response: response
                };
                
                console.log('Ding transaction with warning:', result);
                return result;

            } else {
         
                const errorMessage = this.getErrorMessage(response.ErrorCodes);
                const errorCode = this.getErrorCode(response.ResultCode, response.ErrorCodes);
                
                console.log('Ding transaction failed:', {
                    errorCode: errorCode,
                    errorMessage: errorMessage,
                    resultCode: response.ResultCode,
                    errorCodes: response.ErrorCodes
                });

                return {
                    status: "failed",
                    error_code: errorCode,
                    error_message: errorMessage,
                    request: payload,
                    response: response,
                    provider_txn_id: externalId.toString()
                };
            }

        } catch (error) {
            console.error('Ding topup unexpected error:', error.message);
            return {
                status: "failed",
                error_code: "UNKNOWN_ERROR",
                error_message: `Unexpected error: ${error.message}`,
                request: null,
                response: null
            };
        }
    },

    /**
     * 
     * @param {string} distributorRef 
     * @param {string} transferRef 
     */
    async checkStatus(distributorRef, transferRef = null) {
        const baseUrl = process.env.DING_API_BASE_URL || "https://api.dingconnect.com/api/V1";

        try {
            const apiKey = this.getApiKey();

            const payload = {
                DistributorRef: distributorRef,
                Take: 1, 
                Skip: 0
            };

   
            if (transferRef) {
                payload.TransferRef = transferRef;
            }

            console.log('Ding status check request:', {
                distributorRef: distributorRef,
                transferRef: transferRef
            });

            const httpResponse = await axios.post(`${baseUrl}/ListTransferRecords`, payload, {
                headers: {
                    'api_key': apiKey,
                    'Content-Type': 'application/json'
                },
                timeout: 30_000
            });

            const response = httpResponse.data;
            console.log('Ding status check response:', response);

            if (response.ResultCode === 1 && response.TransferRecords && response.TransferRecords.length > 0) {
                const transferRecord = response.TransferRecords[0];
                const processingState = transferRecord.ProcessingState;
                
                let status;
                switch (processingState) {
                    case 'Complete':
                        status = "success";
                        break;
                    case 'Submitted':
                    case 'Pending':
                        status = "accepted";
                        break;
                    case 'Failed':
                    case 'Cancelled':
                        status = "failed";
                        break;
                    default:
                        status = "accepted";
                }

                const result = {
                    status: status,
                    provider_txn_id: transferRecord.TransferId?.TransferRef || distributorRef,
                    ding_transfer_ref: transferRecord.TransferId?.TransferRef,
                    processing_state: processingState,
                    receive_value: transferRecord.Price?.ReceiveValue,
                    receive_currency: transferRecord.Price?.ReceiveCurrencyIso,
                    started_utc: transferRecord.StartedUtc,
                    completed_utc: transferRecord.CompletedUtc,
                    response: response
                };

                console.log('Ding status check result:', result);
                return result;

            } else if (response.ResultCode === 1 && (!response.TransferRecords || response.TransferRecords.length === 0)) {
                console.log('Ding transaction not found, may still be processing');
                return {
                    status: "accepted", 
                    error_code: "NOT_FOUND",
                    error_message: "Transaction record not found, may still be processing",
                    provider_txn_id: distributorRef,
                    response: response
                };
            } else {
                const errorMessage = this.getErrorMessage(response.ErrorCodes);
                const errorCode = this.getErrorCode(response.ResultCode, response.ErrorCodes);
                
                console.log('Ding status check failed:', {
                    errorCode: errorCode,
                    errorMessage: errorMessage
                });

                return {
                    status: "failed",
                    error_code: errorCode,
                    error_message: errorMessage,
                    response: response
                };
            }

        } catch (error) {
            console.error('Ding status check error:', error.message);
            return {
                status: "failed",
                error_code: "NETWORK",
                error_message: error.message,
                response: error.response?.data || null
            };
        }
    },

    /**
     *
     */
    async getBalance() {
        const baseUrl = process.env.DING_API_BASE_URL || "https://api.dingconnect.com/api/V1";

        try {
            const apiKey = this.getApiKey();

            console.log('Checking Ding balance...');

            const httpResponse = await axios.get(`${baseUrl}/GetBalance`, {
                headers: {
                    'api_key': apiKey,
                    'Content-Type': 'application/json'
                },
                timeout: 30_000
            });

            const response = httpResponse.data;
            console.log('Ding balance response:', response);

            if (response.ResultCode === 1) {
                const result = {
                    status: "success",
                    balance: response.Balance,
                    currency: response.CurrencyIso,
                    response: response
                };
                
                console.log('Ding balance result:', result);
                return result;

            } else {
                const errorMessage = this.getErrorMessage(response.ErrorCodes);
                console.log('Ding balance check failed:', errorMessage);
                
                return {
                    status: "failed",
                    error_code: "BALANCE_ERROR",
                    error_message: errorMessage,
                    response: response
                };
            }

        } catch (error) {
            console.error('Ding balance check error:', error.message);
            return {
                status: "failed",
                error_code: "NETWORK",
                error_message: error.message,
                response: error.response?.data || null
            };
        }
    },

/**
 * 
 */
async getProducts() {
    const baseUrl = process.env.DING_API_BASE_URL || "https://api.dingconnect.com/api/V1";

    try {
        const apiKey = this.getApiKey();

        console.log('Fetching Ding products for Afghanistan...');

    
        const httpResponse = await axios.get(`${baseUrl}/GetProducts`, {
            headers: {
                'api_key': apiKey,
                'Content-Type': 'application/json'
            },
            timeout: 30_000
        });

        const response = httpResponse.data;
        console.log('Ding products response:', response);

        if (response.ResultCode === 1) {
            const afghanProducts = response.Products || [];
            console.log(`Found ${afghanProducts.length} products for Afghanistan`);
            
        
            afghanProducts.forEach(product => {
                console.log('Ding product:', {
                    skuCode: product.SkuCode,
                    provider: product.ProviderCode,
                    min: product.MinPrice,
                    max: product.MaxPrice,
                    benefits: product.Benefits
                });
            });

            return {
                status: "success",
                products: afghanProducts,
                response: response
            };
        } else {
            const errorMessage = this.getErrorMessage(response.ErrorCodes);
            console.log('Ding products fetch failed:', errorMessage);
            
            return {
                status: "failed",
                error_code: "PRODUCTS_ERROR",
                error_message: errorMessage,
                response: response
            };
        }

    } catch (error) {
        console.error('Ding products error:', error.message);
        return {
            status: "failed",
            error_code: "NETWORK",
            error_message: error.message,
            response: error.response?.data || null
        };
    }
},
    /**
     * 
     */
    getErrorMessage(errorCodes) {
        if (!errorCodes || errorCodes.length === 0) {
            return "Unknown error occurred";
        }
        
        const errorDescriptions = errorCodes.map(error => {
            return `${error.Code}${error.Context ? ` (${error.Context})` : ''}`;
        });
        
        return errorDescriptions.join(', ');
    },

    /**
     *
     */
    getErrorCode(resultCode, errorCodes) {
        if (resultCode === 3) {
            return "TRANSIENT_ERROR";
        } else if (resultCode === 4) {
            const firstError = errorCodes && errorCodes[0];
            if (firstError) {
                if (firstError.Code === 'AccountNumberInvalid') {
                    return "INVALID_ACCOUNT";
                } else if (firstError.Code === 'AuthenticationFailed') {
                    return "AUTHENTICATION";
                } else if (firstError.Code === 'InsufficientBalance') {
                    return "INSUFFICIENT_BALANCE";
                } else if (firstError.Code === 'DuplicateTransactionPrevented') {
                    return "DUPLICATE_TRANSACTION";
                } else if (firstError.Code === 'ParameterInvalid') {
                    return "VALIDATION";
                }
            }
            return "VALIDATION";
        } else if (resultCode === 5) {
            return "PROVIDER_ERROR";
        }
        
        return "UNKNOWN_ERROR";
    },
        /**
     * 
     */
    async validateTopup({ phoneNumber, amount, skuCode = null }) {
        const baseUrl = process.env.DING_API_BASE_URL || "https://api.dingconnect.com/api/V1";
        
        try {
            const apiKey = this.getApiKey();
            const finalSkuCode = skuCode || this.getProviderCode(phoneNumber);
            
            const payload = {
                SkuCode: finalSkuCode,
                SendValue: parseFloat(amount),
                AccountNumber: phoneNumber,
                DistributorRef: 'validate-' + Date.now(),
                ValidateOnly: true  
            };

            console.log('🔒 Validating topup (NO TRANSACTION):', {
                phone: phoneNumber,
                amount: amount,
                skuCode: finalSkuCode,
                validateOnly: true
            });

            const httpResponse = await axios.post(`${baseUrl}/SendTransfer`, payload, {
                headers: {
                    'api_key': apiKey,
                    'Content-Type': 'application/json'
                },
                timeout: 30_000
            });

            const response = httpResponse.data;
            
            if (response.ResultCode === 1) {
                return {
                    status: "success",
                    valid: true,
                    message: "Topup validation passed",
                    estimated_receive: response.TransferRecord?.Price?.ReceiveValue,
                    response: response
                };
            } else {
                return {
                    status: "failed", 
                    valid: false,
                    error_message: this.getErrorMessage(response.ErrorCodes),
                    response: response
                };
            }

        } catch (error) {
            console.error('Validation error:', error.message);
            return {
                status: "failed",
                valid: false,
                error_message: error.message
            };
        }
    }
};