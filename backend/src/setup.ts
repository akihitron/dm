import os from 'os';
import logger from "./logger";

// Globals
import config from './config';
import { AppParams, MainContext } from "./global";

// Util
import { rateLimit } from 'express-rate-limit'
import { NextFunction } from 'express';

// Database drivers
// import mongoose from 'mongoose';
import MongoStore from 'connect-mongo';
import { PrismaClient } from '@prisma/client';

// Session store drivers
import { MemcachedStore, MemcachedSessionOptions } from 'connect-memcached';
import { createClient as createRedisClient } from 'redis';
import RedisStore from 'connect-redis';
import { randomUUID } from 'crypto';

const USE_LIMITER = false;
let IPv4: string | null = null;

const IPv4_CheckURL = "https://api.ipify.org";


///////////////////////////////////////////////////////////////////////////////////////////
// MongoDB driver
// class MongoDBDriver {
//   async init(driver_config: any) {
//     const end_point = driver_config.end_point;
//     // Test Connection
//     logger.log("Connecting...");
//     await mongoose.connect(end_point);
//     logger.success("Mongoose: OK");

//     return mongoose;
//   }
// }

///////////////////////////////////////////////////////////////////////////////////////////
// Redis driver
class RedisDriver {
  async init(driver_config: any) {
    const end_point = driver_config.end_point ? driver_config.end_point : `redis://${driver_config.host}:${driver_config.port}`;
    // Test Connection
    logger.log("Redis: Connecting...");
    const redisClient = createRedisClient({ url: end_point });
    await redisClient.connect();
    logger.success("Redis: OK");
    return redisClient;
  }
}


///////////////////////////////////////////////////////////////////////////////////////////
// MySQL/PostgresSQL/SQLite driver
class PrismaDriver {
  ORM: PrismaClient | null | undefined = null;
  connection: any;
  async init(driver_name: string, driver_config: any) {
    const ORM = this.ORM = new PrismaClient({
      log: ["info", "warn", "error"],
    });
    let db_name = "";
    if (driver_config.end_point && driver_config.end_point.indexOf("@") > 0) {
      db_name = driver_config.end_point.split("@").pop();
    }

    logger.log(`Prisma(${driver_name}:${db_name}): Connecting...`);
    await ORM.log.create({
      data: {
        host: os.hostname(),
        ip: IPv4,
        title: "Boot",
        description: "DB connection test",
        timestamp: new Date()
      }
    });

    logger.success(`Prisma(${driver_name}:${db_name}): OK`);
    return this.ORM;
  }
}

///////////////////////////////////////////////////////////////////////////////////////////
// Local IPv4 finder
class NetworkInterfaces {
  static local_ipv4s(): string[] {
    const nets = os.networkInterfaces() as any;
    const results = Object.create(null); // Or just "{}", an empty object
    const locals = ["localhost"];
    for (const name of Object.keys(nets)) {
      for (const net of nets[name]) {
        // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
        // "IPv4" is in Node <= 17, from 18 it"s a number 4 or 6
        const familyV4Value = typeof net.family === "string" ? "IPv4" : 4
        if (net.family === familyV4Value && !net.internal) {
          if (!results[name]) {
            results[name] = [];
          }
          results[name].push(net.address);
          // 10.0.0.0/8
          if (net.address.indexOf("10.") == 0) locals.push(net.address);
          // 172.16.0.0/12
          for (let i = 0; i < 16; i++) if (net.address.indexOf(`172.${i + 16}.`) == 0) locals.push(net.address);
          // 192.168.0.0/16
          if (net.address.indexOf("192.168.") == 0) locals.push(net.address);
        }
      }
    }
    return locals;
  }
}

