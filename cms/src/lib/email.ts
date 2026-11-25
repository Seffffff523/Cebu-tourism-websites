import "server-only";
import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import { env } from "@/lib/env";

let client: SESv2Client | null = null;

/**
 * All email — invites, password resets and workflow notifications — goes through
 * AWS SES. Without AWS_SES_REGION/AWS_SES_FROM the message (links included) is
 * printed to the server log instead, so local development needs no AWS account.
 */
export async function sendEmail(to: string | string[], subject: string, text: string) {
  const recipients = (Array.isArray(to) ? to : [to]).filter(Boolean);
  if (!recipients.length) return;
  const region = env.sesRegion();
  const from = env.sesFrom();
  if (!region || !from) {
    console.info(`[email:dev] to=${recipients.join(",")} subject="${subject}"\n${text}`);
    return;
  }
  client ??= new SESv2Client({ region });
  try {
    await client.send(
      new SendEmailCommand({
        FromEmailAddress: from,
        Destination: { ToAddresses: recipients },
        Content: {
          Simple: {
            Subject: { Data: subject, Charset: "UTF-8" },
            Body: { Text: { Data: text, Charset: "UTF-8" } },
          },
        },
      }),
    );
  } catch (err) {
    // A failed notification must not undo the content change that triggered it.
    console.error("[email] SES send failed:", err);
  }
}
