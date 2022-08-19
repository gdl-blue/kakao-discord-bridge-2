const fs = require('fs');

// 노드카카오 버그 수정
(function() {
	const script  = fs.readFileSync('./node_modules/node-kakao/dist/api/web-client.js') + '';
	const patched = script.replace(`class TextWebRequest {\r\n        constructor(_client) {\r\n            this._client = _client;\r\n        }`, `class TextWebRequest {\r\n        constructor(_client) {\r\n            this._client = _client;\r\n            if(_client.then)\r\n                _client.then(c => this._client = c);\r\n        }`);
	if(script != patched) {
		fs.writeFileSync('./node_modules/node-kakao/dist/api/web-client.js', patched);
	}
})();

const compname = '브릿지';
process.title = '카카오톡 브릿지';
const config = require('./kakao.json');
const { email, uuid, wh, channels, salt, allowed_senders, mp_email, mp_password, mp_uuid, bypass_multiprofile } = config;
const password = Buffer.from(config.password, 'base64') + '';

const https = require('https');
const path = require('path');

const DJS11 = require('djs11');
const CONST11 = require('djs11/src/util/Constants.js');
CONST11.DefaultOptions.ws.properties.$browser = `Discord Android`;
const bridge = new DJS11.Client;
const webhooks = {};
bridge.once('ready', async() => {
	for(item of wh) {
		webhooks[item.id] = await (bridge.fetchWebhook(...item.data));
		webhooks[item.id].chid = item.id;
	}
});

const md5 = require('md5');
const client = id => (webhooks[id.toString()] || ({ guildID: null, send: (async () => {}) }));
const webhook = id => {
	for(var wi in webhooks) {
		var wh = webhooks[wi];
		if(wh.id == id) return wh;
	}
};
bridge.login(config.token);
const { api, AuthApiClient, TalkClient, ChatBuilder, KnownChatType, ReplyContent } = require('node-kakao');
const print = p => console.log(p);
const cfg = {
	agent: 'android', 
	mccmnc: '999', 
	deviceModel: 'SM-T976N', 
	appVersion: '9.2.1', 
	version: '9.2.1', 
	netType: 0, 
	subDevice: true,
};
const kakao = new TalkClient(cfg);

const { Collection } = DJS11;
const messages = new Collection;
const chats = new Collection;
const read = new Collection;
const rc = {};
const system = config.system_nickname || '디버그 & 시스템';

const floorof = Math.floor;
const randint = (s, e) => floorof(Math.random() * (e + 1 - s) + s);

const lastID = {};

function filter(u) {
	/* if(u == system) return u + ' (사칭)';
	else */ return u;
}

function timeout(ms) {
	return new Promise((resolve, reject) => {
		setTimeout(() => resolve(0), ms);
	});
}

function setupBypasser() {
	const compname = '멀티프로필 해제';
	const email = mp_email;
	const password = Buffer.from(mp_password, 'base64') + '';
	const { DefaultConfiguration, api, AuthApiClient, TalkClient, ChatBuilder, KnownChatType, ReplyContent } = require('node-kakao');
	const kakao = new TalkClient(cfg);
	var authApi, loginRes, ws, sc, iv;
	
	(async() => {
		authApi = await AuthApiClient.create(compname, mp_uuid, cfg);
		loginRes = await authApi.login({
			email, password, forced: true,
		});
		if(!loginRes.success) throw Error('로그인 실패 (' + loginRes.status + ')');
		var res = await kakao.login(loginRes.result);
		if(!res.success) throw Error('로그인 실패 (' + res.status + ')');

		print('프로필 로그인 완료!');
		
		ws = api.createSessionWebClient(loginRes.result, Object.assign({ ...DefaultConfiguration }, config), 'https', 'katalk.kakao.com');
		sc = new api.ServiceApiClient(ws);
		
		iv = setInterval(async function() {
			if(sc.config) {
				clearInterval(iv);
				sc.requestMoreSettings();
			}
		}, 100);
	})();
	
	global.pfCache = {};

	global.getRealProfile = async function getRealProfile(id) {
		if(!ws || !sc || !sc.config) return null;
		return pfCache[id] || (pfCache[id] = (await sc.findFriendById(id)).result);
	};
}

