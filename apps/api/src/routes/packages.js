import { Router } from "express";
import { Currency1, Package, ProviderConfig } from "../models/index.js";
import { requireAuth } from "../middlewares/auth.js";
import { requireApiKey } from "../middlewares/apiKeyAuth.js";

export const packagesRouter = Router();



// packagesRouter.get("/", requireApiKey, async (req, res, next) => {
//     try {
//          const packages = await Package.findAll({
//             include: [{
//                 model: ProviderConfig,
//                 as: 'provider',
//                 where: { active: true },
//                 attributes: ['id', 'provider', 'name', 'active']
//             }],
//             where: { status: true },
//             order: [['id', 'ASC']]
//         });

        
//   res.json({
//   data: packages.map(pkg => ({
//     id: pkg.id,
//     cost: parseFloat(pkg.cost),
//     value: parseFloat(pkg.value),
//     cost_currency: pkg.cost_currency || "USD",
//     value_currency: pkg.value_currency || "AFN",
//     base_cost: parseFloat(pkg.base_cost || pkg.cost),
//     provider: pkg.provider ? {
//                     id: pkg.provider.id,
//                     name: pkg.provider.name,
//                     provider: pkg.provider.provider
//                 } : null,
//     status: pkg.status,
//     created_at: pkg.createdAt?.toISOString(),  
//     updated_at: pkg.updatedAt?.toISOString()
//   }))
// });
//     } catch (error) {
//         console.error('Error fetching packages:', error);
//         if (error.message.includes("Unauthorized")) {
//             return res.status(401).json({ data: "Unauthorized" });
//         }
//         res.status(500).json({ error: 'Internal server error' });
//     }
// });


// new router

// packagesRouter.get("/", requireApiKey, async (req, res, next) => {
//     try {
//         console.log('🔍 [Backend] Packages endpoint called');
        
//         // 1. Get country code from request headers
//         const countryCode = req.headers['country-code'] || req.headers['Country-Code'] || 'US';
//         console.log('🌍 [Backend] Country code detected:', countryCode);
        
//         // 2. Map country codes to full country names
//         const countryNameMap = {
//             'US': 'United States',
//             'AF': 'Afghanistan',
//             'PK': 'Pakistan',
//             'IN': 'India',
//             'CN': 'China',
//             'GB': 'United Kingdom',
//             'CA': 'Canada',
//             'AU': 'Australia',
//             'DE': 'Germany',
//             'FR': 'France',
//             'JP': 'Japan',
//             'CH': 'Switzerland',
//             'NZ': 'New Zealand',
//             'BD': 'Bangladesh',
//             'LK': 'Sri Lanka',
//             'NP': 'Nepal',
//             'BT': 'Bhutan',
//             'MV': 'Maldives',
//             'AE': 'United Arab Emirates',
//             'SA': 'Saudi Arabia',
//             'QA': 'Qatar',
//             'OM': 'Oman',
//             'KW': 'Kuwait',
//             'BH': 'Bahrain',
//             'SG': 'Singapore',
//             'MY': 'Malaysia',
//             'TH': 'Thailand',
//             'ID': 'Indonesia',
//             'VN': 'Vietnam',
//             'PH': 'Philippines',
//             'ZA': 'South Africa',
//             'EG': 'Egypt',
//             'NG': 'Nigeria',
//             'KE': 'Kenya',
//             'NO': 'Norway',
//             'SE': 'Sweden',
//             'DK': 'Denmark',
//             'PL': 'Poland',
//             'MX': 'Mexico',
//             'BR': 'Brazil',
//             'AR': 'Argentina',
//             'RU': 'Russia',
//             'UA': 'Ukraine',
//             'KZ': 'Kazakhstan',
//             'KR': 'South Korea',
//             'TR': 'Turkey',
//             'IL': 'Israel',
//             'HK': 'Hong Kong',
//             'TW': 'Taiwan',
//             'EU': 'European Union'
//         };
        
//         const countryName = countryNameMap[countryCode.toUpperCase()] || 'United States';
//         console.log('🗺️ [Backend] Mapped to country name:', countryName);

