-- Plant Guardian Database Schema
-- Supabase (PostgreSQL) SQL Script

-- Create plants table
CREATE TABLE IF NOT EXISTS plants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    species TEXT,
    water_frequency INTEGER,
    last_watered DATE DEFAULT CURRENT_DATE,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE plants ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies

-- Policy: Users can view only their own plants
CREATE POLICY "Users can view their own plants"
    ON plants
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Users can insert their own plants
CREATE POLICY "Users can insert their own plants"
    ON plants
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update only their own plants
CREATE POLICY "Users can update their own plants"
    ON plants
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete only their own plants
CREATE POLICY "Users can delete their own plants"
    ON plants
    FOR DELETE
    USING (auth.uid() = user_id);

-- Create index for faster queries by user_id
CREATE INDEX IF NOT EXISTS plants_user_id_idx ON plants(user_id);

-- Create index for faster queries by last_watered date
CREATE INDEX IF NOT EXISTS plants_last_watered_idx ON plants(last_watered);

-- Optional: Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_plants_updated_at
    BEFORE UPDATE ON plants
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
