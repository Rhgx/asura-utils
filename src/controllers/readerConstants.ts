export const CHAPTER_IMAGE_SELECTOR = [
  "div[data-page] img",
  'img[src*="/asura-images/chapters/"]',
  'img[data-src*="/asura-images/chapters/"]',
  'img[data-loaded-src*="/asura-images/chapters/"]',
  'img[srcset*="/asura-images/chapters/"]',
].join(",");

// Novel chapters have no images, so their text paragraphs stand in for chapter bounds.
export const NOVEL_TEXT_SELECTOR = 'astro-island[component-url*="NovelReader"] p';
