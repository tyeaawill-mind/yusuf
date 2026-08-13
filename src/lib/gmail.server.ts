// Server-only Gmail sending helper via the Lovable connector gateway.

function utf8BinaryString(s: string): string {
  const enc = new TextEncoder().encode(s);
  let bin = "";
  for (let i = 0; i < enc.length; i++) bin += String.fromCharCode(enc[i]);
  return bin;
}

function base64UrlEncode(binary: string): string {
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function encodeSubject(str: string): string {
  // eslint-disable-next-line no-control-regex
  if (/^[\x00-\x7F]*$/.test(str)) return str;
  return `=?UTF-8?B?${btoa(utf8BinaryString(str))}?=`;
}

export async function sendGmail(opts: { to: string[]; subject: string; html: string }): Promise<void> {
  const lovableKey = process.env['LOVABLE_API_KEY'];
  const gmailKey = process.env['GOOGLE_MAIL_API_KEY'];
  if (!lovableKey || !gmailKey) throw new Error("Gmail connector is not configured.");

  const mime = [
    `To: ${opts.to.join(", ")}`,
    `Subject: ${encodeSubject(opts.subject)}`,
    `MIME-Version: 1.0`,
    `Content-Type: text/html; charset="UTF-8"`,
    `Content-Transfer-Encoding: base64`,
    ``,
    btoa(utf8BinaryString(opts.html)).replace(/(.{76})/g, "$1\r\n"),
  ].join("\r\n");

  const res = await fetch(
    "https://connector-gateway.lovable.dev/google_mail/gmail/v1/users/me/messages/send",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": gmailKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ raw: base64UrlEncode(utf8BinaryString(mime)) }),
    },
  );
  if (!res.ok) throw new Error(`Gmail send failed (${res.status}): ${await res.text()}`);
}
