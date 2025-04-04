import { Injectable } from '@nestjs/common';
import { Configuration, OpenAIApi } from 'openai';

@Injectable()
export class FormulaService {
  private openai: OpenAIApi;

  constructor() {
    const configuration = new Configuration({
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.openai = new OpenAIApi(configuration);
  }

  async explainFormula(formula: string): Promise<{ result: string }> {
    const prompt = `다음 수식의 의미를 한국어로 설명해주세요:\n\n${formula}`;
    const response = await this.openai.createChatCompletion({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
    });

    return { result: response.data.choices[0].message?.content?.trim() || '' };
  }
}