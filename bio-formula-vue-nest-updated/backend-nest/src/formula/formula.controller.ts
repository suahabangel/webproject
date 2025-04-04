import { Controller, Post, Body } from '@nestjs/common';
import { FormulaService } from './formula.service';

@Controller('api/formula')
export class FormulaController {
  constructor(private readonly formulaService: FormulaService) {}

  @Post('explain')
  async explain(@Body('formula') formula: string) {
    return this.formulaService.explainFormula(formula);
  }
}