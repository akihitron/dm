process.env.JEST = "true";

import { expect, test } from '@jest/globals';
import configure from "./setup";
import { AppParams } from "./global";
import { PrismaClient } from '@prisma/client';
import logger from "./logger";
const jestConsole = console;
global.console = require('console');

const _package = require('../package.json');

const params = new AppParams();
params.app_name = _package.name;

test("Prisma model test2", async () => {
  const context = await configure(params);
  const ORM = context.model as PrismaClient;
  // logger.log(ORM);
  logger.log(await ORM.test_a.deleteMany({}));
  logger.log(await ORM.test_b.deleteMany({}));
  const test = await ORM.test_a.create({
    data: {
      big_int: BigInt(1234333567890123456789),
      title: "TestA",
      description: "Desc",
    }
  });
  const testb = await ORM.test_b.create({
    data: {
      title: "TestA",
      description: "Desc",
      test_a_id: test.id
    }
  });
  expect(testb.test_a_id).toBe(test.id);
  expect(test.big_int).toBe(1234333567890123456789);
  // logger.log(testb);

  // const test2 = await ORM.TestB.findMany();
  // logger.log(test2);

  // logger.log(await ORM.TestA.deleteOne({where:{id:test.id}}));
  // logger.log(await ORM.TestA.deleteOne({where:{id:testb.id}}));
});