import { flushSync } from "react-dom";

type PhotoTransition = { finished: Promise<void>; skipTransition: () => void };
type TransitionDocument = Document & {
  startViewTransition?: (update: () => Promise<void>) => PhotoTransition;
};
let active: PhotoTransition | undefined;

/** Animate only explicit card/detail navigation. The retained source owns focus and scroll. */
export function withBoulderPhotoTransition(
  update: () => void,
  source: HTMLElement,
) {
  const doc = document as TransitionDocument;
  const image = source.querySelector("img");
  if (
    !doc.startViewTransition ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
    !image || !image.complete || image.naturalWidth === 0
  ) {
    update();
    return;
  }
  active?.skipTransition();
  if (image) {
    doc
      .querySelectorAll("[data-boulder-photo-source]")
      .forEach((node) => node.removeAttribute("data-boulder-photo-source"));
    image.setAttribute("data-boulder-photo-source", "");
  }
  doc.documentElement.dataset.boulderPhotoTransition = "";
  let updated = false;
  try {
    const transition = doc.startViewTransition(async () => {
      updated = true;
      flushSync(update);
      doc.querySelector("[data-boulder-detail-scroll] .kws-detail-enter")?.setAttribute("data-photo-animated", "");
      // Let the mounted media and its cached poster settle before the snapshot.
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      );
    });
    active = transition;
    void transition.finished
      .catch(() => undefined)
      .then(() => {
        if (active === transition) {
          active = undefined;
          delete doc.documentElement.dataset.boulderPhotoTransition;
        }
      });
  } catch {
    delete doc.documentElement.dataset.boulderPhotoTransition;
    if (!updated) update();
  }
}

/** Return navigation must run immediately, including rapid browser Back/Forward. */
export function cancelBoulderPhotoTransition() {
  active?.skipTransition();
  active = undefined;
  delete document.documentElement.dataset.boulderPhotoTransition;
}
