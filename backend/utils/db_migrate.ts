import configure from "../src/setup";
import { AppParams, MainContext, s_exe_s } from "../src/global";

const APP_NAME = require("../package.json").name;

////////////////////////////////////////////////////////////////////////////////////
// Main Proc
async function main(params: AppParams) {
    const app_name = APP_NAME;
    params.server_name = `${app_name} server`;
    params.app_name = app_name;
    params.init.database = false;
    params.init.session_store = false;

    const context: MainContext = await configure(params);

    await s_exe_s(`DATABASE_URL=${process.env.DATABASE_URL} npx prisma migrate deploy`);
    process.exit(0);
}

//////////////////////////////////////////////////////////////////////////////////////
// Single thread
const app_params = new AppParams();
main(app_params);
