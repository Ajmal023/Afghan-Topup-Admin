import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { errorHandler } from "./middlewares/errorHandler.js";
import routes from './routes/index.js';
import path from "node:path";
import { stripeWebhooksRouter } from './routes/stripeWebhooks.js';
import { fileURLToPath } from "node:url";
import { requestLogger } from "./middlewares/requestLogger.js";
import { latencyLogger } from "./middlewares/latencyLogger.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function createServer() {
    const app = express();


    app.use(helmet());
    app.use("/api/webhook", stripeWebhooksRouter);

    app.use(express.json({ limit: "2mb" }));
    app.use(express.urlencoded({ extended: true, limit: "2mb" }));


    app.use(
        cors({
            origin: ["http://localhost:3000", "http://localhost:4000", 'http://localhost:5173',  'http://localhost:5174',"http://afghan-topup.com:8081", "https://wnffwl6f-5173.inc1.devtunnels.ms","https://afghan-topup.com","http://afghan-topup.com" , "http://3.67.144.22/afghan-t/frontend/cms/", "http://3.67.144.22"],
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        })
    );
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cookie, Set-Cookie');
    next();
});
    app.use(cookieParser());


    app.use(morgan("dev"));
    app.use(latencyLogger);
   app.use(requestLogger);
    app.use(
        rateLimit({
            windowMs: 15 * 60 * 1000,
            max: 10000,
        })
    );
 

    app.use("/api", routes);
app.use('/uploads', express.static('public/uploads'));
    const adminDir = path.join(__dirname, "../public-admin");
    app.use("/admin", express.static(adminDir));
    app.get("/admin/*", (_req, res) => res.sendFile(path.join(adminDir, "index.html")));

    app.use(errorHandler);

    return app;
}