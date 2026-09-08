import type { PaymentRecord } from "@/lib/types";
import nodemailer from "nodemailer";
import "server-only";

/** Màu theo KV Đan Tiếng Yêu Thương */
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

export function isMailConfigured() {
  return Boolean(
    process.env.SMTP_USER?.trim() && process.env.SMTP_PASS?.trim(),
  );
}

function mailFrom() {
  const user = process.env.SMTP_USER!.trim();
  return process.env.MAIL_FROM?.trim() || `Đan Tiếng Yêu Thương <${user}>`;
}

function createTransport() {
  const user = process.env.SMTP_USER!.trim();
  const pass = process.env.SMTP_PASS!.replace(/\s+/g, "");
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST?.trim() || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT || 465),
    secure: true,
    auth: { user, pass },
  });
}

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
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Cảm ơn bạn — Đan Tiếng Yêu Thương</title>
</head>
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

export async function sendThankYouEmail(payment: PaymentRecord) {
  if (!isMailConfigured()) {
    console.warn("[mail] Chưa cấu hình SMTP_USER / SMTP_PASS.");
    return { sent: false as const, reason: "missing_mail" as const };
  }

  const smtpUser = process.env.SMTP_USER!.trim();
  const name = payment.name.trim();
  const facebookUrl = "https://www.facebook.com/profile.php?id=61563043126860";
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

  const transport = createTransport();
  await transport.sendMail({
    from: mailFrom(),
    to: payment.email,
    replyTo: smtpUser,
    subject,
    text,
    html: thankYouHtml(name),
  });

  return { sent: true as const, provider: "smtp" as const };
}
