import 'dotenv/config';
import { supabase } from '../lib/supabase.mjs';

const { data, error } = await supabase
  .from('channels')
  .select('name, handle, is_self, is_active, youtube_channel_id')
  .order('is_self', { ascending: false })
  .order('name');
if (error) throw error;

if (!data.length) {
  console.log('No channels yet. Add some with:  npm run add -- "@handle"');
} else {
  for (const c of data) {
    console.log(`${c.is_self ? '★ (you)' : '  '}  ${c.name}  ${c.handle || ''}  ${c.is_active ? '' : '(inactive)'}`);
  }
  console.log(`\n${data.length} channel(s).`);
}
