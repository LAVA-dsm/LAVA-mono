import { Module } from "@nestjs/common";
import { AiModule } from "./ai/ai.module";
import { EmailModule } from "./email/email.module";
import { PrismaModule } from "./prisma/prisma.module";
import { ProjectsModule } from "./projects/projects.module";

@Module({
  imports: [PrismaModule, EmailModule, AiModule, ProjectsModule]
})
export class AppModule {}
