'use client';
import { useEffect, useState } from 'react';
import { promoTimes, type PromoSlot } from '@/lib/daily-clock';
type Preview = { slot: PromoSlot; time: string; day: string; text: string };
type Row = { day: string; channel: string; status: string; error: string | null; post_id: string | null; attempts: number };
type Data = { enabled: boolean; configured: boolean; previews: Preview[]; rows: Row[] };
const labels: Record<string, string> = { ready: '준비', submitting: '전송 중', queued: 'Buffer 예약 완료', failed: '실패 · 다음 실행에서 재시도', uncertain: '결과 확인 필요' };
const descriptions: Record<PromoSlot, string> = { morning: '긴 아침 글', noon: '다른 상황에서 생각하기', afternoon: '일상 속 가벼운 질문', evening: '짧은 생각', night: '하루 끝의 질문' };
function rowTime(channel: string) {
  const slot = channel.split(':').at(-1) as PromoSlot;
  return promoTimes[slot] || promoTimes.morning;
}
export default function PromotionPanel() {
  const [data, setData] = useState<Data | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
  async function load() {
    setError('');
    try {
      const response = await fetch('/api/promotion', { cache: 'no-store' });
      const value = await response.json() as Data & { error?: string };
      if (!response.ok) throw Error(value.error);
      setData(value);
    } catch (e) { setError((e as Error).message); }
  }
  useEffect(() => { load(); }, []);
  async function act(action: string, enabled?: boolean, slot?: PromoSlot) {
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await fetch('/api/promotion', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, enabled, slot }) });
      const value = await response.json() as { error?: string; channel?: { displayName: string } };
      if (!response.ok) throw Error(value.error);
      setNotice(action === 'check' ? `${value.channel?.displayName} Threads 연결을 확인했어요.` : action === 'draft' ? 'Buffer의 Drafts에 테스트 초안을 만들었어요. 공개 게시되지는 않아요.' : enabled ? '하루 5번 자동 게시를 켰어요.' : '자동 게시를 껐어요. 이미 Buffer에 예약된 글은 Buffer에서 취소해 주세요.');
      await load();
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }
  return <section className="admin-panel">
    <h2>Threads 자동 게시 · 하루 5개</h2>
    <p>한국 시간 07:30 · 12:00 · 15:00 · 18:00 · 21:00</p>
    <p>매일 오전 7시에 공개된 같은 주제로 글 5개를 준비합니다. 아침은 긴 글, 나머지는 짧은 일상 글이며 홈페이지 링크와 방문 유도 문구는 넣지 않습니다. 이미지는 첨부하지 않고 문단을 나눈 글로 게시합니다.</p>
    <p>게시 25분 전에 Buffer에 예약합니다. 확실한 실패는 20분·15분·10분 전에 재시도합니다. 결과가 불확실한 요청은 중복 전송하지 않습니다.</p>
    {error && <p className="admin-error" role="alert">{error}</p>}
    {notice && <p className="admin-notice" role="status">{notice}</p>}
    {!data ? <button disabled={busy} onClick={load}>설정 불러오기</button> : <>
      <p><strong>{data.configured ? '연결 정보 있음' : 'Cloudflare 연결 정보 필요'} · 자동 게시 {data.enabled ? '켜짐' : '꺼짐'}</strong></p>
      <div className="admin-row">
        <button disabled={busy || !data.configured} onClick={() => act('check')}>연결 확인</button>
        <button className="admin-primary" disabled={busy || !data.configured} onClick={() => act('toggle', !data.enabled)}>{data.enabled ? '자동 게시 끄기' : '하루 5개 자동 게시 켜기'}</button>
        <button disabled={busy} onClick={load}>새로고침</button>
      </div>
      <p>Cloudflare 실행 일정은 업데이트 파일에 포함돼 있습니다. 기존에 예약된 홍보 글은 자동으로 바뀌지 않으므로 Buffer의 Queue에서 별도로 확인해 주세요. 예약 완료와 실제 게시 완료는 다르며, 게시 완료는 Buffer의 Sent에서 확인합니다.</p>
      <h3>시간별 게시 미리보기</h3>
      <p>각 시간의 다음 게시 내용을 보여줍니다. 공개 전 주제를 수정하면 원고도 바뀝니다. 기존 100개 질문에는 각 5개의 원고가 있고, 새 질문은 공통 생각 문구를 사용합니다.</p>
      {data.previews.map(preview => <article className="admin-comment" key={preview.slot}>
        <h3>{preview.day} · {preview.time} · {descriptions[preview.slot]}</h3>
        <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.8 }}>{preview.text}</p>
        <p>{Array.from(preview.text).length}자</p>
        <button disabled={busy || !data.configured} onClick={() => act('draft', undefined, preview.slot)}>{preview.time} 테스트 초안 만들기</button>
      </article>)}
      <h3>최근 실행 기록</h3>
      {!data.rows.length && <p>아직 실행 기록이 없습니다.</p>}
      {data.rows.map(row => <article className="admin-comment" key={row.day + row.channel}>
        <strong>{row.day} · {rowTime(row.channel)} · {labels[row.status] || row.status}</strong>
        <p>전송 시도 {row.attempts}회{row.post_id ? ` · Buffer 게시물 ${row.post_id}` : ''}</p>
        {row.error && <p>{row.error}</p>}
      </article>)}
      <p><a href="https://publish.buffer.com/" target="_blank" rel="noreferrer">Buffer에서 Drafts · Queue · Sent 확인 ↗</a></p>
    </>}
  </section>;
}
