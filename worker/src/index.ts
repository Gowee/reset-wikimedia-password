/**
 * Welcome to Cloudflare Workers!
 *
 * This is a template for a Queue consumer: a Worker that can consume from a
 * Queue: https://developers.cloudflare.com/queues/get-started/
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */
import { EmailMessage } from "cloudflare:email";
import { createMimeMessage } from "mimetext";

export interface Env {
	// Example binding to a Queue. Learn more at https://developers.cloudflare.com/queues/javascript-apis/
	//MY_QUEUE: Queue;
	RWP_API: string,
	RWP_API_TOKEN: string,
}

export default {
	async email(message: ForwardableEmailMessage, env: Env, ctx: ExecutionContext) {
		console.log(env.RWP_API,
			env.RWP_API_TOKEN)
		try {
			const resp = await fetch(env.RWP_API + "?email=" + message.from, { headers: { 'user-agent': "rwpworker/0.0", 'x-api-token': env.RWP_API_TOKEN } });
			if (!resp.ok) {
				throw Error("Invalid upstream response status: " + resp.statusText);
			}
			const res: any = await resp.json();
			if (res?.resetpassword?.status !== "success") {
				throw Error("Invalid upstream response: " + res?.resetpassword?.status ?? "UNKNOWN REASON")
			}
			const msg = createMimeMessage();
			msg.setHeader("In-Reply-To", message.headers.get("Message-ID"));
			msg.setSender({ name: "RWPWorker", addr: message.to });
			msg.setRecipient(message.from);
			msg.setSubject("Re: Reset Wikipedia Password");
			msg.addMessage({
				contentType: 'text/plain',
				data: `The service has requested a password reset for the email address: ${message.from}.

If there is an Wikimedia account associated with the address, a password reset email will be sent by Wikimedia. If you haven't received an email, please check the reset password help page (https://www.mediawiki.org/wiki/Help:Reset_password) or try again later. Only one password reset email will be sent per valid account every 24 hours.`});

			const replyMessage = new EmailMessage(
				message.to,
				message.from,
				msg.asRaw()
			);

			await (message as any).reply(replyMessage);
		}
		catch (err) {
			console.error(err)
			message.setReject(err as any)
		}
	},

	async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		console.log(env.RWP_API,
			env.RWP_API_TOKEN)

		return new Response(null, { status: 444 })
	}

	// // Our fetch handler is invoked on a HTTP request: we can send a message to a queue
	// // during (or after) a request.
	// // https://developers.cloudflare.com/queues/platform/javascript-apis/#producer
	// async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
	// 	// To send a message on a queue, we need to create the queue first
	// 	// https://developers.cloudflare.com/queues/get-started/#3-create-a-queue
	// 	await env.MY_QUEUE.send({
	// 		url: req.url,
	// 		method: req.method,
	// 		headers: Object.fromEntries(req.headers),
	// 	});
	// 	return new Response('Sent message to the queue');
	// },
	// // The queue handler is invoked when a batch of messages is ready to be delivered
	// // https://developers.cloudflare.com/queues/platform/javascript-apis/#messagebatch
	// async queue(batch: MessageBatch<Error>, env: Env): Promise<void> {
	// 	// A queue consumer can make requests to other endpoints on the Internet,
	// 	// write to R2 object storage, query a D1 Database, and much more.
	// 	for (let message of batch.messages) {
	// 		// Process each message (we'll just log these)
	// 		console.log(`message ${message.id} processed: ${JSON.stringify(message.body)}`);
	// 	}
	// },
};
