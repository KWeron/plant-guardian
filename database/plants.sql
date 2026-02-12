-- 1. Tworzenie tabeli (tylko jeśli nie istnieje)
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

-- 2. Włączenie RLS (bezpieczne do wielokrotnego uruchamiania)
ALTER TABLE plants ENABLE ROW LEVEL SECURITY;

-- 3. Czyszczenie starych polityk (to naprawia Twój błąd!)
DROP POLICY IF EXISTS "Users can view their own plants" ON plants;
DROP POLICY IF EXISTS "Users can insert their own plants" ON plants;
DROP POLICY IF EXISTS "Users can update their own plants" ON plants;
DROP POLICY IF EXISTS "Users can delete their own plants" ON plants;

-- 4. Tworzenie polityk na nowo
CREATE POLICY "Users can view their own plants"
    ON plants FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own plants"
    ON plants FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own plants"
    ON plants FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own plants"
    ON plants FOR DELETE
    USING (auth.uid() = user_id);

-- 5. Indeksy (IF NOT EXISTS zapobiega błędom duplikatów)
CREATE INDEX IF NOT EXISTS plants_user_id_idx ON plants(user_id);
CREATE INDEX IF NOT EXISTS plants_last_watered_idx ON plants(last_watered);