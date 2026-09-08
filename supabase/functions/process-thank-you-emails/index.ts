import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.1";
import nodemailer from "npm:nodemailer@6.10.1";

type ThankYouMessage = {
  payment_id?: string | null;
  email?: string;
  name?: string;
};

const KV = {
  cream: "#F6EFE4",
  paper: "#FFFBF5",
  purple: "#6B3FA0",
  purpleSoft: "#8B5FBF",
  pink: "#E85A9B",
  teal: "#2A9B9B",
  text: "#3D2A55",
  muted: "#6E5A7A",
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function thankYouHtml(name: string) {
  const banner =
    "https://res.cloudinary.com/dyo6tjmky/image/upload/v1788850238/poster_wcoezq.png";
  const facebookUrl = "https://www.facebook.com/profile.php?id=61563043126860";
  const greeting = name
    ? `Thân gửi bạn <strong style="color:${KV.pink};">${escapeHtml(name)}</strong>,`
    : "Thân gửi bạn,";

  return `<!DOCTYPE html>
<html lang="vi">
<body style="margin:0;padding:0;background:${KV.cream};font-family:Arial,Helvetica,sans-serif;color:${KV.text};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${KV.cream};padding:28px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:560px;background:${KV.paper};border:1px solid #E8D9F0;border-radius:18px;overflow:hidden;">
          <tr>
            <td style="padding:0;line-height:0;font-size:0;">
              <img src="${banner}" alt="Đan Tiếng Yêu Thương" width="560" style="display:block;width:100%;max-width:560px;height:auto;border:0;" />
            </td>
          </tr>
          <tr>
            <td style="padding:28px 28px 8px;">
              <p style="margin:0;color:${KV.purple};font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;">Đan Tiếng Yêu Thương</p>
              <h1 style="margin:14px 0 0;font-size:22px;line-height:1.4;color:${KV.purple};font-weight:700;">
                Cảm ơn bạn vì đã tô hồng thêm những nụ cười 💗
              </h1>
              <p style="margin:20px 0 0;color:${KV.text};font-size:16px;line-height:1.7;">
                ${greeting}
              </p>
              <p style="margin:14px 0 0;color:${KV.text};font-size:16px;line-height:1.75;">
                Một chút lòng thành của bạn đã được “Đan tiếng yêu thương” gói ghém cẩn thận rồi đây! 💌
              </p>
              <p style="margin:14px 0 0;color:${KV.text};font-size:16px;line-height:1.75;">
                Mỗi sự đóng góp của bạn chính là một mũi đan kỳ diệu, dệt nên chiếc áo choàng màu hồng ấm áp mang đầy tình yêu thương gửi đến những người cần giúp đỡ. Cảm ơn bạn rất nhiều vì đã nán lại và đồng hành cùng chúng mình trên hành trình tử tế này. Chúc bạn luôn bình năng lượng, hạnh phúc và thật nhiều nụ cười!
              </p>
              <p style="margin:14px 0 0;color:${KV.text};font-size:16px;line-height:1.75;">
                Follow Unicorn tại đây để cùng chúng mình theo dõi những hành trình tiếp theo của “Đan tiếng yêu thương” nhé!
              </p>
              <p style="margin:22px 0 0;color:${KV.muted};font-size:15px;line-height:1.7;">
                Trân trọng,<br />
                <strong style="color:${KV.purple};">Ban Tổ Chức Dự án Đan Tiếng Yêu Thương</strong>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 28px 28px;" align="center">
              <a href="${facebookUrl}" style="display:inline-block;background:${KV.pink};color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 22px;border-radius:999px;">Theo dõi Unicorn trên Facebook</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

async function sendMail(payload: ThankYouMessage) {
  const user = Deno.env.get("SMTP_USER")?.trim();
  const pass = Deno.env.get("SMTP_PASS")?.replace(/\s+/g, "");
  if (!user || !pass) throw new Error("missing_smtp");

  const to = payload.email?.trim();
  if (!to) throw new Error("missing_to");

  const name = (payload.name ?? "").trim();
  const facebookUrl = "https://www.facebook.com/profile.php?id=61563043126860";
  const from =
    Deno.env.get("MAIL_FROM")?.trim() || `Đan Tiếng Yêu Thương <${user}>`;
  const subject =
    "[ĐAN TIẾNG YÊU THƯƠNG] CẢM ƠN BẠN VÌ ĐÃ TÔ HỒNG THÊM NHỮNG NỤ CƯỜI 💗";
  const text = [
    name ? `Thân gửi bạn ${name},` : "Thân gửi bạn,",
    "",
    'Một chút lòng thành của bạn đã được "Đan tiếng yêu thương" gói ghém cẩn thận rồi đây! 💌',
    "",
    "Mỗi sự đóng góp của bạn chính là một mũi đan kỳ diệu, dệt nên chiếc áo choàng màu hồng ấm áp mang đầy tình yêu thương gửi đến những người cần giúp đỡ. Cảm ơn bạn rất nhiều vì đã nán lại và đồng hành cùng chúng mình trên hành trình tử tế này. Chúc bạn luôn bình năng lượng, hạnh phúc và thật nhiều nụ cười!",
    "",
    "Follow Unicorn tại đây để cùng chúng mình theo dõi những hành trình tiếp theo của “Đan tiếng yêu thương” nhé!",
    `Theo dõi Unicorn trên Facebook: ${facebookUrl}`,
    "",
    "Trân trọng,",
    "Ban Tổ Chức Dự án Đan Tiếng Yêu Thương",
  ].join("\n");

  const transport = nodemailer.createTransport({
    host: Deno.env.get("SMTP_HOST")?.trim() || "smtp.gmail.com",
    port: Number(Deno.env.get("SMTP_PORT") || 465),
    secure: true,
    auth: { user, pass },
  });

  await transport.sendMail({
    from,
    to,
    replyTo: user,
    subject,
    text,
    html: thankYouHtml(name),
  });
}

function authorized(req: Request) {
  const expected = Deno.env.get("MAIL_WORKER_SECRET")?.trim();
  if (!expected) return false;
  const header = req.headers.get("x-worker-secret")?.trim();
  if (header && header === expected) return true;
  const auth = req.headers.get("Authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  return Boolean(token && serviceKey && token === serviceKey);
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }
  if (!authorized(req)) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (
    !Deno.env.get("SMTP_USER")?.trim() ||
    !Deno.env.get("SMTP_PASS")?.trim()
  ) {
    return new Response(JSON.stringify({ error: "mail_not_configured" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: jobs, error } = await supabase.rpc(
    "read_thank_you_email_jobs",
    {
      p_vt: 90,
      p_qty: 10,
    },
  );
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const rows = (jobs ?? []) as Array<{
    msg_id: number;
    message: ThankYouMessage;
  }>;
  let sent = 0;
  let archived = 0;
  const failures: Array<{ msg_id: number; error: string }> = [];

  for (const row of rows) {
    const payload = row.message ?? {};
    try {
      await sendMail(payload);
      sent += 1;
      if (payload.payment_id) {
        await supabase.rpc("mark_thank_you_email_sent", {
          p_payment_id: payload.payment_id,
        });
      }
      await supabase.rpc("archive_thank_you_email_job", {
        p_msg_id: row.msg_id,
      });
      archived += 1;
    } catch (err) {
      failures.push({
        msg_id: row.msg_id,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return new Response(
    JSON.stringify({ ok: true, read: rows.length, sent, archived, failures }),
    {
      headers: { "Content-Type": "application/json" },
    },
  );
});
