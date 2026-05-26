const log = require("./logger");

class UtteranceQueue {
  constructor() {
    this.tail = Promise.resolve();
    this.pending = 0;
  }

  enqueue(label, task) {
    this.pending += 1;

    const run = async () => {
      log.system("utterance queued", { label, pending: this.pending });
      try {
        return await task();
      } finally {
        this.pending -= 1;
        log.system("utterance finished", { label, pending: this.pending });
      }
    };

    const next = this.tail.then(run, run);
    this.tail = next.catch(() => {});
    return next;
  }

  size() {
    return this.pending;
  }
}

module.exports = new UtteranceQueue();
