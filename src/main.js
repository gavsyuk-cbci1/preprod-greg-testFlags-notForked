import Rox from 'rox-browser'

// Diagnostics: logs every SDK request through console.error, which Vite forwards to the terminal
// running `npm run dev`. Delete this block once you no longer care about the wire traffic.
const origOpen = XMLHttpRequest.prototype.open
const origSend = XMLHttpRequest.prototype.send
XMLHttpRequest.prototype.open = function (method, url, ...rest) {
  this.__req = `${method} ${url}`
  return origOpen.call(this, method, url, ...rest)
}
XMLHttpRequest.prototype.send = function (body) {
  this.addEventListener('loadend', () => {
    console.error(`[net] ${this.status} ${this.__req}${body ? ` body=${String(body).slice(0, 400)}` : ''}`)
  })
  return origSend.call(this, body)
}

// Straight from the wizard's step 2 snippet, read from `.env` (see `.env.example`). Both have to
// match the snippet: step 2 polls the platform for a flag whose key is exactly the one it generated,
// so a stale name here leaves it on "Waiting for connection..." forever even though the SDK
// connected fine.
const SDK_KEY = import.meta.env.VITE_SDK_KEY
const FLAG_KEY = import.meta.env.VITE_FLAG_KEY || 'myFlag'

// rox-browser hardcodes prod (api.cloudbees.io) as soon as it recognises a platform-shaped key,
// so a preprod key registers its flags in the wrong environment and the dashboard never sees them.
// `options.configuration` replaces the endpoint set wholesale (Config.setActive), and it is applied
// after the key detection, so it wins. Every key the SDK reads has to be present here.
const PREPROD_HOST = 'api.saas-preprod.beescloud.com'
const PREPROD_CONFIGURATION = {
  API_HOST: PREPROD_HOST,
  CD_API_ENDPOINT: `https://${PREPROD_HOST}/device/get_configuration`,
  CD_S3_ENDPOINT: 'https://rox-conf.saas-preprod.beescloud.com/',
  SS_API_ENDPOINT: `https://${PREPROD_HOST}/device/update_state_store/`,
  SS_S3_ENDPOINT: 'https://rox-state.saas-preprod.beescloud.com/',
  CLIENT_DATA_CACHE_KEY: 'client_data',
  NOTIFICATIONS_ENDPOINT: 'https://sdk-notification-service.saas-preprod.beescloud.com/sse',
  ANALYTICS_ENDPOINT: 'https://fm-analytics.saas-preprod.beescloud.com',
  ERROR_REPORTER: undefined,
}

const flags = {
  [FLAG_KEY]: new Rox.Flag(),
}

const stateEl = document.getElementById('state')
const logEl = document.getElementById('log')
document.getElementById('flag-key').textContent = FLAG_KEY

const log = message => {
  logEl.textContent += `${message}\n`
  console.info(message)
}

const paint = () => {
  const isEnabled = flags[FLAG_KEY].isEnabled()
  stateEl.textContent = isEnabled ? 'ON' : 'OFF'
  stateEl.className = isEnabled ? 'on' : 'off'
}

async function initPlatform() {
  if (!SDK_KEY) {
    throw new Error('VITE_SDK_KEY is not set. Copy .env.example to .env and paste the key from step 2 of the wizard.')
  }

  const options = {
    configuration: PREPROD_CONFIGURATION,
    // Logs every config pull, so you can see the toggle from step 3 landing here.
    configurationFetchedHandler: fetcherResult => {
      log(`config fetched: ${fetcherResult.fetcherStatus} (${fetcherResult.hasChanges ? 'changed' : 'no changes'})`)
      paint()
    },
  }

  Rox.register('', flags)
  await Rox.setup(SDK_KEY, options)

  log('Rox.setup done, flag registered with the platform')
  paint()

  if (flags[FLAG_KEY].isEnabled()) {
    // Your flag-gated code here
  }
}

initPlatform().catch(error => {
  stateEl.textContent = 'error'
  log(`setup failed: ${error?.message ?? error}`)
})

// The handler above repaints on every config pull. This is just a safety net, and it stays slow on
// purpose: each `isEnabled()` sends an impression, so a 1s tick floods the analytics endpoint.
setInterval(paint, 5000)
