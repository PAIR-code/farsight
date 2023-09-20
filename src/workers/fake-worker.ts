/**
 * Fake Web Worker class to simulate worker API to accommodate environments that
 * do not support Web Workers (e.g., Chrome Extension)
 */
export class FakeWorker<T> {
  /**
   * Callback method to be overwritten in the "main" thread. It is equivalent to
   * the "postMessage" in the original Worker class.
   * @param e Message event
   */
  workerMessageHandler: (e: MessageEvent<T>) => void;

  constructor(workerMessageHandler: (e: MessageEvent<T>) => void) {
    this.workerMessageHandler = workerMessageHandler;
  }

  /**
   * Handler for message from the "main" thread. Because this function is called
   * from the "main" thread, it is equivalent to the "onMessage" in the original
   * Worker class.
   * @param message Message event
   */
  postMessage(_message: T) {}
}
