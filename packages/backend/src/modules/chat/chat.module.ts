import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { AiModule } from '../ai/ai.module';
import { ProjectsModule } from '../projects/projects.module';

/**
 * Module handling chat operations with AI integration.
 */
@Module({
  imports: [
    PrismaModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    AiModule,
    ProjectsModule,
  ],
  controllers: [ChatController],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}
