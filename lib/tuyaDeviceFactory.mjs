import { TuyaLight } from './devices/TuyaLight.mjs';
import { TuyaSocket } from './devices/TuyaSocket.mjs';

export function tuyaDeviceFactory(data, client) {
	switch (data.category) {
	  	case 'dj':
			// console.log('dj', {data});
			return new TuyaLight(data, client);
			break;
		case 'cz':
		// case 'ps':
			// console.log('cz', {data});
			return new TuyaSocket(data, client);
			break;
	default:
		let e = `Unknown device type: ${data.category}`;
		throw new Error(e);
	}
}