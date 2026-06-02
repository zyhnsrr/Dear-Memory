import { createClient, SupabaseClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';

export interface Memory {
  id: string;
  recipient_email: string;
  photo_url: string;
  voice_url?: string;
  message?: string;
  schedule_type: string;
  delivery_date: string;
  status: 'pending' | 'sent';
  created_at: string;
}

const isSupabaseConfigured = () => {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
};

let supabaseClient: SupabaseClient | null = null;

export const getSupabase = () => {
  if (!isSupabaseConfigured()) return null;
  if (!supabaseClient) {
    supabaseClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return supabaseClient;
};

// Local JSON File DB config
const LOCAL_DB_PATH = path.join(process.cwd(), 'src', 'data', 'local_db.json');

const initLocalDb = async () => {
  try {
    await fs.mkdir(path.dirname(LOCAL_DB_PATH), { recursive: true });
    await fs.access(LOCAL_DB_PATH);
  } catch {
    await fs.writeFile(LOCAL_DB_PATH, JSON.stringify([], null, 2), 'utf-8');
  }
};

const readLocalDb = async (): Promise<Memory[]> => {
  await initLocalDb();
  try {
    const data = await fs.readFile(LOCAL_DB_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading local JSON database:', err);
    return [];
  }
};

const writeLocalDb = async (memories: Memory[]) => {
  await initLocalDb();
  try {
    await fs.writeFile(LOCAL_DB_PATH, JSON.stringify(memories, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing local JSON database:', err);
  }
};

export const createMemory = async (
  memoryData: Omit<Memory, 'id' | 'created_at' | 'status'>
): Promise<Memory> => {
  const newMemory: Memory = {
    ...memoryData,
    id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9),
    status: 'pending',
    created_at: new Date().toISOString(),
  };

  const supabase = getSupabase();
  if (supabase) {
    const { data, error } = await supabase
      .from('memories')
      .insert([newMemory])
      .select()
      .single();

    if (error) {
      console.error('Supabase insert error:', error);
      throw error;
    }
    return data;
  } else {
    // Sandbox Local JSON Database
    const memories = await readLocalDb();
    memories.push(newMemory);
    await writeLocalDb(memories);
    return newMemory;
  }
};

export const getPendingMemories = async (): Promise<Memory[]> => {
  const now = new Date().toISOString();
  const supabase = getSupabase();

  if (supabase) {
    const { data, error } = await supabase
      .from('memories')
      .select('*')
      .eq('status', 'pending')
      .lte('delivery_date', now);

    if (error) {
      console.error('Supabase query pending memories error:', error);
      throw error;
    }
    return data || [];
  } else {
    // Sandbox Local JSON Database
    const memories = await readLocalDb();
    return memories.filter(
      (m) => m.status === 'pending' && new Date(m.delivery_date) <= new Date(now)
    );
  }
};

export const updateMemoryStatus = async (
  id: string,
  status: 'pending' | 'sent'
): Promise<void> => {
  const supabase = getSupabase();

  if (supabase) {
    const { error } = await supabase
      .from('memories')
      .update({ status })
      .eq('id', id);

    if (error) {
      console.error('Supabase update status error:', error);
      throw error;
    }
  } else {
    // Sandbox Local JSON Database
    const memories = await readLocalDb();
    const index = memories.findIndex((m) => m.id === id);
    if (index !== -1) {
      memories[index].status = status;
      await writeLocalDb(memories);
    }
  }
};

export const getAllMemories = async (): Promise<Memory[]> => {
  const supabase = getSupabase();

  if (supabase) {
    const { data, error } = await supabase
      .from('memories')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase get all memories error:', error);
      throw error;
    }
    return data || [];
  } else {
    // Sandbox Local JSON Database
    const memories = await readLocalDb();
    return [...memories].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }
};

export const deleteMemoryLocal = async (id: string): Promise<void> => {
  const supabase = getSupabase();
  if (supabase) {
    const { error } = await supabase.from('memories').delete().eq('id', id);
    if (error) throw error;
  } else {
    const memories = await readLocalDb();
    const filtered = memories.filter((m) => m.id !== id);
    await writeLocalDb(filtered);
  }
};
