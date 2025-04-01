// backend/server.js

const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require("cors");
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET; // <<<--- Use a strong, secret key!

// === Your Atlas Connection String ===
// IMPORTANT: For real applications, use environment variables for sensitive data like this!
const ATLAS_URI = process.env.ATLAS_URI;

// === Middleware ===
app.use(cors()); // Allow requests from frontend
app.use(express.json()); // Parse JSON request bodies

// === Database Connection ===
mongoose.connect(ATLAS_URI) // <<<--- USE THE ATLAS STRING HERE
    .then(() => console.log("MongoDB Atlas Connected Successfully!")) // Updated log message
    .catch(err => {
        console.error("MongoDB Atlas Connection Error:", err); // Updated log message
    });

// === Mongoose Schemas ===
const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true }
});

const TaskSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    completed: { type: Boolean, default: false }
});

// === Mongoose Models ===
const User = mongoose.model("User", UserSchema);
const Task = mongoose.model("Task", TaskSchema);

// === Authentication Middleware ===
const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: "Unauthorized: No token provided" });
    }
    const token = authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).json({ message: "Unauthorized: Malformed token" });
    }
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded; // Attach { userId: '...' } to request
        next();
    } catch (err) {
        console.error("JWT Verification Error:", err.message);
        return res.status(403).json({ message: "Forbidden: Invalid or expired token" });
    }
};

// === API Routes ===

// Register User
app.post("/register", async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) return res.status(400).json({ message: "Username and password required" });
        const existingUser = await User.findOne({ username });
        if (existingUser) return res.status(409).json({ message: "Username already taken" });
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const newUser = new User({ username, password: hashedPassword });
        await newUser.save();
        res.status(201).json({ message: "User registered successfully" });
    } catch (error) {
        console.error("Registration Error:", error);
        res.status(500).json({ message: "Server error during registration" });
    }
});

// Login User
app.post("/login", async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) return res.status(400).json({ message: "Username and password required" });
        const user = await User.findOne({ username });
        if (!user) return res.status(401).json({ message: "Invalid credentials" });
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ message: "Invalid credentials" });
        const payload = { userId: user._id };
        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "1h" });
        res.json({ message: "Login successful", token });
    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ message: "Server error during login" });
    }
});

// Create Task (Protected)
app.post("/tasks", authMiddleware, async (req, res) => {
    try {
        const { title } = req.body;
        if (!title) return res.status(400).json({ message: "Task title is required" });
        const newTask = new Task({ title, userId: req.user.userId, completed: false });
        const savedTask = await newTask.save();
        res.status(201).json(savedTask);
    } catch (error) {
        console.error("Create Task Error:", error);
        res.status(500).json({ message: "Server error creating task" });
    }
});

// Get User's Tasks (Protected)
app.get("/tasks", authMiddleware, async (req, res) => {
    try {
        const tasks = await Task.find({ userId: req.user.userId });
        res.json(tasks);
    } catch (error) {
        console.error("Get Tasks Error:", error);
        res.status(500).json({ message: "Server error fetching tasks" });
    }
});

// Update Task (Protected)
app.put("/tasks/:id", authMiddleware, async (req, res) => {
    try {
        const { completed, title } = req.body;
        const taskId = req.params.id;
        const task = await Task.findOne({ _id: taskId, userId: req.user.userId });
        if (!task) return res.status(404).json({ message: "Task not found or permission denied" });
        if (typeof completed === 'boolean') task.completed = completed;
        if (title) task.title = title;
        const updatedTask = await task.save();
        res.json({ message: "Task updated", task: updatedTask });
    } catch (error) {
         console.error("Update Task Error:", error);
         if (error.kind === 'ObjectId') return res.status(400).json({ message: "Invalid Task ID" });
         res.status(500).json({ message: "Server error updating task" });
    }
});

// Delete Task (Protected)
app.delete("/tasks/:id", authMiddleware, async (req, res) => {
    try {
        const taskId = req.params.id;
        const result = await Task.deleteOne({ _id: taskId, userId: req.user.userId });
        if (result.deletedCount === 0) return res.status(404).json({ message: "Task not found or permission denied" });
        res.json({ message: "Task deleted" });
    } catch (error) {
        console.error("Delete Task Error:", error);
        if (error.kind === 'ObjectId') return res.status(400).json({ message: "Invalid Task ID" });
        res.status(500).json({ message: "Server error deleting task" });
    }
});

// === Start Server ===
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));