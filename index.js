const tmi = require('tmi.js');
require("dotenv").config();

// Define configuration options
const opts = {
	identity: {
		username: process.env.BOT_USERNAME,
		password: process.env.OAUTH_TOKEN
	},
	channels: [
		process.env.CHANNEL_NAME
	]
};

// Create a client with our options
const client = new tmi.client(opts);

// Register our event handlers (defined below)
client.on('message', onMessageHandler);
client.on('connected', onConnectedHandler);

// Connect to Twitch:
client.connect();

const Banchojs = require('bancho.js');
// eslint-disable-next-line no-undef
const bancho = new Banchojs.BanchoClient({ username: 'Eliteronix', password: process.env.OSUIRC, apiKey: process.env.OSUTOKENV1 });

// Called every time a message comes in
async function onMessageHandler(target, context, msg, self) {
	if (self) { return; } // Ignore messages from the bot

	const longRegex = /https?:\/\/osu\.ppy\.sh\/beatmapsets\/.+\/\d+/gm;
	const shortRegex = /https?:\/\/osu\.ppy\.sh\/b\/\d+/gm;
	const longMatches = longRegex.exec(msg);
	const shortMatches = shortRegex.exec(msg);

	let map = null;
	if (longMatches) {
		map = longMatches[0];
	} else if (shortMatches) {
		map = shortMatches[0];
	}

	if (map) {
		map = map.replace(/.+\//gm, '');
		try {
			await bancho.connect();
		} catch (error) {
			if (!error.message === 'Already connected/connecting') {
				throw (error);
			}
		}

		try {
			const IRCUser = await bancho.getUser('Eliteronix');

			let prefix = [];
			if (context.mod) {
				prefix.push('MOD');
			}
			if (context.badges && context.badges.vip) {
				prefix.push('VIP');
			}
			if (context.subscriber) {
				prefix.push('SUB');
			}

			if (prefix.length > 0) {
				prefix = `[${prefix.join('/')}] `;
			} else {
				prefix = '';
			}

			await IRCUser.sendMessage(`${prefix}${context['display-name']} -> https://osu.ppy.sh/b/${map}`);
		} catch (error) {
			if (error.message !== 'Currently disconnected!') {
				console.log(error);
			}
		}

		// client.say(process.env.CHANNEL_NAME, `${context['display-name']} -> Your request has been sent.`);
	}
}

// Called every time the bot connects to Twitch chat
function onConnectedHandler(addr, port) {
	console.log(`* Connected to ${addr}:${port}`);
}