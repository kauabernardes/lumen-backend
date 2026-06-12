import { Injectable } from '@nestjs/common';
import { GoogleGenAI, Type } from '@google/generative-ai'; 
import { SessionMessage } from 'src/session/interface/session-message';
import { ValidateResponseDto } from './dto/validate-response.dto';

@Injectable()
export class AiService {
  private readonly ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
    });
  }
  async ask(temas: string[]): Promise<AskDto> {
  }

  
  async validate(ask: AskDto, messages: SessionMessage[]): Promise<ValidateResponseDto> {
    
  }

  
  async generateRecommendation(taskTitle: string, taskDescription: string, daysRemaining: number): Promise<{ title: string; subtitle: string }> {
    console.log('Generating home recommendation for task:', taskTitle);
    try {
      const config = {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          required: ['title', 'subtitle'],
          properties: {
            title: {
              type: Type.STRING,
              description: 'O título curto da matéria ou compromisso analisado.',
            },
            subtitle: {
              type: Type.STRING,
              description: 'Frase motivacional curta seguindo o padrão exato: "Sua prova é em X dias. Dedique Y horas hoje."',
            },
          },
        },
        systemInstruction: [
          {
            text: `Você atua como 'Luminha', a assistente de estudos inteligente do app Lumen.
            Sua tarefa é analisar o compromisso mais próximo da agenda do estudante e criar uma recomendação de tempo de estudo para HOJE.
            
            DIRETRIZES:
            1. Seja extremamente direta e use tom encorajador.
            2. Estipule uma meta de dedicação para hoje entre 1 a 4 horas com base nos dias restantes (quanto menos dias, mais horas).
            3. O subtítulo deve seguir fielmente o formato: 'Sua prova é em ${daysRemaining} dias. Dedique X horas hoje.' (ajuste o termo se for "Trabalho", "Entrega" ou "Pesquisa" com base no título).`,
          },
        ],
      };

      const response = await this.ai.models.generateContent({
        model: 'gemini-3.5-flash', 
        contents: [
          {
            role: 'user',
            parts: [{ text: `Gere a recomendação para a atividade: "${taskTitle}" com a descrição: "${taskDescription || 'Sem descrição'}". Faltam ${daysRemaining} dias.` }],
          },
        ],
      });

      if (!response.text) {
        throw new Error('A resposta da IA veio vazia.');
      }

      return JSON.parse(response.text);
    } catch (e) {
      console.error('Error generating recommendation:', e);
      const hours = daysRemaining <= 3 ? 2 : 1;
      return {
        title: taskTitle,
        subtitle: `Sua atividade é em ${daysRemaining} dias. Dedique ${hours} hora(s) hoje.`,
      };
    }
  }
}