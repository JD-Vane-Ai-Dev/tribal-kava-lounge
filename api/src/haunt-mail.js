import { EmailClient } from '@azure/communication-email';

export function emailReady(env) {
  if (env.HAUNT_EMAIL_PROVIDER === 'agentmail') return Boolean(env.HAUNT_AGENTMAIL_API_KEY && env.HAUNT_EMAIL_FROM === 'tribalkavalounge@agentmail.to');
  return (!env.HAUNT_EMAIL_PROVIDER || env.HAUNT_EMAIL_PROVIDER === 'acs') && Boolean(env.HAUNT_EMAIL_CONNECTION_STRING && env.HAUNT_EMAIL_FROM);
}

export function createMailer(env, request = fetch) {
  if (env.HAUNT_EMAIL_PROVIDER === 'agentmail') return {
    async send({ operationId, email, subject, text }) {
      if (!emailReady(env)) throw new Error('Email sender is not configured');
      const response = await request(`https://api.agentmail.to/v0/inboxes/${encodeURIComponent(env.HAUNT_EMAIL_FROM)}/messages/send`, {
        method: 'POST', headers: { Authorization: `Bearer ${env.HAUNT_AGENTMAIL_API_KEY}`, 'Content-Type': 'application/json', 'Idempotency-Key': operationId },
        body: JSON.stringify({ to: [email], subject, text }), signal: AbortSignal.timeout(20000)
      });
      if (!response.ok) throw new Error('Email submission failed');
      const result = await response.json();
      if (!result.message_id) throw new Error('Email acceptance could not be confirmed');
      return { messageId: result.message_id };
    }
  };
  const client = env.HAUNT_EMAIL_CONNECTION_STRING ? new EmailClient(env.HAUNT_EMAIL_CONNECTION_STRING) : null;
  return { async send({ operationId, email: address, subject, text }) {
    const poller = await client.beginSend({ senderAddress: env.HAUNT_EMAIL_FROM, recipients: { to: [{ address }] }, content: { subject, plainText: text } }, { operationId });
    const result = await poller.pollUntilDone();
    if (result.status !== 'Succeeded') throw new Error('Email submission failed');
    return { messageId: result.id || operationId };
  } };
}
