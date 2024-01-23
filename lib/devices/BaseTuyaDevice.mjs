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

	async init() {
		this._status = await this._client._deviceStatus( this.id );
		this._details = await this._client._deviceDetails( this.id );
		// this.DND = this.getValueOf('do_not_disturb');
		let desc = this.description;
		this.description = this._details.product_name + (desc ? ` /${this.description}/` : '');
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

}