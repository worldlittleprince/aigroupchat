const MAX_MESSAGES = parseInt(process.env.HISTORY_LIMIT || '200', 10);

export class ConversationHistory {
  constructor() {
    this.messages = [];
  }

  add(message) {
    this.messages.push(message);
    if (this.messages.length > MAX_MESSAGES) {
      this.messages.shift();
    }
  }

  all() {
    return [...this.messages];
  }
}

