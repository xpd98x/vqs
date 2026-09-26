const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const TOKEN = process.env.KICK_TOKEN;
const CHANNEL = "lBotRix";

if (!TOKEN) {
  throw new Error("KICK_TOKEN is missing");
}

async function getChatroomId() {
  const url = `https://kick.com/api/v2/channels/${CHANNEL}/chatroom`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Accept: "application/json",
      "User-Agent": "Mozilla/5.0"
    }
  });

  const text = await response.text();

  if (!response.ok) {
    throw new Error(
      `Chatroom request failed: ${response.status}\n${text}`
    );
  }

  const data = JSON.parse(text);

  const chatroomId =
    data?.chatroom?.id ??
    data?.data?.chatroom?.id;

  if (!chatroomId) {
    throw new Error(`chatroom_id not found:\n${JSON.stringify(data)}`);
  }

  return chatroomId;
}

async function sendMessage(chatroomId) {
  const url =
    `https://kick.com/api/v2/messages/send/${encodeURIComponent(chatroomId)}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0"
    },
    body: JSON.stringify({
      content: "اهلا بكم",
      type: "message",
      message_ref: String(Date.now())
    })
  });

  const text = await response.text();

  console.log(
    new Date().toISOString(),
    "status:",
    response.status,
    text
  );

  if (!response.ok) {
    throw new Error(`Send failed: ${response.status} ${text}`);
  }
}

async function main() {
  const chatroomId = await getChatroomId();

  console.log("Chatroom ID:", chatroomId);
  console.log("Bot started.");

  while (true) {
    try {
      await sendMessage(chatroomId);
    } catch (error) {
      console.error(error.message);
    }

    await sleep(10_000);
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
