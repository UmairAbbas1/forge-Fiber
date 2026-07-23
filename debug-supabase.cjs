const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Error: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables are required.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('Fetching customers...');
  const { data: customers } = await supabase.from('customers').select('*');
  console.log(customers);

  console.log('Fetching orders...');
  const { data: orders } = await supabase.from('orders').select('*');
  console.log(orders);

  console.log('Fetching profiles...');
  const { data: profiles } = await supabase.from('profiles').select('*');
  console.log(profiles);
}

run();
