import { Injectable, Logger } from "@nestjs/common";
import nodemailer from "nodemailer";

export type InvitationEmail = {
  email: string;
  projectName: string;
  invitationUrl: string;
};

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  async sendInvitation(input: InvitationEmail): Promise<void> {
    const from = process.env.SMTP_FROM || "LAVA <no-reply@lava.local>";

    if (process.env.SMTP_HOST && process.env.SMTP_PORT) {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT),
        secure: Number(process.env.SMTP_PORT) === 465,
        auth: process.env.SMTP_USER
          ? {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASS
            }
          : undefined
      });

      await transporter.sendMail({
        from,
        to: input.email,
        subject: `[LAVA] ${input.projectName} 프로젝트 초대`,
        text: `프로젝트 초대 링크: ${input.invitationUrl}`
      });
      return;
    }

    const transporter = nodemailer.createTransport({
      streamTransport: true,
      newline: "unix",
      buffer: true
    });

    const result = await transporter.sendMail({
      from,
      to: input.email,
      subject: `[LAVA] ${input.projectName} 프로젝트 초대`,
      text: `프로젝트 초대 링크: ${input.invitationUrl}`
    });

    this.logger.log(`Dev invitation email for ${input.email}: ${input.invitationUrl}`);
    this.logger.debug(result.message?.toString());
  }
}
