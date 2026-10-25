import type { ChapterEndAction, ConfigKey } from "../config/defaults.js";
import type { ReaderController, ReaderStateSnapshot } from "./readerController.js";
import type { SettingsModalView } from "../views/settingsModalView.js";
import type { ProgressBarView } from "../views/progressBarView.js";
import type { ReaderDockView } from "../views/readerDockView.js";

export interface PageContext {
  isReader: boolean;
  isSeriesPage: boolean;
  isSeriesListing: boolean;
  isAuthPage: boolean;
}

export interface ChapterAccessResult {
  allowed: boolean;
  reason: string;
  unlockTime?: string | null;
}

export type QueryRoot = Document | Element;

export interface PageControllerContext {
  settingsView: SettingsModalView;
  progressBarView: ProgressBarView;
  dockView: ReaderDockView;
  reader: ReaderController;
  observer: MutationObserver | null;
  debounceTimer: number | undefined;
  viewportFrameId: number;
  resizePending: boolean;
  hintTimer: number | undefined;
  globalListenersBound: boolean;
  readerMounted: boolean;
  endActionChapterKey: string;
  endActionCompleted: boolean;
  endActionInFlight: boolean;
  endActionHintTs: number;
  historyWriteTs: number;
  historyWrittenChapterKey: string;
  historyWrittenProgress: number | null;
  resumeAttemptedKey: string;
  chapterAccessCache: Map<string, ChapterAccessResult>;
  pageContext: PageContext;

  getReaderChapterKey(): string;
  refreshEndActionChapterState(): void;
  isNearPageEnd(): boolean;
  getChapterImageCount(root?: Document): number;
  hasPremiumLockSignals(root?: Document): boolean;
  isLikelyPremiumLockedCurrentChapter(): boolean;
  showEndActionHint(message: string): void;
  maybeRunChapterEndAction(): Promise<void>;
  probeChapterAccess(url: unknown): Promise<ChapterAccessResult>;
  tryNavigateNextChapterWithPremiumCheck(): Promise<boolean>;
  stopReaderAutoScrollForEndAction(): boolean | void;
  performSmartEndAction(actionMode: ChapterEndAction): Promise<boolean>;

  applyReaderBrightness(): void;
  getSeriesTitleFromReader(): string;
  recordReaderVisit(progress?: number | null): void;
  applyHistoryUI(): void;
  maybeResumeChapterPosition(): void;

  applyOverhaulTargets(): void;
  clearOverhaulTargets(): void;
  tagChapterTimestamps(): void;
  tagHeaderOverhaulTargets(): void;
  tagThemeTargets(): void;
  tagSeriesOverhaulTargets(): void;

  findHomeSlider(): Element | null;
  findTorakaPromos(): Element[];
  findBetaBannerPromos(): Element[];
  findPopularSections(): Element[];
  normalizeSectionTargets(nodes: Iterable<Element>): Element[];
  isLikelySeriesSection(element: Element, options?: { minLinks?: number; maxLinks?: number }): boolean;
  isLikelySidebarColumn(element: Element): boolean;
  findCompactSidebarTargets(): Element[];
  cleanupCompactSidebar(): void;
  isLikelyBackToTopControl(element: Element, allowNonFloating?: boolean): boolean;
  findBackToTopTargets(): Element[];
  cleanupBackToTopControl(): void;
  cleanupBetaBanner(): void;
  cleanupHomeSections(): void;

  getPageContext(): PageContext;
  bindGlobalListeners(): void;
  observeMutations(): void;
  run(): void;
  mountReaderUI(): void;
  unmountReaderUI(): void;
  syncReaderState(state?: ReaderStateSnapshot): void;
  scheduleViewportUpdate(resize?: boolean): void;
  applyBodyClasses(): void;
  handleConfigChanged(key: ConfigKey): void;
  handleKeyDown(event: KeyboardEvent): void;
  handleDblClick(event: MouseEvent): void;
  handleScroll(): void;
  handleResize(): void;
  focusSearch(): void;
  scrollToChapterList(): void;
  showHint(message: string): void;
  findAncestor(element: Element, predicate: (element: Element) => boolean): Element | null;
  getSeriesAnchors(root?: QueryRoot, options?: { includeChapters?: boolean }): HTMLAnchorElement[];
  getChapterAnchors(root?: QueryRoot): HTMLAnchorElement[];
}
