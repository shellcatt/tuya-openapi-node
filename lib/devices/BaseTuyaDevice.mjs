import moment from 'moment';
import { promisify } from 'util';

let sleep = promisify(setTimeout);

export class BaseTuyaDevice {
 	isActive;

	constructor(data, client) {
		this._data = data;
		this._client = client;

		// this.isActive = false; // Default

		// Make the `api` & `data` rather "protected"
		Object.defineProperty(this, '_client', {
			value: client,
			enumerable: false
		});
		Object.defineProperty(this, '_data', {
			value: data,
			enumerable: false
		});
		this._status = {};
		// Object.defineProperty(this, '_status', {
		// 	value: this._status,
		// 	enumerable: false
		// });
		this._details = {};
		// Object.defineProperty(this, '_details', {
		// 	value: this._details,
		// 	enumerable: false
		// });

		// Public props
		this.id = data.id;
		this.title = data.customName;
		this.description = data.model || '';
		
		this.isOnline = data.isOnline;
	}

	toJSON() {
		return {
		//   _status: this._status,
		  id: this.id,
		  title: this.title,
		  description: this.description,
		  isOnline: this.isOnline,
		  isActive: this.isActive,
		  uptime: this.uptime,
		  updateTime: this.updateTime,
		};
	}

	async init() {
		this._status = await this._client._deviceStatus( this.id );
		this._details = await this._client._deviceDetails( this.id );
		let desc = this.description;
		this.description = this._details.product_name + (desc ? ` /${this.description}/` : '');
	}

	async getHeartbeatFunc() {
		if (this._status?.length) {
			const testFns = [
				{ code: 'do_not_disturb', _type: Boolean },
				{ code: 'countdown_1', _type: Number },
				{ code: 'music_data', _type: String },
			];
			for (let testFn of testFns) {
				if (this._status.find(avlbFn => avlbFn['code'] == testFn['code'])) {
					return testFn;
				}
			}
			return false;
		} 
		throw new Error('Local device instance not properly initialized.');
	}

	
	getValueOf(funcName) {
		if (this._status?.length) {
			let f = this._status.find(i => i.code == funcName);
			return f?.value;
		}
	}

	__calcTimes() {
		if (this._details) {
			let timeZone = parseInt(this._details.time_zone);
			///HACK: wrong time zone if devies were added during DST summer period
			timeZone = 2; 
			this.uptime = moment.duration(moment().subtract(moment.unix(this._details.update_time))).humanize();
			this.updateTime = moment.unix(this._details.update_time).utcOffset(timeZone).format('LLL');
			// this._uptime = this._details.update_time;
		}
	}

	async _actuallyOnline(testTimeout = 300) {
		const _debug = false;
		let hbFn = await this.getHeartbeatFunc();
		_debug && console.debug({heartbeatFunc: hbFn})
		if (hbFn?._type) {
			let origVal = this.getValueOf(hbFn['code']);
			let testVal = null;
			switch (hbFn['_type']) {
				case Boolean: testVal = !origVal;
					break;
				case Number: testVal = 120;
					break;
				case String: testVal = '###';
					break;
			}
			_debug && console.debug(`Setting ${hbFn['code']} to ${testVal}`);
			await this._client.sendDeviceCommand(this.id, hbFn['code'], testVal);

			await sleep(testTimeout);
			this._status = await this._client._deviceStatus(this.id);
			if (this.getValueOf(hbFn['code']) === testVal) {
				_debug && console.debug(`Setting ${hbFn['code']} back to ${origVal}`);
				this._client.sendDeviceCommand(this.id, hbFn['code'], origVal);
				return true;
			}
			return false;
		}
		throw new Error('Device heartbeat hack function not recognized');
		
	}

	
	async setState(dps = ['1'], action) {
		return await Promise.all(dps.map(async dp => 
			await this._client.sendDeviceCommand(this.id, `switch_${dp}`, action)
		));
	}
	
	
	async turnOn() {
		return super.setState.apply(this, [arguments, true]);
	}
	
	async turnOff() {
		return super.setState.apply(this, [arguments, false]);
	}
}