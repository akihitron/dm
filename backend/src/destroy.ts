import configure from "./setup";
import logger from "./logger";
import { AppParams, MainContext } from "./global";
const _package = require('../package.json');

const params = new AppParams();
params.app_name = _package.name;


async function main() {
  const context: MainContext = await configure(params);

  const config = context.config;
  const db_info = config.database.drivers[config.database.driver];
  const url = db_info.end_point;
  logger.log("Connecting to " + url);
  const db_connector = await context.model.$connect();
  logger.log("Connected");
  logger.log("Drop database begin");
  await context.model.$executeRaw`DROP DATABASE '${params.app_name}'`;
  logger.log("Drop database done");
  logger.log("Closing connection");
  await context.model.$disconnect();
  await context.close();
  logger.log("Done");

  process.exit(0);
}

main();

