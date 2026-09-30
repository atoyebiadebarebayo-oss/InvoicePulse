import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const supabaseUrl = 'https://mhjhwothmucstofiykuj.supabase.co'
const supabaseKey = 'sb_publishable_6vmeRg37nTdlTGTMwgAlLw_SigHF-Hw'

export const supabase = createClient(supabaseUrl, supabaseKey)