import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { SimulationService } from './simulation.service';

@Controller('api/simulations')
export class SimulationController {
  constructor(private readonly simulationService: SimulationService) {}

  @Get(':userId')
  getUserSimulations(@Param('userId') userId: string) {
    return this.simulationService.getSimulationsByUser(userId);
  }

  @Post()
  saveSimulation(@Body() body: any) {
    return this.simulationService.saveSimulation(body);
  }
}