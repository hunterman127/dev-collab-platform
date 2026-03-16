const express = require("express");
const pool = require("../db");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/", authMiddleware, async (req, res) => {

    const { name, description, status } = req.body;

    const project = await pool.query(
        `INSERT INTO projects (name, description, owner_id, status)
         VALUES ($1,$2,$3,$4)
         RETURNING *`,
        [name, description, req.user.id, status]
    );

    const projectId = project.rows[0].id;

    await pool.query(
        `INSERT INTO memberships (user_id, project_id, role)
         VALUES ($1,$2,$3)`,
        [req.user.id, projectId, "owner"]
    );

    res.json(project.rows[0]);

});

router.get("/", authMiddleware, async (req, res) => {
    const result = await pool.query(
        `SELECT p.*
         FROM projects p
         JOIN memberships m
         ON p.id = m.project_id
         WHERE m.user_id = $1`,
        [req.user.id]
        );

    res.json(result.rows);
});

router.post("/:projectId/members", authMiddleware, async (req, res) => {

    const { userId, role } = req.body;

    const project = await pool.query(
        "SELECT * FROM projects WHERE id = $1 AND owner_id = $2",
        [req.params.projectId, req.user.id]
    );

    if (project.rows.length === 0) {
        return res.status(403).json({ error: "Not authorized" });
    }

    const result = await pool.query(
        "INSERT INTO memberships (user_id, project_id, role) VALUES ($1,$2,$3) RETURNING *",
        [userId, req.params.projectId, role]
    );

    res.json(result.rows[0]);

});

router.get("/:id", authMiddleware, async (req, res) => {
    const result = await pool.query(
        `SELECT p.*
         FROM projects p
         JOIN memberships m
         ON p.id = m.project_id
         WHERE p.id = $1 AND m.user_id = $2`,
        [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
        return res.status(404).json({ error: "Project not found or access denied" });
    }

    res.json(result.rows[0]);
});

router.get("/:id/members", authMiddleware, async (req, res) => {

    const project = await pool.query(
        `SELECT *
         FROM memberships
         WHERE project_id = $1 AND user_id = $2`,
        [req.params.id, req.user.id]
    );

    if (project.rows.length === 0) {
        return res.status(403).json({ error: "Not authorized" });
    }

    const result = await pool.query(
        `SELECT u.id, u.username, m.role
         FROM users u
         JOIN memberships m
         ON u.id = m.user_id
         WHERE m.project_id = $1`,
        [req.params.id]
    );

    res.json(result.rows);

});

router.get("/:id/messages", authMiddleware, async (req, res) => {

    const membership = await pool.query(
        `SELECT *
         FROM memberships
         WHERE project_id = $1 AND user_id = $2`,
        [req.params.id, req.user.id]
    );

    if (membership.rows.length === 0) {
        return res.status(403).json({ error: "Not authorized" });
    }

    const result = await pool.query(
        `SELECT m.id, m.project_id, m.sender_id, m.content, m.sent_at, u.username
         FROM messages m
         JOIN users u
         ON m.sender_id = u.id
         WHERE m.project_id = $1
         ORDER BY m.sent_at ASC`,
        [req.params.id]
    );

    res.json(result.rows);

});

router.post("/:id/messages", authMiddleware, async (req, res) => {

    const { content } = req.body;

    const membership = await pool.query(
        `SELECT *
         FROM memberships
         WHERE project_id = $1 AND user_id = $2`,
        [req.params.id, req.user.id]
    );

    if (membership.rows.length === 0) {
        return res.status(403).json({ error: "Not authorized" });
    }

    const result = await pool.query(
        `INSERT INTO messages (project_id, sender_id, content)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [req.params.id, req.user.id, content]
    );

    res.json(result.rows[0]);

});


router.delete("/:id", authMiddleware, async (req, res) => {
  const projectId = req.params.id;

  try {
    const projectCheck = await pool.query(
      "SELECT * FROM projects WHERE id = $1 AND owner_id = $2",
      [projectId, req.user.id]
    );

    if (projectCheck.rows.length === 0) {
      return res.status(404).json({ error: "Project not found or not authorized" });
    }

    await pool.query("DELETE FROM messages WHERE project_id = $1", [projectId]);
    await pool.query("DELETE FROM memberships WHERE project_id = $1", [projectId]);

    const result = await pool.query(
      "DELETE FROM projects WHERE id = $1 RETURNING *",
      [projectId]
    );

    res.json({ message: "Project deleted" });
  } catch (err) {
    console.error("delete project error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;

