CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  phone VARCHAR(20) NOT NULL UNIQUE,
  birth_year SMALLINT,
  sex VARCHAR(12),
  weight_kg NUMERIC(5,2),
  height_cm SMALLINT,
  activity VARCHAR(20),
  goal VARCHAR(20),
  body_fat_percent NUMERIC(5,2),
  skeletal_muscle_kg NUMERIC(6,2),
  lean_body_mass_kg NUMERIC(6,2),
  body_water_percent NUMERIC(5,2),
  visceral_fat_level NUMERIC(5,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE users ADD COLUMN IF NOT EXISTS body_fat_percent NUMERIC(5,2);
ALTER TABLE users ADD COLUMN IF NOT EXISTS skeletal_muscle_kg NUMERIC(6,2);
ALTER TABLE users ADD COLUMN IF NOT EXISTS lean_body_mass_kg NUMERIC(6,2);
ALTER TABLE users ADD COLUMN IF NOT EXISTS body_water_percent NUMERIC(5,2);
ALTER TABLE users ADD COLUMN IF NOT EXISTS visceral_fat_level NUMERIC(5,2);

CREATE TABLE IF NOT EXISTS otp_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone VARCHAR(20) NOT NULL,
  code_hash TEXT NOT NULL,
  attempts SMALLINT NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS otp_phone_idx ON otp_challenges(phone, created_at DESC);

CREATE TABLE IF NOT EXISTS sessions (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  rotated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_agent TEXT,
  ip_hash TEXT
);
CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions(user_id, expires_at);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  source VARCHAR(24) NOT NULL,
  source_id TEXT,
  barcode VARCHAR(32),
  name TEXT NOT NULL,
  name_ru TEXT,
  category TEXT,
  brand TEXT,
  image_url TEXT,
  note TEXT,
  serving_grams NUMERIC(8,2),
  raw JSONB,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(source, source_id)
);
ALTER TABLE products ADD COLUMN IF NOT EXISTS search_text TEXT NOT NULL DEFAULT '';
CREATE UNIQUE INDEX IF NOT EXISTS products_barcode_idx ON products(barcode) WHERE barcode IS NOT NULL;
CREATE INDEX IF NOT EXISTS products_name_trgm_idx ON products USING gin(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS products_name_ru_trgm_idx ON products USING gin(name_ru gin_trgm_ops);
CREATE INDEX IF NOT EXISTS products_search_text_trgm_idx ON products USING gin(search_text gin_trgm_ops);
CREATE INDEX IF NOT EXISTS products_search_ru_fts_idx ON products USING gin(to_tsvector('russian', search_text));

CREATE TABLE IF NOT EXISTS product_aliases (
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  alias TEXT NOT NULL,
  locale VARCHAR(8) NOT NULL DEFAULT 'ru',
  PRIMARY KEY(product_id, alias, locale)
);
CREATE INDEX IF NOT EXISTS aliases_trgm_idx ON product_aliases USING gin(alias gin_trgm_ops);

CREATE TABLE IF NOT EXISTS product_nutrients (
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  nutrient_key VARCHAR(64) NOT NULL,
  amount DOUBLE PRECISION NOT NULL CHECK(amount >= 0),
  unit VARCHAR(8) NOT NULL,
  per_grams SMALLINT NOT NULL DEFAULT 100,
  PRIMARY KEY(product_id, nutrient_key)
);
CREATE INDEX IF NOT EXISTS nutrients_key_idx ON product_nutrients(nutrient_key, product_id);

CREATE TABLE IF NOT EXISTS diary_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id TEXT REFERENCES products(id),
  product_snapshot JSONB NOT NULL,
  grams NUMERIC(7,2) NOT NULL CHECK(grams > 0 AND grams <= 5000),
  meal VARCHAR(20) NOT NULL,
  eaten_at TIMESTAMPTZ NOT NULL,
  day DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS diary_user_day_idx ON diary_entries(user_id, day DESC);

CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL,
  day DATE,
  start_time TIME,
  end_time TIME,
  repeat_days SMALLINT[] NOT NULL DEFAULT '{}',
  done BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS tasks_user_day_idx ON tasks(user_id, day, start_time);
CREATE INDEX IF NOT EXISTS tasks_user_category_idx ON tasks(user_id, category, done);

CREATE TABLE IF NOT EXISTS favorites (
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY(user_id, product_id)
);
DELETE FROM favorites f WHERE NOT EXISTS (SELECT 1 FROM products p WHERE p.id=f.product_id);

CREATE TABLE IF NOT EXISTS user_product_portions (
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  grams NUMERIC(7,2) NOT NULL CHECK(grams > 0 AND grams <= 5000),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY(user_id, product_id)
);

CREATE TABLE IF NOT EXISTS favorite_nutrients (
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  nutrient_key VARCHAR(64) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY(user_id, nutrient_key)
);

CREATE TABLE IF NOT EXISTS recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  instructions TEXT NOT NULL DEFAULT '',
  emoji VARCHAR(16) NOT NULL DEFAULT '🍲',
  favorite BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS recipes_user_idx ON recipes(user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS recipe_ingredients (
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES products(id),
  grams NUMERIC(8,2) NOT NULL CHECK(grams > 0 AND grams <= 5000),
  position SMALLINT NOT NULL DEFAULT 0,
  PRIMARY KEY(recipe_id, product_id)
);

CREATE TABLE IF NOT EXISTS assistant_messages (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(12) NOT NULL,
  text TEXT NOT NULL,
  food JSONB,
  foods JSONB,
  recipes JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE assistant_messages ADD COLUMN IF NOT EXISTS food JSONB;
ALTER TABLE assistant_messages ADD COLUMN IF NOT EXISTS foods JSONB;
ALTER TABLE assistant_messages ADD COLUMN IF NOT EXISTS recipes JSONB;
CREATE INDEX IF NOT EXISTS assistant_user_idx ON assistant_messages(user_id, id DESC);

CREATE TABLE IF NOT EXISTS ai_usage (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind VARCHAR(8) NOT NULL CHECK(kind IN ('photo', 'chat')),
  provider_request_id TEXT,
  model VARCHAR(100) NOT NULL,
  prompt_tokens INTEGER NOT NULL CHECK(prompt_tokens >= 0),
  completion_tokens INTEGER NOT NULL CHECK(completion_tokens >= 0),
  total_tokens INTEGER NOT NULL CHECK(total_tokens >= 0),
  cached_tokens INTEGER NOT NULL DEFAULT 0 CHECK(cached_tokens >= 0),
  cache_write_tokens INTEGER NOT NULL DEFAULT 0 CHECK(cache_write_tokens >= 0),
  cache_write_1h_tokens INTEGER NOT NULL DEFAULT 0 CHECK(cache_write_1h_tokens >= 0),
  input_cost_usd NUMERIC(14,10),
  output_cost_usd NUMERIC(14,10),
  cache_cost_usd NUMERIC(14,10),
  total_cost_usd NUMERIC(14,10),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ai_usage_user_idx ON ai_usage(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS sync_runs (
  id BIGSERIAL PRIMARY KEY,
  source TEXT NOT NULL,
  release TEXT,
  status TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  error TEXT
);
