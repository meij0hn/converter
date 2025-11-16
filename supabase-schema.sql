-- Create conversion_history table
CREATE TABLE IF NOT EXISTS conversion_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  row_count INTEGER NOT NULL,
  column_count INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'error')),
  error_message TEXT,
  json_data TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- User association
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_conversion_history_created_at ON conversion_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversion_history_user_id ON conversion_history(user_id DESC);

-- Enable RLS (Row Level Security)
ALTER TABLE conversion_history ENABLE ROW LEVEL SECURITY;

-- Create policy for conversion history (users can only access their own data)
CREATE POLICY "Users can manage their own conversion history" ON conversion_history
  FOR ALL USING (
    auth.uid() = user_id
  );

-- Insert sample data (optional)
-- INSERT INTO users (id, email, name) VALUES 
--   (gen_random_uuid(), 'demo@example.com', 'Demo User');
-- 
-- INSERT INTO conversion_history (file_name, file_size, row_count, column_count, status, json_data, user_id)
-- VALUES 
--   ('sample.xlsx', 1024, 10, 3, 'success', '[{"name": "John", "age": 30, "city": "New York"}]', (SELECT id FROM users WHERE email = 'demo@example.com'));