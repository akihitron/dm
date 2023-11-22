// @ts-ignore
import nodemailer from "nodemailer";
import { MainContext, AppParams } from "../global";
import logger from "../logger";
import configure from "../config";

interface EMailContent {
  subject: string;
  text: string;
  to: string;
}

class EMailService {
  async initialize() { }
  async send_email(content: EMailContent): Promise<any> {
    return new Promise((resolve) => resolve(null));
  }
}
class GMAILService extends EMailService {
  context: MainContext;
  from: string;
  transporter: any;
  config: any;
  constructor(context: MainContext) {
    super();
    this.context = context;
    this.from = "";
    this.config = context.config.email?.drivers?.gmail;
    if (this.config == null) {
      throw new Error("Does not have config.email.drivers.gmail");
    }
  }

  async initialize() {
    const config = this.config;
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      auth: {
        user: config.user,
        pass: config.pass,
      },
    });
    await transporter.verify();
    logger.success("GMAIL: OK");
    this.transporter = transporter;
  }

  send_email(content: EMailContent): Promise<any> {
    const config = this.config;
    return new Promise((resolve, reject) => {
      const to = content.to;
      const text = content.text;
      const subject = content.subject;
      const transporter = this.transporter;

      const message = {
        from: config.user,
        to: to,
        subject: subject,
        text: text,
      };
      try {
        transporter.sendMail(message, function (error: any, info: any) {
          if (error) {
            logger.error("SendMail Error", error);
            reject(error);
            return;
          }
          logger.success(`Sent('${config.user}'=>'${to}') Title(${subject}): message id:`, info.messageId);
          resolve(null);
        });
      } catch (e) {
        logger.error("Error", e);
        reject(e);
      }
    });
  }
}

if (require.main === module) {
  (async () => {
    const params = new AppParams();
    params.app_name = "dmb";
    const config = await configure(params.app_name,params);
    const context = new MainContext();
    context.config = config;

    const gmail = new GMAILService(context);
    await gmail.initialize();
    await gmail.send_email({ subject: "Test", text: "Test", to: gmail.from } as EMailContent);
  })();

}
