'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/use-auth';

export default function SupabaseTest() {
  const { user } = useAuth();
  const [result, setResult] = useState('');

  const testConnection = async () => {
    if (!user) {
      setResult('❌ No user logged in');
      return;
    }

    try {
      // Test basic connection
      const { data, error } = await supabase
        .from('users')
        .select('count(*)')
        .single();

      if (error) throw error;

      setResult('✅ Supabase connection successful!');
      console.log('Supabase test result:', data);
    } catch (error) {
      setResult(`❌ Error: ${error.message}`);
      console.error('Supabase test error:', error);
    }
  };

  return (
    <div className="p-4 border rounded">
      <h3 className="font-bold mb-2">Supabase Connection Test</h3>
      <button 
        onClick={testConnection}
        className="bg-green-500 text-white px-4 py-2 rounded mb-2"
      >
        Test Supabase Connection
      </button>
      <div className="text-sm">{result}</div>
    </div>
  );
}
