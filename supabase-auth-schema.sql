-- Create users table for authentication
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_profiles table for additional user info
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Update conversion_history table to include user_id
ALTER TABLE conversion_history ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE CASCADE;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_conversion_history_user_id ON conversion_history(user_id);
CREATE INDEX IF NOT EXISTS idx_conversion_history_created_at ON conversion_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);

-- Enable RLS (Row Level Security)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversion_history ENABLE ROW LEVEL SECURITY;

-- Create policies for users (users can only access their own data)
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policies for conversion history
CREATE POLICY "Users can view own conversions" ON conversion_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own conversions" ON conversion_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own conversions" ON conversion_history
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own conversions" ON conversion_history
  FOR DELETE USING (auth.uid() = user_id);

-- Users can view their own user info
CREATE POLICY "Users can view own info" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own info" ON users
  FOR UPDATE USING (auth.uid() = id);