const authMiddleware = require("../middleware/authMiddleware");

const jwt = require("jsonwebtoken");

const bcrypt = require("bcrypt");

const pool = require("../db");

const express = require("express");

const router = express.Router();

const saltRounds = 10;

router.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const result = await pool.query(
      "INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email",
      [username, email, hashedPassword]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("register error:", err);

    if (err.code === "23505") {
      return res.status(400).json({ error: "Email already exists" });
    }

    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/login", async (req, res) => {

    const { email, password } = req.body;

    const result = await pool.query(
        "SELECT * FROM users WHERE email = $1",
        [email]
    );

    if (result.rows.length === 0) {
        return res.status(401).json({ error: "Invalid email or password" });
    }

    const user = result.rows[0];

    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
        return res.status(401).json({ error: "Invalid email or password" });
    }

    const token = jwt.sign(
        { id: user.id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: "1h" }
    );

    res.json({
        token,
        user: {
            id: user.id,
            username: user.username,
            email: user.email
        }
    });

});

router.get("/me", authMiddleware, async (req, res) => {
    const result = await pool.query(
        "SELECT id, username, email FROM users WHERE id = $1",
        [req.user.id]
    );

    res.json(result.rows[0]);
});



module.exports = router;