import { 
	tuyaDeviceFactory
} from './tuyaDeviceFactory';

import { TuyaContext } from '@tuya/tuya-connector-nodejs';
import { format } from 'node:util';

const DEFAULTREGION = 'eu';
const TUYA_API_URL = 'https://openapi.tuya%s.com';

export class TuyaOpenAPIClient {
	api;
	deviceMap = {};

	constructor() {
		/** Make `api` "protected"-like */
		Object.defineProperty(this, 'api', {
			value: this.api,
			enumerable: false
		});
	}

	async init(apiKey, apiSecret, apiRegion = DEFAULTREGION) {
		this.api = new TuyaContext({
			baseUrl: format(TUYA_API_URL, apiRegion),
			accessKey: apiKey,
			secretKey: apiSecret,
		});

		const devices = await this.devicesListGlobal();
		
		const _devKey = (o) => (o.customName.toLowerCase() || o.id);
		
		this.deviceMap = devices?.reduce((acc, obj) => ({ 
			...acc,
			[_devKey(obj)]: tuyaDeviceFactory(obj, this) 
		}), {}) ?? [];
		await Promise.all(Object.keys(this.deviceMap).map(async key => {
			
			/** Init device properties */
			await this.deviceMap[key].init();

		}));
	}

	async devicesListGlobal(limit = 20) {
		let res = await this.api.request({
		  path: `/v2.0/cloud/thing/device?page_size=${limit}`,
		  method: 'GET'
		});
		if(res.success) {
			return res.result;
		} 
		throw new Error(`Something went wrong: ` + JSON.stringify(res));
	}
	

	async _deviceDetails(devId) {
		let res = await this.api.device.detail({
			device_id: devId
		});
		return res.result || undefined;
	} 

	async _deviceStatus(devId) {
		let res = await this.api.deviceStatus.status({
			device_id: devId
		});
		return res.result || undefined;
	}


	async sendDeviceCommand(devId, code, value) {
		let commands = [{
			"code": code,
			"value": value
		}];
		return await this._sendDeviceCommands(devId, commands);
	}
	
	async _sendDeviceCommands(devId, commands) {
		const res = await this.api.request({
			path: `/v1.0/iot-03/devices/${devId}/commands`,
			method: 'POST',
			body: {
				"commands": commands
			}
		});
		if (res.success) {
			return res.result;
		} 
		new Error(`Something went wrong: ${res.result}`);
	}
	

	async _deviceFactoryReset(devId) {
		const res = await this.api.request({
			path: `/v2.0/cloud/thing/${devId}/reset`,
			method: 'POST',
		});
		if (res.success) {
			return res.result;
		} 
		new Error(`Something went wrong: ${res.result}`);	
	}

	async _deviceRename(devId, name) {
		const res = await this.api.device.changeName({
			device_id: devId,
			name: name
		});
		if (res.success) {
			return res.result;
		} 
		new Error(`Something went wrong: ${res.result}`);	
	}

}

