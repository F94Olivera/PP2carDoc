// Demo transport: the account email must never control the recipient.
export const sendResendEmail = async (message: { subject: string; text: string }, send = fetch) => {
  const { RESEND_API_KEY: key, RESEND_TEST_TO: to, RESEND_FROM: from } = process.env;
  if (!key || !to || !from) throw new Error("Mail configuration missing");
  const response = await send("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [to], ...message }),
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error("Mail submission failed");
};

export const sendCustomerWelcomeEmail = async (email: string, send = fetch) => {
  const origin = process.env.FRONTEND_URL;
  if (!origin) throw new Error("Frontend URL configuration missing");
  const loginUrl = new URL(`${origin.replace(/\/$/, "")}/login`);
  if (!["http:", "https:"].includes(loginUrl.protocol)) throw new Error("Invalid frontend URL");
  await sendResendEmail(
    {
      subject: "Tu cuenta de carDoc",
      text: `Se creó tu cuenta de carDoc.\nUsuario: ${email}\nIngresá acá: ${loginUrl.href}`,
    },
    send,
  );
};
