-- 1. Tworzenie tabeli (tylko jeśli nie istnieje)
CREATE TABLE IF NOT EXISTS plants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    species VARCHAR(255),
    image_url TEXT,
    water_frequency INTEGER,
    last_watered DATE,
    sunlight TEXT,
    care_level TEXT,
    toxicity BOOLEAN,
    description TEXT,
    purchase_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Dodanie nowych kolumn do istniejącej tabeli (bezpieczne - IF NOT EXISTS nie działa dla kolumn, więc używamy DO block)
DO $$
BEGIN
    -- Dodaj sunlight jeśli nie istnieje
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'plants' AND column_name = 'sunlight') THEN
        ALTER TABLE plants ADD COLUMN sunlight TEXT;
    END IF;
    
    -- Dodaj care_level jeśli nie istnieje
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'plants' AND column_name = 'care_level') THEN
        ALTER TABLE plants ADD COLUMN care_level TEXT;
    END IF;
    
    -- Dodaj toxicity jeśli nie istnieje
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'plants' AND column_name = 'toxicity') THEN
        ALTER TABLE plants ADD COLUMN toxicity BOOLEAN;
    END IF;
    
    -- Dodaj description jeśli nie istnieje
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'plants' AND column_name = 'description') THEN
        ALTER TABLE plants ADD COLUMN description TEXT;
    END IF;

    -- Dodaj purchase_date jeśli nie istnieje
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'plants' AND column_name = 'purchase_date') THEN
        ALTER TABLE plants ADD COLUMN purchase_date DATE;
    END IF;
END $$;

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

-- ============================================================
-- TABELA: care_logs (logi pielęgnacji roślin)
-- ============================================================

-- 1. Tworzenie tabeli care_logs
CREATE TABLE IF NOT EXISTS care_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plant_id UUID NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    type TEXT NOT NULL,            -- np. 'oprysk', 'przycinanie', 'nawożenie'
    pest_name TEXT,                -- nazwa szkodnika (opcjonalne)
    medicine_name TEXT,            -- nazwa środka (opcjonalne)
    concentration TEXT,            -- stężenie / dawka (opcjonalne)
    notes TEXT,                    -- dodatkowe notatki
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Włączenie RLS dla care_logs
ALTER TABLE care_logs ENABLE ROW LEVEL SECURITY;

-- 3. Czyszczenie starych polityk (bezpieczne do wielokrotnego uruchamiania)
DROP POLICY IF EXISTS "Users can view their own care_logs" ON care_logs;
DROP POLICY IF EXISTS "Users can insert their own care_logs" ON care_logs;
DROP POLICY IF EXISTS "Users can update their own care_logs" ON care_logs;
DROP POLICY IF EXISTS "Users can delete their own care_logs" ON care_logs;

-- 4. Tworzenie polityk RLS – tylko właściciel rośliny ma dostęp
CREATE POLICY "Users can view their own care_logs"
    ON care_logs FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own care_logs"
    ON care_logs FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own care_logs"
    ON care_logs FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own care_logs"
    ON care_logs FOR DELETE
    USING (auth.uid() = user_id);

-- 5. Indeksy dla care_logs
CREATE INDEX IF NOT EXISTS care_logs_plant_id_idx ON care_logs(plant_id);
CREATE INDEX IF NOT EXISTS care_logs_user_id_idx ON care_logs(user_id);
CREATE INDEX IF NOT EXISTS care_logs_date_idx ON care_logs(date);