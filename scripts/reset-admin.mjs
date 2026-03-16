import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function resetAdmin() {
  const email = 'admin@trakn.pro'
  const password = process.env.DEMO_PASSWORD || 'demo2026' // Use DEMO_PASSWORD from .env.local

  console.log(`Fetching users to find ${email}...`)
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()
  
  if (listError) {
    console.error("Error fetching users:", listError)
    return
  }

  let adminUser = users.find(u => u.email === email)

  if (adminUser) {
    console.log(`User ${email} found with ID: ${adminUser.id}. Updating password...`)
    const { error: updateError } = await supabase.auth.admin.updateUserById(adminUser.id, {
      password: password,
      email_confirm: true
    })
    
    if (updateError) {
      console.error("Failed to update password:", updateError)
    } else {
      console.log(`Successfully updated password for ${email} to: ${password}`)
    }
  } else {
    console.log(`User ${email} not found. Creating new admin user...`)
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true
    })
    
    if (createError) {
      console.error("Failed to create user:", createError)
    } else {
      console.log(`Successfully created new admin user ${email} with password: ${password}`)
    }
  }
}

resetAdmin()
