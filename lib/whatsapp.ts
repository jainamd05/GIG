// Sends a WhatsApp text message via Meta's Cloud API. Wrap calls to this in
// try/catch at the call site — WhatsApp is a best-effort notification
// channel and a failure here should never block the rest of a request
// (this mirrors how the original n8n workflow was fixed to decouple its
// webhook responses from the flaky WhatsApp branch).
export async function sendWhatsApp(to: string, text: string) {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
  const token = process.env.WHATSAPP_TOKEN

  if (!phoneNumberId || !token) {
    throw new Error('WHATSAPP_PHONE_NUMBER_ID or WHATSAPP_TOKEN is not set')
  }

  const res = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: text },
    }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`WhatsApp send failed (${res.status}): ${body}`)
  }
}