//         // 3. Get currency for the country name
//         let currency;
//         try {
//             console.log('💰 [Backend] Fetching currency for country:', countryName);
//             currency = await Currency1.findOne({ 
//                 where: { currency_country: countryName } 
//             });
//             console.log('✅ [Backend] Currency found:', currency ? {
//                 code: currency.currency_code,
//                 rate: currency.rate,
//                 country: currency.currency_country
//             } : 'Not found');
//         } catch (error) {
//             console.log('❌ [Backend] Currency fetch error:', error.message);
//         }

//         // 4. If currency not found, use USD as default
//         const conversionRate = currency ? currency.rate : 1;
//         const targetCurrency = currency ? currency.currency_code : 'USD';
//         console.log('🔄 [Backend] Using conversion rate:', conversionRate, 'for currency:', targetCurrency);

//         // 5. Fetch packages
//         console.log('📦 [Backend] Fetching packages from database...');
//         const packages = await Package.findAll({
//             include: [{
//                 model: ProviderConfig,
//                 as: 'provider',
//                 where: { active: true },
//                 attributes: ['id', 'provider', 'name', 'active']
//             }],
//             where: { status: true },
//             order: [['id', 'ASC']]
//         });
//         console.log(`📦 [Backend] Found ${packages.length} packages`);

//         // 6. Convert packages to target currency
//         console.log('💱 [Backend] Converting package prices...');
//         const convertedPackages = packages.map(pkg => {
//             const originalCost = parseFloat(pkg.cost);
//             const convertedCost = originalCost * conversionRate;
            
//             console.log(`💵 [Backend] Package ${pkg.id}: ${originalCost} USD -> ${convertedCost.toFixed(2)} ${targetCurrency}`);
            
//             return {
//                 id: pkg.id,
//                 cost: parseFloat(convertedCost.toFixed(2)),
//                 value: parseFloat(pkg.value),
//                 cost_currency: targetCurrency,
//                 value_currency: pkg.value_currency || "AFN",
//                 base_cost: parseFloat(pkg.base_cost || pkg.cost),
//                 original_cost: originalCost,
//                 original_currency: "USD",
//                 conversion_rate: conversionRate,
//                 version: 1,
//                 ios_version: 1,
//                 android_version: 1,
//                 provider: pkg.provider ? {
//                     id: pkg.provider.id,
//                     name: pkg.provider.name,
//                     provider: pkg.provider.provider
//                 } : null,
//                 status: pkg.status,
//                 created_at: pkg.createdAt?.toISOString(),  
//                 updated_at: pkg.updatedAt?.toISOString()
//             }
//         });

//         console.log('✅ [Backend] Successfully processed packages, sending response');
//         res.json({
//             data: convertedPackages,
//             currency_info: {
//                 country_code: countryCode,
//                 country_name: countryName,
//                 currency_code: targetCurrency,
//                 conversion_rate: conversionRate
//             }
//         });
//     } catch (error) {
//         console.error('💥 [Backend] Error in packages endpoint:', error);
//         console.error('💥 [Backend] Error stack:', error.stack);
//         if (error.message.includes("Unauthorized")) {
//             return res.status(401).json({ data: "Unauthorized" });
//         }
//         res.status(500).json({ error: 'Internal server error' });
//     }
// });


// this the new based on IP
// packagesRouter.get("/", requireApiKey, async (req, res, next) => {
//     try {
//         console.log('🔍 [Backend] Packages endpoint called');
        
//         // 1. Auto-detect country from IP address
//         let countryCode = await detectCountryFromIP(req);
//         console.log('🌍 [Backend] Auto-detected country from IP:', countryCode);
        
