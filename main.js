/* =====================================================================
   PL PLAYBOOK PORTAL — BEHAVIOUR LAYER
   Vanilla JS, no build step, no dependencies. Organised as small
   self-contained modules so individual pieces can be lifted out when
   porting into a CMS/website builder.

   NOTE ON STATE: this prototype keeps all "remembered" state (visited
   pages, journey progress, selected role) in memory only — it resets
   on reload. That is intentional for a portable static prototype.
   When you integrate this into SharePoint / WordPress / Webflow /
   Google Sites, replace the PORTAL.state object below with calls to
   that platform's own data layer (a SharePoint list, WP user meta,
   a Webflow CMS collection, etc.) so progress actually persists.
   See README.md → "Wiring up persistence".

   MODULES
   1.  PORTAL namespace + in-memory state
   2.  NavModule              – mobile menu toggle
   3.  SearchModule           – mock search index, autosuggest, filter chips
   4.  TabsModule             – ARIA tabs, used by the 5-level system + pathways
   5.  AccordionModule        – FAQ accordion
   6.  CardModule             – resource card "download" + "mark visited"
   7.  JourneyModule          – step progress dial (in-memory)
   8.  ToastModule            – lightweight notifications
   9.  RolePickerModule       – flagship feature: site-wide role memory,
                                drives role-aware bundles + greetings
   10. CycleNudgeModule       – flagship feature: cycle-aware review nudge
   11. AskPdpoModule          – flagship feature: section-anchored
                                clarification channel to PDPO
   12. NotesModule            – flagship feature: "your school's notes"
                                persistent-feel annotation on templates
   13. DiagnosticModule       – flagship feature: school-context comparison
                                (used on diagnostic.html)
   14. Init
   ===================================================================== */

