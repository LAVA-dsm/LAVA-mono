import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const frontendOrigins = (process.env.FRONTEND_ORIGIN ?? "http://localhost:3000,http://127.0.0.1:3000")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.enableCors({
    origin: frontendOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["content-type", "authorization", "cookie", "origin"]
  });

  // Swagger 명세 설정
  const config = new DocumentBuilder()
    .setTitle("LAVA API")
    .setDescription("LAVA 서비스의 백엔드 REST API 명세서입니다. 모든 API 엔드포인트의 입력/출력 구조와 모의 실행을 테스트할 수 있습니다.")
    .setVersion("1.0")
    .addTag("auth", "인증 및 회원가입 관련 API")
    .addTag("projects", "프로젝트 정보 및 관리 API")
    .addTag("invitations", "프로젝트 팀원 초대 API")
    .addTag("ai", "AI 아이디어 증강 관련 API")
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api-docs", app, document);

  const port = Number(process.env.PORT ?? 4000);
  await app.listen(port);

  // 서버 부팅 시 환경변수 진단 로그 출력
  console.log("=== LAVA API Server Boot Diagnostics ===");
  console.log(`PORT: ${port}`);
  console.log(`NODE_ENV: ${process.env.NODE_ENV ?? "(not set)"}`);
  console.log(`FRONTEND_ORIGIN: ${process.env.FRONTEND_ORIGIN ?? "(not set)"}`);
  console.log(`CORS allowed origins: ${JSON.stringify(frontendOrigins)}`);
  console.log(`FRONTEND_PUBLIC_URL: ${process.env.FRONTEND_PUBLIC_URL ?? "(not set)"}`);
  console.log(`COOKIE_DOMAIN: ${process.env.COOKIE_DOMAIN ?? "(not set)"}`);
  console.log(`DATABASE_URL: ${process.env.DATABASE_URL ? "✅ set" : "❌ NOT SET"}`);
  console.log(`OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? "✅ set" : "❌ NOT SET"}`);
  console.log(`OPENAI_MODEL: ${process.env.OPENAI_MODEL ?? "(not set, default gpt-5-mini)"}`);
  console.log(`SMTP_HOST: ${process.env.SMTP_HOST ?? "(not set)"}`);
  console.log("=========================================");
}

void bootstrap();

