const tmi = require('tmi.js');
const osu = require('node-osu');
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
const bancho = new Banchojs.BanchoClient({ username: process.env.OSUUSERNAME, password: process.env.OSUIRC, apiKey: process.env.OSUTOKENV1 });

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

		//Get the message without the map link
		let message = msg.replace(longRegex, '').replace(shortRegex, '').trim();

		try {
			await bancho.connect();
		} catch (error) {
			if (!error.message === 'Already connected/connecting') {
				throw (error);
			}
		}

		// eslint-disable-next-line no-undef
		const osuApi = new osu.Api(process.env.OSUTOKENV1, {
			// baseUrl: sets the base api url (default: https://osu.ppy.sh/api)
			notFoundAsError: true, // Throw an error on not found instead of returning nothing. (default: true)
			completeScores: false, // When fetching scores also fetch the beatmap they are for (Allows getting accuracy) (default: false)
			parseNumeric: false // Parse numeric values into numbers/floats, excluding ids
		});

		let beatmap = await osuApi.getBeatmaps({ b: map });

		beatmap = beatmap[0];

		if (beatmap && context['display-name'].toLowerCase() !== process.env.CHANNEL_NAME.toLowerCase()) {
			try {
				const IRCUser = await bancho.getUser(process.env.OSUPLAYER);

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

				await IRCUser.sendMessage(`${prefix}${context['display-name']} -> [${beatmap.approvalStatus}] [https://osu.ppy.sh/b/${beatmap.id} ${beatmap.artist} - ${beatmap.title} [${beatmap.version}]] (mapped by ${beatmap.creator}) | ${Math.round(beatmap.difficulty.rating * 100) / 100}* | ${beatmap.bpm} BPM`);
				if (message) {
					await IRCUser.sendMessage(`${prefix}${context['display-name']} -> Comment: ${message}`);
				}
			} catch (error) {
				if (error.message !== 'Currently disconnected!') {
					console.log(error);
				}
			}

			client.say(process.env.CHANNEL_NAME, `${context['display-name']} -> [${beatmap.approvalStatus}] ${beatmap.artist} - ${beatmap.title} [${beatmap.version}] (mapped by ${beatmap.creator}) | ${Math.round(beatmap.difficulty.rating * 100) / 100}* | ${beatmap.bpm} BPM`);
		}
	}
}

// Called every time the bot connects to Twitch chat
function onConnectedHandler(addr, port) {
	console.log(`* Connected to ${addr}:${port}`);
}