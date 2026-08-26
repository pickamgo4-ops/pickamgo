const required = [
  'NEXT_PUBLIC_API_URL',
  'NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN',
  'NEXT_PUBLIC_MARKETPLACE_DOMAIN',
]

const optional = [
  'NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY',
]

const missing = required.filter(name => !process.env[name]?.trim())
if (missing.length > 0) {
  console.error(`Missing required public build variables: ${missing.join(', ')}`)
  process.exit(1)
}

const missingOptional = optional.filter(name => !process.env[name]?.trim())
if (missingOptional.length > 0) {
  console.warn(`Missing optional public build variables: ${missingOptional.join(', ')}`)
}

for (const name of required) console.log(`${name}: PRESENT`)
for (const name of optional.filter(name => process.env[name]?.trim())) console.log(`${name}: PRESENT`)
