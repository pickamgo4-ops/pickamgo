#!/usr/bin/env node
/* eslint-disable no-console */

import { bootstrapAdministrator } from '../src/utils/bootstrap-admin'
import prisma from '../src/utils/prisma'

async function main() {
  const args = process.argv.slice(2)
  const flags = new Set(args.filter(arg => arg.startsWith('--')).map(arg => arg.slice(2)))
  const positional = args.filter(arg => !arg.startsWith('--'))

  const email = positional[0] ?? process.env.ADMIN_EMAIL
  const password = process.env.ADMIN_BOOTSTRAP_PASSWORD
  const allowCreate = flags.has('invite') || flags.has('create') || process.env.NODE_ENV !== 'production'

  if (!email) {
    console.error(JSON.stringify({ ok: false, error: 'ADMIN_EMAIL is required. Pass it as an argument or set the server-side ADMIN_EMAIL environment variable.' }))
    process.exit(1)
  }

  try {
    const result = await bootstrapAdministrator({ email, password, allowCreate })
    console.log(JSON.stringify({ ok: true, ...result }, null, 2))
  } catch (error) {
    console.error(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) }))
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()