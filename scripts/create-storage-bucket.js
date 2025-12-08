import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const SUPABASE_URL = 'https://tkbedvjqciuerhagpmju.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRrYmVkdmpxY2l1ZXJoYWdwbWp1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2ODUyODAsImV4cCI6MjA3OTI2MTI4MH0.dHUoGGdywLyK2M35EFIq-H2UTw8KDRw8BNfYmmsmjRE';

// Create Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function createStorageBucket() {
  try {
    console.log('Creating storage bucket...');
    
    // Check if bucket exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('Error listing buckets:', listError);
      return;
    }

    console.log('Existing buckets:', buckets);

    const assetsBucket = buckets?.find(b => b.name === 'assets');

    if (!assetsBucket) {
      console.log('Creating assets bucket...');
      const { data: newBucket, error: createError } = await supabase.storage.createBucket('assets', {
        public: true,
        allowedMimeTypes: ['image/*', 'audio/*', 'text/*'],
        fileSizeLimit: 52428800 // 50MB (default Supabase limit)
      });

      if (createError) {
        console.error('Error creating bucket:', createError);
      } else {
        console.log('✅ Assets bucket created successfully:', newBucket);
      }
    } else {
      console.log('✅ Assets bucket already exists:', assetsBucket);
    }
  } catch (error) {
    console.error('❌ Error creating bucket:', error);
  }
}

createStorageBucket();