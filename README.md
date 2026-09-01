# testFlags

Throwaway app to exercise the FM PLG onboarding wizard end to end with a real SDK connection.

```bash
npm install
cp .env.example .env   # then paste the SDK key and flag key from step 2
npm run dev            # http://localhost:5180
```

It runs the exact snippet the wizard's step 2 generates for JavaScript / npm: registers the flag in
the default namespace and calls `Rox.setup` with the SDK key. Once it loads, step 2 should flip from
"Waiting for connection..." to "Connected", and step 3 can toggle the flag.

## Configuration

Both values live in `.env`, which is gitignored so no key ends up in the repo. Vite only exposes
variables prefixed with `VITE_`, and it reads the file at server start, so restart `npm run dev`
after editing it.

| Variable | Required | Description |
| --- | --- | --- |
| `VITE_SDK_KEY` | yes | SDK key from the step 2 snippet. Without it the page shows `error` and logs what is missing. |
| `VITE_FLAG_KEY` | no (defaults to `myFlag`) | Flag key from that same snippet. |

Every time you restart the wizard you get a new application, so update **both** variables. Step 2
polls the platform for a flag with exactly the key from its snippet, so if only the SDK key is
updated it stays on "Waiting for connection..." even though the SDK connected fine.

## Why the endpoints are overridden

`rox-browser` switches to prod (`api.cloudbees.io`) on its own as soon as the key looks like a
platform key, and there is no `hosting` value for preprod. With a preprod key that means the flag
gets registered in the wrong environment: the state push returns 200 against prod, and the preprod
dashboard never sees the flag, so step 2 sits on "Waiting for connection..." forever.

`PREPROD_CONFIGURATION` in `src/main.js` replaces the endpoint set so everything lands in preprod.
Drop it (and the `configuration` option) when testing against prod. Note the impression POSTs to
`fm-analytics.saas-preprod.beescloud.com` come back as status 0 (CORS), which does not affect flag
evaluation or registration.
