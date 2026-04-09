require("dotenv").config();

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const registerChatSocket = require("./sockets/chatSocket");
const cors = require("cors");
const pool = require("./db");
const authRoutes = require("./routes/authRoutes");
const projectRoutes = require("./routes/projectRoutes");

const app = express();
app.use(express.json());
app.use(cors());
app.use("/auth", authRoutes);
app.use("/projects", projectRoutes);

app.get("/", async (req, res) => {
    const result = await pool.query("SELECT NOW()");
    res.send(result.rows[0]);
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

registerChatSocket(io, pool);

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});