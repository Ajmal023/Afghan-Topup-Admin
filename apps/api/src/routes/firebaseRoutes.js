import { Router } from "express";
import firebaseService from "../services/firebaseService.js";
import { requireAuth, requireRole } from "../middlewares/auth.js";
import { Customers } from "../models/index.js";

export const firebaseRouter = Router();



firebaseRouter.post("/sync-customers", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const { batchSize = 100, syncType = "full", lastNCustomers = 1000 } = req.body;

    console.log(` Starting ${syncType} sync with batchSize: ${batchSize}`);

    let syncResult;
    
    switch (syncType) {
      case "recent":
        syncResult = await firebaseService.syncRecentCustomers(lastNCustomers, batchSize);
        break;
      case "new":
        syncResult = await firebaseService.syncNewCustomers(batchSize);
        break;
      case "full":
      default:
        syncResult = await firebaseService.syncCustomersToDatabase(batchSize);
        break;
    }

    res.json({
      data: syncResult,
      message: `Customer sync (${syncType}) completed successfully`
    });
  } catch (error) {
    console.error("Firebase sync error:", error);
    res.status(500).json({ error: error.message });
  }
});


firebaseRouter.get("/user-count", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const userCount = await firebaseService.getUserCount();
    
    res.json({
      data: {
        totalUsers: userCount
      },
      message: "User count fetched successfully"
    });
  } catch (error) {
    console.error("User count error:", error);
    res.status(500).json({ error: error.message });
  }
});

firebaseRouter.get("/analytics", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    console.time('Firebase Analytics');
    const analytics = await firebaseService.getUserAnalytics();
    console.timeEnd('Firebase Analytics');
    
    res.json({
      data: analytics,
      message: "Analytics fetched successfully"
    });
  } catch (error) {
    console.error(" Firebase analytics error:", error);
    res.status(500).json({ 
      error: error.message,
      details: "Check Firebase service account configuration"
    });
  }
});


firebaseRouter.get("/users/search", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const { uid, email, phone } = req.query;

    if (!uid && !email && !phone) {
      return res.status(400).json({
        error: "Please provide either uid, email, or phone number for search"
      });
    }

    let user;
    try {
      if (uid) {
        user = await firebaseService.searchUser(uid);
      } else if (email) {
        user = await firebaseService.getUserByEmail(email);
      } else if (phone) {
        user = await firebaseService.getUserByPhone(phone);
      }
    } catch (searchError) {
      return res.status(404).json({ error: searchError.message });
    }

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      data: user,
      message: "User found successfully"
    });
  } catch (error) {
    console.error("❌ Firebase user search error:", error);
    res.status(500).json({ error: error.message });
  }
});


firebaseRouter.get("/users", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const { page = 1, limit = 50, search = '' } = req.query;
    const allUsers = await firebaseService.listAllUsers();


    let filteredUsers = allUsers;
    if (search) {
      filteredUsers = allUsers.filter(user => 
        user.email?.toLowerCase().includes(search.toLowerCase()) ||
        user.phoneNumber?.includes(search) ||
        user.displayName?.toLowerCase().includes(search.toLowerCase()) ||
        user.uid.includes(search)
      );
    }

    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

    res.json({
      data: {
        users: paginatedUsers,
        pagination: {
          current: parseInt(page),
          total: Math.ceil(filteredUsers.length / limit),
          totalUsers: filteredUsers.length,
          hasNext: endIndex < filteredUsers.length,
          hasPrev: page > 1
        }
      },
      message: "Users fetched successfully"
    });
  } catch (error) {
    console.error("❌ Get users error:", error);
    res.status(500).json({ error: error.message });
  }
});


firebaseRouter.get("/sync-status", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const firebaseCount = await firebaseService.getUserCount();
    const dbCustomers = await Customers.findAll();
    
    const status = {
      firebase: {
        total: firebaseCount
      },
      database: {
        total: dbCustomers.length,
        active: dbCustomers.filter(c => c.status === 'active').length,
        inactive: dbCustomers.filter(c => c.status === 'inactive').length
      },
      difference: firebaseCount - dbCustomers.length,
      syncNeeded: firebaseCount !== dbCustomers.length
    };

    res.json({
      data: status,
      message: "Sync status fetched successfully"
    });
  } catch (error) {
    console.error("Sync status error:", error);
    res.status(500).json({ error: error.message });
  }
});

firebaseRouter.get("/test", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const result = await firebaseService.testConnection();
    
    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        data: {
          sampleUsers: result.sampleUsers,
          totalUsers: result.totalUsers
        }
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error("Firebase test endpoint error:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

