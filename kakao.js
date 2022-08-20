const fs = require('fs');
const LosslessJSON = require('lossless-json');

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
const { DefaultConfiguration, util, api, AuthApiClient, TalkClient, ChatBuilder, KnownChatType, ReplyContent } = require('node-kakao');
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

var ws = null, sc = null, iv;
var board = null;

// 게시판 기능 (node-kakao v3에서 가져옴 저작권은 storycraft에게 라이선스는 MIT - https://github.com/storycraft/node-kakao/blob/stable/LICENSE)
(function() {
	var channel_post_struct_1 = (function() {
		var exports = {};
		exports.ChannelPost = exports.BoardEmotionType = exports.PostPermission = exports.PostType;
		var PostType;
		(function (PostType) {
			PostType["TEXT"] = "TEXT";
			PostType["POLL"] = "POLL";
			PostType["FILE"] = "FILE";
			PostType["IMAGE"] = "IMAGE";
			PostType["VIDEO"] = "VIDEO";
			PostType["SCHEDULE"] = "SCHEDULE";
		})(PostType = exports.PostType || (exports.PostType = {}));
		var PostPermission;
		(function (PostPermission) {
		})(PostPermission = exports.PostPermission || (exports.PostPermission = {}));
		var BoardEmotionType;
		(function (BoardEmotionType) {
			BoardEmotionType["LIKE"] = "LIKE";
		})(BoardEmotionType = exports.BoardEmotionType || (exports.BoardEmotionType = {}));
		var ChannelPost;
		(function (ChannelPost) {
			let ContentType;
			(function (ContentType) {
				ContentType["TEXT"] = "text";
				ContentType["MENTION"] = "user";
				ContentType["EVERYONE_MENTION"] = "user_all";
			})(ContentType = ChannelPost.ContentType || (ChannelPost.ContentType = {}));
			let PollItemType;
			(function (PollItemType) {
				PollItemType["TEXT"] = "text";
			})(PollItemType = ChannelPost.PollItemType || (ChannelPost.PollItemType = {}));
		})(ChannelPost = exports.ChannelPost || (exports.ChannelPost = {}));
		return exports;
	})();
	
	function parse(d) {
		return LosslessJSON.parse(d, (key, value) => {
            if(value && typeof value == 'object' && value.isLosslessNumber != undefined) {
                if(key.toLowerCase().endsWith('id')) return value + '';
				else return Number(value + '');
            }
            return value;
        });
	}
	
	class BaseBoardClient extends api.SessionWebClient {
		fillCommentForm(form, content) {
			let contentList = [];
			if (typeof (content) === 'string') {
				contentList.push({ type: 'text', text: content });
			}
			else {
				if (typeof (content.text) === 'string') {
					contentList.push({ type: 'text', text: content.text });
				}
				else if (content.text && content.text instanceof Array) {
					contentList.push(...content.text);
				}
				if (content.emoticon)
					form.sticon = util.JsonUtil.stringifyLoseless(content.emoticon.toJsonAttachment());
			}
			form.content = util.JsonUtil.stringifyLoseless(contentList);
		}
		fillFileMap(form, type, fileMap) {
			form['original_file_names[]'] = Object.keys(fileMap);
			form[`${type.toLowerCase()}_paths[]`] = Object.values(fileMap);
		}
		fillPostForm(form, template) {
			form.object_type = template.object_type;
			if (template.content) {
				let contentList = [];
				if (typeof (template.content) === 'string')
					contentList.push({ text: template.content, type: channel_post_struct_1.ChannelPost.ContentType.TEXT });
				else if (template.content instanceof Array)
					contentList.push(...template.content);
				form.content = util.JsonUtil.stringifyLoseless(contentList);
			}
			if (template.object_type === channel_post_struct_1.PostType.POLL && template.poll_content)
				form.poll_content = util.JsonUtil.stringifyLoseless(template.poll_content);
			if (template.object_type === channel_post_struct_1.PostType.IMAGE)
				this.fillFileMap(form, channel_post_struct_1.PostType.IMAGE, template.images);
			else if (template.object_type === channel_post_struct_1.PostType.VIDEO)
				this.fillFileMap(form, channel_post_struct_1.PostType.VIDEO, template.vidoes);
			else if (template.object_type === channel_post_struct_1.PostType.FILE)
				this.fillFileMap(form, channel_post_struct_1.PostType.FILE, template.files);
			else if (template.object_type === channel_post_struct_1.PostType.SCHEDULE)
				form['schedule_content'] = util.JsonUtil.stringifyLoseless(template.schedule_content);
			if (template.emoticon)
				form.sticon = util.JsonUtil.stringifyLoseless(template.emoticon.toJsonAttachment());
			if (template.scrap)
				form['scrap'] = util.JsonUtil.stringifyLoseless(template.scrap);
			form['notice'] = template.notice;
		}
	}

	class ChannelBoardClient extends BaseBoardClient {
		get Scheme() {
			return 'https';
		}
		get Host() {
			return 'talkmoim-api.kakao.com';
		}
		async requestPostList(channelId) {
			return parse(await this.request('GET', `chats/${channelId.toString()}/posts`) + '');
		}
		async getPost(postId) {
			return parse(await this.request('GET', `posts/${postId}`) + '');
		}
		async getPostEmotionList(postId) {
			return parse(await this.request('GET', `posts/${postId}/emotions`) + '');
		}
		async getPostCommentList(postId) {
			return parse(await this.request('GET', `posts/${postId}/comments`) + '');
		}
		async reactToPost(postId) {
			return parse(await this.request('POST', `posts/${postId}/emotions`, { emotion: channel_post_struct_1.BoardEmotionType.LIKE }) + '');
		}
		async unreactPost(postId, reactionId) {
			return parse(await this.request('DELETE', `posts/${postId}/emotions/${reactionId}`) + '');
		}
		async commentToPost(postId, content) {
			let form = {};
			this.fillCommentForm(form, content);
			return parse(await this.request('POST', `posts/${postId}/comments`, form) + '');
		}
		async deleteComment(postId, commentId) {
			return parse(await this.request('DELETE', `posts/${postId}/comments/${commentId}`) + '');
		}
		async createPost(channelId, template) {
			let form = {};
			this.fillPostForm(form, template);
			return parse(await this.request('POST', `chats/${channelId.toString()}/posts`, form) + '');
		}
		async updatePost(postId, template) {
			let form = {};
			this.fillPostForm(form, template);
			return parse(await this.request('PUT', `posts/${postId}`, form) + '');
		}
		async deletePost(postId) {
			return parse(await this.request('DELETE', `posts/${postId}`) + '');
		}
		async setPostNotice(postId) {
			return parse(await this.request('POST', `posts/${postId}/set_notice`) + '');
		}
		async unsetPostNotice(postId) {
			return parse(await this.request('POST', `posts/${postId}/unset_notice`) + '');
		}
		async sharePostToChannel(postId) {
			return parse(await this.request('POST', `posts/${postId}/share`) + '');
		}
	}
	
	class OpenChannelBoardClient extends BaseBoardClient {
		get Scheme() {
			return 'https';
		}
		get Host() {
			return 'open.kakao.com';
		}
		async requestPostList(linkId, channelId) {
			return parse(await this.request('GET', this.toOpenApiPath(linkId, `chats/${channelId.toString()}/posts`)) + '');
		}
		async getPost(linkId, postId) {
			return parse(await this.request('GET', this.toOpenApiPath(linkId, `posts/${postId}`)) + '');
		}
		async getPostEmotionList(linkId, postId) {
			return parse(await this.request('GET', this.toOpenApiPath(linkId, `posts/${postId}/emotions`)) + '');
		}
		async getPostCommentList(linkId, postId) {
			return parse(await this.request('GET', this.toOpenApiPath(linkId, `posts/${postId}/comments`)) + '');
		}
		async reactToPost(linkId, postId) {
			return parse(await this.request('POST', this.toOpenApiPath(linkId, `posts/${postId}/emotions`), { emotion: channel_post_struct_1.BoardEmotionType.LIKE }) + '');
		}
		async unreactPost(linkId, postId, reactionId) {
			return parse(await this.request('DELETE', this.toOpenApiPath(linkId, `posts/${postId}/emotions/${reactionId}`)) + '');
		}
		async commentToPost(linkId, postId, content) {
			let form = {};
			this.fillCommentForm(form, content);
			return parse(await this.request('POST', this.toOpenApiPath(linkId, `posts/${postId}/comments`), form) + '');
		}
		async deleteComment(linkId, postId, commentId) {
			return parse(await this.request('DELETE', this.toOpenApiPath(linkId, `posts/${postId}/comments/${commentId}`)) + '');
		}
		async createPost(linkId, channelId, template) {
			let form = {};
			this.fillPostForm(form, template);
			return parse(await this.request('POST', this.toOpenApiPath(linkId, `chats/${channelId.toString()}/posts`), form) + '');
		}
		async updatePost(linkId, postId, template) {
			let form = {};
			this.fillPostForm(form, template);
			return parse(await this.request('PUT', this.toOpenApiPath(linkId, `posts/${postId}`), form) + '');
		}
		async deletePost(linkId, postId) {
			return parse(await this.request('DELETE', this.toOpenApiPath(linkId, `posts/${postId}`)) + '');
		}
		async setPostNotice(linkId, postId) {
			return parse(await this.request('POST', this.toOpenApiPath(linkId, `posts/${postId}/set_notice`)) + '');
		}
		async unsetPostNotice(linkId, postId) {
			return parse(await this.request('POST', this.toOpenApiPath(linkId, `posts/${postId}/unset_notice`)) + '');
		}
		async sharePostToChannel(linkId, postId) {
			return parse(await this.request('POST', this.toOpenApiPath(linkId, `posts/${postId}/share`)) + '');
		}
		toOpenApiPath(linkId, path) {
			return `moim/${path}?link_id=${linkId.toString()}`;
		}
	}
	
	global.ChannelBoardClient = ChannelBoardClient;
})();

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
				sc.requestLessSettings();
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