if(config.force_real_profile) setupBypasser();
else global.getRealProfile = id => null;

bridge.on('message', async msg => {
	if(msg.author.bot || msg.webhookID) return;
	if(msg.content && msg.content.startsWith('&')) return;
	if(!msg.content) msg.content = '';
	
	for(var whi in webhooks) {
		var wh = webhooks[whi];
		if(wh.channelID == msg.channel.id) {
			if(!((allowed_senders[msg.channel.id] || []).includes(msg.author.id))) {
				// kakao.channelList.get(wh.chid).sendChat('** ' + msg.author.username + '이(가) 디스코드를 통해 메시지를 전송했읍니다 **').then(handle);
				// return msg.reply2('[' + msg.author.username + ']허가된 멤버가 아니기 때문에 메시지가 카카오톡으로 전송되지 않았읍니다 (디스코드에서만 보려면 메시지 앞에 `&`를 붙이십시오)', 0);
				return;
			}
			
			var cnt = msg.content;
			if(cnt && cnt.startsWith('*')) cnt = cnt.replace('*', '');
			
			var cntnt = r => (((r || '') + cnt) || '*');
			var ref = null;
			var reply = '';
			
			function handle(res) {
				if(!res.success) return msg.reply2('메시지가 정상적으로 전송되지 않았읍니다 다시 시도해 주십시오 (' + res.status + ')', 0);
				if(msg.content && msg.content.startsWith('*')) {
					const ch = kakao.channelList.get(wh.chid);
					if(['MultiChat'].includes(ch._channel.info.type)) {
						// msg.reply2('실톡 그룹 채팅에서는 누가 메시지를 읽었는지 확인하는 기능을 지원하지 않습니다');
						read.set(res.result.logId + '', { msg, nouser: 1, chat: res.result });
						rc[res.result.logId + ''] = ch._channel.info.activeUserCount - 1;
					} else read.set(res.result.logId + '', { msg, nouser: 0, chat: res.result });
				}
			}
			
			try {
				if(msg.reference) {
					if(msg.attachments.size) {
						msg.reply2('[경고!] 답장 메시지에 첨부파일을 추가할 수 없습니다', 0);
					}
					if(!msg.attachments.size || msg.content) {
						try {
							ref = await msg.fetchReference();
						} catch(e) {
							ref = { content: '', id: '0', author: { username: '' } };
						}
						var fc = ref.content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\n/g, ' '), _fc = fc;
						if(fc.length > 30) fc = fc.slice(0, 30) + '...';
						reply = (ref ? ('[' + ref.author.username + '의 메시지: ' + fc + ']\n ↳️ ') : '');
						if(chats.has(ref.id)) {
							kakao.channelList.get(wh.chid).sendChat(new ChatBuilder()
								.append(new ReplyContent(chats.get(ref.id)))
								.text(cntnt())
								.build(KnownChatType.REPLY));
						} else {
							kakao.channelList.get(wh.chid).sendChat(cntnt(reply)).then(handle);
						}
					}
				} else {
					if(msg.attachments.size > 1) {
						msg.reply2('[경고!] 첫 번째 첨부파일만 전송됩니다', 0);
					}
					if(msg.attachments.size) {
						const att = msg.attachments.first();
						if(!att.width) {
							msg.reply2('[오류!] 사진만 보낼 수 있습니다', 0);
						} else {
							https.get(att.url, res => {
								var d = '';
								res.setEncoding('base64');
								res.on('data', chunk => d += chunk);
								res.on('end', () => {
									kakao.channelList.get(wh.chid).sendMedia(KnownChatType.PHOTO, {
										name: att.filename,
										data: Buffer.from(d, 'base64'),
										width: att.width,
										height: att.height,
										ext: path.parse(att.filename).ext.replace('.', ''),
									}).then(res => {
										handle(res);
										if(msg.content && res.success) setTimeout(() => {
											kakao.channelList.get(wh.chid).sendChat(msg.content).then(handle);
										}, 1000);
									});
								});
							});
						}
					} else kakao.channelList.get(wh.chid).sendChat(cntnt()).then(handle);
				}
			} catch(e) {
				msg.reply2('메시지가 정상적으로 전송되지 않았읍니다 다시 시도해 주십시오', 0);
			}
			break;
		}
	}
});

