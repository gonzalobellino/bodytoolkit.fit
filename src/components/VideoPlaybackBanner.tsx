import type { VideoPlaybackNotice } from '../utils/videoPlayback';

export function VideoPlaybackBanner({
  notice,
  className = '',
}: {
  notice: VideoPlaybackNotice | null;
  className?: string;
}): React.JSX.Element | null {
  if (!notice) return null;

  const tone = notice.tone === 'error'
    ? 'bg-amber-50 text-amber-950 border border-amber-200'
    : 'bg-slate-900/85 text-white border border-white/15';

  return (
    <div className={`absolute top-2 left-2 right-2 z-30 rounded-lg px-3 py-2 text-xs leading-snug shadow pointer-events-none ${tone} ${className}`}>
      {notice.message}
    </div>
  );
}
