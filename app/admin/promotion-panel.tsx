'use client';
import { useEffect, useState } from 'react';
type Data = { enabled: boolean; configured: boolean; preview: { day: string; text: string; image: string }; rows: { day: string; status: string; error: string | null; post_id: string | null; attempts: number }[] };
const labels: Record<string, string> = { ready: '준비', submitting: '전송 중', queued: 'Buffer 예약 완료', failed: '실패 · 다음 실행에서 재시도', uncertain: '결과 확인 필요' };
export default function PromotionPanel() {
  const [data, setData] = useState<Data | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
  async function load() {
    try { const r = await fetch('/api/promotion', { cache: 'no-store' }), v = await r.json() as Data & {error?:string}; if (!r.ok) throw Error(v.error); setData(v); }
    catch (e) { setError((e as Error).message); }
  }
  useEffect(() => { load(); }, []);
  async function act(action: string, enabled?: boolean) {
    setBusy(true); setError(''); setNotice('');
    try {
      const r = await fetch('/api/promotion', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, enabled }) }), v = await r.json() as {error?:string;channel:{displayName:string}};
      if (!r.ok) throw Error(v.error);
      setNotice(action === 'check' ? `${v.channel.displayName} Threads 연결을 확인했어요.` : action === 'draft' ? 'Buffer의 Drafts에 테스트 초안을 만들었어요. 공개 게시되지는 않아요.' : enabled ? '자동 홍보를 켰어요. 매일 한국 시간 오전 7시 30분에 게시하도록 준비합니다.' : '자동 홍보를 껐어요. 이미 Buffer에 예약된 글은 Buffer에서 취소해 주세요.');
      await load();
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }
  return <section className="admin-panel"><h2>Threads 자동 홍보</h2><p>질문 공개: 매일 오전 7시 · Threads 게시: 오전 7시 30분 (한국 시간)</p><p>오전 7시 5분에 실제 공개된 질문과 A/B 선택지를 Buffer에 예약합니다. 실패가 확실하면 7시 10분·15분·20분에 재시도합니다. 응답이 끊겨 결과가 불확실하면 중복 전송하지 않습니다.</p>
    {error && <p className="admin-error" role="alert">{error}</p>}{notice && <p className="admin-notice" role="status">{notice}</p>}
    {!data ? <button disabled={busy} onClick={load}>설정 불러오기</button> : <><p><strong>{data.configured ? '연결 정보 있음' : 'Cloudflare 연결 정보 필요'} · 자동 홍보 {data.enabled ? '켜짐' : '꺼짐'}</strong></p><div className="admin-row"><button disabled={busy || !data.configured} onClick={() => act('check')}>연결 확인</button><button disabled={busy || !data.configured} onClick={() => act('draft')}>Buffer에 테스트 초안 만들기</button><button className="admin-primary" disabled={busy || !data.configured} onClick={() => act('toggle', !data.enabled)}>{data.enabled ? '자동 홍보 끄기' : '자동 홍보 켜기'}</button><button disabled={busy} onClick={load}>새로고침</button></div>
      <p>Cloudflare 실행 일정도 필요합니다. 이번 업데이트의 vite.config.ts에 일정이 포함돼 있어요. 예약 완료는 Buffer에 전달됐다는 뜻이며, 실제 게시 성공은 Buffer의 Sent에서 확인하세요.</p><h3>{data.preview.day} 게시 내용 미리보기</h3><p>다음 실행 때의 주제를 바탕으로 만든 예상 원고예요. 공개 전 예약 주제를 수정하면 실제 원고도 바뀝니다.</p><img className="admin-topic-image" src={data.preview.image} alt="홍보 이미지"/><p style={{ whiteSpace: 'pre-wrap' }}>{data.preview.text}</p><h3>최근 실행 기록</h3>{!data.rows.length && <p>아직 실행 기록이 없습니다. 자동 홍보를 켠 뒤 오전 7시 5분 이후 확인해 주세요.</p>}{data.rows.map(row => <article className="admin-comment" key={row.day}><strong>{row.day} · {labels[row.status] || row.status}</strong><p>전송 시도 {row.attempts}회{row.post_id ? ` · Buffer 게시물 ${row.post_id}` : ''}</p>{row.error && <p>{row.error}</p>}</article>)}<p><a href="https://publish.buffer.com/" target="_blank" rel="noreferrer">Buffer에서 Drafts · Queue · Sent 확인 ↗</a></p></>}
  </section>;
}
