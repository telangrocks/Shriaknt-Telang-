const { Pool } = require('pg');
const logger = require('../utils/logger');

let pool = null;
let schemaInitializationPromise = null;

const UUID_NAMESPACE = 'f9ea3ce4-2cf2-4d19-94e9-8e74d689a7cf';
const USER_FOREIGN_KEY_MAPPINGS = [
  { tableName: 'exchange_keys', columnName: 'user_id' },
  { tableName: 'user_pairs', columnName: 'user_id' },
  { tableName: 'user_strategies', columnName: 'user_id' },
  { tableName: 'trades', columnName: 'user_id' },
  { tableName: 'payments', columnName: 'user_id' },
  { tableName: 'notifications', columnName: 'user_id' }
];

function quoteIdentifier(identifier) {
  return `"${identifier.replace(/"/g, '""')}"`;
}

function createPool() {
  if (pool) {
    return pool;
  }

  if (!process.env.DATABASE_URL) {
    const error = new Error('DATABASE_URL environment variable is not set. Cannot create database pool.');
    logger.error('Failed to create database pool:', {
      error: error.message,
      stack: error.stack
    });
    throw error;
  }

  try {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    pool.on('error', (err) => {
      logger.error('Unexpected error on idle database client:', {
        error: err.message,
        code: err.code,
        name: err.name,
        stack: err.stack
      });
    });

    logger.info('Database pool created successfully', {
      maxConnections: 20,
      connectionTimeout: '2000ms',
      idleTimeout: '30000ms'
    });
  } catch (error) {
    logger.error('Failed to create database pool:', {
      error: error.message,
      name: error.name,
      code: error.code,
      stack: error.stack
    });
    throw error;
  }

  return pool;
}

async function initializeDatabaseSchema() {
  if (schemaInitializationPromise) {
    return schemaInitializationPromise;
  }

  schemaInitializationPromise = (async () => {
    const poolInstance = createPool();
    const client = await poolInstance.connect();

    try {
      await initializeSchema(client);
      logger.info('Database schema initialized successfully');
    } finally {
      client.release();
    }
  })().catch((error) => {
    schemaInitializationPromise = null;
    throw error;
  });

  return schemaInitializationPromise;
}

async function ensureExtensions(client) {
  await client.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');
  await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
}

async function getColumnInfo(client, tableName, columnName) {
  const { rows } = await client.query(
    `SELECT data_type, column_default
     FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = $1
       AND column_name = $2`,
    [tableName, columnName]
  );

  return rows[0] || null;
}

async function dropForeignKeyConstraints(client, tableName, columnName) {
  const { rows } = await client.query(
    `SELECT tc.constraint_name
     FROM information_schema.table_constraints tc
     JOIN information_schema.key_column_usage kcu
       ON tc.constraint_name = kcu.constraint_name
     WHERE tc.constraint_type = 'FOREIGN KEY'
       AND tc.table_schema = 'public'
       AND tc.table_name = $1
       AND kcu.column_name = $2`,
    [tableName, columnName]
  );

  for (const { constraint_name: constraintName } of rows) {
    await client.query(
      `ALTER TABLE public.${quoteIdentifier(tableName)}
       DROP CONSTRAINT ${quoteIdentifier(constraintName)}`
    );
  }
}

async function foreignKeyConstraintExists(client, tableName, columnName, referencedTable, referencedColumn) {
  const { rows } = await client.query(
    `SELECT 1
     FROM information_schema.table_constraints tc
     JOIN information_schema.key_column_usage kcu
       ON tc.constraint_name = kcu.constraint_name
      AND tc.constraint_schema = kcu.constraint_schema
     JOIN information_schema.referential_constraints rc
       ON rc.constraint_name = tc.constraint_name
      AND rc.constraint_schema = tc.constraint_schema
     JOIN information_schema.constraint_column_usage ccu
       ON rc.unique_constraint_name = ccu.constraint_name
      AND rc.unique_constraint_schema = ccu.constraint_schema
     WHERE tc.constraint_type = 'FOREIGN KEY'
       AND tc.table_schema = 'public'
       AND tc.table_name = $1
       AND kcu.column_name = $2
       AND ccu.table_name = $3
       AND ccu.column_name = $4
     LIMIT 1`,
    [tableName, columnName, referencedTable, referencedColumn]
  );

  return rows.length > 0;
}