function err(content) {
	return new DJS11.RichEmbed()
		.setColor('#5c4b43')
		.setTitle('오류')
		.setDescription(content);
}

function parseDate(d) {
	var date = new Date(d);
	var ret = '';
	ret += date.getFullYear() + '년 ';
	ret += date.getMonth() + 1 + '월 ';
	ret += date.getDate() + '일 ';
	const hr = date.getHours();
	if(hr > 12) ret += '오후';
	else ret += '오전';
	ret += ' ';
	ret += (hr > 12 ? hr - 12 : hr) + ':';
	var m = date.getMinutes();
	ret += (m < 10 ? '0' + m : m);
	
	return ret;
}

global.posts = {};

function progress(val) {
	if(val > 95) return '[`####################`]';
	if(val > 90) return '[`###################-`]';
	if(val > 85) return '[`##################--`]';
	if(val > 80) return '[`#################---`]';
	if(val > 75) return '[`################----`]';
	if(val > 70) return '[`###############-----`]';
	if(val > 65) return '[`##############------`]';
	if(val > 60) return '[`#############-------`]';
	if(val > 55) return '[`############--------`]';
	if(val > 50) return '[`###########---------`]';
	if(val > 45) return '[`##########----------`]';
	if(val > 40) return '[`#########-----------`]';
	if(val > 35) return '[`########------------`]';
	if(val > 30) return '[`#######-------------`]';
	if(val > 25) return '[`######--------------`]';
	if(val > 20) return '[`#####---------------`]';
	if(val > 15) return '[`####----------------`]';
	if(val > 10) return '[`###-----------------`]';
	if(val >  5) return '[`##------------------`]';
	if(val >  0) return '[`#-------------------`]';
	if(val > -1) return '[`--------------------`]';
}

