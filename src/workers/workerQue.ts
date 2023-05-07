function webWorkerTask<T>(data: T) {
  let result: T;
  let isStarted = false;
  return {
    getIsStarted: () => isStarted,
    getResult: () => result,
    run(worker: Worker, onComplete: () => any) {
      isStarted = true;
      worker.onmessage = (e) => {
        result = e.data;
        onComplete();
      };
      worker.postMessage(data);
    },
  };
}

export type WorkerQueMessageCallback<T> = T extends (
  data: infer Input
) => infer Output
  ? [Input, Output]
  : never;

export function workerQue<T extends [any, any]>(
  data: T[0][],
  workers: Worker[],
  onFinished: (results: T[1][]) => any
) {
  if (data.length === 0) onFinished([]);
  let nextToStart = 0;
  let currentFinished = 0;
  const tasks = data.map((ele) => webWorkerTask(ele));

  function onWebWorkerComplete(webWorker: Worker) {
    currentFinished += 1;
    if (nextToStart < tasks.length) {
      tasks[nextToStart].run(webWorker, () => onWebWorkerComplete(webWorker));
      nextToStart += 1;
    }
    if (currentFinished === data.length)
      onFinished(tasks.map((ele) => ele.getResult()));
  }
  for (
    let workerDataIndexPair = 0;
    workerDataIndexPair < workers.length && workerDataIndexPair < tasks.length;
    ++workerDataIndexPair
  ) {
    const worker = workers[workerDataIndexPair];
    tasks[workerDataIndexPair].run(worker, () => onWebWorkerComplete(worker));
    nextToStart += 1;
  }
}
