import jwt from "jsonwebtoken";
import { User } from "../models/index.js";

export async function requireAuth(req, res, next) {
    console.log("=== requireAuth Debug ===");
    
    let token = req.cookies?.access_token;
    
    if (!token && req.headers.authorization) {
        const authHeader = req.headers.authorization;
        if (authHeader.startsWith('Bearer ')) {
            token = authHeader.substring(7);
            console.log("Token found in Authorization header");
        }
    }
    
    console.log("Access token present:", !!token);
    
    if (!token) {
        console.log("No access token found in cookies or Authorization header");
        return res.status(401).json({ error: "Unauthenticated" });
    }
    
    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        console.log("JWT payload:", payload);
        
        const user = await User.findByPk(payload.sub);
        console.log("User found:", user ? user.id : "NOT FOUND");
        
        if (!user) {
            console.log("User not found in database");
            return res.status(401).json({ error: "User not found" });
        }

        req.user = user;
        console.log("Authentication successful");
        next();
    } catch (error) {
        console.error("JWT verification failed:", error.message);
        return res.status(401).json({ error: "Invalid/expired token" });
    }
}

export const requireRole = (...roles) => (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
        return res.status(403).json({ error: "Forbidden" });
    }
    next();
};