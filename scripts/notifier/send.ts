import { sendNotification } from "./index";

const message = await Bun.stdin.text();
if (!message.trim()) {
  console.error("No message provided on stdin");
  process.exit(1);
}

await sendNotification(message.trim());
