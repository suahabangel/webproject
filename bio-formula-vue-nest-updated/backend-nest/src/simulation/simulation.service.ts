import { Injectable } from '@nestjs/common';

@Injectable()
export class SimulationService {
  private simulations = [];

  getSimulationsByUser(userId: string) {
    return this.simulations.filter(sim => sim.userId === userId);
  }

  saveSimulation(simulation: any) {
    const newSim = {
      ...simulation,
      createdAt: new Date(),
    };
    this.simulations.push(newSim);
    return { success: true, data: newSim };
  }
}