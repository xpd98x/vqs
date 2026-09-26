const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const TOKEN = process.env.KICK_TOKEN;
const CHANNEL = "lBotRix";

if (!TOKEN) {
  throw new Error("KICK_TOKEN is missing");
}

async function getChatroomId() {
  const url = `https://kick.com/api/v2/channels/${CHANNEL}/chatroom`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Accept": "application/json",
      "Authorization": `Bearer ${TOKEN}`,
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

  // Kick بيرجع الـid مباشرة
  const chatroomId = data?.id;

  if (!chatroomId) {
    throw new Error(
      `chatroom_id not found:\n${JSON.stringify(data)}`
    );
  }

  return chatroomId;
}

async function sendMessage(chatroomId) {
  const url =
    `https://kick.com/api/v2/messages/send/${encodeURIComponent(chatroomId)}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json",
      "Authorization": `Bearer ${TOKEN}`,
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
    `${new Date().toISOString()} | HTTP ${response.status} | ${text}`
  );

  if (response.status === 429) {
    console.log("Kick rate limit reached. Waiting 60 seconds...");
    await sleep(60_000);
    return;
  }

  if (!response.ok) {
    throw new Error(`Send failed: ${response.status} ${text}`);
  }
}

async function main() {
  const chatroomId = await getChatroomId();

  console.log(`Channel: ${CHANNEL}`);
  console.log(`Chatroom ID: ${chatroomId}`);
  console.log("Bot started.");

  while (true) {
    try {
      await sendMessage(chatroomId);
    } catch (error) {
      console.error(
        `${new Date().toISOString()} | ${error.message}`
      );
    }

    // كل 10 ثواني
    await sleep(10_000);
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
