/* Cloudflare Worker — 個人網站後端
 * 路由:
 *   POST /api/contact  → 接收聯絡表單,透過 Resend API 把訊息寄到我的信箱
 *   其他所有請求       → 交給靜態資產(env.ASSETS)
 *
 * 需要在 Cloudflare 設定的環境變數(Secret):
 *   RESEND_API_KEY  (必填)  到 https://resend.com 申請,免費額度足夠
 *   CONTACT_TO      (選填)  收件信箱,預設 k28552219@gmail.com
 */

const JSON_HEADERS = { "Content-Type": "application/json; charset=utf-8" };

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/contact") {
      if (request.method !== "POST") {
        return json({ ok: false, error: "Method Not Allowed" }, 405);
      }
      return handleContact(request, env);
    }

    // 其餘路徑:回傳靜態檔案
    return env.ASSETS.fetch(request);
  },
};

async function handleContact(request, env) {
  let data;
  try {
    data = await request.json();
  } catch {
    return json({ ok: false, error: "格式錯誤" }, 400);
  }

  const name = (data.name || "").toString().trim().slice(0, 100);
  const email = (data.email || "").toString().trim().slice(0, 150);
  const message = (data.message || "").toString().trim().slice(0, 5000);

  if (!name || !email || !message) {
    return json({ ok: false, error: "請填寫姓名、Email 與訊息" }, 400);
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return json({ ok: false, error: "Email 格式不正確" }, 400);
  }
  if (!env.RESEND_API_KEY) {
    return json({ ok: false, error: "伺服器尚未設定寄信金鑰" }, 500);
  }

  const to = env.CONTACT_TO || "k28552219@gmail.com";

  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Kai Lin 個人網站 <onboarding@resend.dev>",
      to: [to],
      reply_to: email,
      subject: `網站來信 / ${name}`,
      text: `${message}\n\n.....................\n姓名:${name}\nEmail:${email}`,
    }),
  });

  if (!resp.ok) {
    return json({ ok: false, error: "寄送失敗,請稍後再試" }, 502);
  }

  return json({ ok: true });
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: JSON_HEADERS });
}
