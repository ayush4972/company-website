// Resend can resolve a request with { error } instead of throwing. Only a confirmed
// message ID is a success; the website must not thank someone for unsent email.
export async function deliverEmail(client, message) {
    const result = await client.emails.send(message);
    if (result.error) throw new Error(result.error.message || 'The email provider rejected the message.');
    if (!result.data?.id) throw new Error('The email provider did not confirm the message.');
    return result.data;
}