async function ensureUsersIdIsUuid(client) {
  const columnInfo = await getColumnInfo(client, 'users', 'id');

  if (!columnInfo) {
    return;
  }

  if (columnInfo.data_type === 'uuid') {
    if (!columnInfo.column_default || !columnInfo.column_default.includes('gen_random_uuid')) {
      await client.query(
        'ALTER TABLE public.users ALTER COLUMN id SET DEFAULT gen_random_uuid()'
      );
    }
    return;
  }

  await client.query('BEGIN');
  try {
    for (const { tableName, columnName } of USER_FOREIGN_KEY_MAPPINGS) {
      await dropForeignKeyConstraints(client, tableName, columnName);
    }

    await client.query('ALTER TABLE public.users ALTER COLUMN id DROP DEFAULT');
    await client.query(
      `ALTER TABLE public.users
       ALTER COLUMN id TYPE uuid USING uuid_generate_v5('${UUID_NAMESPACE}'::uuid, id::text)`
    );
    await client.query('ALTER TABLE public.users ALTER COLUMN id SET DEFAULT gen_random_uuid()');

    for (const { tableName, columnName } of USER_FOREIGN_KEY_MAPPINGS) {
      await ensureForeignKeyColumnIsUuid(client, tableName, columnName);
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}

async function ensureForeignKeyColumnIsUuid(client, tableName, columnName) {
  const columnInfo = await getColumnInfo(client, tableName, columnName);
  const constraintExists = await foreignKeyConstraintExists(
    client,
    tableName,
    columnName,
    'users',
    'id'
  );

  if (!columnInfo) {
    await client.query(
      `ALTER TABLE public.${quoteIdentifier(tableName)}
       ADD COLUMN ${quoteIdentifier(columnName)} uuid`
    );
    await client.query(
      `ALTER TABLE public.${quoteIdentifier(tableName)}
       ADD CONSTRAINT ${quoteIdentifier(`${tableName}_${columnName}_fkey`)}
       FOREIGN KEY (${quoteIdentifier(columnName)}) REFERENCES public.users(id) ON DELETE CASCADE`
    );
    return;
  }

  let needsConstraint = !constraintExists;

  if (columnInfo.data_type !== 'uuid') {
    await dropForeignKeyConstraints(client, tableName, columnName);
    await client.query(
      `ALTER TABLE public.${quoteIdentifier(tableName)}
       ALTER COLUMN ${quoteIdentifier(columnName)} DROP DEFAULT`
    );
    await client.query(
      `ALTER TABLE public.${quoteIdentifier(tableName)}
       ALTER COLUMN ${quoteIdentifier(columnName)} TYPE uuid USING (
         CASE
           WHEN ${quoteIdentifier(columnName)} IS NULL THEN NULL
           ELSE uuid_generate_v5('${UUID_NAMESPACE}'::uuid, ${quoteIdentifier(columnName)}::text)
         END
       )`
    );
    needsConstraint = true;
  }

  if (needsConstraint) {
    await client.query(
      `ALTER TABLE public.${quoteIdentifier(tableName)}
       ADD CONSTRAINT ${quoteIdentifier(`${tableName}_${columnName}_fkey`)}
       FOREIGN KEY (${quoteIdentifier(columnName)}) REFERENCES public.users(id) ON DELETE CASCADE`
    );
  }
}

async function initializeSchema(client) {
  try {
    await ensureExtensions(client);

    // Create users table first (no changes needed - already UUID)
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        phone VARCHAR(20) UNIQUE,
        supabase_user_id UUID UNIQUE,
        name VARCHAR(255),
        email VARCHAR(255),
        is_active BOOLEAN DEFAULT true,
        is_verified BOOLEAN DEFAULT false,
        trial_start_date TIMESTAMP,
        trial_end_date TIMESTAMP,
        subscription_start_date TIMESTAMP,
        subscription_end_date TIMESTAMP,
        subscription_status VARCHAR(50) DEFAULT 'trial',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Ensure users.id is UUID (for existing databases)
    await ensureUsersIdIsUuid(client);

    await client.query(
      'ALTER TABLE public.users ALTER COLUMN phone DROP NOT NULL'
    );

    await client.query(`
      ALTER TABLE public.users
      ADD COLUMN IF NOT EXISTS supabase_user_id UUID UNIQUE
    `);

    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique
      ON public.users(email)
      WHERE email IS NOT NULL
    `);

    // FIXED: exchange_keys with UUID user_id
    await client.query(`
      CREATE TABLE IF NOT EXISTS exchange_keys (
        id SERIAL PRIMARY KEY,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        exchange_name VARCHAR(50) NOT NULL,
        api_key_encrypted TEXT NOT NULL,
        api_secret_encrypted TEXT NOT NULL,
        passphrase_encrypted TEXT,
        is_active BOOLEAN DEFAULT true,
        is_validated BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, exchange_name)
      )
    `);

    // FIXED: user_pairs with UUID user_id
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_pairs (
        id SERIAL PRIMARY KEY,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        exchange_name VARCHAR(50) NOT NULL,
        trading_pair VARCHAR(50) NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, exchange_name, trading_pair)
      )
    `);

    // Create strategies table (no user_id - no changes needed)
    await client.query(`
      CREATE TABLE IF NOT EXISTS strategies (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        type VARCHAR(50) NOT NULL,
        category VARCHAR(50) NOT NULL,
        parameters JSONB,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // FIXED: user_strategies with UUID user_id
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_strategies (
        id SERIAL PRIMARY KEY,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        strategy_id INTEGER REFERENCES strategies(id) ON DELETE CASCADE,
        is_active BOOLEAN DEFAULT true,
        parameters JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, strategy_id)
      )
    `);

    // Create ai_signals table (no user_id - no changes needed)
    await client.query(`
      CREATE TABLE IF NOT EXISTS ai_signals (
        id SERIAL PRIMARY KEY,
        exchange_name VARCHAR(50) NOT NULL,
        trading_pair VARCHAR(50) NOT NULL,
        signal_type VARCHAR(10) NOT NULL,
        entry_price DECIMAL(20, 8) NOT NULL,
        stop_loss DECIMAL(20, 8),
        take_profit DECIMAL(20, 8),
        confidence_score INTEGER NOT NULL,
        strategy_id INTEGER REFERENCES strategies(id),
        indicators JSONB,
        expires_at TIMESTAMP NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // FIXED: trades with UUID user_id
    await client.query(`
      CREATE TABLE IF NOT EXISTS trades (
        id SERIAL PRIMARY KEY,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        exchange_name VARCHAR(50) NOT NULL,
        trading_pair VARCHAR(50) NOT NULL,
        signal_id INTEGER REFERENCES ai_signals(id),
        trade_type VARCHAR(10) NOT NULL,
        entry_price DECIMAL(20, 8) NOT NULL,
        quantity DECIMAL(20, 8) NOT NULL,
        stop_loss DECIMAL(20, 8),
        take_profit DECIMAL(20, 8),
        current_price DECIMAL(20, 8),
        status VARCHAR(50) DEFAULT 'open',
        pnl DECIMAL(20, 8) DEFAULT 0,
        pnl_percent DECIMAL(10, 4) DEFAULT 0,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        closed_at TIMESTAMP,
        exchange_order_id VARCHAR(255),
        notes TEXT
      )
    `);

    // FIXED: payments with UUID user_id
    await client.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        payment_id VARCHAR(255) UNIQUE NOT NULL,
        order_id VARCHAR(255) UNIQUE NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        currency VARCHAR(10) NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        payment_method VARCHAR(50),
        cashfree_payment_id VARCHAR(255),
        cashfree_order_id VARCHAR(255),
        subscription_start_date TIMESTAMP,
        subscription_end_date TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        body TEXT NOT NULL,
        data JSONB,
        is_read BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        read_at TIMESTAMP
      )
    `);

    // Run migration logic for existing databases (ensures backward compatibility)
    await ensureForeignKeyColumnIsUuid(client, 'exchange_keys', 'user_id');
    await ensureForeignKeyColumnIsUuid(client, 'user_pairs', 'user_id');
    await ensureForeignKeyColumnIsUuid(client, 'user_strategies', 'user_id');
    await ensureForeignKeyColumnIsUuid(client, 'trades', 'user_id');
    await ensureForeignKeyColumnIsUuid(client, 'payments', 'user_id');
    await ensureForeignKeyColumnIsUuid(client, 'notifications', 'user_id');

    // Create indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
      CREATE INDEX IF NOT EXISTS idx_users_subscription_status ON users(subscription_status);
      CREATE INDEX IF NOT EXISTS idx_exchange_keys_user_id ON exchange_keys(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_pairs_user_id ON user_pairs(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_strategies_user_id ON user_strategies(user_id);
      CREATE INDEX IF NOT EXISTS idx_ai_signals_pair ON ai_signals(exchange_name, trading_pair);
      CREATE INDEX IF NOT EXISTS idx_ai_signals_active ON ai_signals(is_active, expires_at);
      CREATE INDEX IF NOT EXISTS idx_trades_user_id ON trades(user_id);
      CREATE INDEX IF NOT EXISTS idx_trades_status ON trades(status);
      CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
      CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
      CREATE INDEX IF NOT EXISTS idx_notifications_user_id
        ON notifications(user_id, is_read, created_at DESC);
    `);

    await insertDefaultStrategies(client);
  } catch (error) {
    logger.error('Error initializing database schema:', error);
    throw error;
  }
}

async function insertDefaultStrategies(client) {
  const strategies = [
    {
      name: 'RSI Scalping',
      description: 'Quick scalping strategy using RSI oversold/overbought signals',
      type: 'scalping',
      category: 'technical',
      parameters: { rsi_period: 14, rsi_oversold: 30, rsi_overbought: 70 }
    },
    {
      name: 'MACD Crossover',
      description: 'Scalping strategy based on MACD line crossovers',
      type: 'scalping',
      category: 'technical',
      parameters: { fast_period: 12, slow_period: 26, signal_period: 9 }
    },
    {
      name: 'EMA Fast Cross',
      description: 'Fast EMA crossover for quick entries',
      type: 'scalping',
      category: 'technical',
      parameters: { ema_fast: 9, ema_slow: 21 }
    },
    {
      name: 'Volume Breakout',
      description: 'Scalping on volume breakouts',
      type: 'scalping',
      category: 'volume',
      parameters: { volume_threshold: 1.5, price_change: 0.5 }
    },
    {
      name: 'Bollinger Bands',
      description: 'Scalping using Bollinger Band touches',
      type: 'scalping',
      category: 'technical',
      parameters: { period: 20, std_dev: 2 }
    },
    {
      name: 'Swing Trading RSI',
      description: 'Day trading with RSI confirmation',
      type: 'day_trading',
      category: 'technical',
      parameters: { rsi_period: 14, rsi_oversold: 35, rsi_overbought: 65 }
    },
    {
      name: 'MACD Trend',
      description: 'Day trading following MACD trends',
      type: 'day_trading',
      category: 'technical',
      parameters: { fast_period: 12, slow_period: 26, signal_period: 9 }
    },
    {
      name: 'EMA Trend',
      description: 'Day trading with EMA trend following',
      type: 'day_trading',
      category: 'technical',
      parameters: { ema_short: 20, ema_long: 50 }
    },
    {
      name: 'Support Resistance',
      description: 'Day trading at support and resistance levels',
      type: 'day_trading',
      category: 'price_action',
      parameters: { lookback_period: 100, touch_threshold: 3 }
    },
    {
      name: 'Momentum Trading',
      description: 'Day trading on momentum indicators',
      type: 'day_trading',
      category: 'momentum',
      parameters: { momentum_period: 10, threshold: 2 }
    }
  ];

  for (const strategy of strategies) {
    await client.query(`
      INSERT INTO strategies (name, description, type, category, parameters)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT DO NOTHING
    `, [strategy.name, strategy.description, strategy.type, strategy.category, JSON.stringify(strategy.parameters)]);
  }
}

module.exports = { createPool, initializeDatabaseSchema };

