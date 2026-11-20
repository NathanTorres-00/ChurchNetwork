import Player from "@vimeo/player";

export function mountHeroPreview(slide: HTMLElement): (() => void) | undefined {
  const preview = slide.querySelector<HTMLElement>(".videos-hero_preview");
  const link = slide.querySelector<HTMLAnchorElement>("a[data-vimeo]");
  if (!preview || !link) return;

  const url = new URL(link.href);
  url.searchParams.set("background", "1");
  url.searchParams.set("autoplay", "1");
  url.searchParams.set("muted", "1");
  url.searchParams.set("playsinline", "1");

  const frame = document.createElement("iframe");
  frame.title = "Muted video preview";
  frame.tabIndex = -1;
  frame.allow = "autoplay";
  frame.referrerPolicy = "strict-origin-when-cross-origin";
  frame.src = url.href;
  preview.append(frame);

  const player = new Player(frame);
  void Promise.all([player.getVideoWidth(), player.getVideoHeight()])
    .then(([width, height]) => {
      if (width > 0 && height > 0) frame.style.setProperty("--preview-ratio", String(width / height));
    })
    .catch(() => {});

  player.on("timeupdate", ({ seconds }) => {
    if (!Number.isFinite(seconds) || seconds <= 0) return;
    link.dataset.previewTime = String(Math.floor(seconds));
    frame.classList.add("is-playing");
  });
  void player.play().catch(() => {});

  return () => {
    delete link.dataset.previewTime;
    void player.destroy().catch(() => {});
  };
}