//         // 2. Map country codes to full country names
//         const countryNameMap = {
//             'US': 'United States',
//             'AF': 'Afghanistan',
//             'PK': 'Pakistan',
//             'IN': 'India',
//             'CN': 'China',
//             'GB': 'United Kingdom',
//             'CA': 'Canada',
//             'AU': 'Australia',
//             'DE': 'Germany',
//             'FR': 'France',
//             'JP': 'Japan',
//             'CH': 'Switzerland',
//             'NZ': 'New Zealand',
//             'BD': 'Bangladesh',
//             'LK': 'Sri Lanka',
//             'NP': 'Nepal',
//             'BT': 'Bhutan',
//             'MV': 'Maldives',
//             'AE': 'United Arab Emirates',
//             'SA': 'Saudi Arabia',
//             'QA': 'Qatar',
//             'OM': 'Oman',
//             'KW': 'Kuwait',
//             'BH': 'Bahrain',
//             'SG': 'Singapore',
//             'MY': 'Malaysia',
//             'TH': 'Thailand',
//             'ID': 'Indonesia',
//             'VN': 'Vietnam',
//             'PH': 'Philippines',
//             'ZA': 'South Africa',
//             'EG': 'Egypt',
//             'NG': 'Nigeria',
//             'KE': 'Kenya'
//         };
        
//         const countryName = countryNameMap[countryCode] || 'United States';
//         console.log('🗺️ [Backend] Mapped to country name:', countryName);

//         // 3. Get currency for the country
//         let currency = await Currency1.findOne({ 
//             where: { currency_country: countryName } 
//         });
        
//         console.log('✅ [Backend] Currency found:', currency ? {
//             code: currency.currency_code,
//             rate: currency.rate,
//             country: currency.currency_country
//         } : 'Not found');

//         // 4. Use detected currency or default to USD
//         const conversionRate = currency ? parseFloat(currency.rate) : 1;
//         const targetCurrency = currency ? currency.currency_code : 'USD';
//         console.log('🔄 [Backend] Using conversion rate:', conversionRate, 'for currency:', targetCurrency);

//         // 5. Fetch packages
//         const packages = await Package.findAll({
//             include: [{
//                 model: ProviderConfig,
//                 as: 'provider',
//                 where: { active: true },
//                 attributes: ['id', 'provider', 'name', 'active']
//             }],
//             where: { status: true },
//             order: [['id', 'ASC']]
//         });
//         console.log(`📦 [Backend] Found ${packages.length} packages`);

//         // 6. Convert packages to target currency
//         const convertedPackages = packages.map(pkg => {
//             const originalCost = parseFloat(pkg.cost);
//             const convertedCost = originalCost * conversionRate;
            
//             console.log(`💵 [Backend] Package ${pkg.id}: ${originalCost} USD -> ${convertedCost.toFixed(2)} ${targetCurrency}`);
            
//             return {
//                 id: pkg.id,
//                 cost: parseFloat(convertedCost.toFixed(2)), // Converted cost
//                 value: parseFloat(pkg.value),
//                 cost_currency: targetCurrency, // User's local currency
//                 value_currency: pkg.value_currency || "AFN",
//                 base_cost: parseFloat(pkg.base_cost || pkg.cost),
//                 version: 1,
//                 ios_version: 1,
//                 android_version: 1,
//                 provider: pkg.provider ? {
//                     id: pkg.provider.id,
//                     name: pkg.provider.name,
//                     provider: pkg.provider.provider
//                 } : null,
//                 status: pkg.status,
//                 created_at: pkg.createdAt?.toISOString(),  
//                 updated_at: pkg.updatedAt?.toISOString()
//             }
//         });

//         console.log('✅ [Backend] Sending converted packages with currency:', targetCurrency);
//         res.json({ 
//             data: convertedPackages,
//             currency_info: {
//                 country_code: countryCode,
//                 country_name: countryName,
//                 currency_code: targetCurrency,
//                 conversion_rate: conversionRate
//             }
//         });
//     } catch (error) {
//         console.error('💥 [Backend] Error in packages endpoint:', error);
//         res.status(500).json({ error: 'Internal server error' });
//     }
// });

// // IP-based country detection function
// async function detectCountryFromIP(req) {
//     try {
//         console.log('🌐 [Backend] Detecting country via Nginx...');
        
//         // Log all headers for debugging
//         console.log('📋 [Backend] All headers:', Object.keys(req.headers));
        
//         // Method 1: Get client IP from Nginx headers
//         let clientIP = req.headers['x-real-ip'] || 
//                       req.headers['x-forwarded-for'] || 
//                       req.connection.remoteAddress;
        
