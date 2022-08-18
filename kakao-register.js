// node-kakao에 있는 example/registeration어쩌구.js참고함

const { AuthApiClient, KnownAuthStatusCode } = require('node-kakao');
const readline = require('readline');

const config = require('./kakao.json');
const { email, uuid, mp_email, mp_uuid, force_real_profile } = config;
const password = Buffer.from(config.password, 'base64') + '';
const mp_password = Buffer.from(config.mp_password, 'base64') + '';
const compname = '브릿지';
const mp_compname = '멀티프로필 해제';
const print = p => console.log(p);

async function reg(email, password, name, uuid) {
	const form = {
		email,
		password,
		forced: true,
	};

	const api = await AuthApiClient.create(name, uuid, {"agent": "android", "mccmnc": "999", "deviceModel": "SM-T976N", "appVersion": "9.2.1", "version": "9.2.1", "netType": 0, "subDevice": true});
	const loginRes = await api.login(form);
	if (loginRes.success) {
		return print(name + ' 이미 등록되어 있으므로 등록이 필요 없습니다');
	}
	if (loginRes.status !== KnownAuthStatusCode.DEVICE_NOT_REGISTERED) {
		return print('내부 오류가 발생했습니다');
	}

	const passcodeRes = await api.requestPasscode(form);
	if (!passcodeRes.success) return print('내부 오류가 발생했습니다');

	const rl = readline.createInterface(process.stdin, process.stdout);
	const passcode = await new Promise((resolve) => rl.question('인증번호: ', resolve));
	rl.close();

	const registerRes = await api.registerDevice(form, passcode, true);
	if (!registerRes.success) return print('내부 오류가 발생했습니다');

	return print(name + ' 등록 완료');
}

(async function() {
	await reg(email, password, compname, uuid);
	if(config.force_real_profile) await reg(mp_email, mp_password, mp_compname, mp_uuid);
})();