kakao.on('chat', async (data, channel) => {
	lastID[channel.channelId + ''] = data._chat.logId;
	const sender = data.getSenderInfo(channel);
	var pf = ((await getRealProfile(sender.userId)) || { friend: null }).friend || sender;
	
	var nick = pf.nickname || pf.nickName;
	switch(sender.perm) {
		case 8: nick += ' (봇)';
		break; case 4: nick += ' (부방장)';
		break; case 1: nick += ' (방장)';
	}
	
	const _users = channel.getAllUserInfo();
	const users = {};
	while(1) {
		const item = _users.next();
		if(item.done) break;
		users[item.value.userId + ''] = ((await getRealProfile(item.value.userId)) || { friend: null }).friend || item.value;
	}
	
	if(sender.userId + '' == kakao.clientUser.userId + '' && data._chat.attachment.url) return;
	var msg = data.text || '', shmsg = msg;
	var filecfg = {};
	var emoji = null;
	
	// 일반 첨부파일
	if(data._chat.attachment && data._chat.attachment.url)
		// 8MB 이상은 링크로 올리기
		if(data._chat.attachment.s >= 7999998)
			msg += ' [첨부파일: ' + data._chat.attachment.url + ' ]';
		else
			msg = '',
			filecfg = { files: [data._chat.attachment.url] };
	
	// 묶음사진
	if(data._chat.attachment && data._chat.attachment.imageUrls) {
		msg = '';
		var n = 1;
		// filecfg = { files: [] };
		for(var img of data._chat.attachment.imageUrls)
			msg += `[사진 #${n++}: ${img}]\n`;
			// filecfg.files.push(img);
	}
	
	// 이모티콘
	if(data._chat.attachment && (data._chat.type == 25 || data._chat.type == 20 || data._chat.type == 12)) {
		// 움직이는 이모티콘 파싱불가
		const url = api.serviceApiUtil.getEmoticonImageURL(data._chat.attachment.path);
		if(!url || data._chat.attachment.type == 'image/webp' || data._chat.attachment.path.endsWith('.webp'))
			{ if(!msg) msg += '(' + (data._chat.attachment.alt || '이모티콘') + ')'; }
		else
			// msg += '\n[' + (data._chat.attachment.alt || '이모티콘') + ' - ' + url + ']';
			// filecfg.files = [url];
			emoji = await bridge.guilds.get(client(channel.channelId).guildID).createEmoji(url, 'kakaoet' + (new Date().getTime()));
			if(!emoji) msg += ' [' + (data._chat.attachment.alt || '이모티콘') + ']';
			else msg = `<:${emoji.name}:${emoji.id}> ${msg}`;
		if(!data.text) shmsg += '(이모티콘)';
	}
	
	// 답장
	if(data._chat.type == 26)
		msg = '```' + (users[data._chat.attachment.src_userId].nickname || users[data._chat.attachment.src_userId].nickName) + '에게 답장: \n ' + data._chat.attachment.src_message.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\n/g, ' ') + '```   ' + msg,
		shmsg = '[답장] ' + shmsg;
	
	// 샾검색
	if(data._chat.type == 71) {
		msg = '';
		filecfg.embed = {
			color: 0x5c4b43,
			title: '[#] ' + data._chat.attachment.C.HD.TD.T,
			fields: [],
		};
		if(data._chat.attachment.C.ITL)
		for(var item of data._chat.attachment.C.ITL) {
			filecfg.embed.fields.push({
				name: item.TD.T,
				value: item.TD.D + '... [[바로가기]](' + item.L.LPC + ')',
			});
		}
		if(data._chat.attachment.C.THL)
		for(var item of data._chat.attachment.C.THL) {
			filecfg.embed.fields.push({
				name: data._chat.attachment.C.HD.TD.T,
				value: '[[보기]](' + item.L.LPC + ')',
			});
		}
		if(data._chat.attachment.C.HD.L && data._chat.attachment.C.HD.L.LPC) {
			filecfg.embed.fields.push({
				name: data._chat.attachment.C.HD.TD.T,
				value: '**[[검색 결과 더보기]](' + data._chat.attachment.C.HD.L.LPC + ')**',
			});
		}
		else if(data._chat.attachment.P && data._chat.attachment.P.L) {
			filecfg.embed.fields.push({
				name: '기타',
				value: '**[[검색 결과 더보기]](' + data._chat.attachment.P.L.LPC + ')**',
			});
		}
	}
	
	// 공지 및 게시글
	if(data._chat.type == 24) {
		if(data._chat.attachment.os && data._chat.attachment.os[0].t == 1 && data._chat.attachment.os[0].ct) {
			msg = '';
			filecfg.embed = {
				color: 0x5c4b43,
				title: '새 글',
				description: data._chat.attachment.os[0].ct,
			};
		}
		
		// 공지글
		if(data._chat.attachment.os && data._chat.attachment.os[0].t == 3 && data._chat.attachment.os[1].t == 1) {
			msg = '';
			filecfg.embed = {
				color: 0x5c4b43,
				title: '[공지] 새 글',
				description: data._chat.attachment.os[1].ct,
			};
		}
		
		// 공지투표
		if(data._chat.attachment.os && data._chat.attachment.os[1] && data._chat.attachment.os[1].its) {
			msg = '';
			filecfg.embed = {
				color: 0x5c4b43,
				title: '[공지] 투표: ' + data._chat.attachment.os[1].tt,
				fields: [],
			};
			for(var item of data._chat.attachment.os[1].its) {
				filecfg.embed.fields.push({
					name: item.tt,
					value: '*',
				});
			}
		}
	}
	
	// 투표
	if(data._chat.type == 14 && data._chat.attachment.os && data._chat.attachment.os[0]) {
		msg = '';
		filecfg.embed = {
			color: 0x5c4b43,
			title: '투표: ' + data._chat.attachment.title,
			fields: [],
		};
		for(var item of data._chat.attachment.os[0].its) {
			filecfg.embed.fields.push({
				name: item.tt,
				value: '*',
			});
		}
	}
	
	client(channel.channelId).send(msg, Object.assign({
		username: filter(nick),
		avatarURL: pf.originalProfileURL || pf.originalProfileImageUrl || ('https://secure.gravatar.com/avatar/' + md5(salt[0] + sender.userId + salt[1]) + '?d=monsterid'),
		// avatarURL: 'https://secure.gravatar.com/avatar/' + md5(salt[0] + sender.userId + salt[1]) + '?d=retro',
	}, filecfg)).then(msg => {
		messages.set(data._chat.logId + '', {
			author: {
				id: sender.userId,
				username: pf.nickname,
			},
			content: shmsg,
			whmsg: msg,
		});
		
		var dc = data.chat;
		if(msg) chats.set(msg.id, dc);
		
		if(emoji) bridge.guilds.get(client(channel.channelId).guildID).deleteEmoji(emoji);
	});
	
	setTimeout(() => {
		channel.markRead({ logId: channel.info.lastChatLogId });
		setTimeout(() => channel.syncChatList(channel.info.lastChatLogId, channel.info.lastSeenLogId));
	}, randint(1, 5) * 300);
});

