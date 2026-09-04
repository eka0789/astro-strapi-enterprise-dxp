const parse = require('pg-connection-string').parse;

module.exports = ({ env }) => {
  const connectionString = env('DATABASE_URL');
  
  if (connectionString) {
    const config = parse(connectionString);
    return {
      connection: {
        client: 'postgres',
        connection: {
          host: config.host,
          port: config.port || 5432,
          database: config.database,
          user: config.user,
          password: config.password,
          ssl: env.bool('DATABASE_SSL', true) ? { rejectUnauthorized: false } : false,
        },
        debug: false,
        pool: { min: 2, max: 10 }
      },
    };
  }

  return {
    connection: {
      client: env('DATABASE_CLIENT', 'postgres'),
      connection: {
        host: env('DATABASE_HOST', 'aws-0-ap-southeast-1.pooler.supabase.com'),
        port: env.int('DATABASE_PORT', 5432),
        database: env('DATABASE_NAME', 'postgres'),
        user: env('DATABASE_USERNAME', 'postgres.yourprojectref'),
        password: env('DATABASE_PASSWORD', ''),
        ssl: env.bool('DATABASE_SSL', true) ? { rejectUnauthorized: false } : false,
        schema: env('DATABASE_SCHEMA', 'public'),
      },
      pool: {
        min: env.int('DATABASE_POOL_MIN', 2),
        max: env.int('DATABASE_POOL_MAX', 10),
      },
    },
  };
};
