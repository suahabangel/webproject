import { Module } from '@nestjs/common';
import { FormulaController } from './formula/formula.controller';
import { FormulaService } from './formula/formula.service';
import { AppController } from './app.controller';
import { ChatGateway } from './chat/chat.gateway';
import { SimulationController } from './simulation/simulation.controller';
import { SimulationService } from './simulation/simulation.service';

@Module({
  imports: [],
import { FormulaController } from './formula/formula.controller';
import { FormulaService } from './formula/formula.service';
  controllers: [AppController, SimulationController, FormulaController],
  providers: [ChatGateway, SimulationService, FormulaService],
})
export class AppModule {}