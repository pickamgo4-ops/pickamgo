const required = [
  'NEXT_PUBLIC_API_URL',
  'NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN',
  'NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY',
  'NEXT_PUBLIC_MARKETPLACE_DOMAIN',
]

const missing = required.filter(name => !process.env[name]?.trim())
if (missing.length > 0) {
  console.error(`Missing required public build variables: ${missing.join(', ')}`)
  process.exit(1)
}

for (const name of required) console.log(`${name}: PRESENT`)
