import { Injectable, Logger } from "@nestjs/common";
import nodemailer from "nodemailer";

export type InvitationEmail = {
  email: string;
  projectName: string;
  invitationUrl: string;
};

export type VerificationCodeEmail = {
  email: string;
  code: string;
};

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  async sendVerificationCode(input: VerificationCodeEmail): Promise<void> {
    await this.sendMail({
      to: input.email,
      subject: "[LAVA] 이메일 인증 코드",
      text: `이메일 인증 코드: ${input.code}\n이 코드는 5분 동안 유효합니다.`
    });

    this.logger.log(`Dev verification code for ${input.email}: ${input.code}`);
  }

  async sendInvitation(input: InvitationEmail): Promise<void> {
    await this.sendMail({
      to: input.email,
      subject: `[LAVA] ${input.projectName} 프로젝트 초대`,
      text: `프로젝트 초대 링크: ${input.invitationUrl}`
    });

    this.logger.log(`Dev invitation email for ${input.email}: ${input.invitationUrl}`);
  }

  private async sendMail(input: { to: string; subject: string; text: string }): Promise<void> {
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
        to: input.to,
        subject: input.subject,
        text: input.text
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
      to: input.to,
      subject: input.subject,
      text: input.text
    });

    this.logger.debug(result.message?.toString());
  }
}
