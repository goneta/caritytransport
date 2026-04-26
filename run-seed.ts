import { seedDatabase } from './src/lib/seed'
seedDatabase().then(console.log).catch(console.error)