function strip(str, ln) {
	return (str.length > ln) ? str.slice(0, ln - 1) + '...' : str;
}

// 메시지 보내기/게시판 조작
bridge.on('message', async msg => {
	if(msg.author.bot || msg.webhookID) return;
	if(msg.content && msg.content.startsWith('&')) return;
	if(!msg.content) msg.content = '';
	
	for(var whi in webhooks) {
		var wh = webhooks[whi];
		if(wh.channelID != msg.channel.id) continue;
		const kchid   = wh.chid;
		const kch     = kakao.channelList.get(kchid);
		const kchname = kch.getDisplayName();
		const _users  = kch.getAllUserInfo();
		const users   = {};
		while(1) {
			const item = _users.next();
			if(item.done) break;
			users[item.value.userId + ''] = item.value;
		}
		
		// 게시판 목록
		if(msg.content.toLowerCase().startsWith('!board')) {
			if(['OD', 'OM'].includes(kch._channel.info.type))
				return msg.channel.send(err('오픈채팅은 게시판 기능을 지원하지 않습니다'));
			
			const res = await board.requestPostList(kchid);
			if(res.status) return msg.channel.send(err('게시판을 불러오지 못했습니다'));
			global.posts[msg.channel.id + '-' + msg.author.id] = [];
			const { posts } = res;
			const embed = new DJS11.RichEmbed()
				.setColor('#5c4b43')
				.setTitle('**' + strip(kchname, 240) + '**');
			var n = 1;
			for(var post of posts) {
				global.posts[msg.channel.id + '-' + msg.author.id].push(post);
				var content = '게시글';
				if(post.content)
					for(var item of JSON.parse(post.content))
						if(item.type == 'text')
							content = item.text;
				if(post.poll)
					content = post.poll.subject;
				if(post.object_type == 'POLL')
					content = '투표: ' + content;
				if(post.notice)
					content = '[공지] ' + content;
				embed.addField(n++ + '. ' + strip(content, 240), (users[post.owner_id + ''] || { nickname: '작성자 불분명' }).nickname + ' • 댓글 ' + post.comment_count + ' • ' + parseDate(post.created_at));
			}
			msg.channel.send(embed);
			return;
		}
		
		// 게시글 보기
		if(msg.content.toLowerCase().startsWith('!viewpost')) {
			if(['OD', 'OM'].includes(kch._channel.info.type))
				return msg.channel.send(err('오픈채팅은 게시판 기능을 지원하지 않습니다'));
			
			const idx = msg.content.split(/\s+/)[1];
			if(!idx) return msg.channel.send(err('!board로 게시글 목록을 불러오고 번호를 지정해 주세요'));
			var rawpost;
			try {
				rawpost = global.posts[msg.channel.id + '-' + msg.author.id][idx - 1];
			} catch(e) {}
			if(!rawpost) return msg.channel.send(err('!board로 게시글 목록을 불러오고 올바른 번호를 지정해 주세요'));
			const post = await board.getPost(rawpost.id);
			if(post.status) return msg.channel.send(err('게시글을 불러오지 못했습니다'));
			const embed = new DJS11.RichEmbed().setColor('#5c4b43');
			var title = '게시글';
			if(post.poll)
				title = '투표: ' + post.poll.subject;
			if(post.notice && !post.poll)
				title = '공지';
			embed.setTitle('**' + strip(title, 240) + '**');
			var content = '';
			if(post.content)
				for(var item of JSON.parse(post.content))
					if(item.type == 'text')
						content = item.text;
			embed.setDescription(strip(content, 4090));
			if(post.poll)
				for(var item of post.poll.items) {
					embed.addField(strip(item.title, 250), progress(item.user_count / post.poll.user_count * 100) + ' (' + item.user_count + '명)');
				}
			if(post.poll && post.emotions.length)
				embed.addBlankField();
			if(post.emotions.length) {
				var likers = '';
				for(var item of post.emotions)
					likers += '- ' + users[item.owner_id].nickname + ' (' + parseDate(item.created_at) + ')\n';
				embed.addField('좋아요한 친구들 (' + post.emotion_count + ')', likers);
			}
			msg.channel.send(embed).then(() => {
				if(!post.comments.length) return;
				const embed = new DJS11.RichEmbed()
					.setColor('#5c4b43')
					.setTitle('**댓글 ' + post.comments.length + '개**');
				var n = 1;
				for(var item of post.comments) {
					var content = '';
					for(var itm of JSON.parse(item.content))
						if(itm.type == 'text')
							content = itm.text;
					embed.addField(users[item.owner_id + ''].nickname || '작성자 불분명', strip(content, 1019) || '.');
					if(n == 24 && post.comments.length >= 25) {
						embed.addField('*', '(댓글이 더 있습니다.)');
						break;
					}
					n++;
				}
				msg.channel.send(embed);
			});
			return;
		}
		
		// 댓글 달기
		if(msg.content.toLowerCase().startsWith('!comment')) {
			if(['OD', 'OM'].includes(kch._channel.info.type))
				return msg.channel.send(err('오픈채팅은 게시판 기능을 지원하지 않습니다'));
			if(!((allowed_senders[msg.channel.id] || []).includes(msg.author.id)))
				return msg.channel.send(err('댓글을 다는 것이 허용되지 않았습니다'));
			
			const args = msg.content.split(/\s+/);
			const idx = args[1];
			if(!idx) return msg.channel.send(err('!board로 게시글 목록을 불러오고 번호를 지정해 주세요'));
			var rawpost;
			try {
				rawpost = global.posts[msg.channel.id + '-' + msg.author.id][idx - 1];
			} catch(e) {}
			if(!rawpost) return msg.channel.send(err('!board로 게시글 목록을 불러오고 올바른 번호를 지정해 주세요'));
			const post = await board.getPost(rawpost.id);
			board.commentToPost(post.id, args.slice(2, 99999999999).join(' ')).then(() => {
				var title = '게시글';
				if(post.content)
					for(var item of JSON.parse(post.content))
						if(item.type == 'text')
							title = strip(item.text, 32);
				if(post.poll)
					title = post.poll.subject;
				
				msg.reply2(title + '에 댓글을 달았습니다');
			});
			
			return;
		}
		
		// 좋아요
		if(msg.content.toLowerCase().startsWith('!like')) {
			if(['OD', 'OM'].includes(kch._channel.info.type))
				return msg.channel.send(err('오픈채팅은 게시판 기능을 지원하지 않습니다'));
			if(!((allowed_senders[msg.channel.id] || []).includes(msg.author.id)))
				return msg.channel.send(err('좋아요 표시하는 것이 허용되지 않았습니다'));
			
			const args = msg.content.split(/\s+/);
			const idx = args[1];
			if(!idx) return msg.channel.send(err('!board로 게시글 목록을 불러오고 번호를 지정해 주세요'));
			var rawpost;
			try {
				rawpost = global.posts[msg.channel.id + '-' + msg.author.id][idx - 1];
			} catch(e) {}
			if(!rawpost) return msg.channel.send(err('!board로 게시글 목록을 불러오고 올바른 번호를 지정해 주세요'));
			const post = await board.getPost(rawpost.id);
			if(post.my_emotion) return msg.channel.send(err('이미 좋아요 표시헀습니다'));
			board.reactToPost(post.id).then(res => {
				var title = '게시글';
				if(post.content)
					for(var item of JSON.parse(post.content))
						if(item.type == 'text')
							title = strip(item.text, 32);
				if(post.poll)
					title = post.poll.subject;
				
				msg.reply2(title + '에 좋아요 표시했습니다');
			});
			
			return;
		}
		
		// 좋아요 취소
		if(msg.content.toLowerCase().startsWith('!unlike')) {
			if(['OD', 'OM'].includes(kch._channel.info.type))
				return msg.channel.send(err('오픈채팅은 게시판 기능을 지원하지 않습니다'));
			if(!((allowed_senders[msg.channel.id] || []).includes(msg.author.id)))
				return msg.channel.send(err('좋아요 취소하는 것이 허용되지 않았습니다'));
			
			const args = msg.content.split(/\s+/);
			const idx = args[1];
			if(!idx) return msg.channel.send(err('!board로 게시글 목록을 불러오고 번호를 지정해 주세요'));
			var rawpost;
			try {
				rawpost = global.posts[msg.channel.id + '-' + msg.author.id][idx - 1];
			} catch(e) {}
			if(!rawpost) return msg.channel.send(err('!board로 게시글 목록을 불러오고 올바른 번호를 지정해 주세요'));
			const post = await board.getPost(rawpost.id);
			if(!post.my_emotion) return msg.channel.send(err('좋아요 표시하지 않았습니다'));
			board.unreactPost(post.id).then(res => {
				var title = '게시글';
				if(post.content)
					for(var item of JSON.parse(post.content))
						if(item.type == 'text')
							title = strip(item.text, 32);
				if(post.poll)
					title = post.poll.subject;
				
				msg.reply2(title + ' 좋아요 취소했습니다');
			});
			
			return;
		}
		
		// 공지 등록하기
		if(msg.content.toLowerCase().startsWith('!setnotice')) {
			if(['OD', 'OM'].includes(kch._channel.info.type))
				return msg.channel.send(err('오픈채팅은 게시판 기능을 지원하지 않습니다'));
			if(!((allowed_senders[msg.channel.id] || []).includes(msg.author.id)))
				return msg.channel.send(err('공지를 등록하는 것이 허용되지 않았습니다'));
			
			const args = msg.content.split(/\s+/);
			const idx = args[1];
			if(!idx) return msg.channel.send(err('!board로 게시글 목록을 불러오고 번호를 지정해 주세요'));
			var rawpost;
			try {
				rawpost = global.posts[msg.channel.id + '-' + msg.author.id][idx - 1];
			} catch(e) {}
			if(!rawpost) return msg.channel.send(err('!board로 게시글 목록을 불러오고 올바른 번호를 지정해 주세요'));
			const post = await board.getPost(rawpost.id);
			if(post.notice) return msg.channel.send(err('이미 공지글입니다'));
			board.setPostNotice(post.id).then(res => {
				var title = '게시글';
				if(post.content)
					for(var item of JSON.parse(post.content))
						if(item.type == 'text')
							title = strip(item.text, 32);
				if(post.poll)
					title = post.poll.subject;
				
				msg.reply2(title + '을(를) 공지로 등록했습니다');
			});
			
			return;
		}
		
		// 공지 내리기
		if(msg.content.toLowerCase().startsWith('!denotice')) {
			if(['OD', 'OM'].includes(kch._channel.info.type))
				return msg.channel.send(err('오픈채팅은 게시판 기능을 지원하지 않습니다'));
			if(!((allowed_senders[msg.channel.id] || []).includes(msg.author.id)))
				return msg.channel.send(err('공지를 등록하는 것이 허용되지 않았습니다'));
			
			const args = msg.content.split(/\s+/);
			const idx = args[1];
			if(!idx) return msg.channel.send(err('!board로 게시글 목록을 불러오고 번호를 지정해 주세요'));
			var rawpost;
			try {
				rawpost = global.posts[msg.channel.id + '-' + msg.author.id][idx - 1];
			} catch(e) {}
			if(!rawpost) return msg.channel.send(err('!board로 게시글 목록을 불러오고 올바른 번호를 지정해 주세요'));
			const post = await board.getPost(rawpost.id);
			if(!post.notice) return msg.channel.send(err('공지글이 아닙니다'));
			board.unsetPostNotice(post.id).then(res => {
				var title = '게시글';
				if(post.content)
					for(var item of JSON.parse(post.content))
						if(item.type == 'text')
							title = strip(item.text, 32);
				if(post.poll)
					title = post.poll.subject;
				
				msg.reply2(title + ' 공지를 내렸습니다');
			});
			
			return;
		}
		
		// 게시글을 채팅방에 공유하기
		if(msg.content.toLowerCase().startsWith('!share')) {
			if(['OD', 'OM'].includes(kch._channel.info.type))
				return msg.channel.send(err('오픈채팅은 게시판 기능을 지원하지 않습니다'));
			if(!((allowed_senders[msg.channel.id] || []).includes(msg.author.id)))
				return msg.channel.send(err('공지를 등록하는 것이 허용되지 않았습니다'));
			
			const args = msg.content.split(/\s+/);
			const idx = args[1];
			if(!idx) return msg.channel.send(err('!board로 게시글 목록을 불러오고 번호를 지정해 주세요'));
			var rawpost;
			try {
				rawpost = global.posts[msg.channel.id + '-' + msg.author.id][idx - 1];
			} catch(e) {}
			if(!rawpost) return msg.channel.send(err('!board로 게시글 목록을 불러오고 올바른 번호를 지정해 주세요'));
			const post = await board.getPost(rawpost.id);
			board.sharePostToChannel(post.id).then(res => {
				var title = '게시글';
				if(post.content)
					for(var item of JSON.parse(post.content))
						if(item.type == 'text')
							title = strip(item.text, 32);
				if(post.poll)
					title = post.poll.subject;
				
				msg.reply2(title + ' 공유 완료');
			});
			
			return;
		}
		
		if(!((allowed_senders[msg.channel.id] || []).includes(msg.author.id)))
			// kakao.channelList.get(wh.chid).sendChat('** ' + msg.author.username + '이(가) 디스코드를 통해 메시지를 전송했읍니다 **').then(handle);
			// return msg.reply2('[' + msg.author.username + ']허가된 멤버가 아니기 때문에 메시지가 카카오톡으로 전송되지 않았읍니다 (디스코드에서만 보려면 메시지 앞에 `&`를 붙이십시오)', 0);
			return;
		
		var cnt = msg.content;
		if(cnt && cnt.startsWith('*')) cnt = cnt.replace('*', '');
		
		var cntnt = r => (((r || '') + cnt) || '*');
		var ref = null;
		var reply = '';
		
		function handle(res) {
			if(!res.success) return msg.reply2('메시지가 정상적으로 전송되지 않았읍니다 다시 시도해 주십시오 (' + res.status + ')', 0);
			if(msg.content && msg.content.startsWith('*'))
				read.set(res.result.logId + '', { msg, nouser: 0, chat: res.result });
		}
		
		if(msg.reference) {
			if(msg.attachments.size) {
				msg.reply2('[경고!] 답장 메시지에 첨부파일을 추가할 수 없습니다', 0);
				if(!msg.content) return;
			}
			try {
				ref = await msg.fetchReference();
			} catch(e) {
				ref = { content: '', id: '0', author: { username: '' } };
			}
			var fc = ref.content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\n/g, ' '), _fc = fc;
			if(fc.length > 30) fc = fc.slice(0, 30) + '...';
			reply = (ref ? ('[' + ref.author.username + '의 메시지: ' + fc + ']\n ↳️ ') : '');
			if(chats.has(ref.id))
				kakao.channelList.get(wh.chid).sendChat(new ChatBuilder()
					.append(new ReplyContent(chats.get(ref.id)))
					.text(cntnt())
					.build(KnownChatType.REPLY));
			else
				kakao.channelList.get(wh.chid).sendChat(cntnt(reply)).then(handle);
		} else {
			if(msg.attachments.size > 1)
				msg.reply2('[경고!] 첫 번째 첨부파일만 전송됩니다', 0);
			if(!msg.attachments.size)
				return kakao.channelList.get(wh.chid).sendChat(cntnt()).then(handle);
			const att = msg.attachments.first();
			if(!att.width)
				return msg.reply2('[오류!] 사진만 보낼 수 있습니다', 0);
			
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
		break;
	}
});

