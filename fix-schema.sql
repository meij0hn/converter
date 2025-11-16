-- Fix Supabase Schema for History Storage
-- Run this in Supabase SQL Editor

-- Drop existing problematic table if it exists
DROP TABLE IF EXISTS conversion_history;

-- Drop users table if it exists (not needed)
DROP TABLE IF EXISTS users;

-- Create conversion_history table with correct foreign key to auth.users
CREATE TABLE conversion_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  row_count INTEGER NOT NULL,
  column_count INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'error')),
  error_message TEXT,
  json_data TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_conversion_history_created_at ON conversion_history(created_at DESC);
CREATE INDEX idx_conversion_history_user_id ON conversion_history(user_id DESC);

-- Enable Row Level Security
ALTER TABLE conversion_history ENABLE ROW LEVEL SECURITY;

-- Create policy for conversion history (users can only access their own data)
CREATE POLICY "Users can manage their own conversion history" ON conversion_history
  FOR ALL USING (
    auth.uid() = user_id
  );

-- Grant permissions
GRANT ALL ON conversion_history TO authenticated;
GRANT SELECT ON conversion_history TO anon;