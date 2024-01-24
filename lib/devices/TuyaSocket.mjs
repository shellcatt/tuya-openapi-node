import { BaseTuyaDevice } from "./BaseTuyaDevice.mjs";

export class TuyaSocket extends BaseTuyaDevice {
	data = {
		reporting: {
			current: 0,
			voltage: 0,
			power: 0
		}
	};

	constructor(data, client) {
		super(data, client);
	}

	async init() {
		await super.init();

		// Check multiple switches for strips
		let switchNums = [
			'1', '2', '3', '4', '5', '6', 
			'usb1', 'usb2', 'usb3', 'usb4', 'usb5', 'usb6'
		];
		switchNums.forEach(num => {
			let curSwitch = this.getValueOf(`switch_${num}`);
			if (curSwitch !== undefined) {
				this.data[`switch_${num}`] = curSwitch;
				this.isActive ||= curSwitch;
			}
		});

		// Check electrical props
		let add_ele = this.getValueOf('add_ele');
		if (add_ele !== undefined) {
			let voltage = this.getValueOf('cur_voltage'),
				current = this.getValueOf('cur_current'),
				power = this.getValueOf('cur_power');

			this.data.reporting = {
				voltage: voltage ? voltage / 10 : 0,
				current: current ? current / 1000 : 0,
				power: power ? power : 0
			};
		}

		super.__calcTimes();
	}

	
	async turnOn(dps = ['1']) {
		return this.setState.apply(this, [dps, true]);
	}
	
	async turnOff(dps = ['1']) {
		return this.setState.apply(this, [dps, false]);
	}

}