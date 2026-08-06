-- Tabla de códigos de referido
CREATE TABLE IF NOT EXISTS referral_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  promo_days INTEGER DEFAULT 30,
  max_uses INTEGER DEFAULT 1,
  used_count INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla de usuarios que usaron un código
CREATE TABLE IF NOT EXISTS referral_uses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code_id UUID REFERENCES referral_codes(id),
  user_id UUID REFERENCES auth.users(id),
  used_at TIMESTAMPTZ DEFAULT now(),
  promo_expires_at TIMESTAMPTZ,
  UNIQUE(code_id, user_id)
);

-- RLS
ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_uses ENABLE ROW LEVEL SECURITY;

-- Solo el admin puede ver códigos
CREATE POLICY "Admin can manage referral codes" ON referral_codes
  FOR ALL USING (auth.uid() IN (SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' = 'admin'));

-- Cualquier usuario autenticado puede validar un código
CREATE POLICY "Authenticated users can read active codes" ON referral_codes
  FOR SELECT USING (active = true);

-- Usuarios pueden ver sus propios usos
CREATE POLICY "Users can see their own referral uses" ON referral_uses
  FOR SELECT USING (auth.uid() = user_id);

-- Admin puede ver todos los usos
CREATE POLICY "Admin can see all referral uses" ON referral_uses
  FOR ALL USING (auth.uid() IN (SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' = 'admin'));

-- Insertar código de Gisela
INSERT INTO referral_codes (code, promo_days, max_uses, active)
VALUES ('GISELA2026', 30, 1, true)
ON CONFLICT (code) DO NOTHING;
