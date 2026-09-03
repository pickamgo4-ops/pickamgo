const required = [
  'NEXT_PUBLIC_API_URL',
  'NEXT_PUBLIC_GOOGLE_MAPS_API_KEY',
  'NEXT_PUBLIC_MARKETPLACE_DOMAIN',
  'NEXT_PUBLIC_GOOGLE_CLIENT_ID',
]

const optional = [
  'NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY',
]

const missing = required.filter(name => !process.env[name]?.trim())
if (missing.length > 0) {
  console.error(`Missing required public build variables: ${missing.join(', ')}`)
  process.exit(1)
}

const mapsKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY.trim()
if (!/^AIza[0-9A-Za-z_-]{20,}$/.test(mapsKey)) {
  console.error('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is present but does not look like a Google browser API key.')
  process.exit(1)
}

const missingOptional = optional.filter(name => !process.env[name]?.trim())
if (missingOptional.length > 0) {
  console.warn(`Missing optional public build variables: ${missingOptional.join(', ')}`)
}

for (const name of required) console.log(`${name}: PRESENT`)
for (const name of optional.filter(name => process.env[name]?.trim())) console.log(`${name}: PRESENT`)