kakao.on('chat_read', (chat, channel, _user) => {
	const _msg = read.get(chat.logId + '');
	const user = channel.getUserInfo(_user);
	if(!_msg) return;
	const { msg, nouser } = _msg;
	if(_user.userId + '' == (chats.get(msg.id) || { sender: {} }).sender.userId + '') return;
	if(nouser) msg.channel.send(channel._channel.info.activeUserCount - (rc[chat.logId + '']--) + '명이 ' + msg.author.username + '의 메시지를 읽었읍니다');
	else msg.channel.send(user.nickname + '이(가) ' + new Date().getHours() + ':' + (String(new Date().getMinutes()).length > 1 ? (new Date().getMinutes()) : ('0' + new Date().getMinutes())) + '분에 ' + msg.author.username + '의 메시지를 읽었읍니다');
});

kakao.on('chat_deleted', (feedChat, channel) => {
	if(config.force_show_deleted_message) return;
	
	const sender = channel.getUserInfo(feedChat.sender);
	const msg = messages.get(feedChat.text.match(/\"logId\"[:](\d+)/)[1]);
	
	if(msg && (['DirectChat', 'MultiChat'].includes(channel._channel.info.type) || channel._channel.info.activeUserCount == 2)) {
		msg.whmsg.edit('[삭제된 메시지입니다.]', {
			token: webhook(msg.whmsg.webhookID).token
		});
	} else client(channel.channelId).send(sender.nickname + '이(가) 메시지' + (msg ? (' (' + msg.content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\n/g, ' ') + ')') : '') + '를 삭제함', {
		username: system,
		avatarURL: 'https://secure.gravatar.com/avatar/' + md5('') + '?d=retro',
	});
});

kakao.on('message_hidden', (hide, channel) => {
	if(config.force_show_deleted_message) return;
	
	const sender = channel.getUserInfo(hide.sender);
	const msg = messages.get(hide.text.match(/\"logId\"[:](\d+)/)[1]);
	
	if(msg && ((channel._channel.info.type == 'DirectChat' || channel._channel.info.activeUserCount == 2) || sender.perm == 1)) {
		msg.whmsg.edit('[' + sender.nickname + '에 의해 숨겨진 글입니다.]', {
			token: webhook(msg.whmsg.webhookID).token
		});
	} else client(channel.channelId).send(sender.nickname + '이(가) ' + (msg ? (msg.author.username + '의 ') : '') + '메시지' + (msg ? (' (' + msg.content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\n/g, ' ') + ')') : '') + '를 가렸음', {
		username: system,
		avatarURL: 'https://secure.gravatar.com/avatar/' + md5('') + '?d=retro',
	});
});

kakao.on('user_join', (join, channel, user) => {
	if(config.no_system_message) return;
	
	client(channel.channelId).send(user.nickname + '이(가) 방에 들어음', {
		username: system,
		avatarURL: 'https://secure.gravatar.com/avatar/' + md5('') + '?d=retro',
	});
});

kakao.on('user_left', (left, channel, user) => {
	if(config.no_system_message) return;
	
	if(left.sender.userId + '' != user.userId + '') client(channel.channelId).send(user.nickname + '이(가) ' + channel.getUserInfo(left.sender).nickname + '에 의해 추방됨', {
		username: system,
		avatarURL: 'https://secure.gravatar.com/avatar/' + md5('') + '?d=retro',
	}); else client(channel.channelId).send(user.nickname + '이(가) 방을 떠남', {
		username: system,
		avatarURL: 'https://secure.gravatar.com/avatar/' + md5('') + '?d=retro',
	});
});

kakao.on('profile_changed', (channel, oldUser, newUser) => {
	if(config.no_system_message) return;
	
	// console.log(newUser.nickname + '의 프로필이 변경됨 ' + (oldUser.nickname != newUser.nickname ? ('[닉네임: ' + oldUser.nickname + '에서 ' + newUser.nickname + '로]') : ''));
	client(channel.channelId).send(oldUser.nickname + '의 프로필이 변경됨 ' + (oldUser.nickname != newUser.nickname ? ('[닉네임: **' + oldUser.nickname + '**에서 **' + newUser.nickname + '**로]') : ''), {
		username: system,
		avatarURL: 'https://secure.gravatar.com/avatar/' + md5('') + '?d=retro',
	});
});

kakao.on('perm_changed', (channel, oldUser, newUser) => {
	if(config.no_system_message) return;
	
	var cntnt = '';
	
	if(oldUser.perm == 2 && newUser.perm == 4) cntnt = oldUser.nickname + '이(가) 부방장이 됨';
	if(oldUser.perm == 4 && newUser.perm == 2) cntnt = oldUser.nickname + '이 부방장에서 박탈됨';
	
	if(cntnt) client(channel.channelId).send(cntnt, {
		username: system,
		avatarURL: 'https://secure.gravatar.com/avatar/' + md5('') + '?d=retro',
	});
});

kakao.on('host_handover', (channel) => {
	if(config.no_system_message) return;
	
	client(channel.channelId).send('방장이 바뀜', {
		username: system,
		avatarURL: 'https://secure.gravatar.com/avatar/' + md5('') + '?d=retro',
	});
});

(async() => {
    const api = await AuthApiClient.create(compname, uuid, cfg);
    var res = await api.login({
        email, password, forced: true,
    });
    if(!res.success) throw Error('로그인 실패 (' + res.status + ')');
    var res = await kakao.login(res.result);
    if(!res.success) throw Error('로그인 실패 (' + res.status + ')');

    print('로그인 완료!');
	
	const cl = [...kakao._channelList._normal._map.values()].concat([...kakao._channelList._open._map.values()]);
	for(var item of wh) {
		const cid = item.id;
		const ch = cl.find(item => item.channelId+'' == cid);
		if(!ch) { await timeout(1000); continue; }
		lastID[cid] = ch.info.lastChatLogId + '';
		await timeout(1000);
	}
	
	setInterval(async () => {
		for(var cid in lastID) {
			var channel = cl.find(item => item.channelId+'' == cid);
			if(!channel) continue;
			var res = (await channel.getChatListFrom(lastID[cid])).result;
			res = res.filter(item => BigInt(item.logId + '') > BigInt(lastID[cid]));
			
			const _users = channel.getAllUserInfo();
			const users = {};
			while(1) {
				const item = _users.next();
				if(item.done) break;
				users[item.value.userId + ''] = ((await getRealProfile(item.value.userId)) || { friend: null }).friend || item.value;
			}
			
			for(var chat of res) {
				var pf = users[chat.sender.userId + ''];
				if(!pf) continue;
				var nick = pf.nickname || pf.nickName;
				if(chat.sender.userId + '' == kakao.clientUser.userId + '') continue;
				
				var msg = chat.text, shmsg = msg;
				if(msg.startsWith('{"feedType":') || msg.feedType == 14) continue;
				if(chat.attachment && chat.attachment.url)
					msg += ' [첨부파일: ' + chat.attachment.url + ' ]';
				if(chat.attachment && chat.attachment.imageUrls)
					for(var img of chat.attachment.imageUrls)
						msg += ` [첨부파일: ${img}]`;
				if(chat.attachment && (chat.type == 20 || chat.type == 12)) {
					msg += ' [' + (chat.attachment.alt || '이모티콘') + ']';
					if(!chat.text) shmsg += '(이모티콘)';
				}
				if(chat.type == 26)
					msg = '```' + (users[chat.attachment.src_userId].nickname || users[chat.attachment.src_userId].nickName) + '에게 답장: \n ' + chat.attachment.src_message.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\n/g, ' ') + '``` ↳️ ' + msg,
					shmsg = '[답장] ' + shmsg;
				
				client(channel.channelId).send(msg, {
					username: filter(nick),
					avatarURL: pf.originalProfileURL || pf.originalProfileImageUrl || ('https://secure.gravatar.com/avatar/' + md5(salt[0] + chat.sender.userId + salt[1]) + '?d=monsterid'),
					// avatarURL: 'https://secure.gravatar.com/avatar/' + md5(salt[0] + sender.userId + salt[1]) + '?d=retro',
				}).then(msg => {
					messages.set(chat.logId + '', {
						author: {
							id: chat.sender.userId,
							username: pf.nickname,
						},
						content: shmsg,
						whmsg: msg,
					});
					
					chats.set(msg.id, chat);
				});
				
				lastID[channel.channelId + ''] = chat.logId;
				print('누락된 메시지 채우기 - ' + chat.logId);
				channel.syncChatList(channel.info.lastChatLogId, channel.info.lastSeenLogId)
				
				await timeout(500);
			}
			
			await timeout(1000);
		}
	}, 30000);
	
	setInterval(function() {
		global.pfCache = {};
	}, 180000);
})();

// setTimeout(() => process.exit(0), 1000 * randint(1, 3) * 60);
