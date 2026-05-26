import { sendNotification } from "./index";

const raw = await Bun.stdin.text();
if (!raw.trim()) {
  console.error("No message provided on stdin");
  process.exit(1);
}

let title: string;
let body: string;
let booli_id: string | undefined;
try {
  const payload = JSON.parse(raw.trim()) as {
    title?: string;
    body?: string;
    booli_id?: string;
  };
  if (!payload.title || !payload.body) {
    console.error('Payload must have "title" and "body" fields');
    process.exit(1);
  }
  title = payload.title;
  body = payload.body;
  booli_id = payload.booli_id;
} catch {
  console.error(
    "Invalid JSON on stdin — expected { title: string, body: string, booli_id?: string }",
  );
  process.exit(1);
  throw new Error("unreachable");
}

await sendNotification({ title, body, booli_id });
