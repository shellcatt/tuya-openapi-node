import { 
	BaseTuyaDevice 
} from './BaseTuyaDevice';

export class TuyaLight extends BaseTuyaDevice {
	data = {
		workMode: null,
		color: { r: 0, g: 0, b: 0 },
		colorTemp: null,
		brightness: null,
		sceneData: [],
	};

	constructor(data, client) {
		super(data, client);
	}

	async init() {
		await super.init();
		this.isActive = this.getValueOf('switch_led') || false;
		
		this.data.workMode = this.getValueOf('work_mode');
		
		if (this.data.workMode == 'white') {
			let brightness = this.getValueOf('bright_value_v2');
			if (brightness) {
				this.data.brightness = brightness / 10;
			}
			let colorTemp = this.getValueOf('temp_value_v2');
			if (colorTemp) {
				this.data.colorTemp = colorTemp / 10;
			}
		} else if (this.data.workMode == 'colour') {
			let colorData = this.getValueOf('colour_data_v2');
			if (colorData) {
				let hsv = JSON.parse(colorData);
				this.data.color = hsv2rgb(hsv['h']/360, hsv['s']/1000, hsv['v']/1000);
			}
		} else if (this.data.workMode == 'scene') {
			let sceneData = this.getValueOf('scene_data_v2');
			this.data.sceneData = JSON.parse(sceneData);
		}

		super.__calcTimes();
	}

	
	async turnOn(dps = ['led']) {
		return await super.setState.apply(this, [dps, true]);
	}
	
	async turnOff(dps = ['led']) {
		return await super.setState.apply(this, [dps, false]);
	}
	

	
	async setWorkMode(value) {
		if (['white', 'colour', 'scene'].includes(value)) {
			return await super.sendCmd("work_mode", value * 10);
		}
		throw new Error(`Invalid work mode value: ${value}`);
	}

	async setBrightness(value) {
		if (value > 0 || value < 100) {
			return await super.sendCmd("bright_value_v2", value * 10);
		}
		throw new Error(`Invalid brightness value: ${value}`);
	}

	async setColorRGB(value = { r: 0, g: 0, b: 0 }) {
		if (~value?.r && ~value?.g && ~value?.b) {
			return await super.sendCmd("colour_data_v2", rgb2hsv(value.r, value.g, value.b));
		}
		throw new Error(`Invalid color value: ${JSON.stringify(value)}`);
	}

}


function rgb2hsv(r, g, b) {
	r = r / 255;
	g = g / 255;
	b = b / 255;
  
	const max = Math.max(r, g, b),
		min = Math.min(r, g, b);
  
	let h, s, v = max;
  
	const d = max - min;
	s = max === 0 ? 0 : d / max;
  
	if (max === min) {
		h = 0; // achromatic (gray)
	} else {
		switch (max) {
			case r:
				h = (g - b) / d + (g < b ? 6 : 0);
				break;
			case g:
				h = (b - r) / d + 2;
				break;
			case b:
				h = (r - g) / d + 4;
				break;
		}
		h /= 6;
	}
  
	return {
		h: Math.round(h * 360),
		s: Math.round(s * 1000),
		v: Math.round(v * 1000)
	};
	// Quick ref: https://www.rapidtables.com/web/color/RGB_Color.html
}

function hsv2rgb(h, s, v) {                              
	let r, g, b, i, f, p, q, t;
    
    i = Math.floor(h * 6);
    f = h * 6 - i;
    p = v * (1 - s);
    q = v * (1 - f * s);
    t = v * (1 - (1 - f) * s);
    switch (i % 6) {
        case 0: r = v, g = t, b = p; break;
        case 1: r = q, g = v, b = p; break;
        case 2: r = p, g = v, b = t; break;
        case 3: r = p, g = q, b = v; break;
        case 4: r = t, g = p, b = v; break;
        case 5: r = v, g = p, b = q; break;
    }
    return {
        r: Math.round(r * 255),
        g: Math.round(g * 255),
        b: Math.round(b * 255)
    };
}