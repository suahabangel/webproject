import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  getHello(): string {
    return 'NestJS 백엔드가 정상 동작 중입니다!';
  }
}