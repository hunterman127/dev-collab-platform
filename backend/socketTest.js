const { io } = require("socket.io-client");

const socket = io("http://localhost:3000");

socket.on("connect", () => {
    socket.emit("join_project", 1);

    socket.emit("send_message", {
        projectId: 1,
        senderId: 3,
        content: "live socket test"
    });
});

socket.on("new_message", (message) => {
});