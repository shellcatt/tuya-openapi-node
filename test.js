import { TuyaOpenAPIClient } from './lib/TuyaOpenAPIClient.mjs';
import { TuyaLight } from './lib/devices/TuyaLight.mjs';
import { TuyaSocket } from './lib/devices/TuyaSocket.mjs';
import TuyaLink from '@tuyapi/link';

import { env, cwd, exit, stdin } from 'process';
import { promisify } from 'util';
import { log, error } from 'console';
import fs from 'fs';

import select, { Separator } from '@inquirer/select';
import input from '@inquirer/input';
import 'dotenv/config';

let sleep = promisify(setTimeout);

const TUYALINK_OPTIONS = {
    email: env.TUYA_USER,
    password: env.TUYA_PASS,
    region: env.TUYA_REGION,
    timezone: env.TUYA_TIMEZONE,
    apiKey: env.TUYA_API_KEY,
    apiSecret: env.TUYA_API_SECRET,
    schema: env.TUYA_APP_SCHEMA
};

(async () => {

    const tuyaClient = new TuyaOpenAPIClient();

    let [prompt, answer] = [null, null];
    // Graceful stop 
    stdin.on('keypress', (_, key) => {
        if (['escape', 'q'].includes(key.name)) {
          prompt.cancel()
        }
    });

    log(fs.readFileSync(cwd() + '/tuya-iot.asc').toString('utf8'));

    log("---------------------------");
    await sleep(100);
    try {
        log('Initialize client ...');
        await tuyaClient.init(
            env.TUYA_API_KEY, 
            env.TUYA_API_SECRET,
            env.TUYA_REGION
        );
        
        if (Object.keys(tuyaClient.deviceMap).length) {
            log('Found ' + Object.keys(tuyaClient.deviceMap).length + ' devices');
            await sleep(500);

            prompt = select({
                message: 'View device list JSON?',
                choices: [
                    { name: 'Yes', value: 'yes', description: 'Print JSON and continue' },
                    { name: 'No', value: 'no', description: 'Continue' }
                ],
                default: 'no'
            });
            answer = await prompt.catch(onExit);
    
            if (answer == 'yes') {
                log('Device list');
                console.dir(tuyaClient.deviceMap, { depth: null });
            }
        }
        
        prompt = select({
            message: 'Select a device, or ...',
            choices: [
                ...Object.values(tuyaClient.deviceMap).map(d => ({
                    name: d.title || `(${d.description})`,
                    value: d,
                    description: JSON.stringify(d)
                })), 
                new Separator(),
                {
                    name: '+ Add new device',
                    value: 'add',
                    description: JSON.stringify(TUYALINK_OPTIONS)
                },
                new Separator(),
            ],
        });
        answer = await prompt.catch(onExit);

        if (answer === 'add') {
            await addDeviceProcedure();
        } 
        else {
            const tDevice = answer;
            log('Is actually online?');
            let isOnline = await tDevice._actuallyOnline();
            if (!isOnline) {
                error('Device is offline?');
                exit();
            }
            log('... yes');
    
            prompt = select({
                message: 'Select device action',
                choices: [
                    { name: 'Test', value: 'test', description: 'Perform automated device tests' },
                    { name: 'Rename', value: 'rename', description: 'Give new customName to device' },
                    { name: 'Reset', value: 'reset', description: 'Reset factory settings' }
                ],
                default: 'test'
            });
            answer = await prompt.catch(onExit);
            
            if (answer == 'test') {
                await deviceTestProcedure(tDevice);
            } 
            else if (answer == 'rename') {
                answer = await input({ message: 'Enter new device name:' });
                await deviceRenameProcedure(tDevice, answer);
            } 
            else if (answer == 'reset') {
                prompt = select({
                    message: 'ARE YOU SURE YOU WANT TO RESET THIS DEVICE TO FACTORY SETTINGS?',
                    choices: [
                        { name: 'Yes', value: 'yes', description: 'I said YES' },
                        { name: 'No', value: 'no', description: 'Hell NO' }
                    ],
                    default: 'no'
                });
                answer = await prompt.catch(onExit);
                if (answer == 'yes') {
                    await deviceResetProcedure(tDevice);
                } 
            }

        }
        

    } catch (e) {
        console.error('Failed', e);
    }
    log("---------------------------");

})()

async function deviceTestProcedure(tDevice) {
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

        log('Check light colors...');
        log(JSON.stringify( tDevice.data ));
        await sleep(500);
        
        log('Turn off light...');
        await tDevice.turnOff();
    }
    else if (tDevice instanceof TuyaSocket) {
        // tuyaClient.sendDeviceCommand(tDevice.id, 'switch_1', true);
        log('Turn on socket...');
        await tDevice.turnOn();
        await sleep(500);

        log('Wait 25 sec for reporting to register...');
        await sleep(25000);
        
        log('Re-init socket values...');
        await tDevice.init();

        log('Check socket power consumption...');
        log(JSON.stringify( tDevice.data.reporting ));
        await sleep(500);

        log('Turn off socket...');
        await tDevice.turnOff();
        await sleep(500);
    }

    log('✔ Tests completed')
}

async function deviceRenameProcedure(tDevice, name) {
    try {
        await tDevice.rename(name);
    } catch (e) {
        error(`Could not reset device ${tDevice.id}`)
    }
    log(`✔ Device ${tDevice.id} renamed successfully to ${name}!`);
    log(`❗ Changes will take effect in at ~30 seconds`);
}

async function deviceResetProcedure(tDevice) {
    try {
        await tDevice.destroy();
    } catch (e) {
        error(`Could not reset device ${tDevice.id}`)
    }
    log(`✔ Device ${tDevice.id} reset successfully!`);
}

async function addDeviceProcedure() {
    const register = new TuyaLink.wizard(TUYALINK_OPTIONS);

    await register.init();
    log('Logged in successfuly');

    log('Connecting to device.......')
    let devices = await register.linkDevice({ ssid: env.WIFI_SSID, wifiPassword: env.WIFI_PASS, devices: 1 });

    log('✔ Added device(s)')
    console.log(devices);
}

function onExit() {
    console.log('Bye');
    exit();
}