///////////////////////////////////////////////////////////////////////////////////////////
// Check config
function CheckConfig(config: any) {
  const DEFAULT_DATABASE = {
    "driver": "sqlite",
    "drivers": {
      "sqlite": {
        "end_point": "file:./workspace/sqlite.db?connection_limit=1"
      }
    }
  };

  const DEFAULT_SESSION_STORE = {
    "driver": "memorystore",
    "secret_key": randomUUID().replace(/-/g, ""),
    "drivers": {
      "redis": {
        "host": "127.0.0.1",
        "port": 6379,
        "password": null
      },
      "memcached": {
        "hosts": ["127.0.0.1:11211"]
      },
      "memorystore": {

      }
    }
  };

  // Check database config
  if (config.database?.driver == "sqlite" && config.database?.drivers?.[config.database?.driver] == null) {
    config.database = DEFAULT_DATABASE;
  } else if (config.database?.drivers?.[config.database?.driver] == null) {
    logger.error("!Invalid database configuration.");
    logger.error(" => SQLite will be used.");
    config.database = DEFAULT_DATABASE;
  }
  // Check session store config
  if (config.session_store?.driver && config.session_store?.drivers == null) {
    config.session_store.drivers = DEFAULT_SESSION_STORE.drivers;
  } else if (config.session_store?.drivers?.[config.session_store?.driver] == null) {
    logger.error("!Invalid session store configuration.");
    logger.error(" => MemoryStore will be used.");
    logger.error("(We recommend redis or memcached to maintain login during development.)");
    config.session_store = DEFAULT_SESSION_STORE;
  }
  // Check email config
  if (config.email?.drivers?.[config.email?.driver] == null) {
    logger.warn("Does not have an email configuration.");
    logger.warn(" => Standalone user management system.");
  }
  // Optionals
  if (config.default_users == null) {
    config.default_users = [];
  }
}


