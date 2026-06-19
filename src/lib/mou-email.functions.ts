import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import asset1847 from "@/assets/mou/IMG_1847.jpeg.asset.json";
import asset1848 from "@/assets/mou/IMG_1848.jpeg.asset.json";
import asset1849 from "@/assets/mou/IMG_1849.jpeg.asset.json";
import asset1802 from "@/assets/mou/IMG_1802.jpeg.asset.json";
import asset1846 from "@/assets/mou/IMG_1846.jpeg.asset.json";
import assetPdf from "@/assets/mou/MOU_Jun_19_2026.pdf.asset.json";

const ATTACHMENTS = [
  { url: asset1847.url, filename: "IMG_1847.jpeg", contentType: "image/jpeg" },
  { url: asset1848.url, filename: "IMG_1848.jpeg", contentType: "image/jpeg" },
  { url: asset1849.url, filename: "IMG_1849.jpeg", contentType: "image/jpeg" },
  { url: asset1802.url, filename: "IMG_1802.jpeg", contentType: "image/jpeg" },
  { url: asset1846.url, filename: "IMG_1846.jpeg", contentType: "image/jpeg" },
  { url: assetPdf.url, filename: "MOU_Jun_19_2026.pdf", contentType: "application/pdf" },
];

const TO = ["ahsan.russel@nbr.gov.bd", "mdahsan@yusuf.ltd"];
const SUBJECT = "MoU of 19 Jun 2026, Friday";

// Body extracted verbatim from the attached MoU images (IMG_1847 / 1848 / 1849).
const BODY = `ISLAMABAD MEMORANDUM OF UNDERSTANDING
BETWEEN
THE ISLAMIC REPUBLIC OF IRAN
AND
THE UNITED STATES OF AMERICA

The Islamic Republic of Iran and the United States of America have jointly agreed, in good faith, on ......... 2026, at ...................., on the following:

1. The Islamic Republic of Iran and the United States of America, and their allies in the current war, by signing this MoU, declare the immediate and permanent termination of military operations on all fronts, including in Lebanon, and undertake from now on not to initiate any war or any military operation against each other, and to refrain from the threat or use of force against each other, and ensuring the territorial integrity and sovereignty of Lebanon. The final Deal will confirm the permanent termination of the war on all fronts, including in Lebanon, and other provisions of this paragraph.

2. The Islamic Republic of Iran and the United States of America undertake to respect each other's sovereignty and territorial integrity and to refrain from interfering in each other's internal affairs.

3. The Islamic Republic of Iran and the United States of America commit to negotiating and achieving the final Deal, in maximum 60 days extendable with mutual consent.

4. Immediately upon the signing of this MoU, the United States of America will begin the removal of its naval blockade and any disturbances or impediments against the Islamic Republic of Iran, and will fully end the naval blockade within 30 days. During this period, the traffic of vessels will be in proportion to the numbers of pre-war traffic being restored by the Islamic Republic of Iran. The United States of America further undertakes to remove its forces from the proximity of the Islamic Republic of Iran within 30 days after the final Deal.

5. Upon the signing of this MoU, the Islamic Republic of Iran will make arrangements using its best efforts for the safe passage of commercial vessels, with no charge for 60 days only, from the Persian Gulf to the Sea of Oman, and vice versa. The traffic of commercial vessels will immediately start, and considering the need for removing the technical and military obstacles, and de-mining by the Islamic Republic of Iran, will be instated within 30 days. The Islamic Republic of Iran will conduct dialogue with the Sultanate of Oman, to define the future administration and maritime services in the Strait of Hormuz, in discussions with other Persian Gulf Littoral States, in line with applicable international law and the sovereign rights of coastal states of the Strait of Hormuz.

6. The United States of America undertakes, with regional partners, to develop a definitive mutually agreed plan with at least USD 300 Billion, for the reconstruction and economic development of the Islamic Republic of Iran. The mechanism for the implementation of this plan will be finalized as part of final Deal within 60 days. All required licenses, waivers and permissions needed for the relevant financial transactions will be granted by the United States of America.

7. The United States of America undertakes to terminate all types of sanctions against the Islamic Republic of Iran, including the United Nations Security Council resolutions, IAEA Board of Governors resolutions and all unilateral U.S. sanctions, primary and secondary, in an agreed upon schedule as part of the final Deal. The Islamic Republic of Iran and the United States of America acknowledge the critical importance of the sanctions termination issue above mentioned and express their intentions to immediately address these issues in the negotiations in order to achieve mutual agreement on them.

8. The Islamic Republic of Iran reaffirms that it shall not procure or develop nuclear weapons. The Islamic Republic of Iran and the United States of America have agreed to resolve the disposition of stockpiled enriched material pursuant to a mechanism that will be mutually agreed upon, in accordance with the schedule mentioned in paragraph 7, with the minimum methodology to be down blending on-site, under the supervision of the IAEA. The two Parties also agree to discuss the issue of enrichment, and other mutually agreed matters related to the Islamic Republic of Iran's nuclear needs, based on a satisfactory framework being agreed upon in the final Deal. The final Deal will confirm the provisions of this paragraph. The Islamic Republic of Iran and the United States of America acknowledge the critical importance of the nuclear issues above mentioned and express their intentions to immediately address these issues in the negotiations in order to achieve mutual agreement on them.

9. Pending the final Deal, the Islamic Republic of Iran and the United States of America agree to maintain the status quo; the Islamic Republic of Iran will maintain the current status quo of its nuclear program, and the United States of America will not impose any new sanctions, and will not deploy additional forces in the region.

10. The United States of America undertakes that immediately upon the signing of this MoU, and until the termination of sanctions, the U.S. Department of Treasury will issue waivers for the export of Iranian crude oil, petroleum products and derivatives, and all associated services including banking transactions, insurances, transportation, etc.

11. The United States of America undertakes to make fully available for use, the frozen or restricted funds and assets of the Islamic Republic of Iran upon the implementation of this MoU. The United States of America and the Islamic Republic of Iran will mutually agree on the procedures related to the release of these funds during the negotiations. Such funds, whether retained in the original account or transferred, shall be made fully useable for payment to any ultimate beneficiary designated by the Central Bank of the Islamic Republic of Iran. The United States of America undertakes to issue all necessary licenses and authorizations accordingly.

12. The Islamic Republic of Iran and the United States of America agree that an executive mechanism will be established to monitor the successful implementation of this MoU and the future compliance of the final Deal.

13. After signing this MoU, and subject to the beginning of the implementation of paragraphs 1, 4, 5, 10 and 11 of this MoU and the continuing implementation of these measures, the Islamic Republic of Iran and the United States of America will start negotiations regarding the final Deal exclusively on the other paragraphs.

14. The final Deal will be endorsed by a binding UNSC resolution.

On behalf of the Government                On behalf of the Government
of the Islamic Republic of Iran             of the United States of America

Date:                                       Date:


In witness thereof,
The Mediator,
On behalf of the Government
Of the Islamic Republic of Pakistan

Date:`;

