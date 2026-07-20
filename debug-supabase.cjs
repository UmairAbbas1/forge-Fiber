const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://myednlgltvpszzcjfrta.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15ZWRubGdsdHZwc3p6Y2pmcnRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxMDE0MjYsImV4cCI6MjA5OTY3NzQyNn0.VyUyVjXQ1WQpbjISoUsSi2byfeojjXpb50bxWPFQpsk';
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
