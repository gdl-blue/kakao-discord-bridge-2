# kakao-discord-bridge-2
카카오톡 메시지를 디스코드에서 주고받에 해주는 프로그램

** 본계정 말고 부계정 사용을 권장한다.**

## 쓰는 방법
- 도스창을 켜고 `npm i node-kakao`, `npm i discord.js@11.6.3`을 차례로 친다.
- [이 모듈](https://github.com/gdl-blue/discord.js-v11-reborn)을 내려받아 node_modules에 djs11 디렉토리를 만들어서 거기에 저장한다.
- 디스코드 봇을 하나 만든다.
- kakao.json을 만든다.
```json
{
	"email": " ",
	"password": " ",
	"uuid": " ",
	"force_show_deleted_message": false,
	"no_system_message": false,
	"wh": [
		{
			"id": " ",
			"data": [" ", " "]
		}
	],
	"token": " ",
	"salt": ["deververer", "rtgtrrtgergergre"],
	"allowed_senders": {
		" ": [" "],
	}
}
```
   * email: 카카오계정 전자우편 주소
   * password: 카카오계정 비밀번호를 base64로 바꾼 거
   * uuid: 약 80자리의 무작위 base64 문자열
   * force_show_deleted_message: 삭제된 메시지 표시
   * no_system_message: 시스템 메시지 보내지 않기
   * wh: { id: 카톡 채팅방 ID(getid.js 실행으로 확인 가능), data: [ 디스코드 웹후크 ID, 디스코드 웹후크 토큰 ] }
   * token: 디스코드 봇 토큰
   * salt: 충분히 긴 무작위 문자열 2개
   * allowed_senders: { (디스코드 채널 ID): [메시지를 보낼 수 있는 디스코드 유저 ID 1, ...]
- kakao_register.js를 실행한다.
- kakao.js를 실행한다.

## 참고
- 8MB 이하의 사진, 비디오 등은 디스코드에 업로드된다. (즉, 기간 만료가 없다. 8MB보다 큰 화일은 링크 형태로 디스코드에 올라오며 카카오톡에서 화일이 만료되면 더 이상 내려받을 수 없다.)
- 정적 이모티콘은 디스코드 방식 이모지로 바뀌어 올라온다.