(function () {
  "use strict";

  /* -------------------------------------------------------------
     1. PORTAL NAMESPACE + STATE
     ------------------------------------------------------------- */
  const PORTAL = (window.PORTAL = window.PORTAL || {});

  PORTAL.ROLES = [
    { id: "sl", label: "School Leader" },
    { id: "ssd", label: "SSD" },
    { id: "hod", label: "HOD" },
    { id: "tl", label: "Teacher Leader" },
    { id: "im", label: "IM / CIM" },
    { id: "ro", label: "RO" }
  ];

  PORTAL.state = {
    role: null,                // e.g. "ssd" — set via role picker, used to personalise nav/bundles
    visited: new Set(),        // page ids the user has opened this session
    journeyProgress: {},       // { journeySlug: Set(stepIndex) }
    notes: {}                  // { cardId: "free text the user typed" }
  };

  /* Mock content index — stands in for a real search backend.
     Each entry mirrors the "typed result card" pattern from the IA:
     type tells the UI which tag/icon to render. `roles` powers the
     role-aware "starter pack" bundle (Section 9). */
  PORTAL.searchIndex = [
    { id: "tolp-template", title: "Total Learning Plan (ToLP) Template", type: "Template", part: "Appendix A", time: "Fillable template", url: "content.html#level-4", aliases: ["training plan", "pl plan", "tolp"], roles: ["sl", "ssd", "hod"] },
    { id: "creative-tensions", title: "Creative Tensions", type: "Concept", part: "Part 2.3", time: "8 min read", url: "content.html#level-3", aliases: ["vision reality gap", "tension"], roles: ["sl", "ssd"] },
    { id: "learn-compendium", title: "LEARN Compendium", type: "Concept", part: "Part 5.2", time: "10 min read", url: "topic.html", aliases: ["evaluation framework", "learn"], roles: ["sl", "ssd"] },
    { id: "instructional-mentoring", title: "Instructional Mentoring", type: "Concept", part: "Part 3.6", time: "9 min read", url: "role.html", aliases: ["buddy system", "mentoring", "sima"], roles: ["ssd", "im", "tl"] },
    { id: "kotter-model", title: "Kotter's 8-Step Change Model", type: "Concept", part: "Part 4.1", time: "12 min read", url: "content.html#level-3", aliases: ["resistance to change", "change leadership"], roles: ["ssd", "tl"] },
    { id: "learn-review-table", title: "LEARN Review Table", type: "Checklist", part: "Appendix D", time: "Fillable template", url: "content.html#level-4", aliases: ["mid year review", "year end review"], roles: ["sl", "ssd"] },
    { id: "lion-secondary", title: "Lion Secondary School Case Study", type: "Worked Example", part: "Part 6", time: "25 min read", url: "journey.html", aliases: ["case study", "mdm scale"], roles: ["sl", "ssd", "hod", "tl", "im", "ro"] },
    { id: "contacts", title: "Who to Contact for Support", type: "Reference", part: "Part 7.2", time: "Quick reference", url: "#", aliases: ["who do i contact", "support contact"], roles: ["sl", "ssd", "hod", "tl", "im", "ro"] },
    { id: "tension-workshop-guide", title: "SMT Tension-Setting Workshop", type: "Facilitation Guide", part: "Part 2.3", time: "90 min session plan", url: "content.html#level-5", aliases: ["facilitate tension workshop", "smt workshop"], roles: ["sl", "ssd"] },
    { id: "lets-chat-guide", title: "Let's CHAT Facilitation Script", type: "Facilitation Guide", part: "Part 3.7", time: "5-step script", url: "content.html#level-5", aliases: ["facilitate lets chat", "peer support session"], roles: ["ssd", "im"] },
    { id: "developmental-conversation-prompts", title: "Developmental Conversation Prompts", type: "Facilitation Guide", part: "Appendix E", time: "Prompt bank", url: "search.html", aliases: ["coaching questions", "ro conversation", "facilitate mentoring"], roles: ["ssd", "ro", "im", "tl"] }
  ];

  /* Where each role typically lands in the cycle — drives both the
     cycle nudge defaults and the role-aware download bundle. IDs here
     match the data-card-id values on the Download Centre cards in
     search.html (appendix-a … appendix-g), not the searchIndex ids. */
  PORTAL.ROLE_BUNDLES = {
    sl: ["appendix-d", "appendix-g"],
    ssd: ["appendix-a", "appendix-b", "appendix-f", "appendix-g"],
    hod: ["appendix-a", "appendix-c"],
    tl: ["appendix-c", "appendix-e"],
    im: ["appendix-e", "appendix-c"],
    ro: ["appendix-e"]
  };

  /* -------------------------------------------------------------
     2. NAV MODULE
     ------------------------------------------------------------- */
  const NavModule = {
    init() {
      const toggle = document.querySelector("[data-nav-toggle]");
      const panel = document.querySelector("[data-mobile-nav]");
      if (!toggle || !panel) return;

      toggle.addEventListener("click", () => {
        const isOpen = panel.classList.toggle("is-open");
        toggle.setAttribute("aria-expanded", String(isOpen));
        if (isOpen) {
          panel.querySelector("a")?.focus();
        }
      });

      panel.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
          panel.classList.remove("is-open");
          toggle.setAttribute("aria-expanded", "false");
          toggle.focus();
        }
      });
    }
  };

  /* -------------------------------------------------------------
     3. SEARCH MODULE
     ------------------------------------------------------------- */
  const SearchModule = {
    init() {
      const inputs = document.querySelectorAll("[data-search-input]");
      inputs.forEach((input) => this.bindInput(input));

      const chips = document.querySelectorAll("[data-filter-chip]");
      chips.forEach((chip) => {
        chip.addEventListener("click", () => {
          const pressed = chip.getAttribute("aria-pressed") === "true";
          chip.setAttribute("aria-pressed", String(!pressed));
        });
      });

      // Search results page: render mock results on load / on submit
      const resultsRoot = document.querySelector("[data-search-results]");
      if (resultsRoot) {
        const form = document.querySelector("[data-search-form]");
        const params = new URLSearchParams(window.location.search);
        const initialQuery = params.get("q") || "";
        if (form) {
          const input = form.querySelector("input[type='search']");
          if (input) input.value = initialQuery;
          form.addEventListener("submit", (e) => {
            e.preventDefault();
            this.renderResults(resultsRoot, input.value);
          });
        }
        this.renderResults(resultsRoot, initialQuery);
      }
    },

    bindInput(input) {
      const wrapper = input.closest("[data-search-suggest]");
      if (!wrapper) return;
      const panel = wrapper.querySelector("[data-suggest-panel]");
      if (!panel) return;

      input.addEventListener("input", () => {
        const q = input.value.trim().toLowerCase();
        if (q.length < 2) {
          panel.setAttribute("hidden", "");
          panel.innerHTML = "";
          return;
        }
        const matches = this.search(q).slice(0, 5);
        if (!matches.length) {
          panel.setAttribute("hidden", "");
          return;
        }
        panel.innerHTML = matches
          .map(
            (m) =>
              `<li><a href="${m.url}"><span class="tag">${m.type}</span> <span>${m.title}</span> <span class="meta">${m.part}</span></a></li>`
          )
          .join("");
        panel.removeAttribute("hidden");
      });

      document.addEventListener("click", (e) => {
        if (!wrapper.contains(e.target)) panel.setAttribute("hidden", "");
      });
    },

    search(query) {
      const q = query.toLowerCase();
      return PORTAL.searchIndex.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.aliases.some((a) => a.includes(q))
      );
    },

    renderResults(root, query) {
      const matches = query ? this.search(query) : PORTAL.searchIndex;
      const countEl = document.querySelector("[data-result-count]");
      if (countEl) {
        countEl.textContent = matches.length
          ? `${matches.length} result${matches.length === 1 ? "" : "s"} for \u201c${query}\u201d`
          : `No exact match for \u201c${query}\u201d`;
      }

      if (!matches.length) {
        root.innerHTML = `
          <div class="resource-card" role="status">
            <p class="text-muted">We didn't find an exact match — try one of these instead:</p>
            <ul class="stack">
              <li><a class="btn--text" href="role.html">Browse by role</a></li>
              <li><a class="btn--text" href="topic.html">Browse the A–Z topic list</a></li>
              <li><a class="btn--text" href="#" data-suggest-broaden>Search MOE platforms in Part 7</a></li>
            </ul>
          </div>`;
        return;
      }

      root.innerHTML = matches
        .map(
          (m) => `
        <article class="resource-card" data-card-id="${m.id}">
          <div class="resource-card__head">
            <span class="tag${m.type === "Facilitation Guide" ? " tag--accent" : ""}">${m.type}</span>
            <span class="meta">${m.part}</span>
          </div>
          <h4>${m.title}</h4>
          <p>${m.time}</p>
          <div class="resource-card__foot">
            <a class="btn btn--ghost btn--sm" href="${m.url}">Open</a>
          </div>
        </article>`
        )
        .join("");
    }
  };

  /* -------------------------------------------------------------
     4. TABS MODULE (ARIA tabs — powers the 5-level system)
     ------------------------------------------------------------- */
  const TabsModule = {
    init() {
      document.querySelectorAll("[data-tablist]").forEach((tablist) => {
        const tabs = Array.from(tablist.querySelectorAll('[role="tab"]'));
        tabs.forEach((tab, i) => {
          tab.addEventListener("click", () => this.activate(tabs, tab));
          tab.addEventListener("keydown", (e) => {
            if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
              e.preventDefault();
              const dir = e.key === "ArrowRight" ? 1 : -1;
              const next = tabs[(i + dir + tabs.length) % tabs.length];
              next.focus();
              this.activate(tabs, next);
            }
          });
        });

        // Deep-link support: if the URL hash matches a panel this
        // tablist controls (e.g. content.html#level-4 from a card on
        // another page), activate that tab on load instead of the
        // default first tab. This is what lets every other page link
        // straight into a specific level/role/topic panel.
        const hashId = window.location.hash.replace("#", "");
        const matchingTab = tabs.find((t) => t.getAttribute("aria-controls") === hashId);
        if (matchingTab) this.activate(tabs, matchingTab);
      });
    },

    activate(tabs, selectedTab) {
      tabs.forEach((tab) => {
        const selected = tab === selectedTab;
        tab.setAttribute("aria-selected", String(selected));
        tab.tabIndex = selected ? 0 : -1;
        const panel = document.getElementById(tab.getAttribute("aria-controls"));
        if (panel) panel.hidden = !selected;
      });
      this.syncLevelDial(selectedTab);
    },

    syncLevelDial(selectedTab) {
      const dial = document.querySelector("[data-level-dial]");
      if (!dial) return;
      const level = Number(selectedTab.dataset.level);
      dial.querySelectorAll("circle[data-level]").forEach((c) => {
        const n = Number(c.dataset.level);
        c.classList.toggle("is-active", n === level);
        if (n <= level) c.classList.add("is-visited");
      });
    }
  };

  /* -------------------------------------------------------------
     5. ACCORDION MODULE (FAQ)
     ------------------------------------------------------------- */
  const AccordionModule = {
    init() {
      document.querySelectorAll("[data-accordion-trigger]").forEach((trigger) => {
        trigger.addEventListener("click", () => {
          const panel = document.getElementById(trigger.getAttribute("aria-controls"));
          const open = trigger.getAttribute("aria-expanded") === "true";
          trigger.setAttribute("aria-expanded", String(!open));
          if (panel) panel.dataset.open = String(!open);
        });
      });
    }
  };

  /* -------------------------------------------------------------
     6. CARD MODULE (download stub + mark-visited)
     ------------------------------------------------------------- */
  const CardModule = {
    init() {
      document.querySelectorAll("[data-download]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const name = btn.dataset.download;
          ToastModule.show(`Downloading "${name}"… (prototype — wire this to your file host)`);
        });
      });

      document.querySelectorAll("[data-mark-visited]").forEach((link) => {
        link.addEventListener("click", () => {
          const card = link.closest("[data-card-id]");
          if (card) {
            PORTAL.state.visited.add(card.dataset.cardId);
            card.classList.add("is-visited");
          }
        });
      });
    }
  };

  /* -------------------------------------------------------------
     7. JOURNEY MODULE (in-memory step progress)
     ------------------------------------------------------------- */
  const JourneyModule = {
    init() {
      document.querySelectorAll("[data-journey]").forEach((journeyEl) => {
        const slug = journeyEl.dataset.journey;
        PORTAL.state.journeyProgress[slug] = PORTAL.state.journeyProgress[slug] || new Set();

        journeyEl.querySelectorAll("[data-step-complete]").forEach((btn) => {
          btn.addEventListener("click", () => {
            const step = journeyEl.querySelector(`[data-step="${btn.dataset.stepComplete}"]`);
            const idx = Number(btn.dataset.stepComplete);
            PORTAL.state.journeyProgress[slug].add(idx);
            if (step) step.classList.add("is-done");
            this.renderDial(journeyEl, slug);
            ToastModule.show("Step marked complete for this session.");
          });
        });

        this.renderDial(journeyEl, slug);
      });
    },

    renderDial(journeyEl, slug) {
      const dots = journeyEl.querySelectorAll("[data-dial-dot]");
      const done = PORTAL.state.journeyProgress[slug];
      dots.forEach((dot, i) => dot.classList.toggle("is-done", done.has(i)));
      const label = journeyEl.querySelector("[data-dial-label]");
      if (label) label.textContent = `${done.size}/${dots.length} steps visited`;
    }
  };

  /* -------------------------------------------------------------
     8. TOAST MODULE
     ------------------------------------------------------------- */
  const ToastModule = {
    region: null,
    init() {
      this.region = document.querySelector("[data-toast-region]");
    },
    show(message) {
      if (!this.region) return;
      const el = document.createElement("div");
      el.className = "toast";
      el.setAttribute("role", "status");
      el.textContent = message;
      this.region.appendChild(el);
      setTimeout(() => el.remove(), 3200);
    }
  };

  /* -------------------------------------------------------------
     8b. MODE SWITCH MODULE (Role / Challenge / Stage pathway switcher
     on role.html — toggles entire pathway sections, distinct from
     TabsModule which toggles panels within one tablist)
     ------------------------------------------------------------- */
  const ModeSwitchModule = {
    init() {
      const switcher = document.querySelector("[data-mode-switch]");
      if (!switcher) return;
      const buttons = Array.from(switcher.querySelectorAll('[role="tab"]'));
      buttons.forEach((btn) => {
        btn.addEventListener("click", () => {
          buttons.forEach((b) => { b.setAttribute("aria-selected", "false"); b.tabIndex = -1; });
          btn.setAttribute("aria-selected", "true");
          btn.tabIndex = 0;
          document.querySelectorAll("[data-mode-panel]").forEach((p) => { p.hidden = true; });
          const target = document.getElementById(btn.getAttribute("aria-controls"));
          if (target) target.hidden = false;
        });
      });
    }
  };

  /* -------------------------------------------------------------
     9. ROLE PICKER MODULE (flagship feature #6 — role memory)
     Injects a single role-picker control into every page's header
     (no per-page HTML edits needed) and a small "Continue as…"
     prompt strip. Selecting a role updates anything tagged
     [data-role-aware] on the current page — the homepage greeting,
     the Download Centre's bundle button, and which cards in the
     Download Centre are shown by default.
     ------------------------------------------------------------- */
  const RolePickerModule = {
    init() {
      const host = document.querySelector(".header-actions");
      if (!host) return;

      const wrap = document.createElement("div");
      wrap.className = "role-picker";
      wrap.setAttribute("data-role-picker", "");
      wrap.innerHTML = `
        <button class="btn btn--ghost btn--sm" type="button" data-role-picker-toggle aria-haspopup="true" aria-expanded="false">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="8" r="3.5" stroke="currentColor" stroke-width="2"/><path d="M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
          <span data-role-picker-label>I am a…</span>
        </button>
        <ul class="role-picker__menu" data-role-picker-menu hidden role="menu">
          ${PORTAL.ROLES.map((r) => `<li role="none"><button role="menuitem" data-role-option="${r.id}">${r.label}</button></li>`).join("")}
        </ul>`;
      host.insertBefore(wrap, host.firstChild);

      const toggle = wrap.querySelector("[data-role-picker-toggle]");
      const menu = wrap.querySelector("[data-role-picker-menu]");
      const label = wrap.querySelector("[data-role-picker-label]");

      toggle.addEventListener("click", () => {
        const open = menu.hasAttribute("hidden") === false;
        if (open) { menu.setAttribute("hidden", ""); toggle.setAttribute("aria-expanded", "false"); }
        else { menu.removeAttribute("hidden"); toggle.setAttribute("aria-expanded", "true"); }
      });

      document.addEventListener("click", (e) => {
        if (!wrap.contains(e.target)) menu.setAttribute("hidden", "");
      });

      menu.querySelectorAll("[data-role-option]").forEach((opt) => {
        opt.addEventListener("click", () => {
          const role = PORTAL.ROLES.find((r) => r.id === opt.dataset.roleOption);
          PORTAL.state.role = role.id;
          label.textContent = role.label;
          menu.setAttribute("hidden", "");
          toggle.setAttribute("aria-expanded", "false");
          this.applyRole(role);
          ToastModule.show(`Showing content for ${role.label}. (Remembered for this visit only — see README.)`);
        });
      });
    },

    applyRole(role) {
      document.querySelectorAll("[data-role-aware='greeting']").forEach((el) => {
        el.textContent = `Welcome back — here's what ${role.label}s usually need first.`;
      });

      const bundleBtn = document.querySelector("[data-role-aware='bundle-button']");
      if (bundleBtn) bundleBtn.textContent = `Download the ${role.label} starter pack`;

      const cards = document.querySelectorAll("[data-download-centre] [data-card-id]");
      if (cards.length) {
        const allowed = new Set(PORTAL.ROLE_BUNDLES[role.id] || []);
        cards.forEach((card) => {
          card.style.display = allowed.has(card.dataset.cardId) ? "" : "none";
        });
        const note = document.querySelector("[data-role-aware='filter-note']");
        if (note) note.textContent = `Showing items most relevant to ${role.label}s. `;
      }
    }
  };

  /* -------------------------------------------------------------
     10. CYCLE NUDGE MODULE (flagship feature #9)
     Renders into any [data-cycle-nudge] placeholder. The select
     control simulates "where you are in the year" — in production
     this reads the school calendar instead of asking the user.
     ------------------------------------------------------------- */
  const CycleNudgeModule = {
    points: [
      { id: "t1", label: "Term 1, Week 3 — Planning window", stage: "Plan",
        message: "Your LNA should be opening soon.",
        cta: "Open Part 2.3 + Appendix F", url: "content.html#level-1" },
      { id: "t2", label: "Term 2, Week 4 — Mid-Year Review window", stage: "Review",
        message: "This is the window the playbook flags for a Mid-Year LEARN Review — before the ToLP risks being \u201cfiled and forgotten.\u201d",
        cta: "Start your Mid-Year LEARN Review", url: "content.html#level-4" },
      { id: "t3", label: "Term 3, Week 5 — Implementation check-in", stage: "Implement",
        message: "A good point to check whether PLT and mentoring structures are embedding, not just running.",
        cta: "Open the Implement-stage checklist", url: "role.html" },
      { id: "t4", label: "Term 4, Week 8 — Year-End Review window", stage: "Review",
        message: "Time for the Year-End LEARN Review — and to start next cycle's Theory of Change while this year is still fresh.",
        cta: "Start your Year-End Review", url: "content.html#level-4" }
    ],

    init() {
      const hosts = document.querySelectorAll("[data-cycle-nudge]");
      if (!hosts.length) return;

      hosts.forEach((host) => {
        host.innerHTML = `
          <div class="nudge-banner">
            <div class="nudge-banner__head">
              <span class="eyebrow">Where you are in the cycle</span>
              <label class="visually-hidden" for="cycle-select-${host.dataset.nudgeId || "0"}">Simulate the current point in the school year</label>
              <select id="cycle-select-${host.dataset.nudgeId || "0"}" class="input" data-cycle-select style="max-width: 16rem;"></select>
            </div>
            <p class="nudge-banner__message" data-nudge-message></p>
            <a class="btn btn--primary btn--sm" data-nudge-cta href="#">See what's due →</a>
            <p class="meta" style="margin-top:var(--sp-2);">Prototype simulator — production reads this from your school's term calendar automatically.</p>
          </div>`;

        const select = host.querySelector("[data-cycle-select]");
        select.innerHTML = this.points.map((p) => `<option value="${p.id}">${p.label}</option>`).join("");
        select.value = "t2"; // default to the mid-year nudge so the feature's value is visible immediately
        this.render(host, "t2");

        select.addEventListener("change", () => this.render(host, select.value));
      });
    },

    render(host, pointId) {
      const point = this.points.find((p) => p.id === pointId);
      host.querySelector("[data-nudge-message]").textContent = point.message;
      const cta = host.querySelector("[data-nudge-cta]");
      cta.textContent = point.cta + " →";
      cta.href = point.url;
    }
  };

  /* -------------------------------------------------------------
     11. ASK PDPO MODULE (flagship feature #10)
     Injects a site-wide floating button + modal. Auto-detects the
     active section (current tab label, if a level/role tablist is
     open) so the question is anchored to a specific part of the
     playbook rather than submitted with no context.
     ------------------------------------------------------------- */
  const AskPdpoModule = {
    init() {
      const fab = document.createElement("button");
      fab.className = "ask-pdpo-fab";
      fab.type = "button";
      fab.setAttribute("data-ask-pdpo-open", "");
      fab.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 18h.01M9 9a3 3 0 116 0c0 2-3 2.5-3 4.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg> Ask PDPO about this`;
      document.body.appendChild(fab);

      const modalHTML = `
        <div class="modal-overlay" data-ask-pdpo-modal hidden>
          <div class="modal" role="dialog" aria-modal="true" aria-labelledby="ask-pdpo-title">
            <button class="btn btn--icon modal__close" data-ask-pdpo-close aria-label="Close">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2"/></svg>
            </button>
            <h3 id="ask-pdpo-title">Ask PDPO about this section</h3>
            <p class="meta" data-ask-pdpo-context>Re: this page</p>
            <form data-ask-pdpo-form class="stack">
              <div class="field">
                <label for="ask-pdpo-question">Your question</label>
                <textarea id="ask-pdpo-question" class="input" rows="4" required placeholder="What would you like PDPO to clarify?"></textarea>
              </div>
              <button class="btn btn--primary" type="submit">Send to PDPO</button>
              <p class="meta">Routed to PDPO with the section reference attached — not a public comment.</p>
            </form>
          </div>
        </div>`;
      document.body.insertAdjacentHTML("beforeend", modalHTML);

      const overlay = document.querySelector("[data-ask-pdpo-modal]");
      const closeBtn = overlay.querySelector("[data-ask-pdpo-close]");
      const form = overlay.querySelector("[data-ask-pdpo-form]");
      const contextEl = overlay.querySelector("[data-ask-pdpo-context]");

      const open = () => {
        contextEl.textContent = `Re: ${this.currentContext()}`;
        overlay.removeAttribute("hidden");
        overlay.querySelector("textarea").focus();
      };
      const close = () => overlay.setAttribute("hidden", "");

      fab.addEventListener("click", open);
      closeBtn.addEventListener("click", close);
      overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
      document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !overlay.hasAttribute("hidden")) close(); });

      form.addEventListener("submit", (e) => {
        e.preventDefault();
        const ref = this.currentContext();
        close();
        form.reset();
        ToastModule.show(`Sent to PDPO — referencing "${ref}." (Prototype — wire to your ticketing/email workflow.)`);
      });
    },

    currentContext() {
      const activeTab = document.querySelector('[role="tab"][aria-selected="true"]');
      if (activeTab) {
        const tablist = activeTab.closest("[data-tablist]");
        const label = activeTab.querySelector(".time") ? activeTab.textContent.replace(activeTab.querySelector(".time").textContent, "").trim() : activeTab.textContent.trim();
        return `${document.title.split(" — ")[0]} → ${label}`;
      }
      return document.title.split(" — ")[0];
    }
  };

  /* -------------------------------------------------------------
     12. NOTES MODULE (flagship feature #3 — "your school's notes")
     Adds a collapsible notes field under any card marked
     [data-notes-enabled]. Saved in PORTAL.state.notes for this
     session only — see README for wiring real persistence.
     ------------------------------------------------------------- */
  const NotesModule = {
    init() {
      document.querySelectorAll("[data-notes-enabled]").forEach((card) => {
        const id = card.dataset.cardId || Math.random().toString(36).slice(2);
        const wrap = document.createElement("div");
        wrap.className = "notes-box";
        wrap.innerHTML = `
          <button class="btn--text btn--sm" type="button" data-notes-toggle>+ Your school's notes</button>
          <div class="notes-box__panel" hidden>
            <label class="visually-hidden" for="notes-${id}">Your school's notes for this template</label>
            <textarea id="notes-${id}" class="input" rows="3" placeholder="e.g. who owns this at our school, when we last reviewed it…"></textarea>
            <div class="notes-box__actions">
              <button class="btn btn--ghost btn--sm" type="button" data-notes-save>Save</button>
              <span class="meta" data-notes-status></span>
            </div>
          </div>`;
        card.appendChild(wrap);

        const toggle = wrap.querySelector("[data-notes-toggle]");
        const panel = wrap.querySelector(".notes-box__panel");
        const textarea = wrap.querySelector("textarea");
        const status = wrap.querySelector("[data-notes-status]");

        if (PORTAL.state.notes[id]) {
          textarea.value = PORTAL.state.notes[id];
          status.textContent = "Saved for this session";
        }

        toggle.addEventListener("click", () => {
          const open = !panel.hasAttribute("hidden");
          if (open) panel.setAttribute("hidden", ""); else panel.removeAttribute("hidden");
          toggle.textContent = open ? "+ Your school's notes" : "− Your school's notes";
        });

        wrap.querySelector("[data-notes-save]").addEventListener("click", () => {
          PORTAL.state.notes[id] = textarea.value;
          status.textContent = "Saved for this session";
          ToastModule.show("Note saved for this session — wire to your platform's storage to keep it permanently.");
        });
      });
    }
  };

  /* -------------------------------------------------------------
     13. DIAGNOSTIC MODULE (flagship feature #7 — school-context
     comparison against Lion Secondary). Only acts on pages that
     contain [data-diagnostic-form] — i.e. diagnostic.html. Produces
     a short written comparison, deliberately not a score or badge.
     ------------------------------------------------------------- */
  const DiagnosticModule = {
    init() {
      const form = document.querySelector("[data-diagnostic-form]");
      if (!form) return;

      form.addEventListener("submit", (e) => {
        e.preventDefault();
        const data = new FormData(form);
        const culture = data.get("culture");
        const tension = data.get("tension");
        const experience = data.get("experience");
        const smt = data.get("smt");

        const output = document.querySelector("[data-diagnostic-output]");
        const lines = [];

        if (culture === "isolated") {
          lines.push("Your PLC starting point is close to Lion Secondary's own baseline (PLCDR \u201cInitiating\u201d) — the early sequencing in Part 6.2–6.3 (start with willing Teacher Leaders, not a whole-school mandate) is likely to transfer directly.");
        } else if (culture === "pockets") {
          lines.push("You're a step ahead of Lion Secondary's starting point — you may be able to compress or skip the earliest \u201cbuild a small coalition first\u201d stage and move sooner to the structures in Part 6.3.");
        } else {
          lines.push("Your PLC culture is more established than Lion Secondary's starting profile — the case study's early-stage caution (don't mandate school-wide PLTs immediately) may matter less for you than its later-stage content on deepening and sustaining (Part 6.4–6.5).");
        }

        if (tension === "consistency") {
          lines.push("Your primary tension matches Lion Secondary's T1 (practice consistency) most closely — the worked tension statement and ToLP rows in Part 6.3 are a reasonable direct reference point.");
        } else if (tension === "capacity") {
          lines.push("Your primary tension is closer to Lion Secondary's T2 (staff capacity and morale) — pay particular attention to the well-being actions in Part 3.7 alongside the design content, not the design content alone.");
        } else if (tension === "technology") {
          lines.push("Your primary tension touches on what Lion Secondary explicitly deferred to Year 2 (T3, e-Pedagogy) — there is less direct precedent for this in the case study; treat Parts 2–5 as your primary reference instead of the narrative.");
        } else {
          lines.push("Your tension doesn't map closely onto any of Lion Secondary's three — that's a signal to lean more on the general frameworks in Parts 2–5 than on this specific narrative.");
        }

        if (smt === "skeptical") {
          lines.push("<strong>Worth flagging:</strong> Lion Secondary's trajectory assumed a broadly cooperative SMT and willing Teacher Leaders. If your SMT is more skeptical, weight Part 4.1 (Kotter, especially Steps 1–3) more heavily than the case study's pace — expect your own Implement stage to take longer.");
        }

        output.innerHTML = `<div class="resource-card"><h4>What's likely to transfer, and what to adapt</h4><ul class="stack">${lines.map((l) => `<li>${l}</li>`).join("")}</ul><p class="meta" style="margin-top:var(--sp-3);">This is a reflection prompt, not a score — use it to decide what to read closely next, not as a verdict on your school.</p></div>`;
        output.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
    }
  };

  /* -------------------------------------------------------------
     14. INIT
     ------------------------------------------------------------- */
  document.addEventListener("DOMContentLoaded", () => {
    ToastModule.init();
    NavModule.init();
    SearchModule.init();
    TabsModule.init();
    AccordionModule.init();
    CardModule.init();
    JourneyModule.init();
    ModeSwitchModule.init();
    RolePickerModule.init();
    CycleNudgeModule.init();
    AskPdpoModule.init();
    NotesModule.init();
    DiagnosticModule.init();
  });

  // Expose for adaptation / debugging when porting into another platform
  PORTAL.modules = {
    NavModule, SearchModule, TabsModule, AccordionModule, CardModule, JourneyModule, ModeSwitchModule,
    ToastModule, RolePickerModule, CycleNudgeModule, AskPdpoModule, NotesModule, DiagnosticModule
  };
})();
