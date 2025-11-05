import axios from "axios";

const OPERATORS = {
    salaam: 1,
    etisalat: 2,
    roshan: 3,
    mtn: 4,
    awcc: 5
};

function getPhoneNumberCategory(phoneNumber) {
    const cleanNumber = phoneNumber.replace(/^\+93|^93/, '').slice(-9);
    const firstTwoDigits = cleanNumber.substring(0, 2);
    
    if (firstTwoDigits === "74") return '1'; 
    if (firstTwoDigits === "73" || firstTwoDigits === "78") return '2'; 
    if (firstTwoDigits === "72" || firstTwoDigits === "79") return '3'; 
    if (firstTwoDigits === "77" || firstTwoDigits === "76") return '4';
    if (firstTwoDigits === "70" || firstTwoDigits === "71") return '5'; 
    
    return '1'; 
}

export const setaraganTopupProvider = {
    name: "setaragan",

    /**
     * @param { order, item, variant, externalId }
     */
    async topup({ order, item, variant, externalId }) {
        const endpoint = process.env.SETARAGAN_ENDPOINT || "http://203.171.103.68:8093/api/MakeMobileRecharge";
        const username = process.env.SETARAGAN_USERNAME || "SML04321";
        const authKey = process.env.SETARAGAN_AUTH_KEY || "8Ztu@G$cKlJ2lESnLGq0ZTWJAo*!YH5K";
        const msisdn = process.env.SETARAGAN_MSISDN || "799042042";
        
        const rechargeAmount = item?.unit_price_minor ?? variant?.amount_minor;
        const customerMobile = item.msisdn;

        console.log('Sending to Setaragan - Transaction:', {
            phone_number: customerMobile,
            value: rechargeAmount,
            transaction_id: externalId
        });

     
        const requestId = externalId || Date.now().toString();

        const payload = {
            operator_id: getPhoneNumberCategory(customerMobile),
            customer_mobile: customerMobile,
            amount: rechargeAmount.toString(),
            msisdn: msisdn,
            request_id: requestId
        };

        console.log('Setaragan request payload:', payload);

        let httpResponse;
        try {
            httpResponse = await axios.post(endpoint, payload, {
                headers: {
                    "username": username,
                    "authKey": authKey, 
                    "Content-Type": "application/json"
                },
                timeout: 30_000
            });
        } catch (err) {
            console.error('Setaragan API error:', {
                message: err.message,
                response: err.response?.data,
                status: err.response?.status
            });
            
            return {
                status: "failed",
                error_code: "NETWORK",
                error_message: err.message,
                request: payload,
                response: err.response?.data || null
            };
        }

        const response = httpResponse.data;
        console.log('Setaragan API response:', response);

    
        if (response.status === "0") {
            return {
                status: "failed",
                error_code: "API_ERROR",
                error_message: response.data?.message || "API returned error status",
                request: payload,
                response: response,
                provider_txn_id: requestId
            };
        }

     
        if (response.status === "1") {
            const transactionStatus = response.data?.status?.toLowerCase();
            
            switch (transactionStatus) {
                case "success":
                    return {
                        status: "success",
                        provider_txn_id: response.data?.txn_id || requestId,
                        setaragan_txn_id: response.data?.txn_id,
                        operator_txn_id: response.data?.api_txn_id,
                        current_balance: response.data?.current_balance,
                        request: payload,
                        response: response
                    };
                    
                case "inprocess":
                    return {
                        status: "accepted", 
                        provider_txn_id: response.data?.txn_id || requestId,
                        setaragan_txn_id: response.data?.txn_id,
                        operator_txn_id: response.data?.api_txn_id,
                        current_balance: response.data?.current_balance,
                        request: payload,
                        response: response
                    };
                    
                case "failed":
                    return {
                        status: "failed",
                        error_code: "TRANSACTION_FAILED",
                        error_message: response.data?.message || "Transaction failed",
                        request: payload,
                        response: response,
                        provider_txn_id: response.data?.txn_id || requestId
                    };
                    
                default:
                    return {
                        status: "accepted",
                        provider_txn_id: response.data?.txn_id || requestId,
                        setaragan_txn_id: response.data?.txn_id,
                        operator_txn_id: response.data?.api_txn_id,
                        current_balance: response.data?.current_balance,
                        request: payload,
                        response: response
                    };
            }
        }


        return {
            status: "accepted",
            provider_txn_id: requestId,
            request: payload,
            response: response
        };
    },

    /**
     * 
     * @param {string} requestId 
     * @param {string} customerMobile
     * @param {number} amount 
     * @param {number} operatorId 
     */
    async checkStatus(requestId, customerMobile, amount, operatorId) {
        const endpoint = process.env.SETARAGAN_STATUS_ENDPOINT || "http://203.171.103.68:8093/api/getStatusbyRequestIDV3";
        const username = process.env.SETARAGAN_USERNAME || "SML04321";
        const authKey = process.env.SETARAGAN_AUTH_KEY || "8Ztu@G$cKlJ2lESnLGq0ZTWJAo*!YH5K";
        const msisdn = process.env.SETARAGAN_MSISDN || "799042042";

        const payload = {
            request_id: requestId,
            msisdn: msisdn,
            operator_id: operatorId.toString(),
            customer_mobile: customerMobile,
            amount: amount.toString()
        };

        console.log('Setaragan status check payload:', payload);

        try {
            const httpResponse = await axios.post(endpoint, payload, {
                headers: {
                    "username": username,
                    "authKey": authKey, 
                    "Content-Type": "application/json"
                },
                timeout: 15_000
            });

            const response = httpResponse.data;
            console.log('Setaragan status check response:', response);

            if (response.status === "0") {
                return {
                    status: "failed",
                    error_code: "NOT_FOUND",
                    error_message: response.data?.message || "Transaction not found"
                };
            }

            if (response.status === "1") {
                const transactionStatus = response.data?.status?.toLowerCase();
                
                switch (transactionStatus) {
                    case "success":
                        return {
                            status: "success",
                            provider_txn_id: response.data?.txn_id,
                            setaragan_txn_id: response.data?.txn_id,
                            operator_txn_id: response.data?.api_txn_id,
                            amount: response.data?.amount,
                            current_balance: response.data?.current_balance,
                            message: response.data?.message,
                            response: response
                        };
                        
                    case "inprocess":
                    case "pending":
                        return {
                            status: "accepted",
                            provider_txn_id: response.data?.txn_id,
                            setaragan_txn_id: response.data?.txn_id,
                            operator_txn_id: response.data?.api_txn_id,
                            amount: response.data?.amount,
                            current_balance: response.data?.current_balance,
                            message: response.data?.message,
                            response: response
                        };
                        
                    case "failed":
                        return {
                            status: "failed",
                            error_code: "TRANSACTION_FAILED",
                            error_message: response.data?.message || "Transaction failed",
                            provider_txn_id: response.data?.txn_id,
                            response: response
                        };
                        
                    default:
                        return {
                            status: "accepted",
                            provider_txn_id: response.data?.txn_id,
                            setaragan_txn_id: response.data?.txn_id,
                            message: response.data?.message,
                            response: response
                        };
                }
            }

            return {
                status: "accepted",
                provider_txn_id: requestId,
                response: response
            };

        } catch (err) {
            console.error('Setaragan status check error:', err.message);
            return {
                status: "failed",
                error_code: "NETWORK",
                error_message: err.message,
                response: err.response?.data || null
            };
        }
    },

    /**
     * 
     */
    async getBalance() {
        const endpoint = process.env.SETARAGAN_BALANCE_ENDPOINT || "http://203.171.103.68:8093/api/getWalletBalance";
        const username = process.env.SETARAGAN_USERNAME || "SML04321";
        const authKey = process.env.SETARAGAN_AUTH_KEY || "8Ztu@G$cKlJ2lESnLGq0ZTWJAo*!YH5K";
        const msisdn = process.env.SETARAGAN_MSISDN || "799042042";

        const payload = {
            msisdn: msisdn,
            request_id: `BAL_${Date.now()}`
        };

        console.log('Setaragan balance check payload:', payload);

        try {
            const httpResponse = await axios.post(endpoint, payload, {
                headers: {
                    "username": username,
                    "authKey": authKey, 
                    "Content-Type": "application/json"
                },
                timeout: 15_000
            });

            const response = httpResponse.data;
            console.log('Setaragan balance check response:', response);

            if (response.status === "1") {
                return {
                    status: "success",
                    balance: parseFloat(response.data?.main_wallet_balance),
                    message: response.data?.message,
                    response: response
                };
            } else {
                return {
                    status: "failed",
                    error_code: "BALANCE_ERROR",
                    error_message: response.data?.message || "Failed to get balance",
                    response: response
                };
            }

        } catch (err) {
            console.error('Setaragan balance check error:', err.message);
            return {
                status: "failed",
                error_code: "NETWORK",
                error_message: err.message,
                response: err.response?.data || null
            };
        }
    },

    detectOperator(phoneNumber) {
        return getPhoneNumberCategory(phoneNumber);
    }
};