// 수신한 메시지를 디스코드로 보내기
kakao.on('chat', async (data, channel) => {
	lastID[channel.channelId + ''] = data._chat.logId;
	
	// 전송자 정보
	const sender = data.getSenderInfo(channel);
	var pf = ((await getRealProfile(sender.userId)) || { friend: null }).friend || sender;
	var nick = pf.nickname || pf.nickName;
	
	// 방장/부방장 접미사
	switch(sender.perm) {
		case 8: nick += ' (봇)';
		break; case 4: nick += ' (부방장)';
		break; case 1: nick += ' (방장)';
	}
	
	// 대화상대 목록
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
			msg = data._chat.attachment.url;
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
		if(!url || data._chat.attachment.type == 'image/webp' || data._chat.attachment.path.endsWith('.webp')) {
			if(!msg) msg += '(' + (data._chat.attachment.alt || '이모티콘') + ')';
		} else {
			// msg += '\n[' + (data._chat.attachment.alt || '이모티콘') + ' - ' + url + ']';
			// filecfg.files = [url];
			emoji = await bridge.guilds.get(client(channel.channelId).guildID).createEmoji(url, 'kakaoet' + (new Date().getTime()));
			if(!emoji) msg += ' [' + (data._chat.attachment.alt || '이모티콘') + ']';
			else msg = `<:${emoji.name}:${emoji.id}> ${msg}`;
		}
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
	
	// 디스코드로 전송
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
		
		if(msg) chats.set(msg.id, data.chat);
		
		if(emoji) bridge.guilds.get(client(channel.channelId).guildID).deleteEmoji(emoji);
	});
	
	// 읽음 처리 및 동기화
	setTimeout(() => {
		channel.markRead({ logId: channel.info.lastChatLogId });
		setTimeout(() => channel.syncChatList(channel.info.lastChatLogId, channel.info.lastSeenLogId));
	}, randint(1, 5) * 300);
});

