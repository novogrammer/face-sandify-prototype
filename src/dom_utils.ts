export function domReady(onReady: () => void) {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", onReady);
  } else {
    onReady();
  }
}

interface Size {
  width: number;
  height: number;
}

export function getElementSize(element: HTMLElement): Size {
  return {
    width: element.clientWidth,
    height: element.clientHeight,
  }
}
