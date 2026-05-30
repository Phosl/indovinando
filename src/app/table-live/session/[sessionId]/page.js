import TableLiveSessionClient from './TableLiveSessionClient'

export default async function TableLiveSessionPage({params}) {
  const {sessionId} = await params
  return <TableLiveSessionClient sessionId={sessionId} />
}
