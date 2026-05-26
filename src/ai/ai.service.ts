import { Injectable } from '@nestjs/common';
import { GoogleGenAI, Type } from '@google/genai';
import { AskDto } from './dto/ask.dto';
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
        model: 'gemini-3.5-flash',
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

  async validate(ask: AskDto, messages: SessionMessage[]) : Promise<ValidateResponseDto>{
    try { 
      const config = {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          required: ['answerBy', 'feedback'],
          properties: {
            answerBy: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                required: ['userId', 'username', 'isCorrect'],
                properties: {
                  userId: {
                    type: Type.STRING,
                    description: 'ID do usuário que respondeu',
                  },
                  username: {
                    type: Type.STRING,
                    description: 'Nome do usuário que respondeu',
                  },
                  isCorrect: {
                    type: Type.BOOLEAN,
                    description: 'Indica se a resposta do usuário está correta',
                  },
                },
              },
            },
            feedback: {
              type: Type.STRING,
              description: 'Feedback geral sobre as respostas dos usuários',
            },
          },
        }, 
        'systemInstruction': [{'text': `Você atua como 'Luminha', a assistente de estudos inteligente e acolhedora da plataforma Lumen. Sua missão é avaliar debates acadêmicos ocorridos no chat durante sessões Pomodoro em grupo.

          Sua tarefa é cruzar a <questao_alvo> com o <historico_chat> e determinar rigorosamente quais estudantes acertaram ou erraram a resposta.

          DIRETRIZES DE AVALIAÇÃO:
          1. Análise Contextual: Os alunos debatem de forma livre. Avalie o raciocínio construído ao longo das mensagens do aluno, não apenas frases isoladas. Ignore completamente conversas paralelas (off-topic).
          2. Regra da Resposta Parcial (Incorreta): Se um aluno acertar apenas uma parte do conceito, mas errar ou omitir um elemento crucial para a resolução completa da dificuldade indicada, marque 'isCorrect' como FALSE. Use o campo 'feedback' para guiá-los sobre o que faltou.
          3. Regra da Compreensão Indireta (Correta): Se o aluno não der uma resposta direta e formatada, mas a sua linha de argumentação no chat demonstrar domínio prático ou teórico sobre o tema, marque 'isCorrect' como TRUE.
          4. Construção do Feedback: O campo 'feedback' deve englobar o desempenho geral da sala. Elogie o engajamento, esclareça pontos de confusão que surgiram no chat e explique brevemente a resposta ideal da questão.

          DADOS PARA AVALIAÇÃO:

          <questao_alvo>
          Título: ${ask.title}
          Contexto: ${ask.context}
          Pergunta: ${ask.question}
          Dificuldade: ${ask.difficulty}
          </questao_alvo>

          <historico_chat>
          ${messages.map(m => `${m.username} - ${m.userId}: ${m.text}`).join('\n')}
          </historico_chat>`}]
      }

      const response = await this.ai.models.generateContent({
        model: 'gemini-3.5-flash',
        config,
        contents: [
          {
            role: 'user',
            parts: [{ text: 'Faça a validação da rodada atual de estudos.' }],
          },
        ],
      });

      if (!response.text) {
        throw new Error('A resposta da IA veio vazia.');
      }

      const data = JSON.parse(response.text);
      return Object.assign(new ValidateResponseDto(), data);

    } catch (e) {
        console.error('Error validating responses:', e);
        throw new Error('Failed to validate responses');
    }
  }

}