// 메시지가 읽힐 경우
kakao.on('chat_read', (chat, channel, _user) => {
	const _msg = read.get(chat.logId + '');
	const user = channel.getUserInfo(_user);
	if(!_msg) return;
	const { msg, nouser } = _msg;
	if(_user.userId + '' == (chats.get(msg.id) || { sender: {} }).sender.userId + '') return;
	if(nouser) msg.channel.send(channel._channel.info.activeUserCount - (rc[chat.logId + '']--) + '명이 ' + msg.author.username + '의 메시지를 읽었읍니다');
	else msg.channel.send(user.nickname + '이(가) ' + new Date().getHours() + ':' + (String(new Date().getMinutes()).length > 1 ? (new Date().getMinutes()) : ('0' + new Date().getMinutes())) + '분에 ' + msg.author.username + '의 메시지를 읽었읍니다');
});

// 메시지가 지워진 경우
kakao.on('chat_deleted', (feedChat, channel) => {
	if(config.force_show_deleted_message) return;
	
	const sender = channel.getUserInfo(feedChat.sender);
	const msg = messages.get(feedChat.text.match(/\"logId\"[:](\d+)/)[1]);
	
	if(msg && (['DirectChat', 'MultiChat'].includes(channel._channel.info.type) || channel._channel.info.activeUserCount == 2)) {
		msg.whmsg.edit('[메시지 삭제됨]', {
			token: webhook(msg.whmsg.webhookID).token,
			attachments: [],
			embeds: [],
		});
	} else client(channel.channelId).send(sender.nickname + '이(가) 메시지' + (msg ? (' (' + msg.content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\n/g, ' ') + ')') : '') + '를 삭제함', {
		username: system,
		avatarURL: 'https://secure.gravatar.com/avatar/' + md5('') + '?d=retro',
	});
});

// 메시지가 가려진 경우 (오픈채팅)
kakao.on('message_hidden', (hide, channel) => {
	if(config.force_show_deleted_message) return;
	
	const sender = channel.getUserInfo(hide.sender);
	const msg = messages.get(hide.text.match(/\"logId\"[:](\d+)/)[1]);
	
	if(msg && ((channel._channel.info.type == 'DirectChat' || channel._channel.info.activeUserCount == 2) || sender.perm == 1)) {
		msg.whmsg.edit('[' + sender.nickname + '에 의해 숨겨진 글입니다.]', {
			token: webhook(msg.whmsg.webhookID).token,
			attachments: [],
			embeds: [],
		});
	} else client(channel.channelId).send(sender.nickname + '이(가) ' + (msg ? (msg.author.username + '의 ') : '') + '메시지' + (msg ? (' (' + msg.content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\n/g, ' ') + ')') : '') + '를 가렸음', {
		username: system,
		avatarURL: 'https://secure.gravatar.com/avatar/' + md5('') + '?d=retro',
	});
});

// 대화상대 들어옴
kakao.on('user_join', (join, channel, user) => {
	if(config.no_system_message) return;
	
	client(channel.channelId).send(user.nickname + '이(가) 방에 들어음', {
		username: system,
		avatarURL: 'https://secure.gravatar.com/avatar/' + md5('') + '?d=retro',
	});
});

// 대화상대 나감
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

// 프로필 변경 (오픈채팅)
kakao.on('profile_changed', (channel, oldUser, newUser) => {
	if(config.no_system_message) return;
	
	// console.log(newUser.nickname + '의 프로필이 변경됨 ' + (oldUser.nickname != newUser.nickname ? ('[닉네임: ' + oldUser.nickname + '에서 ' + newUser.nickname + '로]') : ''));
	client(channel.channelId).send(oldUser.nickname + '의 프로필이 변경됨 ' + (oldUser.nickname != newUser.nickname ? ('[닉네임: **' + oldUser.nickname + '**에서 **' + newUser.nickname + '**로]') : ''), {
		username: system,
		avatarURL: 'https://secure.gravatar.com/avatar/' + md5('') + '?d=retro',
	});
});

// 부방장 등록/박탈 (오픈채팅)
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

// 방장 변경 (오픈채팅)
kakao.on('host_handover', (channel) => {
	if(config.no_system_message) return;
	
	client(channel.channelId).send('방장이 바뀜', {
		username: system,
		avatarURL: 'https://secure.gravatar.com/avatar/' + md5('') + '?d=retro',
	});
});

// 로그인
(async() => {
    const authapi = await AuthApiClient.create(compname, uuid, cfg);
    var loginRes = await authapi.login({
        email, password, forced: true,
    });
    if(!loginRes.success) throw Error('로그인 실패 (' + loginRes.status + ')');
    var res = await kakao.login(loginRes.result);
    if(!res.success) throw Error('로그인 실패 (' + res.status + ')');
	
	ws = api.createSessionWebClient(loginRes.result, Object.assign({ ...DefaultConfiguration }, cfg), 'https', 'katalk.kakao.com');
	sc = new api.ServiceApiClient(ws);
	iv = setInterval(async function() {
		if(sc.config) {
			clearInterval(iv);
			sc.requestMoreSettings();
			sc.requestLessSettings();
		}
	}, 100);
	board = new ChannelBoardClient(await api.createWebClient('https', 'talkmoim-api.kakao.com'), loginRes.result, Object.assign({ ...DefaultConfiguration }, cfg));

    print('로그인 완료!');
	
	// 누락된 메시지 채움
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
