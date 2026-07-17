(() => {
  "use strict";

  const supabase = window.planoraSupabase;
  const CONFIG = window.PLANORA_CONFIG || {};

  const STATUS_ORDER = ["idea", "created", "scheduled", "posted"];
  const STATUS_LABELS = {
    idea: "Idea",
    created: "Created",
    scheduled: "Scheduled",
    posted: "Posted"
  };
  const STORAGE_KEYS = {
    view: "planora-view-mode",
    activePage: "planora-active-page",
    hiddenWeeks: "planora-hidden-weeks"
  };

  const state = {
    session: null,
    user: null,
    profile: null,
    workspace: null,
    membershipRole: "owner",
    pages: [],
    posts: [],
    activePageId: "all",
    currentDate: new Date(),
    viewMode: localStorage.getItem(STORAGE_KEYS.view) || CONFIG.DEFAULT_VIEW || "monthly",
    search: "",
    statusFilter: "all",
    loading: false,
    saving: false,
    started: false,
    draggedPostId: null,
    realtimeChannels: [],
    realtimeRefreshTimer: null,
    autoRefreshTimer: null,
    clockTimer: null,
    toastTimer: null
  };

  const $ = id => document.getElementById(id);
  const els = {
    appScreen: $("appScreen"),
    sidebar: $("sidebar"),
    sidebarBackdrop: $("sidebarBackdrop"),
    mobileSidebarOpen: $("mobileSidebarOpen"),
    mobileSidebarClose: $("mobileSidebarClose"),
    workspaceName: $("workspaceName"),
    planBadge: $("planBadge"),
    pageTabs: $("pageTabs"),
    addPageButton: $("addPageButton"),
    upgradeButton: $("upgradeButton"),
    accountButton: $("accountButton"),
    accountAvatar: $("accountAvatar"),
    accountName: $("accountName"),
    accountEmail: $("accountEmail"),
    calendarEyebrow: $("calendarEyebrow"),
    calendarTitle: $("calendarTitle"),
    activePageLabel: $("activePageLabel"),
    currentTime: $("currentTime"),
    currentDate: $("currentDate"),
    monthlyViewButton: $("monthlyViewButton"),
    weeklyViewButton: $("weeklyViewButton"),
    previousPeriodButton: $("previousPeriodButton"),
    todayButton: $("todayButton"),
    nextPeriodButton: $("nextPeriodButton"),
    plannerSearch: $("plannerSearch"),
    statusFilter: $("statusFilter"),
    newPostButton: $("newPostButton"),
    emptyNewPostButton: $("emptyNewPostButton"),
    ideaCount: $("ideaCount"),
    createdCount: $("createdCount"),
    scheduledCount: $("scheduledCount"),
    postedCount: $("postedCount"),
    calendarGrid: $("calendarGrid"),
    calendarEmpty: $("calendarEmpty"),
    syncStatus: $("syncStatus"),
    refreshButton: $("refreshButton"),
    changelogButton: $("changelogButton"),
    toast: $("toast"),

    postModal: $("postModal"),
    closePostModal: $("closePostModal"),
    cancelPostButton: $("cancelPostButton"),
    postForm: $("postForm"),
    postModalTitle: $("postModalTitle"),
    postModalDateLabel: $("postModalDateLabel"),
    postId: $("postId"),
    postTitle: $("postTitle"),
    postPage: $("postPage"),
    postStatus: $("postStatus"),
    postDate: $("postDate"),
    postTime: $("postTime"),
    postPlatform: $("postPlatform"),
    postCategory: $("postCategory"),
    postCaption: $("postCaption"),
    postNotes: $("postNotes"),
    deletePostButton: $("deletePostButton"),
    savePostButton: $("savePostButton"),

    pageModal: $("pageModal"),
    closePageModal: $("closePageModal"),
    cancelPageButton: $("cancelPageButton"),
    pageForm: $("pageForm"),
    pageModalTitle: $("pageModalTitle"),
    pageId: $("pageId"),
    pageName: $("pageName"),
    pagePlatform: $("pagePlatform"),
    pageColor: $("pageColor"),
    archivePageButton: $("archivePageButton"),
    savePageButton: $("savePageButton"),

    accountModal: $("accountModal"),
    closeAccountModal: $("closeAccountModal"),
    profileForm: $("profileForm"),
    profileAvatar: $("profileAvatar"),
    profileEmail: $("profileEmail"),
    profilePlanText: $("profilePlanText"),
    profileName: $("profileName"),
    profileWorkspaceName: $("profileWorkspaceName"),
    saveProfileButton: $("saveProfileButton"),
    signOutButton: $("signOutButton"),

    premiumModal: $("premiumModal"),
    closePremiumModal: $("closePremiumModal"),
    premiumDoneButton: $("premiumDoneButton"),

    changelogModal: $("changelogModal"),
    closeChangelogModal: $("closeChangelogModal"),
    changelogContent: $("changelogContent")
  };

  let controlsReady = false;

  function setupControls() {
    if (controlsReady) return;
    controlsReady = true;

    els.mobileSidebarOpen.addEventListener("click", openSidebar);
    els.mobileSidebarClose.addEventListener("click", closeSidebar);
    els.sidebarBackdrop.addEventListener("click", closeSidebar);

    els.monthlyViewButton.addEventListener("click", () => setViewMode("monthly"));
    els.weeklyViewButton.addEventListener("click", () => setViewMode("weekly"));
    els.previousPeriodButton.addEventListener("click", () => movePeriod(-1));
    els.nextPeriodButton.addEventListener("click", () => movePeriod(1));
    els.todayButton.addEventListener("click", () => {
      state.currentDate = new Date();
      loadPosts({ silent: true });
    });

    els.plannerSearch.addEventListener("input", event => {
      state.search = event.target.value.trim().toLowerCase();
      renderPlanner();
    });
    els.statusFilter.addEventListener("change", event => {
      state.statusFilter = event.target.value;
      renderPlanner();
    });

    els.newPostButton.addEventListener("click", () => openPostModal(dateToISO(new Date())));
    els.emptyNewPostButton.addEventListener("click", () => openPostModal(dateToISO(new Date())));
    els.refreshButton.addEventListener("click", () => refreshAll({ announce: true }));
    els.changelogButton.addEventListener("click", () => openModal(els.changelogModal));
    els.closeChangelogModal.addEventListener("click", () => closeModal(els.changelogModal));

    els.addPageButton.addEventListener("click", () => openPageModal());
    els.accountButton.addEventListener("click", openAccountModal);
    els.upgradeButton.addEventListener("click", () => openModal(els.premiumModal));
    els.closePremiumModal.addEventListener("click", () => closeModal(els.premiumModal));
    els.premiumDoneButton.addEventListener("click", () => closeModal(els.premiumModal));

    els.closePostModal.addEventListener("click", () => closeModal(els.postModal));
    els.cancelPostButton.addEventListener("click", () => closeModal(els.postModal));
    els.postForm.addEventListener("submit", savePost);
    els.deletePostButton.addEventListener("click", deletePost);

    document.querySelectorAll(".time-chip").forEach(button => {
      button.addEventListener("click", () => {
        const value = button.dataset.time;
        els.postTime.value = value === "now" ? roundTimeToFiveMinutes(new Date()) : value;
      });
    });

    els.closePageModal.addEventListener("click", () => closeModal(els.pageModal));
    els.cancelPageButton.addEventListener("click", () => closeModal(els.pageModal));
    els.pageForm.addEventListener("submit", savePage);
    els.archivePageButton.addEventListener("click", archivePage);

    els.closeAccountModal.addEventListener("click", () => closeModal(els.accountModal));
    els.profileForm.addEventListener("submit", saveProfile);
    els.signOutButton.addEventListener("click", signOut);

    [els.postModal, els.pageModal, els.accountModal, els.premiumModal, els.changelogModal].forEach(modal => {
      modal.addEventListener("click", event => {
        if (event.target === modal && !state.saving) closeModal(modal);
      });
    });

    document.addEventListener("keydown", handleKeyboardShortcuts);
    window.addEventListener("focus", handleWindowFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);
  }

  async function start(session) {
    if (!session?.user) return;
    setupControls();

    if (state.started && state.user?.id === session.user.id) return;
    await stop({ preserveScreen: true });

    state.session = session;
    state.user = session.user;
    state.started = true;
    els.appScreen.classList.remove("hidden");
    updateVersionLabels();
    updateViewButtons();
    renderChangelog();
    startClock();

    try {
      setSyncStatus("Loading workspace…");
      await loadAccountContext();
      await loadPosts({ silent: true });
      subscribeToRealtime();
      startAutoRefresh();
      setSyncStatus("Synced just now");
    } catch (error) {
      console.error("Planora startup failed:", error);
      showToast(readableError(error), "error");
      setSyncStatus("Sync needs attention");
    }
  }

  async function stop({ preserveScreen = false } = {}) {
    clearInterval(state.autoRefreshTimer);
    clearInterval(state.clockTimer);
    clearTimeout(state.realtimeRefreshTimer);
    state.autoRefreshTimer = null;
    state.clockTimer = null;
    state.realtimeRefreshTimer = null;

    for (const channel of state.realtimeChannels) {
      try { await supabase.removeChannel(channel); } catch (error) { console.warn(error); }
    }
    state.realtimeChannels = [];
    state.started = false;
    state.session = null;
    state.user = null;
    state.profile = null;
    state.workspace = null;
    state.pages = [];
    state.posts = [];
    state.activePageId = "all";
    if (!preserveScreen) els.appScreen.classList.add("hidden");
  }

  async function loadAccountContext() {
    const userId = state.user.id;

    let profileResult = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url, plan, plan_expires_at, created_at, updated_at")
      .eq("id", userId)
      .maybeSingle();

    if (profileResult.error) throw profileResult.error;
    if (!profileResult.data) {
      await wait(700);
      profileResult = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, plan, plan_expires_at, created_at, updated_at")
        .eq("id", userId)
        .single();
      if (profileResult.error) throw profileResult.error;
    }
    state.profile = profileResult.data;

    const membershipResult = await supabase
      .from("workspace_members")
      .select("workspace_id, role")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (membershipResult.error) throw membershipResult.error;
    if (!membershipResult.data) throw new Error("No Planora workspace membership was found for this account.");

    state.membershipRole = membershipResult.data.role;

    const workspaceResult = await supabase
      .from("workspaces")
      .select("id, name, slug, owner_id, created_at, updated_at")
      .eq("id", membershipResult.data.workspace_id)
      .single();
    if (workspaceResult.error) throw workspaceResult.error;
    state.workspace = workspaceResult.data;

    await loadPages();
    restoreActivePage();
    renderIdentity();
    renderPageTabs();
    populatePostPageSelect();
  }

  async function loadPages() {
    const result = await supabase
      .from("social_pages")
      .select("id, workspace_id, name, platform, color, is_archived, created_at, updated_at")
      .eq("workspace_id", state.workspace.id)
      .eq("is_archived", false)
      .order("created_at", { ascending: true });
    if (result.error) throw result.error;
    state.pages = result.data || [];
  }

  function restoreActivePage() {
    const key = `${STORAGE_KEYS.activePage}:${state.workspace.id}`;
    const saved = localStorage.getItem(key) || "all";
    state.activePageId = saved === "all" || state.pages.some(page => page.id === saved) ? saved : "all";
  }

  function renderIdentity() {
    const name = state.profile?.full_name || state.user?.user_metadata?.full_name || state.user?.email?.split("@")[0] || "Planora User";
    const email = state.user?.email || "";
    const plan = state.profile?.plan || "free";
    const initial = name.trim().charAt(0).toUpperCase() || "U";

    els.workspaceName.textContent = state.workspace?.name || "My Workspace";
    els.planBadge.textContent = plan;
    els.planBadge.className = `plan-badge ${plan}`;
    els.accountName.textContent = name;
    els.accountEmail.textContent = email;
    els.accountAvatar.textContent = initial;
    els.profileAvatar.textContent = initial;
    els.profileEmail.textContent = email;
    els.profilePlanText.textContent = `${capitalize(plan)} plan`;
    els.profileName.value = name;
    els.profileWorkspaceName.value = state.workspace?.name || "";
  }

  function renderPageTabs() {
    const fragment = document.createDocumentFragment();

    const allRow = createPageTab({ id: "all", name: "All Content", platform: `${state.pages.length} pages`, color: "#3156d8" });
    fragment.appendChild(allRow);

    state.pages.forEach(page => fragment.appendChild(createPageTab(page, true)));
    els.pageTabs.replaceChildren(fragment);
    updateActivePageLabel();
  }

  function createPageTab(page, editable = false) {
    const row = document.createElement("div");
    row.className = "page-tab-row";

    const button = document.createElement("button");
    button.type = "button";
    button.className = `page-tab${state.activePageId === page.id ? " active" : ""}`;
    button.style.setProperty("--page-color", sanitizeColor(page.color));
    button.innerHTML = `
      <span class="page-tab-dot"></span>
      <span class="page-tab-label">${escapeHtml(page.name)}</span>
      <small>${escapeHtml(page.platform || "General")}</small>
    `;
    button.addEventListener("click", () => selectPage(page.id));
    row.appendChild(button);

    if (editable) {
      const edit = document.createElement("button");
      edit.type = "button";
      edit.className = "page-edit-button";
      edit.title = `Edit ${page.name}`;
      edit.setAttribute("aria-label", edit.title);
      edit.textContent = "⋯";
      edit.addEventListener("click", event => {
        event.stopPropagation();
        openPageModal(page);
      });
      row.appendChild(edit);
    }

    return row;
  }

  async function selectPage(pageId) {
    state.activePageId = pageId;
    localStorage.setItem(`${STORAGE_KEYS.activePage}:${state.workspace.id}`, pageId);
    renderPageTabs();
    renderPlanner();
    closeSidebar();
  }

  function populatePostPageSelect() {
    const fragment = document.createDocumentFragment();
    state.pages.forEach(page => {
      const option = document.createElement("option");
      option.value = page.id;
      option.textContent = `${page.name} · ${page.platform || "General"}`;
      fragment.appendChild(option);
    });
    els.postPage.replaceChildren(fragment);
  }

  async function loadPosts({ silent = false } = {}) {
    if (!state.workspace || state.loading) return;
    state.loading = true;
    els.refreshButton.classList.add("spinning");
    if (!silent) setSyncStatus("Refreshing…");

    const { start, end } = getVisibleDateRange();
    try {
      let query = supabase
        .from("posts")
        .select("id, workspace_id, social_page_id, created_by, title, caption, notes, post_date, post_time, status, platform, category, created_at, updated_at")
        .eq("workspace_id", state.workspace.id)
        .gte("post_date", dateToISO(start))
        .lte("post_date", dateToISO(end))
        .order("post_date", { ascending: true })
        .order("post_time", { ascending: true, nullsFirst: false });

      const result = await query;
      if (result.error) throw result.error;
      state.posts = result.data || [];
      renderPlanner();
      setSyncStatus(`Synced ${formatTimeOnly(new Date())}`);
    } catch (error) {
      setSyncStatus("Sync failed");
      if (!silent) showToast(readableError(error), "error");
      throw error;
    } finally {
      state.loading = false;
      els.refreshButton.classList.remove("spinning");
    }
  }

  async function refreshAll({ announce = false } = {}) {
    if (state.loading || state.saving || isEditing()) return;
    try {
      await loadPages();
      if (state.activePageId !== "all" && !state.pages.some(page => page.id === state.activePageId)) {
        state.activePageId = "all";
      }
      renderPageTabs();
      populatePostPageSelect();
      await loadPosts({ silent: !announce });
      if (announce) showToast("Planner refreshed.", "success");
    } catch (error) {
      console.error(error);
    }
  }

  function renderPlanner() {
    if (!state.workspace) return;
    updateCalendarHeading();
    updateViewButtons();
    updateStats();

    if (state.viewMode === "weekly") renderWeeklyView();
    else renderMonthlyView();
  }

  function getFilteredPosts({ includeStatusAndSearch = true } = {}) {
    return state.posts.filter(post => {
      if (state.activePageId !== "all" && post.social_page_id !== state.activePageId) return false;
      if (!includeStatusAndSearch) return true;
      if (state.statusFilter !== "all" && post.status !== state.statusFilter) return false;
      if (state.search) {
        const haystack = [post.title, post.caption, post.notes, post.platform, post.category]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(state.search)) return false;
      }
      return true;
    });
  }

  function updateStats() {
    const scoped = getFilteredPosts({ includeStatusAndSearch: false });
    els.ideaCount.textContent = scoped.filter(post => post.status === "idea").length;
    els.createdCount.textContent = scoped.filter(post => post.status === "created").length;
    els.scheduledCount.textContent = scoped.filter(post => post.status === "scheduled").length;
    els.postedCount.textContent = scoped.filter(post => post.status === "posted").length;
  }

  function renderMonthlyView() {
    const posts = getFilteredPosts();
    const grouped = groupPostsByDate(posts);
    const year = state.currentDate.getFullYear();
    const month = state.currentDate.getMonth();
    const first = new Date(year, month, 1);
    const gridStart = startOfWeek(first);
    const hiddenWeeks = getHiddenWeeks(year, month);
    const fragment = document.createDocumentFragment();

    for (let weekIndex = 0; weekIndex < 6; weekIndex += 1) {
      const week = document.createElement("section");
      week.className = `calendar-week${hiddenWeeks.has(weekIndex) ? " collapsed" : ""}`;

      const grid = document.createElement("div");
      grid.className = "calendar-week-grid";
      const weekDates = [];

      for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
        const date = addDays(gridStart, weekIndex * 7 + dayIndex);
        weekDates.push(date);
        grid.appendChild(createDayCell(date, grouped.get(dateToISO(date)) || [], month));
      }

      const rangeText = formatWeekRange(weekDates[0], weekDates[6]);
      const hideButton = document.createElement("button");
      hideButton.type = "button";
      hideButton.className = "week-hide-button";
      hideButton.textContent = "Hide week";
      hideButton.addEventListener("click", event => {
        event.stopPropagation();
        setWeekHidden(year, month, weekIndex, true);
        renderMonthlyView();
      });

      const collapsed = document.createElement("div");
      collapsed.className = "collapsed-week-bar";
      const label = document.createElement("span");
      label.textContent = rangeText;
      const showButton = document.createElement("button");
      showButton.type = "button";
      showButton.className = "show-week-button";
      showButton.textContent = "Show week";
      showButton.addEventListener("click", () => {
        setWeekHidden(year, month, weekIndex, false);
        renderMonthlyView();
      });
      collapsed.append(label, showButton);

      week.append(grid, hideButton, collapsed);
      fragment.appendChild(week);
    }

    els.calendarGrid.className = "calendar-grid monthly-view";
    els.calendarGrid.replaceChildren(fragment);
    toggleEmptyState(posts.length === 0);
  }

  function createDayCell(date, dayPosts, activeMonth) {
    const dateString = dateToISO(date);
    const cell = document.createElement("div");
    cell.className = "day-cell";
    cell.dataset.date = dateString;
    if (date.getMonth() !== activeMonth) cell.classList.add("muted");
    if (isSameDate(date, new Date())) cell.classList.add("today");

    const head = document.createElement("div");
    head.className = "day-head";
    const number = document.createElement("span");
    number.className = "day-number";
    number.textContent = String(date.getDate());
    const addButton = document.createElement("button");
    addButton.type = "button";
    addButton.className = "day-add";
    addButton.textContent = "+ Add";
    addButton.addEventListener("click", event => {
      event.stopPropagation();
      openPostModal(dateString);
    });
    head.append(number, addButton);

    const list = document.createElement("div");
    list.className = "post-list";
    dayPosts.sort(comparePostTimes).forEach(post => list.appendChild(createPostCard(post)));

    cell.append(head, list);
    cell.addEventListener("dblclick", () => openPostModal(dateString));
    enableDropTarget(cell, dateString);
    return cell;
  }

  function renderWeeklyView() {
    const posts = getFilteredPosts();
    const grouped = groupPostsByDate(posts);
    const start = startOfWeek(state.currentDate);
    const grid = document.createElement("div");
    grid.className = "weekly-grid";

    for (let i = 0; i < 7; i += 1) {
      const date = addDays(start, i);
      const dateString = dateToISO(date);
      const column = document.createElement("section");
      column.className = `weekly-day${isSameDate(date, new Date()) ? " today" : ""}`;
      column.dataset.date = dateString;

      const header = document.createElement("div");
      header.className = "weekly-day-header";
      header.innerHTML = `<span>${date.toLocaleDateString("en-US", { weekday: "short" })}</span><strong>${date.getDate()}</strong>`;
      header.addEventListener("dblclick", () => openPostModal(dateString));

      const hint = document.createElement("div");
      hint.className = "weekly-drop-hint";
      hint.textContent = "Drop a card here to reschedule";

      const list = document.createElement("div");
      list.className = "post-list";
      (grouped.get(dateString) || []).sort(comparePostTimes).forEach(post => list.appendChild(createPostCard(post)));

      column.append(header, hint, list);
      enableDropTarget(column, dateString);
      grid.appendChild(column);
    }

    els.calendarGrid.className = "calendar-grid weekly-view";
    els.calendarGrid.replaceChildren(grid);
    toggleEmptyState(posts.length === 0);
  }

  function createPostCard(post) {
    const page = state.pages.find(item => item.id === post.social_page_id);
    const card = document.createElement("article");
    card.className = "post-card";
    card.draggable = true;
    card.dataset.postId = post.id;
    card.style.setProperty("--page-color", sanitizeColor(page?.color));

    const top = document.createElement("div");
    top.className = "post-card-top";
    const time = document.createElement("span");
    time.className = "post-time";
    time.textContent = formatPostTime(post.post_time);
    const platform = document.createElement("span");
    platform.className = "platform-chip";
    platform.textContent = post.platform || page?.platform || "General";
    top.append(time, platform);

    const title = document.createElement("h4");
    title.textContent = post.title || "Untitled post";

    const bottom = document.createElement("div");
    bottom.className = "post-card-bottom";
    const status = document.createElement("span");
    status.className = `status-pill ${post.status}`;
    status.textContent = STATUS_LABELS[post.status] || capitalize(post.status);
    const category = document.createElement("span");
    category.className = "category-label";
    category.textContent = post.category || page?.name || "Content";
    bottom.append(status, category);

    const quick = document.createElement("button");
    quick.type = "button";
    quick.className = "quick-status";
    const next = nextStatus(post.status);
    quick.textContent = statusIcon(post.status);
    quick.title = `Move to ${STATUS_LABELS[next]}`;
    quick.setAttribute("aria-label", quick.title);
    quick.addEventListener("click", async event => {
      event.stopPropagation();
      await quickUpdateStatus(post, quick);
    });

    card.append(top, title, bottom, quick);
    card.addEventListener("click", () => openPostModal(post.post_date, post));
    card.addEventListener("dragstart", event => {
      state.draggedPostId = post.id;
      card.classList.add("dragging");
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", post.id);
    });
    card.addEventListener("dragend", () => {
      state.draggedPostId = null;
      card.classList.remove("dragging");
      document.querySelectorAll(".drag-over").forEach(element => element.classList.remove("drag-over"));
    });
    return card;
  }

  function enableDropTarget(element, dateString) {
    element.addEventListener("dragover", event => {
      if (!state.draggedPostId) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      element.classList.add("drag-over");
    });
    element.addEventListener("dragleave", event => {
      if (!element.contains(event.relatedTarget)) element.classList.remove("drag-over");
    });
    element.addEventListener("drop", async event => {
      event.preventDefault();
      element.classList.remove("drag-over");
      const id = event.dataTransfer.getData("text/plain") || state.draggedPostId;
      if (id) await movePostToDate(id, dateString);
    });
  }

  async function movePostToDate(postId, newDate) {
    const post = state.posts.find(item => item.id === postId);
    if (!post || post.post_date === newDate || state.saving) return;
    const oldDate = post.post_date;
    post.post_date = newDate;
    renderPlanner();

    try {
      const result = await supabase.from("posts").update({ post_date: newDate }).eq("id", postId).select("id").single();
      if (result.error) throw result.error;
      showToast(`Moved to ${formatFriendlyDate(newDate)}.`, "success");
    } catch (error) {
      post.post_date = oldDate;
      renderPlanner();
      showToast(readableError(error), "error");
    }
  }

  async function quickUpdateStatus(post, button) {
    if (button.disabled || state.saving) return;
    button.disabled = true;
    const oldStatus = post.status;
    const newStatus = nextStatus(oldStatus);
    post.status = newStatus;
    renderPlanner();

    try {
      const result = await supabase.from("posts").update({ status: newStatus }).eq("id", post.id).select("id").single();
      if (result.error) throw result.error;
      showToast(`Status updated to ${STATUS_LABELS[newStatus]}.`, "success");
    } catch (error) {
      post.status = oldStatus;
      renderPlanner();
      showToast(readableError(error), "error");
    } finally {
      button.disabled = false;
    }
  }

  function openPostModal(dateString, post = null) {
    if (!state.pages.length) {
      showToast("Add a social page before creating a post.", "error");
      openPageModal();
      return;
    }

    els.postForm.reset();
    populatePostPageSelect();
    els.postId.value = post?.id || "";
    els.postModalTitle.textContent = post ? "Edit post" : "Create post";
    els.postDate.value = post?.post_date || dateString || dateToISO(new Date());
    els.postModalDateLabel.textContent = formatFriendlyDate(els.postDate.value);
    els.postTitle.value = post?.title || "";
    els.postPage.value = post?.social_page_id || (state.activePageId !== "all" ? state.activePageId : state.pages[0].id);
    els.postStatus.value = post?.status || "idea";
    els.postTime.value = normalizeDatabaseTime(post?.post_time);
    els.postPlatform.value = post?.platform || state.pages.find(page => page.id === els.postPage.value)?.platform || "Facebook";
    els.postCategory.value = post?.category || "";
    els.postCaption.value = post?.caption || "";
    els.postNotes.value = post?.notes || "";
    els.deletePostButton.classList.toggle("hidden", !post);
    openModal(els.postModal);
    requestAnimationFrame(() => els.postTitle.focus());
  }

  async function savePost(event) {
    event.preventDefault();
    if (state.saving) return;

    const payload = {
      social_page_id: els.postPage.value,
      title: els.postTitle.value.trim(),
      caption: emptyToNull(els.postCaption.value),
      notes: emptyToNull(els.postNotes.value),
      post_date: els.postDate.value,
      post_time: emptyToNull(els.postTime.value),
      status: els.postStatus.value,
      platform: els.postPlatform.value,
      category: emptyToNull(els.postCategory.value)
    };

    if (!payload.title || !payload.social_page_id || !payload.post_date) {
      showToast("Complete the required post fields.", "error");
      return;
    }

    setSaving(true, els.savePostButton, "Saving…");
    try {
      const id = els.postId.value;
      let result;
      if (id) {
        result = await supabase.from("posts").update(payload).eq("id", id).select().single();
      } else {
        result = await supabase.from("posts").insert({
          ...payload,
          workspace_id: state.workspace.id,
          created_by: state.user.id
        }).select().single();
      }
      if (result.error) throw result.error;

      if (id) {
        const index = state.posts.findIndex(post => post.id === id);
        if (index >= 0) state.posts[index] = result.data;
      } else if (isPostInCurrentRange(result.data)) {
        state.posts.push(result.data);
      }

      closeModal(els.postModal, true);
      renderPlanner();
      showToast(id ? "Post updated." : "Post created.", "success");
    } catch (error) {
      showToast(readableError(error), "error");
    } finally {
      setSaving(false, els.savePostButton, "Save post");
    }
  }

  async function deletePost() {
    const id = els.postId.value;
    if (!id || state.saving || !window.confirm("Delete this post permanently?")) return;
    setSaving(true, els.deletePostButton, "Deleting…");
    try {
      const result = await supabase.from("posts").delete().eq("id", id);
      if (result.error) throw result.error;
      state.posts = state.posts.filter(post => post.id !== id);
      closeModal(els.postModal, true);
      renderPlanner();
      showToast("Post deleted.", "success");
    } catch (error) {
      showToast(readableError(error), "error");
    } finally {
      setSaving(false, els.deletePostButton, "Delete post");
    }
  }

  function openPageModal(page = null) {
    els.pageForm.reset();
    els.pageId.value = page?.id || "";
    els.pageModalTitle.textContent = page ? "Edit social page" : "Add a social page";
    els.pageName.value = page?.name || "";
    els.pagePlatform.value = page?.platform || "Facebook";
    els.pageColor.value = sanitizeColor(page?.color);
    els.archivePageButton.classList.toggle("hidden", !page);
    openModal(els.pageModal);
    requestAnimationFrame(() => els.pageName.focus());
  }

  async function savePage(event) {
    event.preventDefault();
    if (state.saving) return;
    const id = els.pageId.value;
    const payload = {
      name: els.pageName.value.trim(),
      platform: els.pagePlatform.value,
      color: els.pageColor.value,
      is_archived: false
    };
    if (!payload.name) return;

    setSaving(true, els.savePageButton, "Saving…");
    try {
      let result;
      if (id) result = await supabase.from("social_pages").update(payload).eq("id", id).select().single();
      else result = await supabase.from("social_pages").insert({ ...payload, workspace_id: state.workspace.id }).select().single();
      if (result.error) throw result.error;

      if (id) {
        const index = state.pages.findIndex(page => page.id === id);
        if (index >= 0) state.pages[index] = result.data;
      } else {
        state.pages.push(result.data);
        state.activePageId = result.data.id;
        localStorage.setItem(`${STORAGE_KEYS.activePage}:${state.workspace.id}`, result.data.id);
      }
      renderPageTabs();
      populatePostPageSelect();
      renderPlanner();
      closeModal(els.pageModal, true);
      showToast(id ? "Social page updated." : "Social page added.", "success");
    } catch (error) {
      showToast(readableError(error), "error");
    } finally {
      setSaving(false, els.savePageButton, "Save page");
    }
  }

  async function archivePage() {
    const id = els.pageId.value;
    const page = state.pages.find(item => item.id === id);
    if (!page || state.saving || !window.confirm(`Archive ${page.name}? Existing posts will remain in the database.`)) return;
    setSaving(true, els.archivePageButton, "Archiving…");
    try {
      const result = await supabase.from("social_pages").update({ is_archived: true }).eq("id", id);
      if (result.error) throw result.error;
      state.pages = state.pages.filter(item => item.id !== id);
      if (state.activePageId === id) state.activePageId = "all";
      renderPageTabs();
      populatePostPageSelect();
      renderPlanner();
      closeModal(els.pageModal, true);
      showToast("Social page archived.", "success");
    } catch (error) {
      showToast(readableError(error), "error");
    } finally {
      setSaving(false, els.archivePageButton, "Archive page");
    }
  }

  function openAccountModal() {
    renderIdentity();
    openModal(els.accountModal);
  }

  async function saveProfile(event) {
    event.preventDefault();
    if (state.saving) return;
    const fullName = els.profileName.value.trim();
    const workspaceName = els.profileWorkspaceName.value.trim();
    if (!fullName || !workspaceName) return;

    setSaving(true, els.saveProfileButton, "Saving…");
    try {
      const [profileResult, workspaceResult] = await Promise.all([
        supabase.from("profiles").update({ full_name: fullName }).eq("id", state.user.id).select().single(),
        supabase.from("workspaces").update({ name: workspaceName }).eq("id", state.workspace.id).select().single()
      ]);
      if (profileResult.error) throw profileResult.error;
      if (workspaceResult.error) throw workspaceResult.error;
      state.profile = profileResult.data;
      state.workspace = workspaceResult.data;
      renderIdentity();
      closeModal(els.accountModal, true);
      showToast("Account settings updated.", "success");
    } catch (error) {
      showToast(readableError(error), "error");
    } finally {
      setSaving(false, els.saveProfileButton, "Save changes");
    }
  }

  async function signOut() {
    if (state.saving) return;
    els.signOutButton.disabled = true;
    const result = await supabase.auth.signOut();
    els.signOutButton.disabled = false;
    if (result.error) showToast(readableError(result.error), "error");
    else closeModal(els.accountModal, true);
  }

  function subscribeToRealtime() {
    unsubscribeRealtime();
    if (!state.workspace) return;
    const workspaceFilter = `workspace_id=eq.${state.workspace.id}`;

    const postsChannel = supabase
      .channel(`planora-posts-${state.workspace.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "posts", filter: workspaceFilter }, scheduleRealtimeRefresh)
      .subscribe((status, error) => handleRealtimeStatus(status, error));

    const pagesChannel = supabase
      .channel(`planora-pages-${state.workspace.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "social_pages", filter: workspaceFilter }, scheduleRealtimeRefresh)
      .subscribe((status, error) => handleRealtimeStatus(status, error));

    state.realtimeChannels = [postsChannel, pagesChannel];
  }

  function unsubscribeRealtime() {
    for (const channel of state.realtimeChannels) {
      supabase.removeChannel(channel).catch(error => console.warn(error));
    }
    state.realtimeChannels = [];
  }

  function scheduleRealtimeRefresh() {
    clearTimeout(state.realtimeRefreshTimer);
    state.realtimeRefreshTimer = setTimeout(() => {
      if (!state.saving && !isEditing()) refreshAll();
    }, 450);
  }

  function handleRealtimeStatus(status, error) {
    if (status === "SUBSCRIBED") setSyncStatus("Realtime connected");
    if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
      console.error("Realtime status:", status, error);
      setSyncStatus("Realtime fallback active");
    }
  }

  function startAutoRefresh() {
    clearInterval(state.autoRefreshTimer);
    const interval = Math.max(Number(CONFIG.AUTO_REFRESH_MS) || 60000, 15000);
    state.autoRefreshTimer = setInterval(() => {
      if (document.visibilityState === "visible" && !state.saving && !state.loading && !isEditing()) {
        refreshAll();
      }
    }, interval);
  }

  function handleWindowFocus() {
    if (state.started && !state.saving && !state.loading && !isEditing()) refreshAll();
  }

  function handleVisibilityChange() {
    if (document.visibilityState === "visible" && state.started && !state.saving && !isEditing()) refreshAll();
  }

  function startClock() {
    clearInterval(state.clockTimer);
    updateClock();
    state.clockTimer = setInterval(updateClock, 1000);
  }

  function updateClock() {
    const now = new Date();
    const timeZone = CONFIG.TIME_ZONE || "Asia/Manila";
    els.currentTime.textContent = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true
    }).format(now);
    els.currentDate.textContent = new Intl.DateTimeFormat("en-US", {
      timeZone,
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric"
    }).format(now);
  }

  function setViewMode(mode) {
    if (!['monthly', 'weekly'].includes(mode) || state.viewMode === mode) return;
    state.viewMode = mode;
    localStorage.setItem(STORAGE_KEYS.view, mode);
    loadPosts({ silent: true });
  }

  function movePeriod(direction) {
    if (state.viewMode === "weekly") state.currentDate = addDays(state.currentDate, direction * 7);
    else state.currentDate = new Date(state.currentDate.getFullYear(), state.currentDate.getMonth() + direction, 1);
    loadPosts({ silent: true });
  }

  function updateViewButtons() {
    const monthly = state.viewMode === "monthly";
    els.monthlyViewButton.classList.toggle("active", monthly);
    els.weeklyViewButton.classList.toggle("active", !monthly);
  }

  function updateCalendarHeading() {
    if (state.viewMode === "weekly") {
      const start = startOfWeek(state.currentDate);
      const end = addDays(start, 6);
      els.calendarEyebrow.textContent = "Weekly calendar";
      els.calendarTitle.textContent = formatWeekRange(start, end);
      els.previousPeriodButton.textContent = "← Previous week";
      els.nextPeriodButton.textContent = "Next week →";
    } else {
      els.calendarEyebrow.textContent = "Monthly calendar";
      els.calendarTitle.textContent = state.currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
      els.previousPeriodButton.textContent = "← Previous";
      els.nextPeriodButton.textContent = "Next →";
    }
    updateActivePageLabel();
  }

  function updateActivePageLabel() {
    const page = state.pages.find(item => item.id === state.activePageId);
    els.activePageLabel.textContent = page ? `${page.name} · ${page.platform || "General"}` : "All social pages";
  }

  function getVisibleDateRange() {
    if (state.viewMode === "weekly") {
      const start = startOfWeek(state.currentDate);
      return { start, end: addDays(start, 6) };
    }
    const first = new Date(state.currentDate.getFullYear(), state.currentDate.getMonth(), 1);
    const start = startOfWeek(first);
    return { start, end: addDays(start, 41) };
  }

  function getHiddenWeeks(year, month) {
    try {
      const all = JSON.parse(localStorage.getItem(STORAGE_KEYS.hiddenWeeks) || "{}");
      const key = hiddenWeeksKey(year, month);
      return new Set((all[key] || []).map(Number));
    } catch {
      return new Set();
    }
  }

  function setWeekHidden(year, month, weekIndex, hidden) {
    try {
      const all = JSON.parse(localStorage.getItem(STORAGE_KEYS.hiddenWeeks) || "{}");
      const key = hiddenWeeksKey(year, month);
      const values = new Set((all[key] || []).map(Number));
      if (hidden) values.add(weekIndex); else values.delete(weekIndex);
      all[key] = [...values].sort((a, b) => a - b);
      localStorage.setItem(STORAGE_KEYS.hiddenWeeks, JSON.stringify(all));
    } catch (error) {
      console.warn("Could not save hidden weeks:", error);
    }
  }

  function hiddenWeeksKey(year, month) {
    return `${state.workspace?.id || "workspace"}:${state.activePageId}:${year}-${String(month + 1).padStart(2, "0")}`;
  }

  function openModal(modal) {
    modal.classList.remove("hidden");
    document.body.style.overflow = "hidden";
  }

  function closeModal(modal, force = false) {
    if (state.saving && !force) return;
    modal.classList.add("hidden");
    if (!document.querySelector(".modal:not(.hidden)")) document.body.style.overflow = "";
  }

  function isEditing() {
    return Boolean(document.querySelector(".modal:not(.hidden)"));
  }

  function setSaving(value, button, label) {
    state.saving = value;
    button.disabled = value;
    button.textContent = label;
  }

  function handleKeyboardShortcuts(event) {
    if (!state.started) return;

    if (event.key === "Escape") {
      document.querySelectorAll(".modal:not(.hidden)").forEach(modal => closeModal(modal));
      closeSidebar();
      return;
    }

    if (isEditing() || ["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName)) return;
    const key = event.key.toLowerCase();
    if (key === "n") {
      event.preventDefault();
      openPostModal(dateToISO(new Date()));
    } else if (key === "r") {
      event.preventDefault();
      refreshAll({ announce: true });
    } else if (key === "w") {
      event.preventDefault();
      setViewMode("weekly");
    } else if (key === "m") {
      event.preventDefault();
      setViewMode("monthly");
    }
  }

  function openSidebar() {
    els.sidebar.classList.add("open");
    els.sidebarBackdrop.classList.remove("hidden");
  }

  function closeSidebar() {
    els.sidebar.classList.remove("open");
    els.sidebarBackdrop.classList.add("hidden");
  }

  function renderChangelog() {
    const fragment = document.createDocumentFragment();
    (CONFIG.CHANGELOG || []).forEach(item => {
      const section = document.createElement("section");
      section.className = "changelog-item";
      const header = document.createElement("div");
      header.className = "changelog-item-header";
      const title = document.createElement("h4");
      title.textContent = `Version ${item.version}`;
      const date = document.createElement("time");
      date.textContent = item.date;
      header.append(title, date);
      const list = document.createElement("ul");
      item.changes.forEach(change => {
        const li = document.createElement("li");
        li.textContent = change;
        list.appendChild(li);
      });
      section.append(header, list);
      fragment.appendChild(section);
    });
    els.changelogContent.replaceChildren(fragment);
  }

  function updateVersionLabels() {
    document.querySelectorAll("[data-app-version]").forEach(element => {
      element.textContent = CONFIG.VERSION || "0.1.0";
    });
  }

  function setSyncStatus(message) { els.syncStatus.textContent = message; }

  function showToast(message, type = "") {
    clearTimeout(state.toastTimer);
    els.toast.textContent = message;
    els.toast.className = `toast${type ? ` ${type}` : ""}`;
    state.toastTimer = setTimeout(() => els.toast.classList.add("hidden"), 3000);
  }

  function toggleEmptyState(empty) { els.calendarEmpty.classList.toggle("hidden", !empty); }
  function groupPostsByDate(posts) {
    const map = new Map();
    posts.forEach(post => {
      if (!map.has(post.post_date)) map.set(post.post_date, []);
      map.get(post.post_date).push(post);
    });
    return map;
  }
  function comparePostTimes(a, b) { return (normalizeDatabaseTime(a.post_time) || "99:99").localeCompare(normalizeDatabaseTime(b.post_time) || "99:99"); }
  function nextStatus(status) { return STATUS_ORDER[(Math.max(0, STATUS_ORDER.indexOf(status)) + 1) % STATUS_ORDER.length]; }
  function statusIcon(status) { return ({ idea: "→", created: "⌁", scheduled: "✓", posted: "↺" })[status] || "→"; }
  function dateToISO(date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }
  function parseISODate(value) { const [y, m, d] = value.split("-").map(Number); return new Date(y, m - 1, d); }
  function startOfWeek(date) { const copy = new Date(date.getFullYear(), date.getMonth(), date.getDate()); copy.setDate(copy.getDate() - copy.getDay()); return copy; }
  function addDays(date, amount) { const copy = new Date(date); copy.setDate(copy.getDate() + amount); return copy; }
  function isSameDate(a, b) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }
  function formatFriendlyDate(value) { return parseISODate(value).toLocaleDateString("en-US", { weekday: "short", month: "long", day: "numeric", year: "numeric" }); }
  function formatWeekRange(start, end) {
    const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
    if (sameMonth) return `${start.toLocaleDateString("en-US", { month: "short" })} ${start.getDate()}–${end.getDate()}, ${end.getFullYear()}`;
    return `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
  }
  function normalizeDatabaseTime(value) { return value ? String(value).slice(0, 5) : ""; }
  function formatPostTime(value) {
    const normalized = normalizeDatabaseTime(value);
    if (!normalized) return "No time";
    const [hourValue, minute] = normalized.split(":").map(Number);
    const suffix = hourValue >= 12 ? "PM" : "AM";
    const hour = hourValue % 12 || 12;
    return `${hour}:${String(minute).padStart(2, "0")} ${suffix}`;
  }
  function roundTimeToFiveMinutes(date) {
    const copy = new Date(date);
    copy.setMinutes(Math.round(copy.getMinutes() / 5) * 5, 0, 0);
    return `${String(copy.getHours()).padStart(2, "0")}:${String(copy.getMinutes()).padStart(2, "0")}`;
  }
  function formatTimeOnly(date) { return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }); }
  function emptyToNull(value) { const trimmed = String(value || "").trim(); return trimmed || null; }
  function capitalize(value) { return value ? value.charAt(0).toUpperCase() + value.slice(1) : ""; }
  function sanitizeColor(value) { return /^#[0-9a-fA-F]{6}$/.test(value || "") ? value : "#3156d8"; }
  function escapeHtml(value) { return String(value || "").replace(/[&<>'"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#039;", '"': "&quot;" })[char]); }
  function readableError(error) {
    const message = error?.message || String(error || "Something went wrong.");
    if (/row-level security/i.test(message)) return "This action is not allowed for your current workspace access.";
    if (/network|fetch/i.test(message)) return "Could not reach Supabase. Check your connection and try again.";
    return message;
  }
  function wait(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
  function isPostInCurrentRange(post) {
    const { start, end } = getVisibleDateRange();
    const date = parseISODate(post.post_date);
    return date >= start && date <= end;
  }

  // Additional style hooks for page rows are injected once to keep the main stylesheet compact.
  const supplementalStyle = document.createElement("style");
  supplementalStyle.textContent = `
    .page-tab-row{display:grid;grid-template-columns:minmax(0,1fr) 26px;gap:4px;align-items:center}
    .page-tab-row:first-child{grid-template-columns:1fr}
    .page-edit-button{opacity:0;width:26px;height:26px;border:0;border-radius:8px;color:var(--muted);background:#f1f4f9;font-size:13px}
    .page-tab-row:hover .page-edit-button,.page-edit-button:focus-visible{opacity:1}
    @media(max-width:980px){.page-edit-button{opacity:.75}}
  `;
  document.head.appendChild(supplementalStyle);

  window.PlanoraApp = Object.freeze({ start, stop, refresh: refreshAll, showToast });
})();
