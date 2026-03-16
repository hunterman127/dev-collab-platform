function registerChatSocket(io, pool) {
    io.on("connection", (socket) => {
        console.log("A user connected");

        socket.on("join_project", (projectId) => {
            socket.join(`project_${projectId}`);
            console.log(`Socket joined project_${projectId}`);
        });

        socket.on("send_message", async (data) => {
            console.log("socket send_message data:", data);

            const { projectId, senderId, content } = data;

            if (!content || content.trim() === "") {
                console.log("message rejected: empty");
                return;
            }

            if (content.length > 1000) {
                console.log("message rejected: too long");
                return;
            }

            const result = await pool.query(
                `INSERT INTO messages (project_id, sender_id, content)
                VALUES ($1, $2, $3)
                RETURNING id`,
                [projectId, senderId, content]
            );

            console.log("saved message id:", result.rows[0].id);

            const message = await pool.query(
                `SELECT m.id, m.project_id, m.sender_id, m.content, m.sent_at, u.username
                FROM messages m
                JOIN users u
                ON m.sender_id = u.id
                WHERE m.id = $1`,
                [result.rows[0].id]
            );

            console.log("broadcasting to room:", `project_${projectId}`);
            console.log("message payload:", message.rows[0]);

            io.to(`project_${projectId}`).emit("new_message", message.rows[0]);
        });

        socket.on("disconnect", () => {
            console.log("A user disconnected");
        });
    });
}

module.exports = registerChatSocket;