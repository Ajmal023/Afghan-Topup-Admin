import admin from 'firebase-admin';
import { Customers } from '../models/index.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class FirebaseService {
  constructor() {
    if (!admin.apps.length) {
      try {
        const serviceAccountPath = join(__dirname, '../../afghan-topup-d6828accf376.json');
        const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
        
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount)
        });
        
        console.log('Firebase Admin initialized with service account file');
      } catch (fileError) {
        try {
          const serviceAccount = {
            type: process.env.FIREBASE_TYPE,
            project_id: process.env.FIREBASE_PROJECT_ID,
            private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
            private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
            client_email: process.env.FIREBASE_CLIENT_EMAIL,
            client_id: process.env.FIREBASE_CLIENT_ID,
            auth_uri: process.env.FIREBASE_AUTH_URI,
            token_uri: process.env.FIREBASE_TOKEN_URI,
            auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_CERT_URL,
            client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL
          };

          if (!serviceAccount.private_key || !serviceAccount.private_key.includes('BEGIN PRIVATE KEY')) {
            throw new Error('Invalid private key format');
          }

          admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
          });
          
          console.log('Firebase Admin initialized with environment variables');
        } catch (envError) {
          console.error('Failed to initialize Firebase Admin:', envError);
          throw new Error('Firebase initialization failed: ' + envError.message);
        }
      }
    }

    this.auth = admin.auth();
    console.log('Firebase Auth service initialized');
  }

 
  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }


  generateUserIdentifier(uid, providerData = []) {

    const providers = providerData.map(provider => provider.providerId).filter(Boolean);
    const primaryProvider = providers[0] || 'anonymous';
    
    return `${uid}@${primaryProvider}.user`;
  }


  async getUserCount() {
    try {
      console.log('Getting total user count from Firebase...');
      let totalCount = 0;
      let nextPageToken;
      let pageCount = 0;

      do {
        pageCount++;
        
   
        if (pageCount > 1) {
          await this.delay(300);
        }
        
        const listUsersResult = await this.auth.listUsers(1000, nextPageToken);
        totalCount += listUsersResult.users.length;
        nextPageToken = listUsersResult.pageToken;
        console.log(`Count page ${pageCount}: ${listUsersResult.users.length} users (Total so far: ${totalCount})`);
      } while (nextPageToken);

      console.log(`Total Firebase users: ${totalCount}`);
      return totalCount;
    } catch (error) {
      console.error('Get user count error:', error);
      throw new Error(`Failed to get user count: ${error.message}`);
    }
  }


  async listAllUsers(maxResults = 1000) {
    try {
      console.log('Fetching ALL Firebase users with rate limiting...');
      let allUsers = [];
      let nextPageToken;
      let pageCount = 0;
      const startTime = Date.now();

      do {
        pageCount++;
        console.log(`Fetching page ${pageCount} of Firebase users...`);
        
     
        if (pageCount > 1) {
          await this.delay(500);
        }
        
        const listUsersResult = await this.auth.listUsers(maxResults, nextPageToken);
        const usersInPage = listUsersResult.users;
        allUsers = allUsers.concat(usersInPage);
        nextPageToken = listUsersResult.pageToken;
        
        console.log(`Page ${pageCount}: ${usersInPage.length} users fetched (Total: ${allUsers.length})`);
        
      } while (nextPageToken);

      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000;
      
      console.log(`✅ COMPLETED: Total Firebase users fetched: ${allUsers.length} in ${duration.toFixed(2)} seconds`);
      
      return allUsers.map(user => ({
        uid: user.uid,
        email: user.email,
        phoneNumber: user.phoneNumber,
        displayName: user.displayName,
        emailVerified: user.emailVerified,
        disabled: user.disabled,
        providerData: user.providerData || [],
        metadata: {
          creationTime: user.metadata.creationTime,
          lastSignInTime: user.metadata.lastSignInTime
        }
      }));
    } catch (error) {
      console.error('Firebase list users error:', error);
      throw new Error(`Failed to list users: ${error.message}`);
    }
  }


  async syncCustomersToDatabase(batchSize = 100) {
    try {
      console.log('🚀 Starting comprehensive Firebase to database sync...');
      
  
      const totalCount = await this.getUserCount();
      console.log(`📊 Total Firebase users to process: ${totalCount}`);
      
      let nextPageToken;
      let pageCount = 0;
      let syncedCount = 0;
      let updatedCount = 0;
      let errors = [];
      const startTime = Date.now();

   
      do {
        pageCount++;
        

        if (pageCount > 1) {
          await this.delay(500);
        }
        
        console.log(`📄 Fetching and processing page ${pageCount}...`);
        const listUsersResult = await this.auth.listUsers(1000, nextPageToken);
        const usersInPage = listUsersResult.users;
        nextPageToken = listUsersResult.pageToken;

        console.log(`🔄 Processing ${usersInPage.length} users from page ${pageCount}...`);


        for (let i = 0; i < usersInPage.length; i += batchSize) {
          const batch = usersInPage.slice(i, i + batchSize);
          const batchNumber = Math.floor(i / batchSize) + 1;
          
          console.log(`⚡ Processing batch ${batchNumber} of page ${pageCount} (${batch.length} users)...`);

  
          for (const firebaseUser of batch) {
            try {
         
              let userEmail = firebaseUser.email;
              let userPhone = firebaseUser.phoneNumber || '';
              
         
              if (!userEmail) {
                if (userPhone) {
            
                  userEmail = `${userPhone.replace(/\+/g, '')}@phone.user`;
                } else {
                  userEmail = this.generateUserIdentifier(firebaseUser.uid, firebaseUser.providerData);
                }
              }

      
              let firstName = '';
              let lastName = '';
              if (firebaseUser.displayName) {
                const nameParts = firebaseUser.displayName.split(' ');
                firstName = nameParts[0] || '';
                lastName = nameParts.slice(1).join(' ') || '';
              }

              const customerData = {
                uid: firebaseUser.uid,
                email: userEmail,
                phone_number: userPhone,
                first_name: firstName,
                last_name: lastName,
                country_code: 'AF',
                status: firebaseUser.disabled ? 'inactive' : 'active',
      
                auth_provider: firebaseUser.providerData && firebaseUser.providerData.length > 0 
                  ? firebaseUser.providerData[0].providerId 
                  : 'firebase',
                email_verified: firebaseUser.emailVerified || false,
                phone_verified: !!firebaseUser.phoneNumber
              };

         
              const existingCustomer = await Customers.findOne({ where: { uid: firebaseUser.uid } });

              if (existingCustomer) {
                await existingCustomer.update(customerData);
                updatedCount++;
                if (updatedCount % 100 === 0) {
                  console.log(`✅ Updated ${updatedCount} customers so far...`);
                }
              } else {
                await Customers.create(customerData);
                syncedCount++;
                if (syncedCount % 100 === 0) {
                  console.log(`🆕 Synced ${syncedCount} new customers so far...`);
                }
              }

           
              await this.delay(10);

            } catch (error) {
              console.error(`❌ Error syncing user ${firebaseUser.uid}:`, error.message);
              errors.push({
                uid: firebaseUser.uid,
                email: firebaseUser.email || 'no-email',
                phone: firebaseUser.phoneNumber || 'no-phone',
                error: error.message
              });
            }
          }

 
          await this.delay(100);
        }

        const processedCount = syncedCount + updatedCount;
        const progress = (processedCount / totalCount) * 100;
        console.log(`📊 Progress: ${progress.toFixed(1)}% - Synced: ${syncedCount}, Updated: ${updatedCount}, Errors: ${errors.length}`);

      } while (nextPageToken);

      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000;
      
      const result = {
        totalFirebaseUsers: totalCount,
        totalProcessed: syncedCount + updatedCount,
        synced: syncedCount,
        updated: updatedCount,
        errors: errors,
        duration: `${duration.toFixed(2)} seconds`,
        successRate: ((syncedCount + updatedCount) / totalCount * 100).toFixed(1) + '%'
      };

      console.log('🎉 SYNC COMPLETED SUCCESSFULLY!');
      console.log('================================');
      console.log(`Total Users: ${totalCount}`);
      console.log(`New Customers: ${syncedCount}`);
      console.log(`Updated Customers: ${updatedCount}`);
      console.log(`Errors: ${errors.length}`);
      console.log(`Duration: ${duration.toFixed(2)} seconds`);
      console.log(`Success Rate: ${result.successRate}`);
      console.log('================================');
      
      return result;
    } catch (error) {
      console.error('❌ SYNC FAILED:', error);
      throw new Error(`Sync failed: ${error.message}`);
    }
  }


  async syncRecentCustomers(lastNCustomers = 1000, batchSize = 100) {
    try {
      console.log(`🚀 Fetching last ${lastNCustomers} recent Firebase users...`);
      
      let allUsers = [];
      let nextPageToken;
      let pageCount = 0;

     
      do {
        pageCount++;
        
      
        if (pageCount > 1) {
          await this.delay(500);
        }
        
        const listUsersResult = await this.auth.listUsers(1000, nextPageToken);
        allUsers = allUsers.concat(listUsersResult.users);
        nextPageToken = listUsersResult.pageToken;
        
        console.log(`📥 Collected ${allUsers.length} users so far...`);
        
     
        if (allUsers.length >= lastNCustomers) {
          break;
        }
      } while (nextPageToken);

      
      const sortedUsers = allUsers.sort((a, b) => {
        return new Date(b.metadata.creationTime) - new Date(a.metadata.creationTime);
      });
      
    
      const recentUsers = sortedUsers.slice(0, lastNCustomers);
      
      console.log(`🔄 Processing ${recentUsers.length} recent users...`);
      
      let syncedCount = 0;
      let updatedCount = 0;
      let errors = [];
      const startTime = Date.now();

    
      for (let i = 0; i < recentUsers.length; i += batchSize) {
        const batch = recentUsers.slice(i, i + batchSize);
        const batchNumber = Math.floor(i / batchSize) + 1;
        console.log(`⚡ Processing recent batch ${batchNumber} of ${Math.ceil(recentUsers.length / batchSize)}...`);

        for (const firebaseUser of batch) {
          try {
        
            let userEmail = firebaseUser.email;
            let userPhone = firebaseUser.phoneNumber || '';
            
            if (!userEmail) {
              if (userPhone) {
                userEmail = `${userPhone.replace(/\+/g, '')}@phone.user`;
              } else {
                userEmail = this.generateUserIdentifier(firebaseUser.uid, firebaseUser.providerData);
              }
            }

            let firstName = '';
            let lastName = '';
            if (firebaseUser.displayName) {
              const nameParts = firebaseUser.displayName.split(' ');
              firstName = nameParts[0] || '';
              lastName = nameParts.slice(1).join(' ') || '';
            }

            const customerData = {
              uid: firebaseUser.uid,
              email: userEmail,
              phone_number: userPhone,
              first_name: firstName,
              last_name: lastName,
              country_code: 'AF',
              status: firebaseUser.disabled ? 'inactive' : 'active',
              auth_provider: firebaseUser.providerData && firebaseUser.providerData.length > 0 
                ? firebaseUser.providerData[0].providerId 
                : 'firebase',
              email_verified: firebaseUser.emailVerified || false,
              phone_verified: !!firebaseUser.phoneNumber
            };

            const existingCustomer = await Customers.findOne({ where: { uid: firebaseUser.uid } });

            if (existingCustomer) {
              await existingCustomer.update(customerData);
              updatedCount++;
            } else {
              await Customers.create(customerData);
              syncedCount++;
            }

            await this.delay(10);

          } catch (error) {
            errors.push({ 
              uid: firebaseUser.uid, 
              email: firebaseUser.email || 'no-email',
              phone: firebaseUser.phoneNumber || 'no-phone',
              error: error.message 
            });
          }
        }

        await this.delay(100);
      }

      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000;

      return {
        totalRecentUsers: recentUsers.length,
        synced: syncedCount,
        updated: updatedCount,
        errors: errors,
        duration: `${duration.toFixed(2)} seconds`
      };
    } catch (error) {
      throw new Error(`Recent sync failed: ${error.message}`);
    }
  }

  async syncNewCustomers(batchSize = 100) {
    try {
      console.log('🚀 Starting smart sync - only new users...');
      
      const latestCustomer = await Customers.findOne({
        order: [['createdAt', 'DESC']]
      });

      let cutoffDate = new Date('2000-01-01'); 
      if (latestCustomer) {
        cutoffDate = new Date(latestCustomer.createdAt);
      }

      console.log(`📅 Syncing users created after: ${cutoffDate}`);

      let nextPageToken;
      let pageCount = 0;
      let syncedCount = 0;
      let updatedCount = 0;
      let errors = [];
      const startTime = Date.now();

      do {
        pageCount++;
        
   
        if (pageCount > 1) {
          await this.delay(500);
        }
        
        const listUsersResult = await this.auth.listUsers(1000, nextPageToken);
        const usersInPage = listUsersResult.users;
        nextPageToken = listUsersResult.pageToken;

      
        const newUsers = usersInPage.filter(user => {
          const userCreationTime = new Date(user.metadata.creationTime);
          return userCreationTime > cutoffDate;
        });

        console.log(`📄 Page ${pageCount}: ${usersInPage.length} total, ${newUsers.length} new users`);

       
        for (let i = 0; i < newUsers.length; i += batchSize) {
          const batch = newUsers.slice(i, i + batchSize);
          
          for (const firebaseUser of batch) {
            try {
        
              let userEmail = firebaseUser.email;
              let userPhone = firebaseUser.phoneNumber || '';
              
              if (!userEmail) {
                if (userPhone) {
                  userEmail = `${userPhone.replace(/\+/g, '')}@phone.user`;
                } else {
                  userEmail = this.generateUserIdentifier(firebaseUser.uid, firebaseUser.providerData);
                }
              }

              let firstName = '';
              let lastName = '';
              if (firebaseUser.displayName) {
                const nameParts = firebaseUser.displayName.split(' ');
                firstName = nameParts[0] || '';
                lastName = nameParts.slice(1).join(' ') || '';
              }

              const customerData = {
                uid: firebaseUser.uid,
                email: userEmail,
                phone_number: userPhone,
                first_name: firstName,
                last_name: lastName,
                country_code: 'AF',
                status: firebaseUser.disabled ? 'inactive' : 'active',
                auth_provider: firebaseUser.providerData && firebaseUser.providerData.length > 0 
                  ? firebaseUser.providerData[0].providerId 
                  : 'firebase',
                email_verified: firebaseUser.emailVerified || false,
                phone_verified: !!firebaseUser.phoneNumber
              };

              const existingCustomer = await Customers.findOne({ where: { uid: firebaseUser.uid } });

              if (existingCustomer) {
                await existingCustomer.update(customerData);
                updatedCount++;
              } else {
                await Customers.create(customerData);
                syncedCount++;
              }

              await this.delay(10);

            } catch (error) {
              errors.push({ 
                uid: firebaseUser.uid, 
                email: firebaseUser.email || 'no-email',
                phone: firebaseUser.phoneNumber || 'no-phone',
                error: error.message 
              });
            }
          }

          await this.delay(100);
        }

       
        if (newUsers.length === 0) {
          console.log('✅ No more new users found, stopping sync.');
          break;
        }

      } while (nextPageToken);

      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000;

      return {
        totalProcessed: syncedCount + updatedCount,
        synced: syncedCount,
        updated: updatedCount,
        errors: errors,
        cutoffDate: cutoffDate,
        duration: `${duration.toFixed(2)} seconds`
      };
    } catch (error) {
      throw new Error(`Smart sync failed: ${error.message}`);
    }
  }


  async getUserAnalytics() {
    try {
      console.log('📊 Fetching Firebase analytics...');
      const totalCount = await this.getUserCount();
      
      const sampleUsers = await this.auth.listUsers(2000);
      const users = sampleUsers.users;
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
      const analytics = {
        totalUsers: totalCount,
        activeUsers: users.filter(u => !u.disabled).length,
        disabledUsers: users.filter(u => u.disabled).length,
        emailVerified: users.filter(u => u.emailVerified).length,
        withPhone: users.filter(u => u.phoneNumber).length,
        withEmail: users.filter(u => u.email).length,
        phoneOnly: users.filter(u => !u.email && u.phoneNumber).length,
        anonymousUsers: users.filter(u => !u.email && !u.phoneNumber).length,
        recentUsers: users.filter(u => {
          try {
            const creationTime = new Date(u.metadata.creationTime);
            return creationTime > thirtyDaysAgo;
          } catch (e) {
            return false;
          }
        }).length
      };

      console.log('📈 Firebase analytics calculated:', analytics);
      return analytics;
    } catch (error) {
      console.error('❌ Analytics failed:', error);
      throw new Error(`Analytics failed: ${error.message}`);
    }
  }

 
  async testConnection() {
    try {
      console.log('🔌 Testing Firebase connection...');
      const totalCount = await this.getUserCount();
      const sampleUsers = await this.auth.listUsers(5);
      
      return {
        success: true,
        message: "Firebase connection successful",
        totalUsers: totalCount,
        sampleUsers: sampleUsers.users.slice(0, 3).map(user => ({
          uid: user.uid,
          email: user.email,
          phoneNumber: user.phoneNumber,
          displayName: user.displayName
        }))
      };
    } catch (error) {
      console.error('❌ Firebase connection test failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }


  async searchUser(uid) {
    try {
      console.log(`🔍 Searching Firebase user with UID: ${uid}`);
      const user = await this.auth.getUser(uid);
      return {
        uid: user.uid,
        email: user.email || 'N/A',
        phoneNumber: user.phoneNumber || 'N/A',
        displayName: user.displayName || 'N/A',
        emailVerified: user.emailVerified,
        disabled: user.disabled,
        providerData: user.providerData || [],
        metadata: {
          creationTime: user.metadata.creationTime,
          lastSignInTime: user.metadata.lastSignInTime
        }
      };
    } catch (error) {
      throw new Error(`User not found: ${error.message}`);
    }
  }


  async getUserByEmail(email) {
    try {
      console.log(`🔍 Searching Firebase user with email: ${email}`);
      const user = await this.auth.getUserByEmail(email);
      return {
        uid: user.uid,
        email: user.email || 'N/A',
        phoneNumber: user.phoneNumber || 'N/A',
        displayName: user.displayName || 'N/A',
        emailVerified: user.emailVerified,
        disabled: user.disabled,
        providerData: user.providerData || [],
        metadata: {
          creationTime: user.metadata.creationTime,
          lastSignInTime: user.metadata.lastSignInTime
        }
      };
    } catch (error) {
      throw new Error(`User not found with email: ${email}`);
    }
  }


  async getUserByPhone(phone) {
    try {
      console.log(`🔍 Searching Firebase user with phone: ${phone}`);
      const user = await this.auth.getUserByPhoneNumber(phone);
      return {
        uid: user.uid,
        email: user.email || 'N/A',
        phoneNumber: user.phoneNumber || 'N/A',
        displayName: user.displayName || 'N/A',
        emailVerified: user.emailVerified,
        disabled: user.disabled,
        providerData: user.providerData || [],
        metadata: {
          creationTime: user.metadata.creationTime,
          lastSignInTime: user.metadata.lastSignInTime
        }
      };
    } catch (error) {
      throw new Error(`User not found with phone: ${phone}`);
    }
  }
}

export default new FirebaseService();