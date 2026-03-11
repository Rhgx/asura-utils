// ==UserScript==
// @name         Asura Utils
// @namespace    http://tampermonkey.net/
// @version      5.3.0
// @description  Reader enhancement with a single left dock, auto-scroll, image resizing, keyboard shortcuts, ad block, progress bar, layout customization, and UI cleanup.
// @author       Rocks
// @match        https://asuracomic.net/*
// @icon         https://asuracomic.net/images/logo.webp
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// @run-at       document-start
// ==/UserScript==

(function () {
  "use strict";

  // =============================================================================
  // 1. CONFIGURATION
  // =============================================================================
  const DEFAULTS = {
    hideSlider: false,
    colorTimestamps: true,
    readerWidget: true,
    autoScrollSpeed: 2.0,
    imageWidth: 800,
    adBlock: true,
    hideToraka: true,
    hideComments: false,
    showProgressBar: true,
    fitWidthMode: false,
    hideDefaultBackToTop: true,
    doubleClickScroll: true,
    compactSidebar: false,
    hidePopularSection: false,
    menuSeriesOverhaul: false,
    readerDockCollapsed: true,
    readerDockSection: "all",
    themePreset: "asuraClassic",
  };

  const CONSTANTS = {
    BASE_WIDTH: 800,
    SPEED_STEP: 0.5,
  };

  const BASE_THEME_TOKENS = {
    "--au-accent": "#913fe2",
    "--au-accent-strong": "#6f2598",
    "--au-accent-glow": "rgba(145, 63, 226, 0.38)",
    "--au-bg-soft": "rgba(21, 19, 31, 0.94)",
    "--au-bg-panel": "#1a1725",
    "--au-bg-control": "rgba(34, 29, 49, 0.92)",
    "--au-border": "rgba(145, 63, 226, 0.34)",
    "--au-border-soft": "rgba(201, 166, 243, 0.24)",
    "--au-text": "#f5eeff",
    "--au-text-dim": "#bcabd4",
    "--au-shadow": "0 18px 40px rgba(11, 8, 20, 0.55)",
    "--au-settings-btn-bg": "#6f2598",
    "--au-settings-btn-hover": "#5a1f78",
    "--au-modal-overlay": "rgba(7, 5, 13, 0.86)",
    "--au-modal-bg": "linear-gradient(160deg, #1b1629 0%, #121019 100%)",
    "--au-modal-title": "#f5eeff",
    "--au-section-title": "#af95cc",
    "--au-input-bg": "#130f1f",
    "--au-input-border": "rgba(165, 130, 208, 0.32)",
    "--au-toggle-bg": "#3b3150",
    "--au-progress-track": "rgba(9, 7, 14, 0.6)",
    "--au-progress-end": "#b67dff",
    "--au-dock-handle-bg":
      "linear-gradient(165deg, rgba(31, 24, 46, 0.96), rgba(19, 15, 30, 0.96))",
    "--au-dock-handle-hover-bg": "rgba(48, 35, 72, 0.96)",
    "--au-dock-handle-hover-border": "rgba(179, 138, 234, 0.62)",
    "--au-dock-panel-bg":
      "linear-gradient(160deg, rgba(26, 22, 39, 0.96), rgba(18, 15, 29, 0.96))",
    "--au-dock-section-border": "rgba(188, 159, 226, 0.2)",
    "--au-dock-title": "#efe4ff",
    "--au-dock-btn-border": "rgba(166, 133, 212, 0.38)",
    "--au-dock-btn-hover-bg": "rgba(66, 51, 96, 0.92)",
    "--au-dock-btn-hover-border": "rgba(195, 152, 248, 0.64)",
    "--au-dock-btn-active-border": "rgba(229, 203, 255, 0.4)",
    "--au-dock-btn-active-inset": "rgba(145, 63, 226, 0.25)",
    "--au-dock-input-bg": "#140f20",
    "--au-dock-footer": "#9f8dbc",
    "--au-reader-backdrop": "rgba(8, 5, 16, 0.56)",
    "--au-shortcut-bg": "rgba(20, 15, 32, 0.95)",
    "--au-shortcut-border": "rgba(185, 147, 235, 0.45)",
    "--au-shortcut-shadow": "0 12px 30px rgba(21, 11, 39, 0.55)",
    "--au-shortcut-text": "#fff",
    "--au-shortcuts-copy": "#b8a6d3",
    "--au-signature-text": "#907cab",
    "--auo-accent": "#913fe2",
    "--auo-accent-strong": "#6f2598",
    "--auo-surface": "#222222",
    "--auo-surface-hover": "#343434",
    "--auo-text": "#d9d9d9",
    "--auo-text-dim": "#a2a2a2",
    "--auo-border": "rgba(162, 162, 162, 0.2)",
    "--auo-bg": "#16151d",
    "--auo-header-start": "#7d33c8",
    "--auo-nav-hover-bg": "rgba(22, 21, 29, 0.55)",
    "--auo-nav-hover-text": "#ffffff",
    "--auo-search-bg": "#16151d",
    "--auo-search-border": "#2e2a3a",
    "--auo-auth-border": "rgba(255, 255, 255, 0.12)",
    "--auo-auth-hover-bg": "#5a1f78",
    "--auo-auth-hover-border": "rgba(255, 255, 255, 0.2)",
    "--auo-card-alt-bg": "#1f1f26",
    "--auo-link": "#e7deff",
    "--auo-chapter-bg": "#25252d",
    "--auo-chapter-hover-border": "rgba(145, 63, 226, 0.45)",
    "--auo-on-accent": "#ffffff",
    "--au-logo-filter": "none",
  };

  const THEME_PRESETS = {
    asuraClassic: {
      label: "Asura Classic",
      tokens: {},
    },
    asuraOcean: {
      label: "Asura Ocean",
      tokens: {
        "--au-accent": "#2f9d95",
        "--au-accent-strong": "#247e77",
        "--au-accent-glow": "rgba(47, 157, 149, 0.34)",
        "--au-bg-soft": "rgba(18, 23, 28, 0.86)",
        "--au-bg-panel": "#131920",
        "--au-bg-control": "rgba(24, 33, 41, 0.92)",
        "--au-border": "rgba(133, 162, 188, 0.22)",
        "--au-border-soft": "rgba(133, 162, 188, 0.2)",
        "--au-text": "#e8eef5",
        "--au-text-dim": "#9eb0c2",
        "--au-shadow": "0 16px 38px rgba(0, 0, 0, 0.42)",
        "--au-settings-btn-bg": "#2f9d95",
        "--au-settings-btn-hover": "#247e77",
        "--au-modal-overlay": "rgba(0, 0, 0, 0.85)",
        "--au-modal-bg": "#131920",
        "--au-modal-title": "#c7d8eb",
        "--au-section-title": "#7b8ea3",
        "--au-input-bg": "#0d1319",
        "--au-input-border": "#32465b",
        "--au-toggle-bg": "#374554",
        "--au-progress-track": "rgba(0, 0, 0, 0.35)",
        "--au-progress-end": "#78c8c2",
        "--au-dock-handle-bg": "rgba(18, 23, 28, 0.88)",
        "--au-dock-handle-hover-bg": "rgba(30, 39, 48, 0.92)",
        "--au-dock-handle-hover-border": "rgba(133, 162, 188, 0.42)",
        "--au-dock-panel-bg": "rgba(18, 23, 28, 0.88)",
        "--au-dock-section-border": "rgba(133, 162, 188, 0.2)",
        "--au-dock-title": "#dce7f2",
        "--au-dock-btn-border": "rgba(133, 162, 188, 0.38)",
        "--au-dock-btn-hover-bg": "rgba(41, 58, 74, 0.92)",
        "--au-dock-btn-hover-border": "rgba(133, 162, 188, 0.6)",
        "--au-dock-btn-active-border": "rgba(172, 219, 214, 0.6)",
        "--au-dock-btn-active-inset": "rgba(47, 157, 149, 0.28)",
        "--au-dock-input-bg": "#0f1720",
        "--au-dock-footer": "#8ba0b5",
        "--au-reader-backdrop": "rgba(4, 10, 15, 0.62)",
        "--au-shortcut-bg": "rgba(15, 25, 35, 0.95)",
        "--au-shortcut-border": "rgba(133, 162, 188, 0.45)",
        "--au-shortcut-shadow": "0 12px 30px rgba(2, 6, 10, 0.62)",
        "--au-shortcuts-copy": "#a5b9cd",
        "--au-signature-text": "#7990a7",
        "--auo-accent": "#2f9d95",
        "--auo-accent-strong": "#247e77",
        "--auo-surface": "#1e2630",
        "--auo-surface-hover": "#2a3644",
        "--auo-text": "#d4e0ed",
        "--auo-text-dim": "#95a8bc",
        "--auo-border": "rgba(133, 162, 188, 0.24)",
        "--auo-bg": "#121820",
        "--auo-header-start": "#2e8f89",
        "--auo-nav-hover-bg": "rgba(18, 24, 32, 0.58)",
        "--auo-search-bg": "#121820",
        "--auo-search-border": "#293746",
        "--auo-auth-border": "rgba(255, 255, 255, 0.12)",
        "--auo-auth-hover-bg": "#1e6b65",
        "--auo-card-alt-bg": "#182028",
        "--auo-link": "#d6f6f3",
        "--auo-chapter-bg": "#232d39",
        "--auo-chapter-hover-border": "rgba(47, 157, 149, 0.5)",
        "--auo-on-accent": "#effffd",
        "--au-logo-filter": "hue-rotate(-96deg) saturate(1) brightness(1.06)",
      },
    },
    dracula: {
      label: "Dracula",
      tokens: {
        "--au-accent": "#bd93f9",
        "--au-accent-strong": "#ff79c6",
        "--au-accent-glow": "rgba(189, 147, 249, 0.36)",
        "--au-bg-soft": "rgba(40, 42, 54, 0.94)",
        "--au-bg-panel": "#282a36",
        "--au-bg-control": "rgba(68, 71, 90, 0.9)",
        "--au-border": "rgba(189, 147, 249, 0.38)",
        "--au-border-soft": "rgba(98, 114, 164, 0.4)",
        "--au-text": "#f8f8f2",
        "--au-text-dim": "#bdc2df",
        "--au-shadow": "0 18px 40px rgba(12, 13, 18, 0.62)",
        "--au-settings-btn-bg": "#bd93f9",
        "--au-settings-btn-hover": "#a876f5",
        "--au-modal-overlay": "rgba(16, 17, 24, 0.88)",
        "--au-modal-bg": "linear-gradient(160deg, #2b2d3b 0%, #222433 100%)",
        "--au-modal-title": "#f8f8f2",
        "--au-section-title": "#f1a8da",
        "--au-input-bg": "#232532",
        "--au-input-border": "rgba(98, 114, 164, 0.65)",
        "--au-toggle-bg": "#44475a",
        "--au-progress-track": "rgba(40, 42, 54, 0.7)",
        "--au-progress-end": "#8be9fd",
        "--au-dock-handle-bg":
          "linear-gradient(165deg, rgba(46, 48, 63, 0.96), rgba(36, 37, 50, 0.96))",
        "--au-dock-handle-hover-bg": "rgba(68, 71, 90, 0.95)",
        "--au-dock-handle-hover-border": "rgba(255, 121, 198, 0.62)",
        "--au-dock-panel-bg":
          "linear-gradient(160deg, rgba(44, 46, 60, 0.96), rgba(34, 36, 48, 0.96))",
        "--au-dock-section-border": "rgba(98, 114, 164, 0.45)",
        "--au-dock-title": "#f8f8f2",
        "--au-dock-btn-border": "rgba(189, 147, 249, 0.4)",
        "--au-dock-btn-hover-bg": "rgba(83, 86, 108, 0.92)",
        "--au-dock-btn-hover-border": "rgba(255, 121, 198, 0.62)",
        "--au-dock-btn-active-border": "rgba(255, 184, 108, 0.6)",
        "--au-dock-btn-active-inset": "rgba(189, 147, 249, 0.28)",
        "--au-dock-input-bg": "#242634",
        "--au-dock-footer": "#c7b3de",
        "--au-reader-backdrop": "rgba(15, 16, 23, 0.62)",
        "--au-shortcut-bg": "rgba(42, 44, 58, 0.95)",
        "--au-shortcut-border": "rgba(189, 147, 249, 0.5)",
        "--au-shortcut-shadow": "0 12px 30px rgba(15, 16, 24, 0.62)",
        "--au-shortcuts-copy": "#cfb5ec",
        "--au-signature-text": "#a88fbe",
        "--auo-accent": "#bd93f9",
        "--auo-accent-strong": "#ff79c6",
        "--auo-surface": "#2f3242",
        "--auo-surface-hover": "#3a3e53",
        "--auo-text": "#f8f8f2",
        "--auo-text-dim": "#b6bce2",
        "--auo-border": "rgba(98, 114, 164, 0.35)",
        "--auo-bg": "#232532",
        "--auo-header-start": "#7b5ab9",
        "--auo-nav-hover-bg": "rgba(34, 36, 49, 0.6)",
        "--auo-search-bg": "#232532",
        "--auo-search-border": "#50556f",
        "--auo-auth-border": "rgba(248, 248, 242, 0.16)",
        "--auo-auth-hover-bg": "#a96ff3",
        "--auo-card-alt-bg": "#282b3a",
        "--auo-link": "#8be9fd",
        "--auo-chapter-bg": "#33374a",
        "--auo-chapter-hover-border": "rgba(255, 121, 198, 0.52)",
        "--auo-on-accent": "#2a2136",
        "--au-logo-filter": "hue-rotate(-5deg) saturate(1.14) brightness(1.04)",
      },
    },
    nord: {
      label: "Nord",
      tokens: {
        "--au-accent": "#88c0d0",
        "--au-accent-strong": "#5e81ac",
        "--au-accent-glow": "rgba(136, 192, 208, 0.34)",
        "--au-bg-soft": "rgba(46, 52, 64, 0.94)",
        "--au-bg-panel": "#2e3440",
        "--au-bg-control": "rgba(59, 66, 82, 0.92)",
        "--au-border": "rgba(129, 161, 193, 0.38)",
        "--au-border-soft": "rgba(94, 129, 172, 0.34)",
        "--au-text": "#e5e9f0",
        "--au-text-dim": "#b9c4d6",
        "--au-shadow": "0 18px 40px rgba(25, 30, 39, 0.56)",
        "--au-settings-btn-bg": "#5e81ac",
        "--au-settings-btn-hover": "#4c6f98",
        "--au-modal-overlay": "rgba(23, 28, 37, 0.86)",
        "--au-modal-bg": "linear-gradient(160deg, #343b48 0%, #2a303b 100%)",
        "--au-modal-title": "#eceff4",
        "--au-section-title": "#a3b2cc",
        "--au-input-bg": "#2b313c",
        "--au-input-border": "rgba(129, 161, 193, 0.45)",
        "--au-toggle-bg": "#4c566a",
        "--au-progress-track": "rgba(32, 38, 47, 0.72)",
        "--au-progress-end": "#81a1c1",
        "--au-dock-handle-bg":
          "linear-gradient(165deg, rgba(57, 65, 80, 0.96), rgba(47, 53, 66, 0.96))",
        "--au-dock-handle-hover-bg": "rgba(76, 86, 106, 0.95)",
        "--au-dock-handle-hover-border": "rgba(136, 192, 208, 0.66)",
        "--au-dock-panel-bg":
          "linear-gradient(160deg, rgba(56, 64, 79, 0.96), rgba(45, 52, 65, 0.96))",
        "--au-dock-section-border": "rgba(129, 161, 193, 0.32)",
        "--au-dock-title": "#eceff4",
        "--au-dock-btn-border": "rgba(129, 161, 193, 0.45)",
        "--au-dock-btn-hover-bg": "rgba(86, 97, 118, 0.94)",
        "--au-dock-btn-hover-border": "rgba(136, 192, 208, 0.66)",
        "--au-dock-btn-active-border": "rgba(180, 142, 173, 0.58)",
        "--au-dock-btn-active-inset": "rgba(94, 129, 172, 0.24)",
        "--au-dock-input-bg": "#2a303b",
        "--au-dock-footer": "#aebcd1",
        "--au-reader-backdrop": "rgba(26, 31, 40, 0.6)",
        "--au-shortcut-bg": "rgba(52, 59, 72, 0.95)",
        "--au-shortcut-border": "rgba(129, 161, 193, 0.5)",
        "--au-shortcut-shadow": "0 12px 30px rgba(22, 27, 35, 0.62)",
        "--au-shortcuts-copy": "#b8c8dd",
        "--au-signature-text": "#98a9bf",
        "--auo-accent": "#88c0d0",
        "--auo-accent-strong": "#5e81ac",
        "--auo-surface": "#3b4252",
        "--auo-surface-hover": "#434c5e",
        "--auo-text": "#e5e9f0",
        "--auo-text-dim": "#b9c4d6",
        "--auo-border": "rgba(129, 161, 193, 0.28)",
        "--auo-bg": "#2e3440",
        "--auo-header-start": "#6795c3",
        "--auo-nav-hover-bg": "rgba(46, 52, 64, 0.62)",
        "--auo-search-bg": "#2a303b",
        "--auo-search-border": "#4f5f79",
        "--auo-auth-border": "rgba(236, 239, 244, 0.16)",
        "--auo-auth-hover-bg": "#4c6f98",
        "--auo-card-alt-bg": "#353c4b",
        "--auo-link": "#8fbcbb",
        "--auo-chapter-bg": "#3a4354",
        "--auo-chapter-hover-border": "rgba(136, 192, 208, 0.58)",
        "--auo-on-accent": "#eef4ff",
        "--au-logo-filter": "hue-rotate(-72deg) saturate(0.9) brightness(1.08)",
      },
    },
    catppuccinMocha: {
      label: "Catppuccin Mocha",
      tokens: {
        "--au-accent": "#cba6f7",
        "--au-accent-strong": "#b4befe",
        "--au-accent-glow": "rgba(203, 166, 247, 0.34)",
        "--au-bg-soft": "rgba(30, 30, 46, 0.94)",
        "--au-bg-panel": "#1e1e2e",
        "--au-bg-control": "rgba(49, 50, 68, 0.92)",
        "--au-border": "rgba(203, 166, 247, 0.35)",
        "--au-border-soft": "rgba(137, 180, 250, 0.34)",
        "--au-text": "#cdd6f4",
        "--au-text-dim": "#a6adc8",
        "--au-shadow": "0 18px 40px rgba(17, 17, 27, 0.62)",
        "--au-settings-btn-bg": "#cba6f7",
        "--au-settings-btn-hover": "#b88de9",
        "--au-modal-overlay": "rgba(17, 17, 27, 0.86)",
        "--au-modal-bg": "linear-gradient(160deg, #24273a 0%, #1e2030 100%)",
        "--au-modal-title": "#f5e0dc",
        "--au-section-title": "#f2cdcd",
        "--au-input-bg": "#181825",
        "--au-input-border": "rgba(137, 180, 250, 0.42)",
        "--au-toggle-bg": "#45475a",
        "--au-progress-track": "rgba(24, 24, 37, 0.74)",
        "--au-progress-end": "#89b4fa",
        "--au-dock-handle-bg":
          "linear-gradient(165deg, rgba(49, 50, 68, 0.96), rgba(37, 38, 53, 0.96))",
        "--au-dock-handle-hover-bg": "rgba(69, 71, 90, 0.95)",
        "--au-dock-handle-hover-border": "rgba(180, 190, 254, 0.68)",
        "--au-dock-panel-bg":
          "linear-gradient(160deg, rgba(48, 50, 66, 0.96), rgba(35, 36, 49, 0.96))",
        "--au-dock-section-border": "rgba(166, 173, 200, 0.3)",
        "--au-dock-title": "#f5c2e7",
        "--au-dock-btn-border": "rgba(180, 190, 254, 0.46)",
        "--au-dock-btn-hover-bg": "rgba(88, 91, 112, 0.94)",
        "--au-dock-btn-hover-border": "rgba(203, 166, 247, 0.66)",
        "--au-dock-btn-active-border": "rgba(243, 139, 168, 0.56)",
        "--au-dock-btn-active-inset": "rgba(203, 166, 247, 0.28)",
        "--au-dock-input-bg": "#181825",
        "--au-dock-footer": "#a6adc8",
        "--au-reader-backdrop": "rgba(17, 17, 27, 0.62)",
        "--au-shortcut-bg": "rgba(49, 50, 68, 0.95)",
        "--au-shortcut-border": "rgba(203, 166, 247, 0.5)",
        "--au-shortcut-shadow": "0 12px 30px rgba(17, 17, 27, 0.7)",
        "--au-shortcuts-copy": "#bac2de",
        "--au-signature-text": "#9399b2",
        "--auo-accent": "#cba6f7",
        "--auo-accent-strong": "#b4befe",
        "--auo-surface": "#313244",
        "--auo-surface-hover": "#45475a",
        "--auo-text": "#cdd6f4",
        "--auo-text-dim": "#a6adc8",
        "--auo-border": "rgba(166, 173, 200, 0.24)",
        "--auo-bg": "#1e1e2e",
        "--auo-header-start": "#b784f2",
        "--auo-nav-hover-bg": "rgba(30, 30, 46, 0.64)",
        "--auo-search-bg": "#1e1e2e",
        "--auo-search-border": "#585b70",
        "--auo-auth-border": "rgba(205, 214, 244, 0.16)",
        "--auo-auth-hover-bg": "#9f7dd8",
        "--auo-card-alt-bg": "#2a2b3c",
        "--auo-link": "#89dceb",
        "--auo-chapter-bg": "#3a3c52",
        "--auo-chapter-hover-border": "rgba(203, 166, 247, 0.58)",
        "--auo-on-accent": "#1e1e2e",
        "--au-logo-filter": "hue-rotate(-2deg) saturate(1.18) brightness(1.06)",
      },
    },
    solarizedDark: {
      label: "Solarized Dark",
      tokens: {
        "--au-accent": "#2aa198",
        "--au-accent-strong": "#268bd2",
        "--au-accent-glow": "rgba(42, 161, 152, 0.34)",
        "--au-bg-soft": "rgba(0, 43, 54, 0.94)",
        "--au-bg-panel": "#002b36",
        "--au-bg-control": "rgba(7, 54, 66, 0.92)",
        "--au-border": "rgba(42, 161, 152, 0.36)",
        "--au-border-soft": "rgba(88, 110, 117, 0.45)",
        "--au-text": "#eee8d5",
        "--au-text-dim": "#93a1a1",
        "--au-shadow": "0 18px 40px rgba(0, 28, 34, 0.56)",
        "--au-settings-btn-bg": "#2aa198",
        "--au-settings-btn-hover": "#238a83",
        "--au-modal-overlay": "rgba(0, 30, 38, 0.88)",
        "--au-modal-bg": "linear-gradient(160deg, #063743 0%, #002b36 100%)",
        "--au-modal-title": "#fdf6e3",
        "--au-section-title": "#93a1a1",
        "--au-input-bg": "#042f3a",
        "--au-input-border": "rgba(88, 110, 117, 0.58)",
        "--au-toggle-bg": "#586e75",
        "--au-progress-track": "rgba(0, 30, 38, 0.72)",
        "--au-progress-end": "#b58900",
        "--au-dock-handle-bg":
          "linear-gradient(165deg, rgba(8, 54, 66, 0.96), rgba(0, 43, 54, 0.96))",
        "--au-dock-handle-hover-bg": "rgba(14, 70, 84, 0.95)",
        "--au-dock-handle-hover-border": "rgba(38, 139, 210, 0.62)",
        "--au-dock-panel-bg":
          "linear-gradient(160deg, rgba(7, 58, 71, 0.96), rgba(0, 43, 54, 0.96))",
        "--au-dock-section-border": "rgba(88, 110, 117, 0.4)",
        "--au-dock-title": "#fdf6e3",
        "--au-dock-btn-border": "rgba(42, 161, 152, 0.46)",
        "--au-dock-btn-hover-bg": "rgba(20, 80, 96, 0.94)",
        "--au-dock-btn-hover-border": "rgba(38, 139, 210, 0.62)",
        "--au-dock-btn-active-border": "rgba(181, 137, 0, 0.64)",
        "--au-dock-btn-active-inset": "rgba(42, 161, 152, 0.25)",
        "--au-dock-input-bg": "#032c37",
        "--au-dock-footer": "#8aa0a5",
        "--au-reader-backdrop": "rgba(0, 25, 31, 0.62)",
        "--au-shortcut-bg": "rgba(5, 51, 63, 0.95)",
        "--au-shortcut-border": "rgba(42, 161, 152, 0.5)",
        "--au-shortcut-shadow": "0 12px 30px rgba(0, 23, 28, 0.72)",
        "--au-shortcuts-copy": "#9db0b0",
        "--au-signature-text": "#738f90",
        "--auo-accent": "#2aa198",
        "--auo-accent-strong": "#268bd2",
        "--auo-surface": "#073642",
        "--auo-surface-hover": "#0a4a5a",
        "--auo-text": "#eee8d5",
        "--auo-text-dim": "#93a1a1",
        "--auo-border": "rgba(88, 110, 117, 0.32)",
        "--auo-bg": "#002b36",
        "--auo-header-start": "#1f877f",
        "--auo-nav-hover-bg": "rgba(0, 43, 54, 0.64)",
        "--auo-search-bg": "#002b36",
        "--auo-search-border": "#39565f",
        "--auo-auth-border": "rgba(238, 232, 213, 0.16)",
        "--auo-auth-hover-bg": "#217d77",
        "--auo-card-alt-bg": "#06303b",
        "--auo-link": "#93a1a1",
        "--auo-chapter-bg": "#0b3f4d",
        "--auo-chapter-hover-border": "rgba(38, 139, 210, 0.58)",
        "--auo-on-accent": "#fdf6e3",
        "--au-logo-filter": "hue-rotate(-94deg) saturate(0.95) brightness(1.03)",
      },
    },
  };

  const THEME_PRESET_OPTIONS = Object.entries(THEME_PRESETS).map(
    ([value, preset]) => ({
      value,
      label: preset.label,
    })
  );

  const APPEARANCE_MODAL_SECTION = {
    title: "Appearance",
    selects: [
      {
        key: "themePreset",
        id: "sel-themePreset",
        label: "Theme",
        options: THEME_PRESET_OPTIONS,
      },
    ],
  };

  const CONFIG_META = {
    autoScrollSpeed: { type: "number", min: 0.1, max: 15.0, step: 0.1 },
    imageWidth: { type: "number", min: 400, max: 3000, step: 1 },
    menuSeriesOverhaul: { type: "boolean" },
    readerDockCollapsed: { type: "boolean" },
    readerDockSection: { type: "string" },
    themePreset: { type: "string", options: Object.keys(THEME_PRESETS) },
  };

  const READER_MODAL_SECTION = {
    title: "Reader",
    toggles: [
      ["readerWidget", "Enable Reader Dock"],
      ["showProgressBar", "Show Progress Bar"],
      ["fitWidthMode", "Fit Width to Screen"],
      ["doubleClickScroll", "Double-Click to Scroll"],
    ],
    inputs: [
      {
        key: "imageWidth",
        id: "inp-imageWidth",
        label: "Image Width (px)",
        type: "number",
        step: "1",
      },
      {
        key: "autoScrollSpeed",
        id: "inp-autoScrollSpeed",
        label: "Scroll Speed",
        type: "number",
        step: "0.1",
      },
    ],
  };

  const ConfigStore = {
    sanitize(key, value) {
      const fallback = DEFAULTS[key];
      const meta = CONFIG_META[key] || {};
      const type = meta.type || typeof fallback;

      if (type === "boolean") return !!value;

      if (type === "number") {
        let n = Number(value);
        if (!Number.isFinite(n)) n = Number(fallback || 0);
        if (Number.isFinite(meta.min)) n = Math.max(meta.min, n);
        if (Number.isFinite(meta.max)) n = Math.min(meta.max, n);

        const step = Number(meta.step);
        if (Number.isFinite(step) && step > 0) {
          const decimals = (String(step).split(".")[1] || "").length;
          const factor = Math.pow(10, decimals);
          n = Math.round(n * factor) / factor;
        }
        return n;
      }

      if (type === "string") {
        const str = value === null || value === undefined ? String(fallback || "") : String(value);
        if (Array.isArray(meta.options) && meta.options.length > 0) {
          if (meta.options.includes(str)) return str;
          if (meta.options.includes(String(fallback))) return String(fallback);
          return String(meta.options[0]);
        }
        return str;
      }

      return value === undefined ? fallback : value;
    },

    get(key) {
      const raw = GM_getValue(key, DEFAULTS[key]);
      return this.sanitize(key, raw);
    },

    set(key, value) {
      const clean = this.sanitize(key, value);
      GM_setValue(key, clean);
      return clean;
    },

    toggle(key) {
      const next = !this.get(key);
      this.set(key, next);
      return next;
    },

    getAll() {
      const cfg = {};
      for (const k in DEFAULTS) cfg[k] = this.get(k);
      return cfg;
    },
  };

  const ThemeController = {
    activeThemeKey: DEFAULTS.themePreset,

    resolveTheme(themeKey) {
      const key = ConfigStore.sanitize("themePreset", themeKey);
      const preset = THEME_PRESETS[key] || THEME_PRESETS[DEFAULTS.themePreset];
      return {
        key,
        label: preset.label,
        tokens: {
          ...BASE_THEME_TOKENS,
          ...preset.tokens,
        },
      };
    },

    apply(themeKey) {
      const resolved = this.resolveTheme(themeKey);
      const root = document.documentElement;
      if (!root) return resolved.key;

      Object.entries(resolved.tokens).forEach(([token, value]) => {
        root.style.setProperty(token, value);
      });

      this.activeThemeKey = resolved.key;
      if (document.body) {
        document.body.classList.add("au-theme-enabled");
        document.body.setAttribute("data-au-theme", resolved.key);
      }
      return resolved.key;
    },
  };

  // =============================================================================
  // 2. STYLES
  // =============================================================================
  const CSS = `
    :root {
      --au-accent: #913fe2;
      --au-accent-strong: #6f2598;
      --au-accent-glow: rgba(145, 63, 226, 0.38);
      --au-bg-soft: rgba(21, 19, 31, 0.94);
      --au-bg-panel: #1a1725;
      --au-bg-control: rgba(34, 29, 49, 0.92);
      --au-border: rgba(145, 63, 226, 0.34);
      --au-border-soft: rgba(201, 166, 243, 0.24);
      --au-text: #f5eeff;
      --au-text-dim: #bcabd4;
      --au-shadow: 0 18px 40px rgba(11, 8, 20, 0.55);
      --au-settings-btn-bg: #6f2598;
      --au-settings-btn-hover: #5a1f78;
      --au-modal-overlay: rgba(7, 5, 13, 0.86);
      --au-modal-bg: linear-gradient(160deg, #1b1629 0%, #121019 100%);
      --au-modal-title: #f5eeff;
      --au-section-title: #af95cc;
      --au-input-bg: #130f1f;
      --au-input-border: rgba(165, 130, 208, 0.32);
      --au-toggle-bg: #3b3150;
      --au-progress-track: rgba(9, 7, 14, 0.6);
      --au-progress-end: #b67dff;
      --au-dock-handle-bg: linear-gradient(165deg, rgba(31, 24, 46, 0.96), rgba(19, 15, 30, 0.96));
      --au-dock-handle-hover-bg: rgba(48, 35, 72, 0.96);
      --au-dock-handle-hover-border: rgba(179, 138, 234, 0.62);
      --au-dock-panel-bg: linear-gradient(160deg, rgba(26, 22, 39, 0.96), rgba(18, 15, 29, 0.96));
      --au-dock-section-border: rgba(188, 159, 226, 0.2);
      --au-dock-title: #efe4ff;
      --au-dock-btn-border: rgba(166, 133, 212, 0.38);
      --au-dock-btn-hover-bg: rgba(66, 51, 96, 0.92);
      --au-dock-btn-hover-border: rgba(195, 152, 248, 0.64);
      --au-dock-btn-active-border: rgba(229, 203, 255, 0.4);
      --au-dock-btn-active-inset: rgba(145, 63, 226, 0.25);
      --au-dock-input-bg: #140f20;
      --au-dock-footer: #9f8dbc;
      --au-reader-backdrop: rgba(8, 5, 16, 0.56);
      --au-shortcut-bg: rgba(20, 15, 32, 0.95);
      --au-shortcut-border: rgba(185, 147, 235, 0.45);
      --au-shortcut-shadow: 0 12px 30px rgba(21, 11, 39, 0.55);
      --au-shortcut-text: #fff;
      --au-shortcuts-copy: #b8a6d3;
      --au-signature-text: #907cab;
      --auo-accent: #913fe2;
      --auo-accent-strong: #6f2598;
      --auo-surface: #222222;
      --auo-surface-hover: #343434;
      --auo-text: #d9d9d9;
      --auo-text-dim: #a2a2a2;
      --auo-border: rgba(162, 162, 162, 0.2);
      --auo-bg: #16151d;
      --auo-header-start: #7d33c8;
      --auo-nav-hover-bg: rgba(22, 21, 29, 0.55);
      --auo-nav-hover-text: #fff;
      --auo-search-bg: #16151d;
      --auo-search-border: #2e2a3a;
      --auo-auth-border: rgba(255, 255, 255, 0.12);
      --auo-auth-hover-bg: #5a1f78;
      --auo-auth-hover-border: rgba(255, 255, 255, 0.2);
      --auo-card-alt-bg: #1f1f26;
      --auo-link: #e7deff;
      --auo-chapter-bg: #25252d;
      --auo-chapter-hover-border: rgba(145, 63, 226, 0.45);
      --auo-on-accent: #fff;
      --au-logo-filter: none;
    }

    .au-settings-btn {
      height: 2.5rem;
      padding: 0 1rem;
      background: var(--au-settings-btn-bg);
      color: var(--au-shortcut-text);
      border-radius: 0.5rem;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
      margin-right: 10px;
      border: none;
    }
    .au-settings-btn:hover {
      background: var(--au-settings-btn-hover);
    }

    #au-modal-overlay {
      position: fixed;
      inset: 0;
      background: var(--au-modal-overlay);
      z-index: 99999;
      display: flex;
      justify-content: center;
      align-items: center;
      backdrop-filter: blur(4px);
    }
    #au-modal {
      background: var(--au-modal-bg);
      border: 1px solid var(--au-border);
      border-radius: 12px;
      width: 400px;
      max-width: 92vw;
      max-height: 88vh;
      overflow: auto;
      padding: 22px;
      color: var(--au-text);
      font-family: "Fira Sans", "Segoe UI", sans-serif;
      box-shadow: var(--au-shadow);
    }
    .au-modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 18px;
      border-bottom: 1px solid var(--au-border-soft);
      padding-bottom: 12px;
    }
    .au-modal-title { font-size: 18px; font-weight: 700; color: var(--au-modal-title); }
    .au-close-btn { cursor: pointer; font-size: 24px; color: var(--au-text-dim); line-height: 1; }
    .au-close-btn:hover { color: var(--au-shortcut-text); }
    .au-section { margin-bottom: 18px; }
    .au-section-title {
      font-size: 11px;
      color: var(--au-section-title);
      text-transform: uppercase;
      margin-bottom: 10px;
      font-weight: 700;
      letter-spacing: 0.05em;
    }
    .au-control-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      font-size: 14px;
      color: var(--au-text);
      gap: 10px;
    }
    .au-input-num {
      background: var(--au-input-bg);
      border: 1px solid var(--au-input-border);
      color: var(--au-shortcut-text);
      padding: 5px 8px;
      border-radius: 6px;
      width: 76px;
      text-align: center;
      outline: none;
    }
    .au-input-num:focus { border-color: var(--au-accent); }
    .au-input-select {
      background: var(--au-input-bg);
      border: 1px solid var(--au-input-border);
      color: var(--au-text);
      padding: 5px 8px;
      border-radius: 6px;
      min-width: 150px;
      max-width: 200px;
      outline: none;
    }
    .au-input-select:focus { border-color: var(--au-accent); }
    .au-toggle { position: relative; display: inline-block; width: 42px; height: 22px; flex-shrink: 0; }
    .au-toggle input { opacity: 0; width: 0; height: 0; }
    .au-slider {
      position: absolute;
      cursor: pointer;
      inset: 0;
      background: var(--au-toggle-bg);
      transition: 0.25s;
      border-radius: 34px;
    }
    .au-slider:before {
      position: absolute;
      content: "";
      height: 16px;
      width: 16px;
      left: 3px;
      bottom: 3px;
      background: var(--au-shortcut-text);
      transition: 0.25s;
      border-radius: 50%;
    }
    input:checked + .au-slider { background: var(--au-accent); }
    input:checked + .au-slider:before { transform: translateX(20px); }

    .au-shortcuts-copy {
      font-size: 11px;
      color: var(--au-shortcuts-copy);
      line-height: 1.65;
    }
    .au-modal-signature {
      font-size: 10px;
      color: var(--au-signature-text);
      text-align: center;
    }

    body.au-adblock #header-ads,
    body.au-adblock #main-menu-ads,
    body.au-adblock div[id*="google_ads"],
    body.au-adblock div[class*="adsbygoogle"],
    body.au-adblock button[aria-label="Close promotion"] { display: none !important; pointer-events: none !important; }
    body.au-hide-slider .au-hide-slider-target,
    body.au-hide-toraka .au-hide-toraka-target,
    body.au-hide-comments #disqus_thread,
    body.au-hide-comments .comments-section,
    body.au-hide-comments [class*="comment"],
    body.au-hide-comments [id*="comment"],
    body.au-hide-popular .au-hide-popular-target { display: none !important; }
    body.au-hide-btt button[class*="fixed"][class*="bottom"],
    body.au-hide-btt div[class*="fixed"][class*="bottom"]:has(svg),
    body.au-hide-btt a[class*="scroll-to-top"],
    body.au-hide-btt button:has(svg[class*="chevron-up"]),
    body.au-hide-btt [class*="back-to-top"],
    body.au-hide-btt [id*="back-to-top"] { display: none !important; }
    body.au-compact-sidebar div.float-right { width: 25% !important; }
    body.au-compact-sidebar div.float-right > div { margin: 0 5px !important; }

    html { scroll-behavior: auto !important; }
    .w-full.mx-auto.center img {
      display: block !important;
      width: 100% !important;
      max-width: var(--comic-width, 800px) !important;
      margin: 0 auto !important;
    }
    body.au-fit-width .w-full.mx-auto.center img { max-width: 100% !important; width: auto !important; }

    #au-progress-bar {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 4px;
      background: var(--au-progress-track);
      z-index: 99997;
    }
    #au-progress-bar-fill {
      height: 100%;
      width: 0;
      background: linear-gradient(90deg, var(--au-accent-strong), var(--au-accent), var(--au-progress-end));
      transition: width 0.1s ease-out;
      cursor: pointer;
    }
    #au-progress-bar-fill:hover { height: 8px; margin-top: -2px; }

    #au-reader-dock-shell {
      position: fixed;
      right: 14px;
      top: 50%;
      transform: translateY(-50%);
      display: flex;
      flex-direction: row-reverse;
      align-items: stretch;
      gap: 8px;
      z-index: 99996;
    }
    #au-reader-dock-handle {
      width: 48px;
      min-width: 48px;
      border: 1px solid var(--au-border);
      border-radius: 14px;
      background: var(--au-dock-handle-bg);
      color: var(--au-text);
      backdrop-filter: blur(12px);
      box-shadow: var(--au-shadow);
      cursor: pointer;
      display: grid;
      place-items: center;
      font-size: 18px;
      transition: background 0.2s, border-color 0.2s, transform 0.2s;
    }
    #au-reader-dock-handle:hover {
      background: var(--au-dock-handle-hover-bg);
      border-color: var(--au-dock-handle-hover-border);
      transform: translateX(-1px);
    }
    #au-reader-dock {
      width: 280px;
      max-width: calc(100vw - 90px);
      background: var(--au-dock-panel-bg);
      border: 1px solid var(--au-border);
      border-radius: 16px;
      backdrop-filter: blur(12px);
      box-shadow: var(--au-shadow);
      color: var(--au-text);
      overflow: hidden;
      transition: width 0.25s ease, opacity 0.2s ease, border-color 0.2s ease;
    }
    #au-reader-dock-shell.is-collapsed #au-reader-dock { width: 0; opacity: 0; border-color: transparent; }
    #au-reader-dock-shell.is-scrolling #au-reader-dock { opacity: 0.94; }

    .au-dock-content { padding: 14px; min-width: 280px; box-sizing: border-box; }
    .au-dock-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 1px solid var(--au-border-soft);
    }
    .au-dock-title { font-size: 14px; font-weight: 700; letter-spacing: 0.02em; color: var(--au-dock-title); }
    .au-dock-progress { font-size: 12px; color: var(--au-text-dim); font-variant-numeric: tabular-nums; }
    .au-dock-section {
      margin-bottom: 12px;
      padding-bottom: 10px;
      border-bottom: 1px solid var(--au-dock-section-border);
    }
    .au-dock-section:last-of-type { border-bottom: none; margin-bottom: 6px; padding-bottom: 0; }
    .au-dock-section-label {
      margin-bottom: 8px;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--au-text-dim);
      font-weight: 700;
    }
    .au-dock-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 8px; font-size: 13px; }
    .au-dock-btn,
    .au-dock-nav-btn {
      border: 1px solid var(--au-dock-btn-border);
      border-radius: 8px;
      background: var(--au-bg-control);
      color: var(--au-text);
      cursor: pointer;
      transition: background 0.2s, border-color 0.2s, transform 0.15s;
    }
    .au-dock-btn { padding: 6px 10px; font-size: 12px; min-width: 84px; text-align: center; }
    .au-dock-btn:hover,
    .au-dock-nav-btn:hover { background: var(--au-dock-btn-hover-bg); border-color: var(--au-dock-btn-hover-border); }
    .au-dock-btn.active {
      background: linear-gradient(135deg, var(--au-accent), var(--au-accent-strong));
      border-color: var(--au-dock-btn-active-border);
      color: var(--au-shortcut-text);
      box-shadow: 0 0 0 1px var(--au-dock-btn-active-inset) inset;
    }
    .au-dock-btn:disabled,
    .au-dock-nav-btn:disabled,
    .au-dock-step:disabled,
    .au-dock-num:disabled { opacity: 0.45; cursor: not-allowed; }
    .au-dock-stepper { display: inline-flex; align-items: center; gap: 6px; }
    .au-dock-step {
      width: 28px;
      height: 28px;
      border: 1px solid var(--au-dock-btn-border);
      border-radius: 6px;
      background: var(--au-bg-control);
      color: var(--au-text);
      cursor: pointer;
      font-size: 15px;
      line-height: 1;
    }
    .au-dock-num {
      width: 70px;
      height: 28px;
      border: 1px solid var(--au-dock-btn-border);
      border-radius: 6px;
      background: var(--au-dock-input-bg);
      color: var(--au-text);
      text-align: center;
      font-size: 12px;
      padding: 0 4px;
    }
    .au-dock-nav-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .au-dock-nav-btn { padding: 7px 9px; font-size: 12px; text-align: center; }
    .au-dock-footer { margin-top: 8px; color: var(--au-dock-footer); font-size: 10px; line-height: 1.5; text-align: left; }

    #au-reader-dock-backdrop {
      position: fixed;
      inset: 0;
      background: var(--au-reader-backdrop);
      z-index: 99995;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.2s;
    }
    #au-reader-dock-backdrop.visible { opacity: 1; pointer-events: auto; }

    .au-shortcut-hint {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: var(--au-shortcut-bg);
      color: var(--au-shortcut-text);
      padding: 14px 20px;
      border: 1px solid var(--au-shortcut-border);
      box-shadow: var(--au-shortcut-shadow);
      border-radius: 8px;
      font-size: 15px;
      z-index: 99999;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.2s;
    }
    .au-shortcut-hint.visible { opacity: 1; }

    body.au-theme-enabled header a[href="/"] img[alt*="Asura Logo"],
    body.au-theme-enabled header a[href*="asuracomic.net/"] img[alt*="Asura Logo"],
    body.au-theme-enabled header img[src*="logo_002"],
    body.au-theme-enabled header img[src*="/logo.webp"],
    body.au-theme-enabled footer a[href="/"] img[alt*="Asura Logo"],
    body.au-theme-enabled footer a[href*="asuracomic.net/"] img[alt*="Asura Logo"],
    body.au-theme-enabled footer img[src*="logo_002"],
    body.au-theme-enabled footer img[src*="/logo.webp"] {
      filter: var(--au-logo-filter);
      transition: filter 0.25s ease;
    }

    body.au-theme-enabled .text-themecolor,
    body.au-theme-enabled [class*="text-themecolor"] {
      color: var(--auo-accent) !important;
    }
    body.au-theme-enabled .border-themecolor,
    body.au-theme-enabled [class*="border-themecolor"] {
      border-color: var(--auo-accent) !important;
    }
    body.au-theme-enabled .bg-themecolor,
    body.au-theme-enabled [class*="bg-themecolor"],
    body.au-theme-enabled [class*="data-[state=active]:bg-themecolor"][data-state="active"] {
      background-color: var(--auo-accent-strong) !important;
      color: var(--auo-on-accent) !important;
    }
    body.au-theme-enabled [class*="hover:text-themecolor"]:hover {
      color: var(--auo-accent) !important;
    }
    body.au-theme-enabled .bg-themecolor.text-themecolor,
    body.au-theme-enabled [class*="bg-themecolor"][class*="text-themecolor"],
    body.au-theme-enabled .bg-themecolor .text-themecolor,
    body.au-theme-enabled [class*="bg-themecolor"] [class*="text-themecolor"],
    body.au-theme-enabled [class*="data-[state=active]:bg-themecolor"][data-state="active"] [class*="text-themecolor"] {
      color: var(--auo-on-accent) !important;
    }
    body.au-theme-enabled .bg-themecolor [class*="hover:text-themecolor"]:hover,
    body.au-theme-enabled [class*="bg-themecolor"] [class*="hover:text-themecolor"]:hover {
      color: var(--auo-on-accent) !important;
    }
    body.au-theme-enabled .lucide,
    body.au-theme-enabled [class*="lucide "] {
      stroke: currentColor;
    }
    body.au-theme-enabled .lucide[class*="text-purple-"],
    body.au-theme-enabled [class*="lucide"][class*="text-purple-"],
    body.au-theme-enabled [class*="lucide"][class*="text-[#913FE2]"],
    body.au-theme-enabled [class*="lucide"][class*="text-[#8E3FDD]"],
    body.au-theme-enabled [class*="lucide"][class*="text-[#6F2598]"],
    body.au-theme-enabled [class*="lucide"][class*="text-themecolor"] {
      color: var(--auo-accent) !important;
      stroke: currentColor !important;
    }
    body.au-theme-enabled .lucide[class*="stroke-purple-"],
    body.au-theme-enabled [class*="lucide"][class*="stroke-purple-"],
    body.au-theme-enabled [class*="lucide"][class*="stroke-[#913FE2]"],
    body.au-theme-enabled [class*="lucide"][class*="stroke-[#8E3FDD]"],
    body.au-theme-enabled [class*="lucide"][class*="stroke-[#6F2598]"],
    body.au-theme-enabled [class*="lucide"][class*="stroke-themecolor"] {
      stroke: var(--auo-accent) !important;
    }
    body.au-theme-enabled .bg-themecolor .lucide,
    body.au-theme-enabled [class*="bg-themecolor"] .lucide,
    body.au-theme-enabled [class*="data-[state=active]:bg-themecolor"][data-state="active"] .lucide {
      color: var(--auo-on-accent) !important;
      stroke: currentColor !important;
    }
    body.au-theme-enabled [class*="scrollbar-thumb-themecolor"] {
      scrollbar-color: var(--auo-accent) transparent;
    }
    body.au-theme-enabled [class*="scrollbar-thumb-themecolor"]::-webkit-scrollbar-thumb {
      background-color: var(--auo-accent);
    }

    body.au-theme-enabled:is(.au-page-series, .au-page-reader) [class*="bg-[#222222]"],
    body.au-theme-enabled:is(.au-page-series, .au-page-reader) [class~="bg-[#222]"],
    body.au-theme-enabled:is(.au-page-series, .au-page-reader) .bg-comments-background,
    body.au-theme-enabled:is(.au-page-series, .au-page-reader) .bg-secondarybackground {
      background: var(--auo-surface) !important;
    }
    body.au-theme-enabled:is(.au-page-series, .au-page-reader) [class~="bg-[#333]"],
    body.au-theme-enabled:is(.au-page-series, .au-page-reader) [class*="bg-[#343434]"],
    body.au-theme-enabled:is(.au-page-series, .au-page-reader) [class*="hover:bg-[#343434]"]:hover {
      background: var(--auo-surface-hover) !important;
    }
    body.au-theme-enabled:is(.au-page-series, .au-page-reader) [class~="bg-[#8E3FDD]"],
    body.au-theme-enabled:is(.au-page-series, .au-page-reader) [class~="bg-[#913FE2]"],
    body.au-theme-enabled:is(.au-page-series, .au-page-reader) [class~="bg-[#6F2598]"],
    body.au-theme-enabled:is(.au-page-series, .au-page-reader) [class~="bg-[#7928ca]"],
    body.au-theme-enabled:is(.au-page-series, .au-page-reader) [class~="bg-[#9333ea]"],
    body.au-theme-enabled:is(.au-page-series, .au-page-reader) .bg-primary {
      background: var(--auo-accent) !important;
      color: var(--auo-on-accent) !important;
    }
    body.au-theme-enabled:is(.au-page-series, .au-page-reader) [class~="bg-[#9333ea]/10"],
    body.au-theme-enabled:is(.au-page-series, .au-page-reader) [class~="bg-purple-500/10"],
    body.au-theme-enabled:is(.au-page-series, .au-page-reader) [class~="hover:bg-[#9333ea]/10"]:hover,
    body.au-theme-enabled:is(.au-page-series, .au-page-reader) [class~="hover:bg-purple-800/50"]:hover {
      background: var(--au-accent-glow) !important;
    }
    body.au-theme-enabled:is(.au-page-series, .au-page-reader) [class~="hover:bg-[#5a1f78]"]:hover,
    body.au-theme-enabled:is(.au-page-series, .au-page-reader) [class~="hover:bg-[#7928ca]"]:hover,
    body.au-theme-enabled:is(.au-page-series, .au-page-reader) [class~="hover:bg-purple-700"]:hover,
    body.au-theme-enabled:is(.au-page-series, .au-page-reader) [class~="hover:bg-primary/90"]:hover {
      background: var(--auo-accent-strong) !important;
      color: var(--auo-on-accent) !important;
    }
    body.au-theme-enabled:is(.au-page-series, .au-page-reader) [class~="bg-[#8E3FDD]"] [class~="text-white"],
    body.au-theme-enabled:is(.au-page-series, .au-page-reader) [class~="bg-[#913FE2]"] [class~="text-white"],
    body.au-theme-enabled:is(.au-page-series, .au-page-reader) [class~="bg-[#6F2598]"] [class~="text-white"],
    body.au-theme-enabled:is(.au-page-series, .au-page-reader) [class~="bg-[#7928ca]"] [class~="text-white"],
    body.au-theme-enabled:is(.au-page-series, .au-page-reader) [class~="bg-[#9333ea]"] [class~="text-white"],
    body.au-theme-enabled:is(.au-page-series, .au-page-reader) .bg-primary [class~="text-white"],
    body.au-theme-enabled:is(.au-page-series, .au-page-reader) [class~="bg-[#8E3FDD]"] [class~="text-[#f5f5f5]"],
    body.au-theme-enabled:is(.au-page-series, .au-page-reader) [class~="bg-[#913FE2]"] [class~="text-[#f5f5f5]"],
    body.au-theme-enabled:is(.au-page-series, .au-page-reader) [class~="bg-[#6F2598]"] [class~="text-[#f5f5f5]"],
    body.au-theme-enabled:is(.au-page-series, .au-page-reader) [class~="bg-[#7928ca]"] [class~="text-[#f5f5f5]"],
    body.au-theme-enabled:is(.au-page-series, .au-page-reader) [class~="bg-[#9333ea]"] [class~="text-[#f5f5f5]"],
    body.au-theme-enabled:is(.au-page-series, .au-page-reader) .bg-primary [class~="text-[#f5f5f5]"] {
      color: var(--auo-on-accent) !important;
    }
    body.au-theme-enabled:is(.au-page-series, .au-page-reader) [class*="border-[#312f40]"],
    body.au-theme-enabled:is(.au-page-series, .au-page-reader) [class*="border-[#A2A2A2]/20"],
    body.au-theme-enabled:is(.au-page-series, .au-page-reader) [class~="border-[#383838]"],
    body.au-theme-enabled:is(.au-page-series, .au-page-reader) [class~="border-[#888]"],
    body.au-theme-enabled:is(.au-page-series, .au-page-reader) [class*="border-b-[#A2A2A2]/20"],
    body.au-theme-enabled:is(.au-page-series, .au-page-reader) [class*="border-t-[#A2A2A2]/20"],
    body.au-theme-enabled:is(.au-page-series, .au-page-reader) [class*="border-zinc-700"],
    body.au-theme-enabled:is(.au-page-series, .au-page-reader) [class*="border-zinc-800"],
    body.au-theme-enabled:is(.au-page-series, .au-page-reader) [class*="divide-zinc-800/30"] {
      border-color: var(--auo-border) !important;
    }
    body.au-theme-enabled:is(.au-page-series, .au-page-reader) [class~="text-[#A2A2A2]"],
    body.au-theme-enabled:is(.au-page-series, .au-page-reader) [class~="text-[#9ca3af]"],
    body.au-theme-enabled:is(.au-page-series, .au-page-reader) [class~="text-[#9B9B9B]"],
    body.au-theme-enabled:is(.au-page-series, .au-page-reader) [class~="text-[#999]"],
    body.au-theme-enabled:is(.au-page-series, .au-page-reader) [class~="text-[#999999]"],
    body.au-theme-enabled:is(.au-page-series, .au-page-reader) [class~="text-[#888]"],
    body.au-theme-enabled:is(.au-page-series, .au-page-reader) [class~="text-zinc-300"],
    body.au-theme-enabled:is(.au-page-series, .au-page-reader) [class~="text-zinc-400"],
    body.au-theme-enabled:is(.au-page-series, .au-page-reader) [class~="text-zinc-600"],
    body.au-theme-enabled:is(.au-page-series, .au-page-reader) .text-muted-foreground {
      color: var(--auo-text-dim) !important;
    }
    body.au-theme-enabled:is(.au-page-series, .au-page-reader) [class~="text-[#D9D9D9]"],
    body.au-theme-enabled:is(.au-page-series, .au-page-reader) [class~="text-[#DDDDDD]"],
    body.au-theme-enabled:is(.au-page-series, .au-page-reader) [class~="text-[#f5f5f5]"],
    body.au-theme-enabled:is(.au-page-series, .au-page-reader) [class~="text-[#fff]"],
    body.au-theme-enabled:is(.au-page-series, .au-page-reader) [class~="text-white"],
    body.au-theme-enabled:is(.au-page-series, .au-page-reader) [class~="text-zinc-100"],
    body.au-theme-enabled:is(.au-page-series, .au-page-reader) [class~="text-zinc-200"] {
      color: var(--auo-text) !important;
    }
    body.au-theme-enabled:is(.au-page-series, .au-page-reader) [class~="text-[#913FE2]"],
    body.au-theme-enabled:is(.au-page-series, .au-page-reader) [class~="text-[#8E3FDD]"],
    body.au-theme-enabled:is(.au-page-series, .au-page-reader) [class~="text-[#6F2598]"],
    body.au-theme-enabled:is(.au-page-series, .au-page-reader) [class~="text-[#7928ca]"],
    body.au-theme-enabled:is(.au-page-series, .au-page-reader) [class~="text-[#9333ea]"] {
      color: var(--auo-accent) !important;
    }
    body.au-theme-enabled:is(.au-page-series, .au-page-reader) [class~="hover:text-[#7928ca]"]:hover,
    body.au-theme-enabled:is(.au-page-series, .au-page-reader) [class~="hover:text-[#9333ea]"]:hover {
      color: var(--auo-accent) !important;
    }
    body.au-theme-enabled:is(.au-page-series, .au-page-reader) [class~="placeholder:text-[#a2a2a2c7]"]::placeholder {
      color: var(--auo-text-dim) !important;
    }
    body.au-theme-enabled:is(.au-page-series, .au-page-reader) [class~="stroke-[#913FE2]"],
    body.au-theme-enabled:is(.au-page-series, .au-page-reader) [class~="stroke-[#8E3FDD]"],
    body.au-theme-enabled:is(.au-page-series, .au-page-reader) [class~="stroke-[#6F2598]"] {
      stroke: var(--auo-accent) !important;
    }

    body.au-theme-enabled .au-overhaul-header {
      background: linear-gradient(180deg, var(--auo-header-start) 0%, var(--auo-accent-strong) 100%) !important;
      border-bottom: 1px solid var(--auo-border);
      box-shadow: 0 10px 24px rgba(14, 9, 25, 0.38);
    }
    body.au-menu-series-overhaul .au-overhaul-header-inner {
      gap: 0.9rem;
      padding-top: 0.25rem;
      padding-bottom: 0.25rem;
    }
    body.au-menu-series-overhaul .au-overhaul-nav-link {
      border-radius: 0.375rem;
      transition: background-color 0.2s, color 0.2s;
    }
    body.au-theme-enabled .au-overhaul-nav-link:hover {
      background: var(--auo-nav-hover-bg) !important;
      color: var(--auo-nav-hover-text) !important;
    }
    body.au-theme-enabled .au-overhaul-search {
      background: var(--auo-search-bg) !important;
      border-color: var(--auo-search-border) !important;
      box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.15) inset;
    }
    body.au-theme-enabled .au-overhaul-search:focus {
      border-color: var(--auo-accent) !important;
      box-shadow: 0 0 0 2px var(--au-accent-glow);
    }
    body.au-theme-enabled .au-overhaul-auth-btn {
      background: var(--auo-accent-strong) !important;
      border: 1px solid var(--auo-auth-border) !important;
      box-shadow: none !important;
    }
    body.au-theme-enabled .au-overhaul-auth-btn:hover {
      background: var(--auo-auth-hover-bg) !important;
      border-color: var(--auo-auth-hover-border) !important;
    }

    body.au-theme-enabled.au-page-series .au-series-breadcrumb,
    body.au-theme-enabled.au-page-series .au-series-card,
    body.au-theme-enabled.au-page-series .au-series-chapters,
    body.au-theme-enabled.au-page-series .au-series-comments,
    body.au-theme-enabled.au-page-series .au-series-related {
      border: 1px solid var(--auo-border);
      background: var(--auo-surface);
    }
    body.au-theme-enabled.au-page-series .au-series-breadcrumb {
      background: var(--auo-card-alt-bg);
    }
    body.au-theme-enabled.au-page-series .au-series-card,
    body.au-theme-enabled.au-page-series .au-series-synopsis,
    body.au-theme-enabled.au-page-series .au-series-chapter-row h3 {
      color: var(--auo-text);
    }
    body.au-theme-enabled.au-page-series .au-series-synopsis {
      border-top: 1px solid var(--auo-border);
      border-bottom: 1px solid var(--auo-border);
    }
    body.au-theme-enabled.au-page-series .au-series-meta {
      color: var(--auo-text-dim);
    }
    body.au-theme-enabled.au-page-series .au-series-meta a,
    body.au-theme-enabled.au-page-series .au-series-synopsis a {
      color: var(--auo-link);
    }
    body.au-theme-enabled.au-page-series .au-series-chapter-row {
      border-color: var(--auo-border) !important;
      background: var(--auo-chapter-bg);
      transition: background-color 0.18s, border-color 0.18s, transform 0.12s;
    }
    body.au-theme-enabled.au-page-series .au-series-chapter-row:hover {
      background: var(--auo-surface-hover) !important;
      border-color: var(--auo-chapter-hover-border) !important;
    }

    body.au-menu-series-overhaul.au-page-series .au-series-breadcrumb,
    body.au-menu-series-overhaul.au-page-series .au-series-card,
    body.au-menu-series-overhaul.au-page-series .au-series-chapters,
    body.au-menu-series-overhaul.au-page-series .au-series-comments,
    body.au-menu-series-overhaul.au-page-series .au-series-related {
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 10px 28px rgba(11, 8, 16, 0.24);
    }
    body.au-menu-series-overhaul.au-page-series .au-series-synopsis {
      line-height: 1.65;
    }
    body.au-menu-series-overhaul.au-page-series .au-series-chapters {
      margin-top: 0.5rem;
    }
    body.au-menu-series-overhaul.au-page-series .au-series-chapter-row:hover {
      transform: translateY(-1px);
    }

    @media (max-width: 900px) {
      #au-reader-dock-shell {
        top: 0;
        right: 0;
        transform: none;
        width: 100%;
        height: 100vh;
        pointer-events: none;
        align-items: flex-start;
      }
      #au-reader-dock-handle {
        pointer-events: auto;
        margin-top: calc(50vh - 24px);
        margin-right: 8px;
        border-radius: 12px;
      }
      #au-reader-dock {
        position: fixed;
        right: 8px;
        top: 8px;
        bottom: 8px;
        width: min(320px, 84vw);
        max-width: min(320px, 84vw);
        border-radius: 14px;
        overflow: auto;
        pointer-events: auto;
        transition: transform 0.25s ease, opacity 0.2s ease;
      }
      #au-reader-dock-shell.is-collapsed #au-reader-dock {
        width: min(320px, 84vw);
        transform: translateX(calc(100% + 12px));
        opacity: 0;
      }
      #au-reader-dock-shell:not(.is-collapsed) #au-reader-dock {
        transform: translateX(0);
        opacity: 1;
      }
      .au-dock-content { min-width: 0; }
    }
  `;
  // =============================================================================
  // 3. VIEWS
  // =============================================================================
  class SettingsModalView {
    constructor(onConfigChanged) {
      this.onConfigChanged = onConfigChanged;
      this.modalOpen = false;
    }

    createHeaderButton() {
      if (document.getElementById("au-settings-btn-main")) return;

      const profileLinks = document.querySelectorAll(
        'header a[href*="/login"], header a[href*="/dashboard"]'
      );
      if (profileLinks.length === 0) return;

      const targetAnchor =
        Array.from(profileLinks).find((el) => el.offsetParent !== null) ||
        profileLinks[0];
      const container =
        targetAnchor.closest('div[style*="width: auto"]') ||
        targetAnchor.parentElement;
      if (!container || !container.parentNode) return;

      const btn = document.createElement("button");
      btn.id = "au-settings-btn-main";
      btn.className = "au-settings-btn";
      btn.innerHTML =
        '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path><circle cx="12" cy="12" r="3"></circle></svg>';
      btn.onclick = (e) => {
        e.preventDefault();
        this.toggleModal();
      };

      container.parentNode.insertBefore(btn, container);
    }

    toggleModal() {
      const existing = document.getElementById("au-modal-overlay");
      if (existing) {
        existing.remove();
        this.modalOpen = false;
      } else {
        this.renderModal();
        this.modalOpen = true;
      }
    }

    renderModal() {
      const cfg = ConfigStore.getAll();
      const overlay = document.createElement("div");
      overlay.id = "au-modal-overlay";

      const sections = [
        {
          title: "General",
          toggles: [
            ["adBlock", "Ad Blocker"],
            ["hideSlider", "Hide Home Slider"],
            ["hideToraka", "Hide Toraka Promo"],
            ["hideComments", "Hide Comments Section"],
            ["hideDefaultBackToTop", "Hide Site's Back-to-Top"],
          ],
        },
        {
          title: "Layout",
          toggles: [
            ["compactSidebar", "Compact Sidebar"],
            ["hidePopularSection", "Hide Popular Section"],
            ["menuSeriesOverhaul", "Overhaul Main Menu + Series Page"],
          ],
        },
        APPEARANCE_MODAL_SECTION,
        READER_MODAL_SECTION,
      ];

      const sectionHtml = sections
        .map((section) => {
          const toggles = (section.toggles || [])
            .map(([key, label]) => this.toggleHTML(key, label, cfg[key]))
            .join("");

          const inputs = (section.inputs || [])
            .map((input) => {
              const isDisabled =
                input.key === "imageWidth" && !!cfg.fitWidthMode;
              return `
                <div class="au-control-row">
                  <span>${input.label}</span>
                  <input
                    type="${input.type}"
                    id="${input.id}"
                    class="au-input-num"
                    data-key="${input.key}"
                    step="${input.step || "1"}"
                    value="${cfg[input.key]}"
                    ${isDisabled ? 'disabled style="opacity:0.5"' : ""}
                  >
                </div>
              `;
            })
            .join("");

          const selects = (section.selects || [])
            .map((select) => {
              const options = (select.options || [])
                .map((opt) => {
                  const value = typeof opt === "string" ? opt : opt.value;
                  const label = typeof opt === "string" ? opt : opt.label;
                  const selected = String(cfg[select.key]) === String(value);
                  return `<option value="${value}" ${selected ? "selected" : ""}>${label}</option>`;
                })
                .join("");

              return `
                <div class="au-control-row">
                  <span>${select.label}</span>
                  <select id="${select.id}" class="au-input-select" data-key="${select.key}">
                    ${options}
                  </select>
                </div>
              `;
            })
            .join("");

          return `
            <div class="au-section">
              <div class="au-section-title">${section.title}</div>
              ${toggles}
              ${selects}
              ${inputs}
            </div>
          `;
        })
        .join("");

      overlay.innerHTML = `
        <div id="au-modal">
          <div class="au-modal-header">
            <span class="au-modal-title">Asura Utils Settings</span>
            <span class="au-close-btn">&times;</span>
          </div>
          ${sectionHtml}
          <div class="au-section">
            <div class="au-section-title">Keyboard Shortcuts</div>
            <div class="au-shortcuts-copy">
              <b>Reader:</b> S (scroll), Q/E or +/- (speed), A/D or Arrows/PgUp/PgDn (nav), B (back to series), W (fit width toggle)<br>
              <b>Series Page:</b> C (search), L (chapter list)
            </div>
          </div>
          <div class="au-modal-signature">By Rocks</div>
        </div>
      `;

      document.body.appendChild(overlay);

      const close = () => {
        overlay.remove();
        this.modalOpen = false;
      };

      const closeBtn = overlay.querySelector(".au-close-btn");
      if (closeBtn) closeBtn.onclick = close;

      overlay.onclick = (e) => {
        if (e.target === overlay) close();
      };

      overlay.querySelectorAll(".au-toggle input").forEach((input) => {
        input.onchange = (e) => {
          const key = e.target.getAttribute("data-key");
          const value = !!e.target.checked;
          ConfigStore.set(key, value);
          this.onConfigChanged(key, value);

          if (key === "fitWidthMode") {
            const widthInput = overlay.querySelector("#inp-imageWidth");
            if (widthInput) {
              widthInput.disabled = value;
              widthInput.style.opacity = value ? "0.5" : "1";
            }
          }
        };
      });

      overlay.querySelectorAll(".au-input-num[data-key]").forEach((input) => {
        input.onchange = (e) => {
          const key = e.target.getAttribute("data-key");
          const value = ConfigStore.set(key, e.target.value);
          e.target.value = String(value);
          this.onConfigChanged(key, value);
        };
      });

      overlay.querySelectorAll(".au-input-select[data-key]").forEach((select) => {
        select.onchange = (e) => {
          const key = e.target.getAttribute("data-key");
          const value = ConfigStore.set(key, e.target.value);
          e.target.value = String(value);
          this.onConfigChanged(key, value);
        };
      });
    }

    toggleHTML(key, label, checked) {
      return `
        <div class="au-control-row">
          <span>${label}</span>
          <label class="au-toggle">
            <input type="checkbox" data-key="${key}" ${checked ? "checked" : ""}>
            <span class="au-slider"></span>
          </label>
        </div>
      `;
    }
  }

  class ProgressBarView {
    constructor() {
      this.boundClick = null;
    }

    mount() {
      if (document.getElementById("au-progress-bar")) return;
      const bar = document.createElement("div");
      bar.id = "au-progress-bar";
      bar.innerHTML = '<div id="au-progress-bar-fill"></div>';
      document.body.appendChild(bar);

      this.boundClick = (e) => {
        const rect = bar.getBoundingClientRect();
        const pct = rect.width > 0 ? (e.clientX - rect.left) / rect.width : 0;
        const clamped = Math.max(0, Math.min(1, pct));
        const maxScroll = Math.max(1, document.body.scrollHeight - window.innerHeight);
        window.scrollTo({ top: clamped * maxScroll, behavior: "smooth" });
      };
      bar.addEventListener("click", this.boundClick);
    }

    update(progressPct) {
      const fill = document.getElementById("au-progress-bar-fill");
      if (!fill) return;
      const pct = Math.max(0, Math.min(100, Number(progressPct) || 0));
      fill.style.width = `${pct}%`;
    }

    unmount() {
      const bar = document.getElementById("au-progress-bar");
      if (!bar) return;
      if (this.boundClick) bar.removeEventListener("click", this.boundClick);
      bar.remove();
      this.boundClick = null;
    }
  }

  class ReaderDockView {
    constructor(onCollapsedChange) {
      this.onCollapsedChange = onCollapsedChange;
      this.shell = null;
      this.panel = null;
      this.backdrop = null;
      this.collapsed = true;
      this.actions = null;
      this.onResize = this.handleResize.bind(this);
    }

    isMounted() {
      return !!document.getElementById("au-reader-dock-shell");
    }

    isMobile() {
      return window.matchMedia("(max-width: 900px)").matches;
    }

    mount(actions) {
      this.actions = actions;

      if (this.isMounted()) {
        this.shell = document.getElementById("au-reader-dock-shell");
        this.panel = document.getElementById("au-reader-dock");
        this.backdrop = document.getElementById("au-reader-dock-backdrop");
        return;
      }

      const shell = document.createElement("div");
      shell.id = "au-reader-dock-shell";
      shell.className = "is-collapsed";
      shell.innerHTML = `
        <button id="au-reader-dock-handle" type="button" aria-label="Toggle reader dock">|||</button>
        <aside id="au-reader-dock" aria-label="Reader controls">
          <div class="au-dock-content">
            <div class="au-dock-header">
              <div class="au-dock-title">Reader Tools</div>
              <div id="au-dock-progress" class="au-dock-progress">0%</div>
            </div>

            <div class="au-dock-section">
              <div class="au-dock-section-label">Auto Scroll</div>
              <div class="au-dock-row">
                <span>Status</span>
                <button id="au-dock-scroll-btn" class="au-dock-btn" type="button">Start (S)</button>
              </div>
              <div class="au-dock-row">
                <span>Speed</span>
                <div class="au-dock-stepper">
                  <button id="au-dock-speed-dec" class="au-dock-step" type="button">-</button>
                  <input id="au-dock-speed-input" class="au-dock-num" type="number" step="0.1">
                  <button id="au-dock-speed-inc" class="au-dock-step" type="button">+</button>
                </div>
              </div>
            </div>

            <div class="au-dock-section">
              <div class="au-dock-section-label">Layout</div>
              <div class="au-dock-row">
                <span>Fit Width</span>
                <button id="au-dock-fit-btn" class="au-dock-btn" type="button">Off (W)</button>
              </div>
              <div class="au-dock-row">
                <span>Width</span>
                <div class="au-dock-stepper">
                  <button id="au-dock-width-dec" class="au-dock-step" type="button">-</button>
                  <input id="au-dock-width-input" class="au-dock-num" type="number" step="1">
                  <button id="au-dock-width-inc" class="au-dock-step" type="button">+</button>
                </div>
              </div>
            </div>

            <div class="au-dock-section">
              <div class="au-dock-section-label">Navigation</div>
              <div class="au-dock-nav-grid">
                <button id="au-dock-prev" class="au-dock-nav-btn" type="button">Prev (A)</button>
                <button id="au-dock-next" class="au-dock-nav-btn" type="button">Next (D)</button>
                <button id="au-dock-series" class="au-dock-nav-btn" type="button">Series (B)</button>
                <button id="au-dock-top" class="au-dock-nav-btn" type="button">Top</button>
              </div>
            </div>

            <div class="au-dock-footer">
              Keys: S Q/E +/- A/D Arrows PgUp/PgDn B W<br>
              Double-click toggles auto-scroll
            </div>
          </div>
        </aside>
      `;

      const backdrop = document.createElement("div");
      backdrop.id = "au-reader-dock-backdrop";

      document.body.appendChild(backdrop);
      document.body.appendChild(shell);

      this.shell = shell;
      this.panel = shell.querySelector("#au-reader-dock");
      this.backdrop = backdrop;

      this.bindEvents();
      window.addEventListener("resize", this.onResize, { passive: true });
    }

    bindEvents() {
      if (!this.shell || !this.actions) return;

      const byId = (id) => this.shell.querySelector(`#${id}`);
      const handle = byId("au-reader-dock-handle");
      const scrollBtn = byId("au-dock-scroll-btn");
      const speedDec = byId("au-dock-speed-dec");
      const speedInc = byId("au-dock-speed-inc");
      const speedInput = byId("au-dock-speed-input");
      const widthDec = byId("au-dock-width-dec");
      const widthInc = byId("au-dock-width-inc");
      const widthInput = byId("au-dock-width-input");
      const fitBtn = byId("au-dock-fit-btn");
      const prevBtn = byId("au-dock-prev");
      const nextBtn = byId("au-dock-next");
      const seriesBtn = byId("au-dock-series");
      const topBtn = byId("au-dock-top");

      if (handle) handle.onclick = () => this.setCollapsed(!this.collapsed, true);
      if (scrollBtn) scrollBtn.onclick = () => this.actions.toggleScroll();
      if (speedDec) speedDec.onclick = () => this.actions.stepSpeed(-CONSTANTS.SPEED_STEP);
      if (speedInc) speedInc.onclick = () => this.actions.stepSpeed(CONSTANTS.SPEED_STEP);

      if (speedInput) {
        speedInput.onkeydown = (e) => e.stopPropagation();
        speedInput.onchange = (e) => this.actions.setSpeed(e.target.value);
      }

      if (widthDec) widthDec.onclick = () => this.actions.stepWidth(-100);
      if (widthInc) widthInc.onclick = () => this.actions.stepWidth(100);
      if (widthInput) {
        widthInput.onkeydown = (e) => e.stopPropagation();
        widthInput.onchange = (e) => this.actions.setWidth(e.target.value);
      }
      if (fitBtn) fitBtn.onclick = () => this.actions.toggleFitWidth();

      const mobileClose = () => {
        if (this.isMobile()) this.setCollapsed(true, true);
      };
      if (prevBtn) prevBtn.onclick = () => { this.actions.navigate("prev"); mobileClose(); };
      if (nextBtn) nextBtn.onclick = () => { this.actions.navigate("next"); mobileClose(); };
      if (seriesBtn) seriesBtn.onclick = () => { this.actions.goSeries(); mobileClose(); };
      if (topBtn) topBtn.onclick = () => { this.actions.goTop(); mobileClose(); };
      if (this.backdrop) this.backdrop.onclick = () => this.setCollapsed(true, true);
    }

    handleResize() {
      this.updateBackdropState();
    }

    setCollapsed(value, persist) {
      this.collapsed = !!value;
      if (this.shell) this.shell.classList.toggle("is-collapsed", this.collapsed);
      this.updateBackdropState();
      if (persist) ConfigStore.set("readerDockCollapsed", this.collapsed);
      if (this.onCollapsedChange) this.onCollapsedChange(this.collapsed);
    }

    updateBackdropState() {
      if (!this.backdrop) return;
      const show = this.isMobile() && !this.collapsed;
      this.backdrop.classList.toggle("visible", show);
    }

    sync(state) {
      if (!this.shell) return;

      const byId = (id) => this.shell.querySelector(`#${id}`);
      const progress = byId("au-dock-progress");
      const scrollBtn = byId("au-dock-scroll-btn");
      const speedInput = byId("au-dock-speed-input");
      const widthInput = byId("au-dock-width-input");
      const fitBtn = byId("au-dock-fit-btn");
      const prevBtn = byId("au-dock-prev");
      const nextBtn = byId("au-dock-next");
      const seriesBtn = byId("au-dock-series");
      const widthDec = byId("au-dock-width-dec");
      const widthInc = byId("au-dock-width-inc");

      if (progress) progress.textContent = `${state.progress}%`;
      if (scrollBtn) {
        scrollBtn.textContent = state.isScrolling ? "Stop (S)" : "Start (S)";
        scrollBtn.classList.toggle("active", state.isScrolling);
      }
      if (speedInput) speedInput.value = String(state.speed);
      if (widthInput) widthInput.value = String(state.width);
      if (fitBtn) {
        fitBtn.textContent = state.fitWidth ? "On (W)" : "Off (W)";
        fitBtn.classList.toggle("active", state.fitWidth);
      }

      const widthDisabled = !!state.fitWidth;
      if (widthInput) widthInput.disabled = widthDisabled;
      if (widthDec) widthDec.disabled = widthDisabled;
      if (widthInc) widthInc.disabled = widthDisabled;
      if (prevBtn) prevBtn.disabled = !state.canPrev;
      if (nextBtn) nextBtn.disabled = !state.canNext;
      if (seriesBtn) seriesBtn.disabled = !state.hasSeries;
      if (this.shell) this.shell.classList.toggle("is-scrolling", !!state.isScrolling);
    }

    unmount() {
      if (this.shell) this.shell.remove();
      if (this.backdrop) this.backdrop.remove();
      this.shell = null;
      this.panel = null;
      this.backdrop = null;
      this.actions = null;
      window.removeEventListener("resize", this.onResize);
    }
  }

  // =============================================================================
  // 4. READER CONTROLLER
  // =============================================================================
  class ReaderController {
    constructor(onStateChange, onHint) {
      this.onStateChange = onStateChange;
      this.onHint = onHint;
      this.state = {
        isScrolling: false,
        accumulatedScroll: 0,
        rafId: 0,
        speed: ConfigStore.get("autoScrollSpeed"),
        width: ConfigStore.get("imageWidth"),
      };
    }

    start() {
      this.state.speed = ConfigStore.get("autoScrollSpeed");
      this.state.width = ConfigStore.get("imageWidth");
      this.applyWidth();
      this.emitState();
    }

    stop() {
      this.stopScroll();
      this.state.accumulatedScroll = 0;
      this.emitState();
    }

    stopScroll() {
      this.state.isScrolling = false;
      if (this.state.rafId) {
        cancelAnimationFrame(this.state.rafId);
        this.state.rafId = 0;
      }
    }

    toggleScroll() {
      this.state.isScrolling = !this.state.isScrolling;
      if (this.state.isScrolling) {
        this.scrollLoop();
      } else {
        this.stopScroll();
      }
      this.emitState();
    }

    scrollLoop() {
      if (!this.state.isScrolling) return;

      const scale = this.state.width / CONSTANTS.BASE_WIDTH;
      this.state.accumulatedScroll += (this.state.speed / 2) * scale;
      const step = Math.floor(this.state.accumulatedScroll);

      if (step >= 1) {
        window.scrollBy(0, step);
        this.state.accumulatedScroll -= step;
      }

      this.state.rafId = requestAnimationFrame(() => this.scrollLoop());
    }

    setSpeed(value) {
      const speed = ConfigStore.set("autoScrollSpeed", value);
      this.state.speed = speed;
      this.emitState();
      return speed;
    }

    stepSpeed(delta) {
      return this.setSpeed(this.state.speed + delta);
    }

    setWidth(value) {
      if (ConfigStore.get("fitWidthMode")) {
        this.emitState();
        return this.state.width;
      }
      const width = ConfigStore.set("imageWidth", value);
      this.state.width = width;
      this.applyWidth();
      this.emitState();
      return width;
    }

    stepWidth(delta) {
      return this.setWidth(this.state.width + delta);
    }

    applyWidth() {
      document.documentElement.style.setProperty(
        "--comic-width",
        `${this.state.width}px`
      );
    }

    getProgress() {
      const maxScroll = Math.max(1, document.body.scrollHeight - window.innerHeight);
      const pct = Math.round((window.scrollY / maxScroll) * 100);
      return Math.max(0, Math.min(100, pct));
    }

    findSeriesLink() {
      return document.querySelector('a[href*="/series/"]:not([href*="/chapter/"])');
    }

    hasSeriesLink() {
      return !!this.findSeriesLink();
    }

    getChapterNavTarget(direction) {
      const keyword = direction === "next" ? "next" : "prev";
      const links = Array.from(document.querySelectorAll("a"));

      const direct = links.find((a) => {
        if (!a.href || !a.href.includes("/chapter/")) return false;
        const txt = (a.textContent || "").trim().toLowerCase();
        return txt.includes(keyword);
      });
      if (direct) return direct;

      const fallback = links.find((a) => {
        const txt = (a.textContent || "").trim().toLowerCase();
        return txt.includes(keyword);
      });
      return fallback || null;
    }

    canNavigate(direction) {
      return !!this.getChapterNavTarget(direction);
    }

    navigate(direction) {
      const target = this.getChapterNavTarget(direction);
      if (!target) {
        this.emitState();
        return false;
      }
      target.click();
      return true;
    }

    goSeries() {
      const seriesLink = this.findSeriesLink();
      if (!seriesLink) {
        this.emitState();
        return false;
      }
      window.location.href = seriesLink.href;
      return true;
    }

    goTop() {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }

    toggleFitWidth() {
      const next = ConfigStore.toggle("fitWidthMode");
      document.body.classList.toggle("au-fit-width", next);
      this.onHint(next ? "Fit Width: ON" : "Fit Width: OFF");
      this.emitState();
      return next;
    }

    getStateSnapshot() {
      return {
        isScrolling: this.state.isScrolling,
        speed: this.state.speed,
        width: this.state.width,
        fitWidth: ConfigStore.get("fitWidthMode"),
        progress: this.getProgress(),
        canPrev: this.canNavigate("prev"),
        canNext: this.canNavigate("next"),
        hasSeries: this.hasSeriesLink(),
      };
    }

    emitState() {
      if (this.onStateChange) this.onStateChange(this.getStateSnapshot());
    }
  }

  // =============================================================================
  // 5. PAGE CONTROLLER
  // =============================================================================
  const PageController = {
    settingsView: null,
    progressBarView: null,
    dockView: null,
    reader: null,
    observer: null,
    debounceTimer: null,
    hintTimer: null,
    globalListenersBound: false,
    readerMounted: false,
    pageContext: { isReader: false, isSeriesPage: false, isSeriesListing: false },

    init() {
      GM_addStyle(CSS);

      this.settingsView = new SettingsModalView((key) =>
        this.handleConfigChanged(key)
      );
      this.progressBarView = new ProgressBarView();
      this.dockView = new ReaderDockView((collapsed) => {
        ConfigStore.set("readerDockCollapsed", collapsed);
      });
      this.reader = new ReaderController(
        (state) => this.syncReaderState(state),
        (message) => this.showHint(message)
      );

      ThemeController.apply(ConfigStore.get("themePreset"));
      this.bindGlobalListeners();
      this.observeMutations();
      this.run();
    },

    observeMutations() {
      if (this.observer || !document.body) return;
      this.observer = new MutationObserver(() => {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => this.run(), 250);
      });
      this.observer.observe(document.body, { childList: true, subtree: true });
    },

    bindGlobalListeners() {
      if (this.globalListenersBound) return;
      this.globalListenersBound = true;

      document.addEventListener("keydown", (e) => this.handleKeyDown(e));
      document.addEventListener("dblclick", (e) => this.handleDblClick(e));
      window.addEventListener("scroll", () => this.handleScroll(), {
        passive: true,
      });
      window.addEventListener("resize", () => this.handleResize(), {
        passive: true,
      });
    },

    getPageContext() {
      const url = window.location.href;
      const isReader = url.includes("/chapter/");
      const isSeriesListing = /\/series(\?|$)/.test(url);
      const isSeriesPage = /\/series\/[^/?#]+/.test(url) && !isReader;
      return { isReader, isSeriesPage, isSeriesListing };
    },

    run() {
      if (!document.body) return;

      this.pageContext = this.getPageContext();
      ThemeController.apply(ConfigStore.get("themePreset"));
      this.applyBodyClasses();
      this.settingsView.createHeaderButton();
      this.applyOverhaulTargets();

      if (this.pageContext.isReader && ConfigStore.get("readerWidget")) {
        this.mountReaderUI();
      } else {
        this.unmountReaderUI();
      }

      this.cleanupHomeSections();
      this.syncReaderState();
    },

    mountReaderUI() {
      this.reader.start();

      this.dockView.mount({
        toggleScroll: () => this.reader.toggleScroll(),
        setSpeed: (value) => this.reader.setSpeed(value),
        stepSpeed: (delta) => this.reader.stepSpeed(delta),
        setWidth: (value) => this.reader.setWidth(value),
        stepWidth: (delta) => this.reader.stepWidth(delta),
        toggleFitWidth: () => this.reader.toggleFitWidth(),
        navigate: (direction) => this.reader.navigate(direction),
        goSeries: () => this.reader.goSeries(),
        goTop: () => this.reader.goTop(),
      });

      this.dockView.setCollapsed(ConfigStore.get("readerDockCollapsed"), false);

      if (ConfigStore.get("showProgressBar")) {
        this.progressBarView.mount();
      } else {
        this.progressBarView.unmount();
      }

      this.readerMounted = true;
    },

    unmountReaderUI() {
      if (this.readerMounted) this.reader.stop();
      this.dockView.unmount();
      this.progressBarView.unmount();
      this.readerMounted = false;
    },

    syncReaderState(state) {
      if (!this.pageContext.isReader || !this.readerMounted) return;
      const snapshot = state || this.reader.getStateSnapshot();

      this.dockView.sync(snapshot);

      if (ConfigStore.get("showProgressBar")) {
        this.progressBarView.mount();
        this.progressBarView.update(snapshot.progress);
      } else {
        this.progressBarView.unmount();
      }
    },

    applyBodyClasses() {
      const body = document.body;
      if (!body) return;

      body.classList.add("au-theme-enabled");
      body.classList.toggle("au-hide-slider", !!ConfigStore.get("hideSlider"));
      body.classList.toggle("au-adblock", !!ConfigStore.get("adBlock"));
      body.classList.toggle("au-hide-toraka", !!ConfigStore.get("hideToraka"));
      body.classList.toggle(
        "au-hide-comments",
        !!ConfigStore.get("hideComments")
      );
      body.classList.toggle("au-fit-width", !!ConfigStore.get("fitWidthMode"));
      body.classList.toggle(
        "au-hide-btt",
        !!ConfigStore.get("hideDefaultBackToTop")
      );
      body.classList.toggle(
        "au-compact-sidebar",
        !!ConfigStore.get("compactSidebar")
      );
      body.classList.toggle(
        "au-hide-popular",
        !!ConfigStore.get("hidePopularSection")
      );
      body.classList.toggle(
        "au-menu-series-overhaul",
        !!ConfigStore.get("menuSeriesOverhaul")
      );
      body.classList.toggle(
        "au-page-series",
        this.pageContext.isSeriesPage && !this.pageContext.isSeriesListing
      );
      body.classList.toggle("au-page-reader", this.pageContext.isReader);
    },

    applyOverhaulTargets() {
      this.clearOverhaulTargets();

      this.tagHeaderOverhaulTargets();
      if (this.pageContext.isSeriesPage && !this.pageContext.isSeriesListing) {
        this.tagSeriesOverhaulTargets();
      }
    },

    clearOverhaulTargets() {
      const markerClasses = [
        "au-overhaul-header",
        "au-overhaul-header-inner",
        "au-overhaul-nav-link",
        "au-overhaul-search",
        "au-overhaul-auth-btn",
        "au-series-breadcrumb",
        "au-series-card",
        "au-series-synopsis",
        "au-series-meta",
        "au-series-chapters",
        "au-series-chapter-row",
        "au-series-comments",
        "au-series-related",
      ];
      const selector = markerClasses.map((cls) => `.${cls}`).join(",");
      document.querySelectorAll(selector).forEach((el) => {
        markerClasses.forEach((cls) => el.classList.remove(cls));
      });
    },

    tagHeaderOverhaulTargets() {
      const header = document.querySelector("header.bg-themecolor");
      if (!header) return;

      header.classList.add("au-overhaul-header");

      const inner =
        header.querySelector('div[class*="max-w-[1220px]"]') ||
        header.firstElementChild;
      if (inner) inner.classList.add("au-overhaul-header-inner");

      header
        .querySelectorAll("ul li a span, ul li a")
        .forEach((el) => el.classList.add("au-overhaul-nav-link"));

      const searchInput =
        header.querySelector('input[placeholder*="Search"]') ||
        header.querySelector('input[type="search"]') ||
        header.querySelector("input[type='text']");
      if (searchInput) searchInput.classList.add("au-overhaul-search");

      header
        .querySelectorAll('a[href*="/login"], a[href*="/dashboard"]')
        .forEach((anchor) => {
          const btn = anchor.querySelector("button");
          if (btn) btn.classList.add("au-overhaul-auth-btn");
        });
    },

    tagSeriesOverhaulTargets() {
      const divs = Array.from(document.querySelectorAll("div"));
      const textOf = (el) => (el.textContent || "").trim().toLowerCase();

      const breadcrumb = divs.find(
        (el) =>
          this.hasClassSnippets(el, ["bg-[#222222]", "px-5", "py-2.5"]) &&
          textOf(el).includes("asura scans")
      );
      if (breadcrumb) breadcrumb.classList.add("au-series-breadcrumb");

      const seriesCard = divs.find(
        (el) =>
          this.hasClassSnippets(el, ["bg-[#222222]"]) &&
          /synopsis|bookmark|followed by|keywords/i.test(el.textContent || "")
      );
      if (seriesCard) seriesCard.classList.add("au-series-card");

      const synopsisHeading = Array.from(document.querySelectorAll("h3")).find((h) =>
        /^synopsis/i.test((h.textContent || "").trim())
      );
      if (synopsisHeading) {
        const synopsisBlock = synopsisHeading.closest("div");
        if (synopsisBlock) synopsisBlock.classList.add("au-series-synopsis");
      }

      const metaScope = seriesCard || document.body;
      Array.from(metaScope.querySelectorAll("div"))
        .filter((el) => {
          const txt = textOf(el);
          if (!txt) return false;
          const hasTargetText =
            txt.includes("status") ||
            txt.includes("type") ||
            txt.includes("bookmark") ||
            txt.includes("followed by");
          return hasTargetText && txt.length < 700;
        })
        .slice(0, 4)
        .forEach((el) => el.classList.add("au-series-meta"));

      const chapterHeader = divs.find(
        (el) =>
          this.hasClassSnippets(el, ["border-b-[1px]", "border-[#312f40]"]) &&
          /^chapter\b/i.test((el.textContent || "").trim())
      );
      const chapterContainer = chapterHeader && chapterHeader.parentElement;
      if (chapterContainer) chapterContainer.classList.add("au-series-chapters");

      divs
        .filter(
          (el) =>
            this.hasClassSnippets(el, ["pl-4", "py-2", "rounded-md"]) &&
            /chapter\s*\d+/i.test(el.textContent || "")
        )
        .forEach((el) => el.classList.add("au-series-chapter-row"));

      const commentsHeading = Array.from(document.querySelectorAll("h3")).find(
        (h) => (h.textContent || "").trim().toLowerCase() === "comments"
      );
      const commentsContainer = commentsHeading
        ? commentsHeading.closest(".bg-comments-background")
        : null;
      if (commentsContainer) commentsContainer.classList.add("au-series-comments");

      const relatedHeading = Array.from(document.querySelectorAll("h3")).find(
        (h) => (h.textContent || "").trim().toLowerCase() === "related series"
      );
      const relatedContainer = relatedHeading
        ? relatedHeading.closest(".bg-comments-background")
        : null;
      if (relatedContainer) relatedContainer.classList.add("au-series-related");
    },

    handleConfigChanged(key) {
      if (key === "themePreset") {
        ThemeController.apply(ConfigStore.get("themePreset"));
      }

      if (key === "readerWidget") {
        this.run();
        return;
      }

      if (key === "showProgressBar") {
        if (
          ConfigStore.get("showProgressBar") &&
          this.pageContext.isReader &&
          this.readerMounted
        ) {
          this.progressBarView.mount();
        } else {
          this.progressBarView.unmount();
        }
      }

      if (key === "fitWidthMode") {
        document.body.classList.toggle(
          "au-fit-width",
          !!ConfigStore.get("fitWidthMode")
        );
      }

      if (key === "imageWidth") {
        this.reader.state.width = ConfigStore.get("imageWidth");
        this.reader.applyWidth();
      }

      if (key === "autoScrollSpeed") {
        this.reader.state.speed = ConfigStore.get("autoScrollSpeed");
      }

      this.applyBodyClasses();
      this.run();
    },

    handleScroll() {
      if (!this.pageContext.isReader || !this.readerMounted) return;
      this.syncReaderState();
    },

    handleResize() {
      if (!this.pageContext.isReader || !this.readerMounted) return;
      this.syncReaderState();
    },

    handleKeyDown(e) {
      const tag = (e.target && e.target.tagName) || "";
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      const context = this.getPageContext();
      const key = typeof e.key === "string" ? e.key : "";
      const lowerKey = key.toLowerCase();
      const code = e.code || "";

      if (context.isReader) {
        const readerEnabled = ConfigStore.get("readerWidget");
        if (lowerKey === "s") {
          if (readerEnabled) {
            e.preventDefault();
            this.reader.toggleScroll();
          }
          return;
        }

        if (
          key === "=" ||
          key === "+" ||
          code === "NumpadAdd" ||
          code === "KeyE"
        ) {
          if (readerEnabled) this.reader.stepSpeed(CONSTANTS.SPEED_STEP);
          return;
        }

        if (
          key === "-" ||
          key === "_" ||
          code === "NumpadSubtract" ||
          code === "KeyQ"
        ) {
          if (readerEnabled) this.reader.stepSpeed(-CONSTANTS.SPEED_STEP);
          return;
        }

        if (key === "ArrowRight" || code === "KeyD" || key === "PageDown") {
          if (readerEnabled) {
            e.preventDefault();
            this.reader.navigate("next");
          }
          return;
        }

        if (key === "ArrowLeft" || code === "KeyA" || key === "PageUp") {
          if (readerEnabled) {
            e.preventDefault();
            this.reader.navigate("prev");
          }
          return;
        }

        // Legacy aliases retained for backward compatibility.
        if (key === "[") {
          this.reader.navigate("prev");
          return;
        }
        if (key === "]") {
          this.reader.navigate("next");
          return;
        }

        if (lowerKey === "b") {
          this.reader.goSeries();
          return;
        }
        if (lowerKey === "w") {
          this.reader.toggleFitWidth();
          return;
        }
      }

      if (context.isSeriesPage) {
        switch (lowerKey) {
          case "c":
            e.preventDefault();
            this.focusSearch();
            return;
          case "l":
            e.preventDefault();
            this.scrollToChapterList();
            return;
          default:
            break;
        }
      }
    },

    handleDblClick(e) {
      if (!this.pageContext.isReader) return;
      if (!ConfigStore.get("readerWidget")) return;
      if (!ConfigStore.get("doubleClickScroll")) return;

      const target = e.target;
      if (!target || !target.closest) return;
      if (target.closest("#au-reader-dock-shell")) return;
      if (target.closest("#au-modal-overlay")) return;

      this.reader.toggleScroll();
    },

    focusSearch() {
      const searchInput =
        document.querySelector('input[placeholder*="Search"]') ||
        document.querySelector('input[type="search"]') ||
        document.querySelector(".series-search input");

      if (searchInput) {
        searchInput.focus();
        searchInput.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    },

    scrollToChapterList() {
      const headings = Array.from(document.querySelectorAll("h2, h3, h4"));
      const chapterHeading = headings.find((h) =>
        (h.textContent || "").toLowerCase().includes("chapter")
      );

      const chapterSection =
        chapterHeading ||
        document.querySelector('[class*="chapter"]') ||
        document.querySelector("div.chapter");

      const firstChapter = document.querySelector('a[href*="/chapter/"]');
      const target = chapterSection || (firstChapter && firstChapter.closest("div"));
      if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
    },

    showHint(message) {
      let hint = document.getElementById("au-shortcut-hint");
      if (!hint) {
        hint = document.createElement("div");
        hint.id = "au-shortcut-hint";
        hint.className = "au-shortcut-hint";
        document.body.appendChild(hint);
      }

      hint.textContent = message;
      hint.classList.add("visible");
      clearTimeout(this.hintTimer);
      this.hintTimer = setTimeout(() => hint.classList.remove("visible"), 1000);
    },

    hasClasses(el, classes) {
      return !!el && !!el.classList && classes.every((c) => el.classList.contains(c));
    },

    hasClassSnippets(el, snippets) {
      if (!el || typeof el.className !== "string") return false;
      return snippets.every((snippet) => el.className.includes(snippet));
    },

    findAncestor(el, predicate) {
      let cur = el;
      while (cur && cur !== document.body) {
        if (predicate(cur)) return cur;
        cur = cur.parentElement;
      }
      return null;
    },

    findHomeSlider() {
      const normalizeSliderTarget = (node) => {
        if (!node || !node.querySelector) return node || null;

        const loopNode =
          node.matches("div.loop.owl-carousel.full") ?
            node :
            node.querySelector("div.loop.owl-carousel.full");
        if (loopNode) return loopNode.closest("div.overflow-hidden") || loopNode;

        const carouselNode =
          node.matches("div.carousel-root, div.carousel.carousel-slider") ?
            node :
            node.querySelector("div.carousel-root, div.carousel.carousel-slider");
        if (carouselNode) {
          return (
            carouselNode.closest("div.overflow-hidden") ||
            carouselNode.closest("div.carousel-root") ||
            carouselNode
          );
        }

        // Avoid broad wrappers that can span most of the page.
        const nestedOverflow = node.querySelector("div.overflow-hidden");
        if (nestedOverflow && node.classList && node.classList.contains("min-h-72")) {
          return nestedOverflow;
        }

        return node;
      };

      // Prefer explicit home-slider structures from the current Asura homepage markup.
      const explicitSlider = document.querySelector(
        "div.loop.owl-carousel.full, div.carousel-root, div.carousel.carousel-slider"
      );
      if (explicitSlider) {
        const explicitContainer = normalizeSliderTarget(explicitSlider);
        if (explicitContainer && explicitContainer !== document.body) {
          return explicitContainer;
        }
      }

      const hasManyPosters = (el) =>
        el.querySelectorAll(
          'img[alt="poster"], img[src*="thumb"], img[src*="storage/media"]'
        ).length >= 4;
      const hasManySeriesLinks = (el) => {
        const count = el.querySelectorAll('a[href*="/series/"]').length;
        return count >= 4 && count <= 24;
      };
      const isReasonableSliderContainer = (el) => {
        if (!el || el === document.body || el === document.documentElement) return false;
        if (el.closest("header") || el.closest("footer")) return false;

        const rect = el.getBoundingClientRect();
        if (!rect || rect.width <= 0 || rect.height <= 0) return false;

        const minHeight = 120;
        const maxHeight = window.innerHeight * 1.35;
        const maxArea = window.innerWidth * window.innerHeight * 1.4;
        const area = rect.width * rect.height;

        if (rect.height < minHeight || rect.height > maxHeight) return false;
        if (area > maxArea) return false;
        return true;
      };

      const overflowCandidates = Array.from(
        document.querySelectorAll("div.overflow-hidden")
      ).filter(
        (el) =>
          hasManyPosters(el) &&
          hasManySeriesLinks(el) &&
          isReasonableSliderContainer(el)
      );

      const candidates =
        overflowCandidates.length > 0
          ? overflowCandidates
          : Array.from(document.querySelectorAll("div")).filter(
              (el) =>
                hasManyPosters(el) &&
                hasManySeriesLinks(el) &&
                isReasonableSliderContainer(el)
            );
      if (candidates.length === 0) return null;

      const nearTop = candidates.filter((el) => {
        const rect = el.getBoundingClientRect();
        return rect.top >= -200 && rect.top < window.innerHeight * 1.5;
      });
      const pool = nearTop.length > 0 ? nearTop : candidates;

      const best = pool.reduce((acc, el) => {
        if (!acc) return el;
        const aRect = acc.getBoundingClientRect();
        const eRect = el.getBoundingClientRect();
        return eRect.width > aRect.width ? el : acc;
      }, null);
      return normalizeSliderTarget(best);
    },

    findTorakaPromos() {
      const anchors = Array.from(document.querySelectorAll('a[href*="toraka.com"]'));
      const images = Array.from(
        document.querySelectorAll('img[src*="toraka"], img[alt*="Toraka"]')
      );
      const nodes = anchors.concat(images);
      const targets = new Set();

      nodes.forEach((node) => {
        const candidate = this.findAncestor(node, (el) => {
          if (!el || !el.querySelectorAll) return false;
          if (el.closest && el.closest("footer")) return false;
          const text = (el.textContent || "").toLowerCase();
          const hasTorakaText = text.includes("toraka");
          const linkCount = el.querySelectorAll('a[href*="toraka.com"]').length;
          const imgCount = el.querySelectorAll(
            'img[src*="toraka"], img[alt*="Toraka"]'
          ).length;
          return (hasTorakaText && linkCount >= 1) || (linkCount >= 2 && imgCount >= 1);
        });
        if (candidate) targets.add(candidate);
      });

      return Array.from(targets);
    },

    findPopularSections() {
      const targets = new Set();
      const headings = Array.from(document.querySelectorAll("h2, h3, h4, span, p"));

      headings.forEach((h) => {
        const txt = (h.textContent || "").trim().toLowerCase();
        if (!txt || !txt.includes("popular")) return;
        const container = this.findAncestor(h, (el) => {
          if (!el || !el.querySelectorAll) return false;
          return el.querySelectorAll('a[href*="/series/"]').length >= 3;
        });
        if (container) targets.add(container);
      });

      return Array.from(targets);
    },

    cleanupHomeSections() {
      const path = window.location.pathname || "/";
      const isHome = path === "/" || path === "" || path.startsWith("/page/");
      if (!isHome) return;

      document
        .querySelectorAll(".au-hide-slider-target")
        .forEach((el) => el.classList.remove("au-hide-slider-target"));
      document
        .querySelectorAll(".au-hide-toraka-target")
        .forEach((el) => el.classList.remove("au-hide-toraka-target"));
      document
        .querySelectorAll(".au-hide-popular-target")
        .forEach((el) => el.classList.remove("au-hide-popular-target"));

      if (ConfigStore.get("hideSlider")) {
        const slider = this.findHomeSlider();
        if (slider) slider.classList.add("au-hide-slider-target");
      }
      if (ConfigStore.get("hideToraka")) {
        this.findTorakaPromos().forEach((el) => el.classList.add("au-hide-toraka-target"));
      }
      if (ConfigStore.get("hidePopularSection")) {
        this.findPopularSections().forEach((el) => el.classList.add("au-hide-popular-target"));
      }
    },
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => PageController.init());
  } else {
    PageController.init();
  }

})();
