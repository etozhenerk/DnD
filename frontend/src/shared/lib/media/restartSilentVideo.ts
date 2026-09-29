export function restartSilentVideo(video: HTMLVideoElement, startSeconds = 0): void {
  video.muted = true;
  video.currentTime = startSeconds;
  // Keep the user gesture when resuming a paused or finished video.
  // A rejected play request must not interrupt the song selection.
  void video.play().catch(() => undefined);
}