//         console.log('🌐 [Backend] Client IP from Nginx:', clientIP);

//         // Clean the IP
//         if (clientIP && clientIP.includes(',')) {
//             clientIP = clientIP.split(',')[0].trim();
//         }
//         if (clientIP && clientIP.includes('::ffff:')) {
//             clientIP = clientIP.replace('::ffff:', '');
//         }

//         // Method 2: Check if Nginx GeoIP module is configured
//         // Common Nginx GeoIP headers
//         const nginxGeoHeaders = {
//             'x-country-code': req.headers['x-country-code'],
//             'x-geo-country': req.headers['x-geo-country'],
//             'geoip-country-code': req.headers['geoip-country-code'],
//             'cf-ipcountry': req.headers['cf-ipcountry'], // If using CloudFlare with Nginx
//         };

//         console.log('🗺️ [Backend] Nginx Geo Headers:', nginxGeoHeaders);

//         for (const [header, value] of Object.entries(nginxGeoHeaders)) {
//             if (value && value.length === 2) {
//                 console.log(`🌍 [Backend] Using country from ${header}:`, value);
//                 return value.toUpperCase();
//             }
//         }

//         // Method 3: Use IP geolocation as fallback
//         if (clientIP && clientIP !== '127.0.0.1' && clientIP !== '::1') {
//             try {
//                 console.log('🌍 [Backend] Falling back to IP geolocation for:', clientIP);
//                 const response = await fetch(`http://ip-api.com/json/${clientIP}?fields=status,countryCode`, {
//                     timeout: 3000
//                 });
                
//                 const data = await response.json();
//                 console.log('🌍 [Backend] IP-API response:', data);
                
//                 if (data && data.status === 'success' && data.countryCode) {
//                     console.log('✅ [Backend] Country detected via IP:', data.countryCode);
//                     return data.countryCode;
//                 }
//             } catch (error) {
//                 console.log('❌ [Backend] IP geolocation failed:', error.message);
//             }
//         }

//         // Final fallback to US
//         console.log('🌍 [Backend] Using default country: US');
//         return 'US';
        
//     } catch (error) {
//         console.log('❌ [Backend] Country detection error:', error.message);
//         return 'US';
//     }
// }

