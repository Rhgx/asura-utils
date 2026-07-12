import "./base.css";
import "./settings-modal.css";
// This file adjusts the shared modal styles to match the current site UI, so order matters.
import "./settings-modal-current.css";
import "./reader-ui.css";
// Site-specific mappings load after component styles because they must override native colors.
import "./site-theme-mapping.css";
import "./series-overhaul.css";
import "./responsive.css";
