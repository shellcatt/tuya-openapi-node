import { TuyaOpenAPIClient } from './lib/TuyaOpenAPIClient.mjs';
import { TuyaLight } from './lib/devices/TuyaLight.mjs';
import { TuyaSocket } from './lib/devices/TuyaSocket.mjs';

import { env, cwd, exit } from 'process';
import { promisify } from 'util';
import { log, error } from 'console';
import fs from 'fs';

import select from '@inquirer/select';
import 'dotenv/config';

// const env = process.env;

let sleep = promisify(setTimeout);

(async () => {

    const tuyaClient = new TuyaOpenAPIClient();

    log(fs.readFileSync(cwd() + '/tuya-iot.asc').toString('utf8'));

    log("---------------------------");
    await sleep(100);
    try {
        log('Initialize client ...');
        await tuyaClient.init(
            env.TUYA_API_KEY, 
            env.TUYA_API_SECRET,
            env.TUYA_API_REGION
        );
        
        if (!Object.keys(tuyaClient.deviceMap).length) {
            error('No devices found.');
            return;
        }

        const answer = await select({
            message: 'View device list JSON?',
            choices: [
                { name: 'yes', value: 'yes', description: 'Print JSON and continue' },
                { name: 'no', value: 'no', description: 'Continue' }
            ],
            default: 'no'
        });
        if (answer == 'yes') {
            log('Device list');
            console.dir(tuyaClient.deviceMap, { depth: null });
        }
        
        const tDevice = await select({
            message: 'Select a device to test',
            choices: Object.values(tuyaClient.deviceMap).map(d => ({
                name: d.title || `(${d.description})`,
                value: d,
                description: JSON.stringify(d)
            })),
        });

        log('Is actually online?');
        let isOnline = await tDevice._actuallyOnline();
        if (!isOnline) {
            error('Device is offline?')
            exit()
        }
        await sleep(1000);
        
        if (tDevice instanceof TuyaLight) {
            // tuyaClient.sendDeviceCommand(tDevice.id, 'switch_led', true);
            log('Turn off light...');
            await tDevice.turnOff();
            await sleep(500);

            log('Turn on light...');
            await tDevice.turnOn();
            await sleep(500);
            
            log('Set light brightness...');
            await tDevice.setBrightness(50);
            await sleep(500);

            log('Set light color mode...');
            await tDevice.setWorkMode('colour');
            await sleep(1000);

            log('Set light color value...');
            await tDevice.setColorRGB({ r: 250, g: 0, b: 0 });
            await sleep(1000);

            await tDevice.turnOff();
        }
        else if (tDevice instanceof TuyaSocket) {
          // tuyaClient.sendDeviceCommand(tDevice.id, 'switch_1', true);
          log('Turn on socket...');
          await tDevice.turnOn();
          await sleep(500);
          
          log('Turn off socket...');
          await tDevice.turnOff();
          await sleep(500);
        }

    } catch (e) {
        console.error('Failed', e);
    }
    log("---------------------------");

})()
