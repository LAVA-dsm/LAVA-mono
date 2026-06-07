import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    try {
      await this.$connect();
    } catch (error) {
      console.warn(
        "⚠️ 데이터베이스 연결에 실패했습니다. DB 조회를 제외한 Swagger(/api-docs) 조회 등은 정상 구동됩니다.",
        error instanceof Error ? error.message : error
      );
    }
  }

  async onModuleDestroy() {
    try {
      await this.$disconnect();
    } catch {
      // Ignore disconnect errors during destroy
    }
  }
}
