// Provider interface
// generate({ persona, history, lastMessage }) => { content: string } or { noResponse: true }

export class LLMProvider {
  async generate() {
    throw new Error('Not implemented');
  }
}

