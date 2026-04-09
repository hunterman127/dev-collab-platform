const express = require("express");
const pool = require("../db");
const authMiddleware = require("../middleware/authMiddleware");
const authenticateToken = require("../middleware/authMiddleware");
const router = express.Router();

router.post("/", authMiddleware, async (req, res) => {
  try {
    const { name, description, status, tech_stack, repo_url } = req.body;

    const project = await pool.query(
      `INSERT INTO projects (name, description, owner_id, status, tech_stack, repo_url)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING *`,
      [name, description, req.user.id, status, tech_stack, repo_url]
    );

    const projectId = project.rows[0].id;

    await pool.query(
      `INSERT INTO memberships (user_id, project_id, role)
       VALUES ($1,$2,$3)`,
      [req.user.id, projectId, "owner"]
    );

    res.json(project.rows[0]);
  } catch (err) {
    console.error("failed to create project:", err);
    res.status(500).json({ error: "Failed to create project" });
  }
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

router.get("/invites", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        invites.id,
        invites.project_id,
        invites.status,
        invites.created_at,
        projects.name AS project_name,
        users.username AS sender_username
      FROM invites
      JOIN projects ON invites.project_id = projects.id
      JOIN users ON invites.sender_id = users.id
      WHERE invites.receiver_id = $1
        AND invites.status = 'pending'
      ORDER BY invites.created_at DESC
      `,
      [req.user.id]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("failed to load invites:", err);
    res.status(500).json({ error: "Failed to load invites" });
  }
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

router.delete("/:projectId/members/:userId", authMiddleware, async (req, res) => {
  try {
    const projectId = req.params.projectId;
    const targetUserId = req.params.userId;

    // check requester is owner
    const project = await pool.query(
      "SELECT * FROM projects WHERE id = $1 AND owner_id = $2",
      [projectId, req.user.id]
    );

    if (project.rows.length === 0) {
      return res.status(403).json({ error: "Only owner can remove members" });
    }

    // prevent owner removing themselves
    if (Number(targetUserId) === req.user.id) {
      return res.status(400).json({ error: "Owner cannot remove themselves" });
    }

    // remove member
    const result = await pool.query(
      "DELETE FROM memberships WHERE project_id = $1 AND user_id = $2 RETURNING *",
      [projectId, targetUserId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Member not found" });
    }

    return res.json({ message: "Member removed" });
  } catch (err) {
    console.error("remove member error:", err);
    return res.status(500).json({ error: "Failed to remove member" });
  }
});

router.get("/:id/tasks", authMiddleware, async (req, res) => {
  try {
    const projectId = Number(req.params.id);

    const membership = await pool.query(
      `SELECT *
       FROM memberships
       WHERE project_id = $1 AND user_id = $2`,
      [projectId, req.user.id]
    );

    if (membership.rows.length === 0) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const tasks = await pool.query(
      `SELECT tasks.*, users.username AS assigned_username
       FROM tasks
       LEFT JOIN users ON tasks.assigned_to = users.id
       WHERE tasks.project_id = $1
       ORDER BY tasks.created_at DESC`,
      [projectId]
    );

    res.json(tasks.rows);
  } catch (err) {
    console.error("failed to load tasks:", err);
    res.status(500).json({ error: "Failed to load tasks" });
  }
});

router.post("/:id/tasks", authMiddleware, async (req, res) => {
  try {
    const projectId = Number(req.params.id);
    const { title, description, status, assigned_to } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: "Task title is required" });
    }

    const membership = await pool.query(
      `SELECT *
      FROM memberships
      WHERE project_id = $1 AND user_id = $2`,
      [projectId, req.user.id]
    );

    if (membership.rows.length === 0) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const insertResult = await pool.query(
      `INSERT INTO tasks (project_id, title, description, status, assigned_to)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, project_id, title, description, status, assigned_to, created_at`,
      [
        projectId,
        title.trim(),
        description || null,
        status || "backlog",
        assigned_to ? Number(assigned_to) : null,
      ]
    );

    const newTaskId = insertResult.rows[0].id;

    const fullTask = await pool.query(
      `SELECT tasks.*, users.username AS assigned_username
       FROM tasks
       LEFT JOIN users ON tasks.assigned_to = users.id
       WHERE tasks.id = $1`,
      [newTaskId]
    );

    return res.json(fullTask.rows[0]);
  } catch (err) {
    console.error("failed to create task:", err);
    return res.status(500).json({
      error: "Failed to create task",
      details: err.message,
    });
  }
});

router.post("/:projectId/invite", authenticateToken, async (req, res) => {
  const { username } = req.body;
  const { projectId } = req.params;

  try {
    if (!username || !username.trim()) {
      return res.status(400).json({ error: "Username is required" });
    }

    const project = await pool.query(
      "SELECT * FROM projects WHERE id = $1 AND owner_id = $2",
      [projectId, req.user.id]
    );

    if (project.rows.length === 0) {
      return res.status(403).json({ error: "Only owner can send invites" });
    }

    const userResult = await pool.query(
      "SELECT id FROM users WHERE username = $1",
      [username.trim()]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const receiver_id = userResult.rows[0].id;

    if (receiver_id === req.user.id) {
      return res.status(400).json({ error: "You cannot invite yourself" });
    }

    const existingMember = await pool.query(
      `SELECT * FROM memberships
       WHERE project_id = $1 AND user_id = $2`,
      [projectId, receiver_id]
    );

    if (existingMember.rows.length > 0) {
      return res.status(400).json({ error: "User is already a project member" });
    }

    console.log("sending invite:", {
      projectId,
      senderId: req.user.id,
      receiverId: receiver_id,
      username: username.trim(),
    });

    const inviteResult = await pool.query(
      `INSERT INTO invites (project_id, sender_id, receiver_id, status)
       VALUES ($1, $2, $3, 'pending')
       ON CONFLICT (project_id, receiver_id)
       DO UPDATE SET
         sender_id = EXCLUDED.sender_id,
         status = 'pending',
         created_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [projectId, req.user.id, receiver_id]
    );

    console.log("invite upsert result:", inviteResult.rows[0]);

    return res.json({ message: "Invite sent" });
  } catch (err) {
    console.error("failed to send invite:", err);
    return res.status(500).json({
      error: "Failed to send invite",
      details: err.message,
    });
  }
});

