type QueueTask = {
  task: () => Promise<unknown>;
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
};

let isProcessing = false;
const queue: QueueTask[] = [];

export function enqueue<T>(task: () => Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    queue.push({
      task: task as () => Promise<unknown>,
      resolve: resolve as (value: unknown) => void,
      reject,
    });
    void processQueue();
  });
}

async function processQueue(): Promise<void> {
  if (isProcessing || queue.length === 0) return;

  isProcessing = true;
  const current = queue.shift() as QueueTask;

  try {
    const result = await current.task();
    current.resolve(result);
  } catch (error) {
    current.reject(error);
  } finally {
    isProcessing = false;
    void processQueue();
  }
}
