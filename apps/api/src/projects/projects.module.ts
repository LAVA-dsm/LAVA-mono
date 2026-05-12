import { Module } from "@nestjs/common";
import { AiModule } from "../ai/ai.module";
import { AuthModule } from "../auth/auth.module";
import { EmailModule } from "../email/email.module";
import { PrismaModule } from "../prisma/prisma.module";
import { InvitationsController, ProjectsController } from "./projects.controller";
import { ProjectsService } from "./projects.service";

@Module({
  imports: [PrismaModule, AiModule, EmailModule, AuthModule],
  controllers: [ProjectsController, InvitationsController],
  providers: [ProjectsService]
})
export class ProjectsModule {}
