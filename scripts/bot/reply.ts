import { postToChannel } from "./discord-api";

const raw = await Bun.stdin.text();
if (!raw.trim()) {
  console.error("No payload on stdin");
  process.exit(1);
}

let thread_id: string;
let content: string;
try {
  const payload = JSON.parse(raw.trim()) as { thread_id?: string; content?: string };
  if (!payload.thread_id || !payload.content) {
    console.error('Payload must have "thread_id" and "content"');
    process.exit(1);
  }
  thread_id = payload.thread_id;
  content = payload.content;
} catch {
  console.error('Invalid JSON — expected { thread_id: string, content: string }');
  process.exit(1);
  throw new Error("unreachable");
}

await postToChannel(thread_id, content);
console.log(`Reply posted to thread ${thread_id}`);