router.post("/invites/:inviteId/accept", authenticateToken, async (req, res) => {
  const { inviteId } = req.params;

  try {
    const inviteResult = await pool.query(
      `SELECT * FROM invites
       WHERE id = $1 AND receiver_id = $2 AND status = 'pending'`,
      [inviteId, req.user.id]
    );

    if (inviteResult.rows.length === 0) {
      return res.status(404).json({ error: "Invite not found" });
    }

    const invite = inviteResult.rows[0];

    await pool.query(
      `INSERT INTO memberships (user_id, project_id, role)
       VALUES ($1, $2, 'member')
       ON CONFLICT DO NOTHING`,
      [req.user.id, invite.project_id]
    );

    await pool.query(
      `UPDATE invites
       SET status = 'accepted'
       WHERE id = $1`,
      [inviteId]
    );

    res.json({ message: "Invite accepted" });
  } catch (err) {
    console.error("failed to accept invite:", err);
    res.status(500).json({ error: "Failed to accept invite" });
  }
});

router.post("/invites/:inviteId/decline", authenticateToken, async (req, res) => {
  const { inviteId } = req.params;

  try {
    const result = await pool.query(
      `UPDATE invites
       SET status = 'declined'
       WHERE id = $1 AND receiver_id = $2 AND status = 'pending'
       RETURNING *`,
      [inviteId, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Invite not found" });
    }

    res.json({ message: "Invite declined" });
  } catch (err) {
    console.error("failed to decline invite:", err);
    res.status(500).json({ error: "Failed to decline invite" });
  }
});


router.patch("/:projectId/tasks/:taskId", authMiddleware, async (req, res) => {
  try {
    const projectId = Number(req.params.projectId);
    const taskId = Number(req.params.taskId); 
    const { status } = req.body;

    const membership = await pool.query(
      `SELECT *
      FROM memberships
      WHERE project_id = $1 AND user_id = $2`,
      [projectId, req.user.id]
    );

    if (membership.rows.length === 0) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const allowedStatuses = ["backlog", "in_progress", "done"];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid task status" });
    }

    const result = await pool.query(
      `UPDATE tasks
       SET status = $1
       WHERE id = $2
       RETURNING *`,
      [status, taskId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Task not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("failed to update task status:", err);
    res.status(500).json({ error: "Failed to update task status" });
  }
});

router.delete("/:projectId/tasks/:taskId", authMiddleware, async (req, res) => {
  try {
    const projectId = Number(req.params.projectId);
    const taskId = Number(req.params.taskId);

    const membership = await pool.query(
      "SELECT * FROM projects WHERE id = $1 AND owner_id = $2",
      [projectId, req.user.id]
    );

    if (membership.rows.length === 0) {
      return res.status(403).json({ error: "Only owner can delete tasks" });
    }

    const result = await pool.query(
      `DELETE FROM tasks
       WHERE id = $1 AND project_id = $2
       RETURNING *`,
      [taskId, projectId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Task not found" });
    }

    return res.json({ message: "Task deleted", task: result.rows[0] });
  } catch (err) {
    console.error("failed to delete task:", err);
    return res.status(500).json({ error: "Failed to delete task" });
  }
});

router.delete("/:projectId/leave", authMiddleware, async (req, res) => {
  try {
    const projectId = req.params.projectId;

    const membership = await pool.query(
      `SELECT * FROM memberships
       WHERE project_id = $1 AND user_id = $2`,
      [projectId, req.user.id]
    );

    if (membership.rows.length === 0) {
      return res.status(404).json({ error: "Membership not found" });
    }

    const project = await pool.query(
      `SELECT * FROM projects WHERE id = $1`,
      [projectId]
    );

    if (project.rows.length === 0) {
      return res.status(404).json({ error: "Project not found" });
    }

    if (project.rows[0].owner_id === req.user.id) {
      return res.status(400).json({ error: "Owner cannot leave their own project" });
    }

    await pool.query(
      `DELETE FROM memberships
       WHERE project_id = $1 AND user_id = $2`,
      [projectId, req.user.id]
    );

    return res.json({ message: "Left project successfully" });
  } catch (err) {
    console.error("leave project error:", err);
    return res.status(500).json({ error: "Failed to leave project" });
  }
});

router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const projectId = req.params.id;
    const { description, status, tech_stack, repo_url } = req.body;

    const projectCheck = await pool.query(
      "SELECT * FROM projects WHERE id = $1 AND owner_id = $2",
      [projectId, req.user.id]
    );

    if (projectCheck.rows.length === 0) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const result = await pool.query(
      `UPDATE projects
       SET description = $1,
           status = $2,
           tech_stack = $3,
           repo_url = $4,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING *`,
      [description, status, tech_stack, repo_url, projectId]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("failed to update project:", err);
    res.status(500).json({ error: "Failed to update project" });
  }
});

module.exports = router;

