import { diff_match_patch as Diff } from 'diff-match-patch'

const calucateDiff = (left: string, right: string) => {
  const diff = new Diff()
  const changes = diff.diff_main(left, right)
  diff.diff_cleanupSemantic(changes)
  return changes
}


self.onmessage = ({data})=>{
  const {left,right} = data;
  const c = calucateDiff(left,right)
  self.postMessage(c);
}