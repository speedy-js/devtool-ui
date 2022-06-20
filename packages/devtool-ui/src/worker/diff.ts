// @ts-expect-error
import Worker from "./diff.worker?worker";
export const calucateDiffWithWorker = async (left: string, right: string) => {
  const w = new Worker();
  w.postMessage({
    left,
    right,
  });

  return new Promise(r=>{
    // @ts-expect-error
    w.addEventListener("message", ({ data }) => {
      w.terminate()
      r(data)
    });
  })  

};