function encodeRfc2047(str: string): string {
  // Use Q-encoding for non-ASCII subjects; here subject is ASCII so passthrough.
  // eslint-disable-next-line no-control-regex
  if (/^[\x00-\x7F]*$/.test(str)) return str;
  const b64 = btoa(unescape(encodeURIComponent(str)));
  return `=?UTF-8?B?${b64}?=`;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

// Insert CRLFs every 76 chars per RFC 2045.
function wrapBase64(b64: string): string {
  return b64.replace(/(.{76})/g, "$1\r\n");
}

function base64UrlEncode(str: string): string {
  // str is binary string
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function utf8BinaryString(s: string): string {
  // Convert UTF-8 string to binary string for base64
  const enc = new TextEncoder().encode(s);
  let bin = "";
  for (let i = 0; i < enc.length; i++) bin += String.fromCharCode(enc[i]);
  return bin;
}

export const sendMouEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const lovableKey = process.env.LOVABLE_API_KEY;
    const gmailKey = process.env.GOOGLE_MAIL_API_KEY;
    if (!lovableKey || !gmailKey) {
      throw new Error("Gmail connector is not configured.");
    }

    // Resolve origin to fetch CDN-hosted attachments.
    const req = getRequest();
    const origin = req ? new URL(req.url).origin : "";

    // Fetch all attachments in parallel.
    const fetched = await Promise.all(
      ATTACHMENTS.map(async (a) => {
        const absUrl = a.url.startsWith("http") ? a.url : `${origin}${a.url}`;
        const res = await fetch(absUrl);
        if (!res.ok) throw new Error(`Failed to fetch ${a.filename}: ${res.status}`);
        const buf = new Uint8Array(await res.arrayBuffer());
        return { ...a, data: wrapBase64(bytesToBase64(buf)) };
      }),
    );

    const boundary = `----yusuf_${Date.now().toString(36)}`;
    const headers = [
      `To: ${TO.join(", ")}`,
      `Subject: ${encodeRfc2047(SUBJECT)}`,
      `MIME-Version: 1.0`,
      `Content-Type: multipart/mixed; boundary="${boundary}"`,
    ].join("\r\n");

    const textPart = [
      `--${boundary}`,
      `Content-Type: text/plain; charset="UTF-8"`,
      `Content-Transfer-Encoding: base64`,
      ``,
      wrapBase64(bytesToBase64(new TextEncoder().encode(BODY))),
    ].join("\r\n");

    const attachmentParts = fetched.map((a) =>
      [
        `--${boundary}`,
        `Content-Type: ${a.contentType}; name="${a.filename}"`,
        `Content-Transfer-Encoding: base64`,
        `Content-Disposition: attachment; filename="${a.filename}"`,
        ``,
        a.data,
      ].join("\r\n"),
    );

    const mime =
      headers +
      "\r\n\r\n" +
      textPart +
      "\r\n" +
      attachmentParts.join("\r\n") +
      `\r\n--${boundary}--\r\n`;

    const raw = base64UrlEncode(utf8BinaryString(mime));

    const res = await fetch(
      "https://connector-gateway.lovable.dev/google_mail/gmail/v1/users/me/messages/send",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableKey}`,
          "X-Connection-Api-Key": gmailKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ raw }),
      },
    );

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Gmail send failed (${res.status}): ${text}`);
    }
    const json = (await res.json()) as { id?: string };
    return { ok: true as const, messageId: json.id ?? null, recipients: TO };
  });
