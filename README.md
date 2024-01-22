# Tuya IoT Core API (NodeJS)

### Get Tuya API key & secret

- Visit the [iot platform](https://iot.tuya.com/cloud/)
- Create a Project
- Add Authorization
  

## Usage 

<details open>
<summary> <strong> Standalone </strong> </summary>

- install modules with `npm install`
- create a `.env` file (see `.env.example`)
- run tests with `npm test`

</details>


### ☞ [Useful links](./TUYA-LINKS.md) 

### Useful Hints
- Device `online` heartbeat timeout is ~5 minutes, so even though online status is registered within ~30 seconds, official `offline` status is registered within the heartbeat timeout 
- status function values (`switch_*`, `colour_data_*`, etc.) have their values updated instantaniously, so they can be used to determine a device's responsiveness
- Most light bulbs (`dj`) consume ~30 Watts in `white` mode, and <~30 Watts in `colour` mode
- Power sockets (`cz`) report down to at least ~32 Watts as measurable power consumption


### About 

Advanced low-level device communication. Utilizes [`tuya-connector-nodejs`](https://github.com/tuya/tuya-connector-nodejs).

> See also

- [Tuya Smart Life API + CLI](https://github.com/shellcatt/tuya-smartlife-api-node)

<br>