packagesRouter.get("/", requireApiKey, async (req, res, next) => {
    try {
         const packages = await Package.findAll({
            include: [{
                model: ProviderConfig,
                as: 'provider',
                where: { active: true },
                attributes: ['id', 'provider', 'name', 'active']
            }],
            where: { status: true },
            order: [['id', 'ASC']]
        });

        
  res.json({
  data: packages.map(pkg => ({
    id: pkg.id,
    cost: parseFloat(pkg.cost),
    value: parseFloat(pkg.value),
    cost_currency: pkg.cost_currency || "USD",
    value_currency: pkg.value_currency || "AFN",
    base_cost: parseFloat(pkg.base_cost || pkg.cost),
    version: 1,
    ios_version: 1,
    android_version: 1,
    provider: pkg.provider ? {
                    id: pkg.provider.id,
                    name: pkg.provider.name,
                    provider: pkg.provider.provider
                } : null,
    status: pkg.status,
    created_at: pkg.createdAt?.toISOString(),  
    updated_at: pkg.updatedAt?.toISOString()
  }))
});
    } catch (error) {
        console.error('Error fetching packages:', error);
        if (error.message.includes("Unauthorized")) {
            return res.status(401).json({ data: "Unauthorized" });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
});

packagesRouter.get("/admin", requireAuth, async (req, res, next) => {
    try {
        const packages = await Package.findAll({
                include: [{
                    model: ProviderConfig,
                    as: 'provider',
                    attributes: ['id', 'provider', 'name', 'active']
                }],
                order: [['id', 'ASC']]
            });
        
        res.json({ 
            data: packages.map(pkg => ({
                id: pkg.id,
                cost: parseFloat(pkg.cost),
                value: parseFloat(pkg.value),
                cost_currency: pkg.cost_currency || "USD",
                value_currency: pkg.value_currency || "AFN",
                base_cost: parseFloat(pkg.base_cost || pkg.cost),
                provider: pkg.provider ? {
                    id: pkg.provider.id,
                    name: pkg.provider.name,
                    provider: pkg.provider.provider,
                    active: pkg.provider.active
                } : null,
                status: pkg.status,
                created_at: pkg.createdAt,
                updated_at: pkg.updatedAt
            }))
        });
    } catch (error) {
        console.error('Error fetching packages:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


packagesRouter.post("/", requireAuth, async (req, res, next) => {
    try {
        const { cost, value, provider_id, status = true } = req.body;

        if (!cost || !value) {
            return res.status(400).json({ error: "Cost and value are required" });
        }

        const provider = await ProviderConfig.findByPk(provider_id);
        if (!provider) {
            return res.status(404).json({ error: "Provider not found" });
        }
        const newPackage = await Package.create({
            cost: parseFloat(cost),
            cost_currency: "USD",
            value: parseFloat(value),
            value_currency: "AFN",
            base_cost: parseFloat(cost),
            provider_id: provider_id,
            status: Boolean(status)
        });


        const packageWithProvider = await Package.findByPk(newPackage.id, {
            include: [{
                model: ProviderConfig,
                as: 'provider',
                attributes: ['id', 'provider', 'name', 'active']
            }]
        });        
        res.status(201).json({
            message: 'Package added successfully',
            data: newPackage
        });
    } catch (error) {
        console.error('Error creating package:', error);
        res.status(500).json({ error: 'Error, Something went wrong' });
    }
});


packagesRouter.put("/:id", requireAuth, async (req, res, next) => {
    try {
        const { id } = req.params;
        const { cost, value, provider_id, status } = req.body;

        if (!cost || !value) {
            return res.status(400).json({ error: "Cost and value are required" });
        }

        const packageItem = await Package.findByPk(id);
        if (!packageItem) {
            return res.status(404).json({ error: "Package not found" });
        }
        if (provider_id) {
            const provider = await ProviderConfig.findByPk(provider_id);
            if (!provider) {
                return res.status(404).json({ error: "Provider not found" });
            }
        }
        
        await packageItem.update({
            cost: parseFloat(cost),
            value: parseFloat(value),
            ...(provider_id && { provider_id }),
            ...(status !== undefined && { status: Boolean(status) })
        });

        const updatedPackage = await Package.findByPk(id, {
            include: [{
                model: ProviderConfig,
                as: 'provider',
                attributes: ['id', 'provider', 'name', 'active']
            }]
        });

        res.json({
            message: 'Package edited successfully',
            data: updatedPackage
        });
    } catch (error) {
        console.error('Error updating package:', error);
        res.status(500).json({ error: 'Error, Something went wrong' });
    }
});

packagesRouter.patch("/:id/toggle", requireAuth, async (req, res, next) => {
    try {
        const { id } = req.params;

        const packageItem = await Package.findByPk(id);
        if (!packageItem) {
            return res.status(404).json({ error: "Package not found" });
        }

        await packageItem.update({ status: !packageItem.status });

        res.json({
            message: `Package ${packageItem.status ? 'activated' : 'deactivated'} successfully`,
            data: {
                id: packageItem.id,
                status: packageItem.status
            }
        });
    } catch (error) {
        console.error('Error toggling package status:', error);
        res.status(500).json({ error: 'Error updating package status' });
    }
});


packagesRouter.delete("/:id", requireApiKey, async (req, res, next) => {
    try {
        const { id } = req.params;

        const packageItem = await Package.findByPk(id);
        if (!packageItem) {
            return res.status(404).json({ error: "Package not found" });
        }

        await packageItem.destroy();
        res.json({ status: 200, message: 'Success' });
    } catch (error) {
        console.error('Error deleting package:', error);
        res.status(500).json({ error: 'Something went wrong' });
    }
});


packagesRouter.get("/ajax", requireApiKey, async (req, res, next) => {
    try {
        const packages = await Package.findAll({
            order: [['id', 'ASC']]
        });
        res.json(packages);
    } catch (error) {
        console.error('Error fetching packages:', error);
        next(error);
    }
});