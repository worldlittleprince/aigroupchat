import { io } from "socket.io-client";

const A = io("http://localhost:3000", { auth: { roomId: "room-a" } });
const B = io("http://localhost:3000", { auth: { roomId: "room-b" } });

let aHistory = null;
let bHistory = null;
let aMessages = [];
let bMessages = [];

function waitFor(socket, event) {
  return new Promise((resolve) => socket.once(event, resolve));
}

async function main() {
  await Promise.all([
    new Promise((r) => A.on("connect", r)),
    new Promise((r) => B.on("connect", r)),
  ]);

  aHistory = await waitFor(A, "history");
  bHistory = await waitFor(B, "history");

  A.on("message", (m) => aMessages.push(m));
  B.on("message", (m) => bMessages.push(m));

  // Send one message in room-a only
  A.emit("user_message", { content: "hello from A", displayName: "A" });

  // Wait a bit to allow broadcasts
  await new Promise((r) => setTimeout(r, 600));

  console.log(
    JSON.stringify({
      aInitial: aHistory.length,
      bInitial: bHistory.length,
      aNewMessages: aMessages.filter((m) => m.content.includes("hello from A")).length,
      bNewMessages: bMessages.filter((m) => m.content.includes("hello from A")).length,
    })
  );

  A.close();
  B.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