///////////////////////////////////////////////////////////////////////////////////////////
// Setup
let _context_: MainContext;
async function configure(params: AppParams) {
  if (_context_) return _context_;
  return _context_ = await new Promise(async (resolve) => {

    const init = params.init;
    const app_name = params.app_name;

    ///////////////////////////////////////////////////////////////////////////////////////////
    // Configuration
    const context = new MainContext();
    context.config = config(params.app_name);
    CheckConfig(context.config);
    context.worker_id = params.worker.id;
    context.limiters = {};
    context.sub_apis = {};
    context.local_ipv4s = NetworkInterfaces.local_ipv4s();
    logger.log(`ARGV: NODE_ENV(${process.env.NODE_ENV}) JEST(${process.env.JEST}) DEBUG(${process.env.DEBUG}) NODE_CLUSTER(${process.env.NODE_CLUSTER})`);

    IPv4 = await fetch(context.config.IPv4_CheckURL ?? IPv4_CheckURL).then(res => res.text()).catch(e => console.error("\x1b[31m", e, "\x1b[0m")) as string;
    if (IPv4 == null) {
      logger.error("Failed to get IPv4 address.");
      process.exit(1);
    }

    let counter = 0;
    const timer = setInterval(() => { logger.log("... " + ((++counter) * 2) + " sec") }, 2000);

    try {
      // Database
      let db;
      const database_config = context.config.database;
      if (database_config == null) {
        logger.error("Does not exists database configuration.");
        process.exit(1);
      }
      let model_init_func = null;
      if (context.db == null) {
        const driver_name = database_config.driver;
        const driver_config = database_config.drivers[driver_name];
        process.env.DATABASE_URL = driver_config.end_point;
        if (init.database) {
          if (driver_config == null) {
            logger.error("Does not exists database driver configuration.", driver_name);
            process.exit(1);
          }
          if (driver_name == "mongodb") {
            throw new Error("Removed MongoDB driver.");
            // const driver = new MongoDBDriver();
            // db = driver.init(driver_config);
            // model_init_func = async function (db: any) {
            //   // context.model = new Model(context);
            // }
          } else if (driver_name == "prisma" || driver_name == "mysql" || driver_name == "postgres" || driver_name == "postgresql" || driver_name == "sqlite" || driver_name == "sqlite3" || driver_name == "sqlserver") {
            const driver = new PrismaDriver();
            db = await driver.init(driver_name, driver_config);
            model_init_func = async function (db: any) {
              context.model = driver.ORM;
            }
          } else {
            logger.error("Invalid driver.", driver_name);
            process.exit(1);
          }
        }
      }

      // Session Store
      let session_store: any;
      const session_store_config = context.config.session_store;
      if (session_store_config && init.session_store) {
        const driver_name = session_store_config.driver;
        const driver_config = session_store_config.drivers[driver_name];
        if (driver_name == "mongodb") {
          if (database_config.driver == "mongodb") {
            const _db: any = await db;
            session_store = MongoStore.create({
              clientPromise: new Promise(resolve => resolve((_db as any).connection.getClient())),
            });
          } else {
            session_store = MongoStore.create({
              mongoUrl: driver_config.end_point
            });
          }
          logger.log("SessionStore:", driver_name, driver_config.end_point);
        } else if (driver_name == "redis") {
          const driver = new RedisDriver();
          const redis_connector = await driver.init(driver_config);
          session_store = new RedisStore({
            client: redis_connector,
            prefix: params.app_name + ":",
          });
          context.clear_sessions = function () {
            return new Promise(async (resolve, reject) => {
              logger.log("Clearing sessions...");
              const keys = await redis_connector.keys(`${app_name}:*`);
              logger.log("Clearing sessions...", keys.length);
              for (const key of keys) {
                logger.log("Delete:", key);
                await redis_connector.del(key);
              }
              resolve(0);
            });
          }
        } else if (driver_name == "memcached") {
          session_store = new MemcachedStore(driver_config as MemcachedSessionOptions);
          logger.log("SessionStore:", driver_name, driver_config.hosts);
        } else {
          // Default is MemoryStore.
        }
      }


      { // API Limiter
        function EmptyMiddleware(req: Request, res: Response, next: NextFunction) {
          next();
        }

        const Store = undefined; // TODO: Use redis

        const CommonLimiter = USE_LIMITER ? rateLimit({
          windowMs: 30 * 1000, // 30 minutes
          limit: 100,
          standardHeaders: 'draft-7', // Set `RateLimit` and `RateLimit-Policy` headers
          legacyHeaders: false, // Disable the `X-RateLimit-*` headers
          store: Store // Use an external store for more precise rate limiting
        }) : EmptyMiddleware;

        const ApiLimiter = USE_LIMITER ? rateLimit({
          windowMs: 2 * 60 * 1000, // 2 minutes
          limit: 100,
          standardHeaders: 'draft-7', // Set `RateLimit` and `RateLimit-Policy` headers
          legacyHeaders: false, // Disable the `X-RateLimit-*` headers
          store: Store // Use an external store for more precise rate limiting
        }) : EmptyMiddleware;

        const SensitiveLimiter = USE_LIMITER ? rateLimit({
          windowMs: 1 * 60 * 1000, // 1 minutes
          limit: 10,
          standardHeaders: 'draft-7', // Set `RateLimit` and `RateLimit-Policy` headers
          legacyHeaders: false, // Disable the `X-RateLimit-*` headers
          store: Store // Use an external store for more precise rate limiting
        }) : EmptyMiddleware;

        context.limiters.CommonLimiter = CommonLimiter;
        context.limiters.ApiLimiter = ApiLimiter;
        context.limiters.SensitiveLimiter = SensitiveLimiter;
      }

      if (init.database) {
        context.db = await db;
        model_init_func && await model_init_func(context.db);
      }
      if (session_store && init.session_store) context.session_store = await session_store;
      context.close = async function () {
        try { await context.session_store?.destroy?.(); } catch (e: any) { console.error("\x1b[31m", e, "\x1b[0m") }
        try { await context.session_store?.close?.(); } catch (e: any) { console.error("\x1b[31m", e, "\x1b[0m") }
        try { await context.db?.connection?.close?.(); } catch (e: any) { console.error("\x1b[31m", e, "\x1b[0m") }
        try { await context.db?.close?.(); } catch (e: any) { console.error("\x1b[31m", e, "\x1b[0m") }
        try { await context.db?.disconnect?.(); } catch (e: any) { console.error("\x1b[31m", e, "\x1b[0m") }
      }
      clearInterval(timer);
      resolve(context);
    } catch (e) {
      timer && clearInterval(timer);
      console.error(e);
      process.exit(1);
    }

  });
}

export default configure;
