const compname = '브릿지';
const config = require('./kakao.json');
const { email, uuid, wh, channels, salt, allowed_senders } = config;
const password = Buffer.from(config.password, 'base64') + '';
const { AuthApiClient, TalkClient, ChatBuilder, KnownChatType, ReplyContent } = require('node-kakao');
const print = p => console.log(p);
const kakao = new TalkClient({"agent": "android", "mccmnc": "999", "deviceModel": "SM-T976N", "appVersion": "9.2.1", "version": "9.2.1", "netType": 0, "subDevice": true});
const fs = require('fs');

(async() => {
    const api = await AuthApiClient.create(compname, uuid, {"agent": "android", "mccmnc": "999", "deviceModel": "SM-T976N", "appVersion": "9.2.1", "version": "9.2.1", "netType": 0, "subDevice": true});
    var res = await api.login({
        email, password, forced: true,
    });
    if(!res.success) throw Error('로그인 실패 (' + res.status + ')');
    var res = await kakao.login(res.result);
    if(!res.success) throw Error('로그인 실패 (' + res.status + ')');
	
	var i = 0;
	const channels = [...kakao._channelList._normal._map.values()].concat([...kakao._channelList._open._map.values()]);
	for(var item=0; item<channels.length; item++) {
		print(` - ${channels[item].getDisplayName()} (${channels[item].channelId})`);
	}
	
	return;
})();
