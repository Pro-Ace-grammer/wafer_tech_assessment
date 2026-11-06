"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const app_1 = __importDefault(require("./app"));
const prisma_1 = __importDefault(require("./config/prisma"));
const PORT = process.env.PORT || 5000;
// Wrapping the Express app in a native Node HTTP server
const httpServer = http_1.default.createServer(app_1.default);
// Initializing Socket.IO with CORS enabled for React
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST", "PATCH", "DELETE"]
    }
});
// Attaching the 'io' instance to the Express app 
// This allows our task controllers to access it via req.app.get("io")
app_1.default.set("io", io);
// Handle WebSocket connections
io.on("connection", (socket) => {
    console.log(`⚡ [Socket] User connected: ${socket.id}`);
    // When a user opens a project board, they join that project's specific room
    socket.on("joinProject", (projectId) => {
        socket.join(projectId);
        console.log(`👥 [Socket] User ${socket.id} joined project room: ${projectId}`);
    });
    // When they leave the board, they leave the room
    socket.on("leaveProject", (projectId) => {
        socket.leave(projectId);
        console.log(`👋 [Socket] User ${socket.id} left project room: ${projectId}`);
    });
    socket.on("disconnect", () => {
        console.log(`❌ [Socket] User disconnected: ${socket.id}`);
    });
});
const server = httpServer.listen(PORT, () => {
    console.log(`🚀 Server listening on http://localhost:${PORT}`);
    console.log(`📡 Health Check: http://localhost:${PORT}/api/health`);
    console.log(`🔌 WebSockets enabled and listening`);
});
const gracefulShutdown = async (signal) => {
    console.log(`\nReceived ${signal}. Gracefully shutting down...`);
    server.close(async () => {
        await prisma_1.default.$disconnect();
        console.log("Database connection closed. Process terminated.");
        process.exit(0);
    });
};
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
