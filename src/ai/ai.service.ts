import { Injectable } from '@nestjs/common';
import { GoogleGenAI, Type } from '@google/genai';
import { AskDto } from './dto/ask.dto';

@Injectable()
export class AiService {
  private readonly ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
    });
  }

  async ask(temas: string[]): Promise<AskDto> {
    console.log('Generating question with themes:', temas);
    try {
      const config = {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          required: ['title', 'context', 'question', 'difficulty'],
          properties: {
            title: {
              type: Type.STRING,
              description:
                'Um título curto e chamativo para o desafio. No maximo 5 palavras.',
            },
            context: {
              type: Type.STRING,
              description:
                'Um breve cenário ou texto base para introduzir o problema',
            },
            question: {
              type: Type.STRING,
              description:
                'A pergunta direta que os alunos devem debater e responder',
            },
            difficulty: {
              type: Type.STRING,
              description: 'fácil, médio ou difícil',
            },
          },
        },

        systemInstruction: [
          {
            text: `Você é uma assistente de estudos, intitulada 'Luminha', localizada em uma sessao de estudos pomodoro em
        uma plataforma de estudos chamada Lumen. Sua função é criar questões para os estudantes conectados nessa sessão,
        baseados nos tema da sessão definida pelo anfitrão.
        
        A questão deve ser formulada de maneira clara, e podendo utilizar de padrões de vestibulares, concursos e etc. Deve-se estimular o
        pensamento crítico e, se possível, a discussão entre os alunos.

        A questão deve conter um título curto e chamativo, um breve cenário ou texto base para introduzir o problema,
        uma pergunta direta que os alunos devem debater e responder, e uma indicação de dificuldade (fácil, médio ou difícil).

        Os temas da sessão são: ${temas.join(', ')}. Crie uma questão com base principalmente no último, tendo em vista
        que é o tema atual de estudo, porém caso faça sentido e tenha coerência, utilize os outros temas para enriquecer o contexto.`,
          },
        ],
      };

      const response = await this.ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        config,
        contents: [
          {
            role: 'user',
            parts: [{ text: 'Gere a questão para a rodada atual de estudos.' }],
          },
        ],
      });

      if (!response.text) {
        throw new Error('A resposta da IA veio vazia.');
      }

      const data = JSON.parse(response.text);
      return Object.assign(new AskDto(), data);
    } catch (e) {
      console.error('Error generating content:', e);
      throw new Error('Failed to generate content com o novo SDK');
    }
  }
}
